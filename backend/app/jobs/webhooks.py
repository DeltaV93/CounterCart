"""Webhook handling jobs."""

from datetime import datetime, timezone
from typing import Any
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    PlaidItem,
    PlaidItemStatus,
    WebhookEvent,
    WebhookStatus,
)
from app.jobs.sync_transactions import sync_plaid_item_transactions
from app.utils.logger import logger


async def handle_plaid_webhook(
    db: AsyncSession, webhook_event_id: str
) -> dict[str, Any]:
    """
    Process Plaid webhook event asynchronously.
    Called from the webhook API route after signature verification.
    """
    # Get webhook event
    result = await db.execute(
        select(WebhookEvent).where(WebhookEvent.id == webhook_event_id)
    )
    event = result.scalar_one_or_none()

    if not event:
        raise ValueError(f"Webhook event not found: {webhook_event_id}")

    if event.status != WebhookStatus.PENDING:
        return {"skipped": True, "reason": f"Event status is {event.status.value}"}

    event.status = WebhookStatus.PROCESSING
    await db.flush()

    payload = event.payload
    webhook_type = payload.get("webhook_type")
    webhook_code = payload.get("webhook_code")
    item_id = payload.get("item_id")

    try:
        # Find PlaidItem
        result = await db.execute(
            select(PlaidItem).where(PlaidItem.itemId == item_id)
        )
        plaid_item = result.scalar_one_or_none()

        if not plaid_item:
            raise ValueError(f"Plaid item not found for item_id: {item_id}")

        job_result: dict[str, Any] = {}

        if webhook_type == "TRANSACTIONS":
            job_result = await _handle_transactions_webhook(
                db, plaid_item.id, webhook_code, payload
            )
        elif webhook_type == "ITEM":
            job_result = await _handle_item_webhook(
                db, plaid_item.id, webhook_code, payload
            )
        else:
            job_result = {"handled": False, "reason": f"Unhandled type: {webhook_type}"}

        # Mark as completed
        event.status = WebhookStatus.COMPLETED
        event.processedAt = datetime.now(timezone.utc)
        await db.commit()

        return {
            "success": True,
            "webhook_type": webhook_type,
            "webhook_code": webhook_code,
            "result": job_result,
        }

    except Exception as e:
        event.status = WebhookStatus.FAILED
        event.error = str(e)
        event.retryCount += 1
        await db.commit()
        raise


async def _handle_transactions_webhook(
    db: AsyncSession,
    plaid_item_id: str,
    webhook_code: str,
    payload: dict,
) -> dict[str, Any]:
    """Handle TRANSACTIONS webhook events."""
    sync_codes = [
        "INITIAL_UPDATE",
        "HISTORICAL_UPDATE",
        "DEFAULT_UPDATE",
        "TRANSACTIONS_REMOVED",
        "SYNC_UPDATES_AVAILABLE",
    ]

    if webhook_code in sync_codes:
        sync_result = await sync_plaid_item_transactions(db, plaid_item_id)
        return {
            "code": webhook_code,
            "new_transactions": payload.get("new_transactions"),
            "syncResult": sync_result,
        }

    return {"handled": False, "reason": f"Unhandled code: {webhook_code}"}


async def _handle_item_webhook(
    db: AsyncSession,
    plaid_item_id: str,
    webhook_code: str,
    payload: dict,
) -> dict[str, Any]:
    """Handle ITEM webhook events."""
    result = await db.execute(
        select(PlaidItem).where(PlaidItem.id == plaid_item_id)
    )
    plaid_item = result.scalar_one()
    now = datetime.now(timezone.utc)

    if webhook_code == "ERROR":
        error_info = payload.get("error", {})
        plaid_item.status = PlaidItemStatus.ERROR
        plaid_item.errorCode = error_info.get("error_code")
        plaid_item.updatedAt = now
        await db.flush()
        return {
            "code": webhook_code,
            "errorCode": error_info.get("error_code"),
            "errorMessage": error_info.get("error_message"),
        }

    elif webhook_code == "LOGIN_REPAIRED":
        plaid_item.status = PlaidItemStatus.ACTIVE
        plaid_item.errorCode = None
        plaid_item.updatedAt = now
        await db.flush()
        # Sync transactions now that access is restored
        sync_result = await sync_plaid_item_transactions(db, plaid_item_id)
        return {"code": webhook_code, "syncResult": sync_result}

    elif webhook_code == "PENDING_EXPIRATION":
        plaid_item.status = PlaidItemStatus.LOGIN_REQUIRED
        plaid_item.updatedAt = now
        await db.flush()
        # TODO: Send notification to user
        return {"code": webhook_code, "message": "Access token expiring soon"}

    elif webhook_code == "USER_PERMISSION_REVOKED":
        plaid_item.status = PlaidItemStatus.DISCONNECTED
        plaid_item.updatedAt = now
        await db.flush()
        return {"code": webhook_code, "message": "User revoked permission"}

    elif webhook_code == "WEBHOOK_UPDATE_ACKNOWLEDGED":
        return {"code": webhook_code, "message": "Webhook update acknowledged"}

    return {"handled": False, "reason": f"Unhandled code: {webhook_code}"}


async def retry_failed_webhooks(
    db: AsyncSession, max_retries: int = 3
) -> dict[str, Any]:
    """
    Retry failed webhook events that haven't exceeded retry limit.
    Can be triggered manually or scheduled.
    """
    logger.info("Retrying failed webhooks", {"max_retries": max_retries})

    result = await db.execute(
        select(WebhookEvent)
        .where(WebhookEvent.source == "plaid")
        .where(WebhookEvent.status == WebhookStatus.FAILED)
        .where(WebhookEvent.retryCount < max_retries)
        .order_by(WebhookEvent.createdAt.asc())
        .limit(50)
    )
    failed_events = list(result.scalars().all())

    results = []

    for event in failed_events:
        try:
            event.status = WebhookStatus.PENDING
            await db.flush()

            job_result = await handle_plaid_webhook(db, event.id)
            results.append({"eventId": event.id, "success": True, "result": job_result})
        except Exception as e:
            logger.error("Retry failed", {"event_id": event.id}, e)
            results.append({"eventId": event.id, "success": False, "error": str(e)})

    summary = {"totalRetried": len(failed_events), "results": results}
    logger.info("Webhook retry completed", summary)
    return summary
