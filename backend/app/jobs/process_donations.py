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
from app.config import settings
from app.utils.logger import logger

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
