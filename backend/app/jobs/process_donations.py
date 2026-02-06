"""Donation processing jobs."""

import base64
import json
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from typing import Any
from urllib.parse import urlencode
from sqlalchemy import select, update, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from cuid2 import cuid_wrapper

from app.models import (
    User,
    Transaction,
    TransactionStatus,
    Donation,
    DonationStatus,
    DonationBatch,
    DonationBatchStatus,
)
from app.models.bank_account import BankAccount
from app.models.plaid_item import PlaidItem
from app.models.charity import Charity
from app.config import settings
from app.utils.logger import logger
from app.services.stripe_service import stripe_service
from app.services.change_service import change_service, ChangeApiError

generate_cuid = cuid_wrapper()


def get_week_start(date: datetime) -> datetime:
    """Get the Sunday of the week for a given date."""
    days_since_sunday = (date.weekday() + 1) % 7
    return (date - timedelta(days=days_since_sunday)).replace(
        hour=0, minute=0, second=0, microsecond=0
    )


def generate_donation_url(
    charity_slug: str,
    amount: float,
    metadata: dict[str, str],
) -> str:
    """Generate Every.org donation URL with tracking metadata."""
    params = {
        "amount": f"{amount:.2f}",
        "frequency": "ONCE",
        "success_url": f"{settings.APP_URL}/dashboard/donations?success=true",
    }

    if settings.EVERYORG_WEBHOOK_TOKEN:
        params["webhook_token"] = settings.EVERYORG_WEBHOOK_TOKEN

    # Encode metadata as base64
    metadata_b64 = base64.b64encode(json.dumps(metadata).encode()).decode()
    params["partner_metadata"] = metadata_b64

    return f"https://www.every.org/{charity_slug}#donate?{urlencode(params)}"


async def create_weekly_batches(db: AsyncSession) -> dict[str, Any]:
    """
    Create donation batches for all users with pending donations.
    Groups by user, checks auto-donate setting, creates/updates batches.
    """
    logger.info("Creating weekly batches")

    week_of = get_week_start(datetime.now(timezone.utc)).date()

    # Find pending donations without batches
    result = await db.execute(
        select(Donation)
        .options(selectinload(Donation.user))
        .where(Donation.status == DonationStatus.PENDING)
        .where(Donation.batchId == None)
    )
    pending_donations = list(result.scalars().all())

    # Group by user
    donations_by_user: dict[str, list[Donation]] = {}
    for donation in pending_donations:
        if donation.userId not in donations_by_user:
            donations_by_user[donation.userId] = []
        donations_by_user[donation.userId].append(donation)

    results = []

    for user_id, donations in donations_by_user.items():
        user = donations[0].user
        if not user.autoDonateEnabled:
            continue

        total_amount = sum(float(d.amount) for d in donations)
        if total_amount < 1.0:
            continue

        # Check if batch exists for this week
        result = await db.execute(
            select(DonationBatch).where(
                DonationBatch.userId == user_id,
                DonationBatch.weekOf == week_of,
            )
        )
        batch = result.scalar_one_or_none()

        now = datetime.now(timezone.utc)
        if batch:
            batch.totalAmount += Decimal(str(total_amount))
            batch.updatedAt = now
        else:
            batch = DonationBatch(
                id=generate_cuid(),
                userId=user_id,
                weekOf=week_of,
                totalAmount=Decimal(str(total_amount)),
                status=DonationBatchStatus.PENDING,
                createdAt=now,
                updatedAt=now,
            )
            db.add(batch)

        await db.flush()

        # Update donations with batch ID
        for donation in donations:
            donation.batchId = batch.id

        # Update transaction statuses
        transaction_ids = [d.transactionId for d in donations if d.transactionId]
        if transaction_ids:
            await db.execute(
                update(Transaction)
                .where(Transaction.id.in_(transaction_ids))
                .values(status=TransactionStatus.BATCHED)
            )

        results.append({
            "userId": user_id,
            "batchId": batch.id,
            "donationCount": len(donations),
            "totalAmount": total_amount,
        })

    await db.commit()

    summary = {
        "weekOf": str(week_of),
        "batchesCreated": len(results),
        "results": results,
    }
    logger.info("Weekly batches created", summary)
    return summary


