"""Grant distribution jobs.

Distributes grants from Tech by Choice to designated charities via Every.org Partner API.

Flow:
1. ACH payment succeeds (funds received by TBC)
2. This job is triggered via internal API
3. Donations are grouped by charity
4. Every.org Partner API disbursement is created
5. Webhook notifies when disbursement completes
"""

import os
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any
import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import (
    Donation,
    DonationBatch,
    DonationBatchStatus,
)
from app.models.charity import Charity
from app.models.cause import Cause
from app.config import settings
from app.utils.logger import logger


# Every.org Partner API configuration
EVERYORG_PARTNER_API_URL = "https://partners.every.org/v1"


class EveryOrgPartnerClient:
    """Client for Every.org Partner Disbursement API."""

    def __init__(self):
        self.partner_id = settings.EVERYORG_PARTNER_ID
        self.partner_secret = settings.EVERYORG_PARTNER_SECRET
        self.webhook_url = f"{settings.APP_URL}/api/webhooks/everyorg/disbursement"

    def is_configured(self) -> bool:
        """Check if Partner API credentials are configured."""
        return bool(self.partner_id and self.partner_secret)

    async def create_disbursement(
        self,
        grants: list[dict[str, Any]],
    ) -> dict[str, Any]:
        """
        Create a disbursement batch to distribute grants to nonprofits.

        Args:
            grants: List of grant requests with nonprofit_id, amount, memo, metadata

        Returns:
            Disbursement response with id and status
        """
        if not self.is_configured():
            raise ValueError(
                "Every.org Partner API not configured. "
                "Set EVERYORG_PARTNER_ID and EVERYORG_PARTNER_SECRET."
            )

        total_amount = sum(g["amount"] for g in grants)

        logger.info(
            "Creating Every.org disbursement",
            {
                "grant_count": len(grants),
                "total_amount_cents": total_amount,
                "nonprofits": [g["nonprofit_id"] for g in grants],
            },
        )

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{EVERYORG_PARTNER_API_URL}/disbursements",
                headers={
                    "Authorization": f"Bearer {self.partner_secret}",
                    "Content-Type": "application/json",
                },
                json={
                    "partner_id": self.partner_id,
                    "disbursements": grants,
                    "webhook_url": self.webhook_url,
                },
                timeout=30.0,
            )

            if response.status_code >= 400:
                error_text = response.text
                logger.error(
                    "Every.org disbursement API error",
                    {
                        "status": response.status_code,
                        "error": error_text,
                    },
                )
                raise ValueError(
                    f"Every.org API error: {response.status_code} - {error_text}"
                )

            result = response.json()

        logger.info(
            "Every.org disbursement created",
            {
                "disbursement_id": result.get("id"),
                "status": result.get("status"),
                "grant_count": len(result.get("disbursements", [])),
            },
        )

        return result


# Singleton client instance
_partner_client: EveryOrgPartnerClient | None = None


def get_partner_client() -> EveryOrgPartnerClient:
    """Get the Every.org Partner API client."""
    global _partner_client
    if _partner_client is None:
        _partner_client = EveryOrgPartnerClient()
    return _partner_client


async def get_default_charity_for_cause(
    db: AsyncSession,
    cause_id: str,
) -> Charity | None:
    """Get the default charity for a cause."""
    result = await db.execute(
        select(Charity).where(
            Charity.causeId == cause_id,
            Charity.isDefault == True,
            Charity.isActive == True,
        )
    )
    charity = result.scalar_one_or_none()

    if not charity:
        # Fall back to any active charity for this cause
        result = await db.execute(
            select(Charity).where(
                Charity.causeId == cause_id,
                Charity.isActive == True,
            ).limit(1)
        )
        charity = result.scalar_one_or_none()

    return charity