async def process_donation_batch(
    db: AsyncSession, batch_id: str
) -> dict[str, Any]:
    """
    Process a single donation batch - generates donation URLs.
    Groups donations by charity and creates consolidated URLs.
    """
    result = await db.execute(
        select(DonationBatch)
        .options(
            selectinload(DonationBatch.donations).selectinload(Donation.charity),
            selectinload(DonationBatch.user),
        )
        .where(DonationBatch.id == batch_id)
    )
    batch = result.scalar_one_or_none()

    if not batch:
        raise ValueError(f"Batch not found: {batch_id}")

    if batch.status not in [DonationBatchStatus.PENDING, DonationBatchStatus.READY]:
        return {"skipped": True, "reason": f"Batch status is {batch.status.value}"}

    batch.status = DonationBatchStatus.PROCESSING
    batch.updatedAt = datetime.now(timezone.utc)
    await db.flush()

    # Group donations by charity
    donations_by_charity: dict[str, dict[str, Any]] = {}
    for donation in batch.donations:
        if donation.charitySlug not in donations_by_charity:
            donations_by_charity[donation.charitySlug] = {
                "charitySlug": donation.charitySlug,
                "charityName": donation.charityName,
                "amount": 0.0,
                "donationIds": [],
            }
        donations_by_charity[donation.charitySlug]["amount"] += float(donation.amount)
        donations_by_charity[donation.charitySlug]["donationIds"].append(donation.id)

    # Generate URLs
    donation_urls = []
    for charity_slug, data in donations_by_charity.items():
        url = generate_donation_url(
            charity_slug,
            data["amount"],
            {"userId": batch.userId, "batchId": batch.id},
        )
        donation_urls.append({
            "charitySlug": charity_slug,
            "charityName": data["charityName"],
            "amount": data["amount"],
            "url": url,
            "donationIds": data["donationIds"],
        })

    batch.status = DonationBatchStatus.READY
    batch.updatedAt = datetime.now(timezone.utc)
    await db.commit()

    return {
        "batchId": batch_id,
        "userId": batch.userId,
        "totalAmount": float(batch.totalAmount),
        "charityCount": len(donation_urls),
        "donationUrls": donation_urls,
    }


async def complete_donation(
    db: AsyncSession,
    donation_id: str | None,
    batch_id: str | None,
    user_id: str | None,
    every_org_id: str,
) -> dict[str, Any]:
    """
    Mark a donation as completed (called from Every.org webhook).
    Updates donation status and checks if batch is complete.
    """
    donation = None

    if donation_id:
        result = await db.execute(
            select(Donation).where(Donation.id == donation_id)
        )
        donation = result.scalar_one_or_none()
    elif batch_id and user_id:
        result = await db.execute(
            select(Donation)
            .where(Donation.batchId == batch_id)
            .where(Donation.userId == user_id)
            .where(Donation.status.in_([DonationStatus.PENDING, DonationStatus.PROCESSING]))
            .limit(1)
        )
        donation = result.scalar_one_or_none()

    if not donation:
        logger.warn("No matching donation found", {"every_org_id": every_org_id})
        return {"success": False, "reason": "Donation not found"}

    now = datetime.now(timezone.utc)
    donation.status = DonationStatus.COMPLETED
    donation.everyOrgId = every_org_id
    donation.completedAt = now

    # Update linked transaction
    if donation.transactionId:
        await db.execute(
            update(Transaction)
            .where(Transaction.id == donation.transactionId)
            .values(status=TransactionStatus.DONATED)
        )

    # Check if batch is complete
    if donation.batchId:
        result = await db.execute(
            select(func.count(Donation.id))
            .where(Donation.batchId == donation.batchId)
            .where(Donation.status.in_([DonationStatus.PENDING, DonationStatus.PROCESSING]))
        )
        pending_count = result.scalar()

        if pending_count == 0:
            await db.execute(
                update(DonationBatch)
                .where(DonationBatch.id == donation.batchId)
                .values(
                    status=DonationBatchStatus.COMPLETED,
                    processedAt=now,
                    updatedAt=now,
                )
            )

    await db.commit()

    logger.info(
        "Donation completed",
        {"donation_id": donation.id, "every_org_id": every_org_id},
    )

    return {"success": True, "donationId": donation.id, "everyOrgId": every_org_id}


async def reset_monthly_totals(db: AsyncSession) -> dict[str, Any]:
    """
    Reset all users' monthly donation totals.
    Runs on the 1st of each month at midnight UTC.
    """
    logger.info("Resetting monthly totals")

    result = await db.execute(update(User).values(currentMonthTotal=0))
    await db.commit()

    summary = {
        "usersReset": result.rowcount,
        "resetAt": datetime.now(timezone.utc).isoformat(),
    }
    logger.info("Monthly totals reset", summary)
    return summary


async def weekly_donation_processing(db: AsyncSession) -> dict[str, Any]:
    """
    Weekly orchestration: create batches then process each.
    Runs every Sunday at 8 PM UTC.
    """
    logger.info("Starting weekly donation processing")

    # Create batches
    batch_result = await create_weekly_batches(db)

    # Process each batch
    process_results = []
    for batch in batch_result.get("results", []):
        try:
            result = await process_donation_batch(db, batch["batchId"])
            process_results.append({"batchId": batch["batchId"], "result": result})
        except Exception as e:
            logger.error("Failed to process batch", {"batch_id": batch["batchId"]}, e)
            process_results.append({
                "batchId": batch["batchId"],
                "error": str(e),
            })

    summary = {
        "batchesCreated": batch_result["batchesCreated"],
        "batchesProcessed": len(process_results),
        "results": process_results,
    }
    logger.info("Weekly donation processing completed", summary)
    return summary


async def get_ach_enabled_account(
    db: AsyncSession, user_id: str
) -> tuple[BankAccount, str] | None:
    """Get ACH-enabled bank account for a user."""
    result = await db.execute(
        select(BankAccount)
        .join(PlaidItem)
        .where(PlaidItem.userId == user_id)
        .where(BankAccount.achEnabled == True)
        .where(BankAccount.stripePaymentMethodId != None)
    )
    bank_account = result.scalar_one_or_none()

    if not bank_account or not bank_account.stripePaymentMethodId:
        return None

    return bank_account, bank_account.stripePaymentMethodId