async def distribute_batch_grants(
    db: AsyncSession,
    batch_id: str,
) -> dict[str, Any]:
    """
    Distribute grants to charities via Every.org Partner API.

    Called after ACH payment succeeds. Groups donations by charity
    and creates a single disbursement batch.

    Args:
        db: Database session
        batch_id: ID of the donation batch to process

    Returns:
        Result with disbursement ID and grant count
    """
    # Fetch batch with donations
    result = await db.execute(
        select(DonationBatch)
        .options(
            selectinload(DonationBatch.donations).selectinload(Donation.designatedCause),
            selectinload(DonationBatch.donations).selectinload(Donation.charity),
            selectinload(DonationBatch.user),
        )
        .where(DonationBatch.id == batch_id)
    )
    batch = result.scalar_one_or_none()

    if not batch:
        raise ValueError(f"Batch not found: {batch_id}")

    # Check if already processed
    if batch.grantStatus == "completed":
        return {"skipped": True, "reason": "Already distributed"}

    if batch.grantStatus == "processing":
        return {"skipped": True, "reason": "Already processing"}

    # Check Partner API configuration
    client = get_partner_client()
    if not client.is_configured():
        logger.warn(
            "Every.org Partner API not configured, skipping grant distribution",
            {"batch_id": batch_id},
        )
        return {"skipped": True, "reason": "Partner API not configured"}

    # Group donations by charity
    grants_by_charity: dict[str, dict[str, Any]] = {}

    for donation in batch.donations:
        # Determine which charity to grant to
        charity_slug = None

        if donation.charitySlug:
            # Use explicitly specified charity
            charity_slug = donation.charitySlug
        elif donation.designatedCauseId:
            # Find default charity for the designated cause
            default_charity = await get_default_charity_for_cause(
                db, donation.designatedCauseId
            )
            if default_charity:
                charity_slug = default_charity.everyOrgSlug

        if not charity_slug:
            logger.warn(
                "No charity found for donation, skipping",
                {"donation_id": donation.id, "cause_id": donation.designatedCauseId},
            )
            continue

        # Group by charity
        if charity_slug not in grants_by_charity:
            cause_name = (
                donation.designatedCause.name
                if donation.designatedCause
                else "General"
            )
            grants_by_charity[charity_slug] = {
                "nonprofit_id": charity_slug,
                "amount": 0,
                "donation_ids": [],
                "cause": cause_name,
            }

        grants_by_charity[charity_slug]["amount"] += int(float(donation.amount) * 100)
        grants_by_charity[charity_slug]["donation_ids"].append(donation.id)

    if not grants_by_charity:
        logger.warn("No grants to distribute for batch", {"batch_id": batch_id})
        batch.grantStatus = "completed"
        batch.grantedAt = datetime.now(timezone.utc)
        await db.commit()
        return {"skipped": True, "reason": "No grants to distribute"}

    # Prepare disbursement request
    disbursements = []
    for charity_slug, data in grants_by_charity.items():
        disbursements.append({
            "nonprofit_id": charity_slug,
            "amount": data["amount"],
            "memo": f"CounterCart grant - {data['cause']}",
            "metadata": {
                "batch_id": batch_id,
                "donation_ids": data["donation_ids"],
                "designated_cause": data["cause"],
            },
        })

    # Update batch status to processing
    now = datetime.now(timezone.utc)
    batch.grantStatus = "processing"
    await db.flush()

    try:
        # Create disbursement via Every.org Partner API
        result = await client.create_disbursement(disbursements)

        # Update batch with disbursement ID
        batch.everyOrgDisbursementId = result["id"]

        # Mark individual donations as pending grant
        for donation in batch.donations:
            donation.grantStatus = "pending"

        await db.commit()

        logger.info(
            "Grant distribution initiated",
            {
                "batch_id": batch_id,
                "disbursement_id": result["id"],
                "grant_count": len(disbursements),
                "total_amount_cents": sum(d["amount"] for d in disbursements),
            },
        )

        return {
            "batchId": batch_id,
            "disbursementId": result["id"],
            "grantsQueued": len(disbursements),
            "totalAmount": sum(d["amount"] for d in disbursements) / 100,
        }

    except Exception as e:
        # Mark batch as failed
        batch.grantStatus = "failed"
        batch.grantError = str(e)
        await db.commit()

        logger.error(
            "Grant distribution failed",
            {"batch_id": batch_id},
            e,
        )
        raise


async def retry_failed_disbursements(db: AsyncSession) -> dict[str, Any]:
    """
    Retry failed disbursements.

    Finds batches with grantStatus = "failed" and attempts to redistribute.
    """
    result = await db.execute(
        select(DonationBatch).where(
            DonationBatch.grantStatus == "failed",
            DonationBatch.status == DonationBatchStatus.COMPLETED,
        )
    )
    failed_batches = list(result.scalars().all())

    results = []
    for batch in failed_batches:
        try:
            # Reset grant status
            batch.grantStatus = None
            batch.grantError = None
            batch.everyOrgDisbursementId = None
            await db.commit()

            # Retry distribution
            result = await distribute_batch_grants(db, batch.id)
            results.append({"batchId": batch.id, "result": result})
        except Exception as e:
            results.append({"batchId": batch.id, "error": str(e)})

    return {
        "retried": len(failed_batches),
        "results": results,
    }