async def process_auto_donation_batch(
    db: AsyncSession, batch_id: str
) -> dict[str, Any]:
    """
    Process a batch with automatic ACH debit and Change API donations.
    This is the new auto-donation flow.
    """
    result = await db.execute(
        select(DonationBatch)
        .options(
            selectinload(DonationBatch.donations).selectinload(Donation.charity),
            selectinload(DonationBatch.user),
        )
        .where(DonationBatch.id == batch_id)
    )
    batch = result.scalar_one_or_none()

    if not batch:
        raise ValueError(f"Batch not found: {batch_id}")

    if batch.status not in [DonationBatchStatus.PENDING, DonationBatchStatus.READY]:
        return {"skipped": True, "reason": f"Batch status is {batch.status.value}"}

    user = batch.user
    if not user.autoDonateEnabled:
        return {"skipped": True, "reason": "Auto-donate not enabled"}

    # Check for ACH-enabled account
    ach_result = await get_ach_enabled_account(db, user.id)
    if not ach_result:
        logger.warn("No ACH account for auto-donation", {"user_id": user.id})
        return {"skipped": True, "reason": "No ACH account configured"}

    bank_account, payment_method_id = ach_result

    if not user.stripeCustomerId:
        logger.warn("No Stripe customer for auto-donation", {"user_id": user.id})
        return {"skipped": True, "reason": "No Stripe customer"}

    batch.status = DonationBatchStatus.PROCESSING
    batch.updatedAt = datetime.now(timezone.utc)
    await db.flush()

    total_cents = int(float(batch.totalAmount) * 100)

    # Step 1: Create ACH payment via Stripe
    try:
        payment_intent = await stripe_service.create_ach_payment(
            customer_id=user.stripeCustomerId,
            payment_method_id=payment_method_id,
            amount=total_cents,
            metadata={
                "batch_id": batch.id,
                "user_id": user.id,
            },
        )

        batch.stripePaymentIntentId = payment_intent.id
        batch.stripePaymentStatus = payment_intent.status

        # ACH payments are async - they go to "processing" status
        # We'll complete donations when we receive the payment success webhook
        if payment_intent.status in ["succeeded", "processing"]:
            logger.info(
                "ACH payment initiated",
                {
                    "batch_id": batch.id,
                    "payment_intent_id": payment_intent.id,
                    "status": payment_intent.status,
                },
            )
        else:
            raise ValueError(f"Unexpected payment status: {payment_intent.status}")

        await db.commit()

        return {
            "batchId": batch.id,
            "userId": user.id,
            "totalAmount": float(batch.totalAmount),
            "paymentIntentId": payment_intent.id,
            "paymentStatus": payment_intent.status,
            "donationCount": len(batch.donations),
        }

    except Exception as e:
        batch.status = DonationBatchStatus.FAILED
        batch.stripePaymentStatus = "failed"
        batch.updatedAt = datetime.now(timezone.utc)
        await db.commit()

        logger.error("ACH payment failed", {"batch_id": batch.id}, e)
        raise


async def distribute_donations_to_charities(
    db: AsyncSession, batch_id: str
) -> dict[str, Any]:
    """
    Distribute donations to charities via Change API.
    Called after ACH payment succeeds.
    """
    result = await db.execute(
        select(DonationBatch)
        .options(
            selectinload(DonationBatch.donations).selectinload(Donation.charity),
        )
        .where(DonationBatch.id == batch_id)
    )
    batch = result.scalar_one_or_none()

    if not batch:
        raise ValueError(f"Batch not found: {batch_id}")

    distribution_results = []

    for donation in batch.donations:
        charity = donation.charity

        # Get Change nonprofit ID
        change_nonprofit_id = getattr(charity, 'changeNonprofitId', None)
        if not change_nonprofit_id and charity.ein:
            # Try to find by EIN
            nonprofit = await change_service.get_nonprofit_by_ein(charity.ein)
            if nonprofit:
                change_nonprofit_id = nonprofit.get("id")

        if not change_nonprofit_id:
            logger.warn(
                "No Change nonprofit ID for charity",
                {"charity_id": charity.id, "charity_name": charity.name},
            )
            donation.status = DonationStatus.FAILED
            donation.errorMessage = "Charity not available for auto-donation"
            distribution_results.append({
                "donationId": donation.id,
                "success": False,
                "error": "No Change nonprofit ID",
            })
            continue

        try:
            amount_cents = int(float(donation.amount) * 100)
            change_donation = await change_service.create_donation(
                nonprofit_id=change_nonprofit_id,
                amount=amount_cents,
                metadata={
                    "donation_id": donation.id,
                    "batch_id": batch.id,
                    "user_id": donation.userId,
                },
            )

            donation.changeId = change_donation.get("id")
            donation.status = DonationStatus.PROCESSING  # Will be COMPLETED via webhook

            distribution_results.append({
                "donationId": donation.id,
                "changeId": change_donation.get("id"),
                "success": True,
            })

        except ChangeApiError as e:
            logger.error(
                "Change API error",
                {"donation_id": donation.id, "error": str(e)},
            )
            donation.status = DonationStatus.FAILED
            donation.errorMessage = str(e)
            distribution_results.append({
                "donationId": donation.id,
                "success": False,
                "error": str(e),
            })

    await db.commit()

    return {
        "batchId": batch_id,
        "donationsProcessed": len(distribution_results),
        "results": distribution_results,
    }


async def handle_ach_payment_succeeded(
    db: AsyncSession, payment_intent_id: str
) -> dict[str, Any]:
    """
    Handle successful ACH payment - distribute donations to charities.
    Called from Stripe webhook.
    """
    result = await db.execute(
        select(DonationBatch).where(
            DonationBatch.stripePaymentIntentId == payment_intent_id
        )
    )
    batch = result.scalar_one_or_none()

    if not batch:
        logger.warn("No batch found for payment intent", {"payment_intent_id": payment_intent_id})
        return {"success": False, "reason": "Batch not found"}

    now = datetime.now(timezone.utc)
    batch.stripePaymentStatus = "succeeded"
    batch.achDebitedAt = now
    batch.updatedAt = now

    await db.commit()

    # Now distribute to charities via Change API
    distribution_result = await distribute_donations_to_charities(db, batch.id)

    logger.info(
        "ACH payment succeeded, donations distributed",
        {
            "batch_id": batch.id,
            "payment_intent_id": payment_intent_id,
            "donations_processed": distribution_result["donationsProcessed"],
        },
    )

    return {
        "success": True,
        "batchId": batch.id,
        "distribution": distribution_result,
    }


async def handle_ach_payment_failed(
    db: AsyncSession, payment_intent_id: str, failure_reason: str | None = None
) -> dict[str, Any]:
    """
    Handle failed ACH payment.
    Called from Stripe webhook.
    """
    result = await db.execute(
        select(DonationBatch)
        .options(selectinload(DonationBatch.donations))
        .where(DonationBatch.stripePaymentIntentId == payment_intent_id)
    )
    batch = result.scalar_one_or_none()

    if not batch:
        logger.warn("No batch found for failed payment", {"payment_intent_id": payment_intent_id})
        return {"success": False, "reason": "Batch not found"}

    now = datetime.now(timezone.utc)
    batch.status = DonationBatchStatus.FAILED
    batch.stripePaymentStatus = "failed"
    batch.updatedAt = now

    # Mark all donations in the batch as failed
    for donation in batch.donations:
        donation.status = DonationStatus.FAILED
        donation.errorMessage = failure_reason or "ACH payment failed"

    await db.commit()

    logger.error(
        "ACH payment failed",
        {
            "batch_id": batch.id,
            "payment_intent_id": payment_intent_id,
            "failure_reason": failure_reason,
        },
    )

    return {
        "success": True,
        "batchId": batch.id,
        "status": "failed",
    }


async def weekly_auto_donation_processing(db: AsyncSession) -> dict[str, Any]:
    """
    Weekly auto-donation processing: create batches and process with ACH + Change.
    Runs every Sunday at 8 PM UTC for users with auto-donate enabled.
    """
    logger.info("Starting weekly auto-donation processing")

    # Create batches (same as before)
    batch_result = await create_weekly_batches(db)

    # Process each batch with auto-donation flow
    process_results = []
    for batch_info in batch_result.get("results", []):
        batch_id = batch_info["batchId"]
        try:
            result = await process_auto_donation_batch(db, batch_id)
            process_results.append({"batchId": batch_id, "result": result})
        except Exception as e:
            logger.error("Failed to process auto-donation batch", {"batch_id": batch_id}, e)
            process_results.append({
                "batchId": batch_id,
                "error": str(e),
            })

    summary = {
        "batchesCreated": batch_result["batchesCreated"],
        "batchesProcessed": len(process_results),
        "results": process_results,
    }
    logger.info("Weekly auto-donation processing completed", summary)
    return summary
