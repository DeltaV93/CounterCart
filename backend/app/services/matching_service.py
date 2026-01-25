"""Transaction matching service."""

from decimal import Decimal
from datetime import datetime, timezone
from typing import Any
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from cuid2 import cuid_wrapper

from app.models import (
    Transaction,
    TransactionStatus,
    Donation,
    DonationStatus,
    BusinessMapping,
    UserCause,
    Charity,
    User,
)
from app.services.plaid_service import normalize_merchant_name
from app.utils.logger import logger

# CUID generator
generate_cuid = cuid_wrapper()

# Cache for business mappings (5 minute TTL)
_mappings_cache: dict[str, Any] | None = None
_cache_expires_at: float = 0
CACHE_TTL_SECONDS = 300  # 5 minutes


async def get_business_mappings(db: AsyncSession) -> list[BusinessMapping]:
    """Get active business mappings with caching."""
    global _mappings_cache, _cache_expires_at

    now = datetime.now(timezone.utc).timestamp()

    if _mappings_cache is not None and now < _cache_expires_at:
        return _mappings_cache["mappings"]

    result = await db.execute(
        select(BusinessMapping)
        .options(selectinload(BusinessMapping.cause))
        .where(BusinessMapping.isActive == True)
    )
    mappings = list(result.scalars().all())

    _mappings_cache = {"mappings": mappings}
    _cache_expires_at = now + CACHE_TTL_SECONDS

    return mappings


def invalidate_mappings_cache():
    """Invalidate the business mappings cache."""
    global _mappings_cache, _cache_expires_at
    _mappings_cache = None
    _cache_expires_at = 0


async def find_mapping(
    db: AsyncSession, merchant_name: str
) -> BusinessMapping | None:
    """Find a business mapping for a merchant name."""
    normalized = normalize_merchant_name(merchant_name)
    mappings = await get_business_mappings(db)

    for mapping in mappings:
        pattern = mapping.merchantPattern.upper()
        if pattern in normalized:
            return mapping

    return None


async def user_has_cause(db: AsyncSession, user_id: str, cause_id: str) -> bool:
    """Check if user has selected a cause."""
    result = await db.execute(
        select(UserCause).where(
            UserCause.userId == user_id, UserCause.causeId == cause_id
        )
    )
    return result.scalar_one_or_none() is not None


async def get_default_charity(db: AsyncSession, cause_id: str) -> Charity | None:
    """Get the default charity for a cause."""
    result = await db.execute(
        select(Charity).where(
            Charity.causeId == cause_id,
            Charity.isDefault == True,
            Charity.isActive == True,
        )
    )
    return result.scalar_one_or_none()


def calculate_donation_amount(transaction_amount: Decimal, multiplier: Decimal) -> Decimal:
    """
    Calculate donation amount based on round-up logic.

    Rounds transaction to next dollar, multiplies by user's multiplier.
    """
    # Round up to nearest dollar
    rounded_up = Decimal(str(int(transaction_amount) + 1))
    round_up_amount = rounded_up - transaction_amount

    # If already a round number, use $1
    if round_up_amount == 0:
        base_amount = Decimal("1.00")
    else:
        base_amount = round_up_amount

    # Apply multiplier
    return (base_amount * multiplier).quantize(Decimal("0.01"))


async def process_transaction(
    db: AsyncSession, user_id: str, transaction_id: str
) -> dict[str, Any]:
    """
    Process a transaction and create a donation if matched.

    Returns: {"matched": bool, "donation_id": str | None}
    """
    # Get the transaction
    result = await db.execute(
        select(Transaction).where(Transaction.id == transaction_id)
    )
    transaction = result.scalar_one_or_none()

    if not transaction:
        return {"matched": False}

    # Find matching business
    mapping = await find_mapping(db, transaction.merchantName)

    if not mapping:
        # Update transaction status to SKIPPED
        transaction.status = TransactionStatus.SKIPPED
        await db.flush()
        return {"matched": False}

    # Check if user cares about this cause
    if not await user_has_cause(db, user_id, mapping.causeId):
        transaction.status = TransactionStatus.SKIPPED
        transaction.matchedMappingId = mapping.id
        await db.flush()
        return {"matched": False}

    # Get user settings
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        return {"matched": False}

    # Calculate donation amount
    donation_amount = calculate_donation_amount(
        transaction.amount, user.donationMultiplier
    )

    # Check monthly limit
    if user.monthlyLimit:
        new_total = user.currentMonthTotal + donation_amount
        if new_total > user.monthlyLimit:
            transaction.status = TransactionStatus.SKIPPED
            transaction.matchedMappingId = mapping.id
            await db.flush()
            return {"matched": False}

    # Get default charity for cause
    charity = await get_default_charity(db, mapping.causeId)

    if not charity:
        logger.error("No default charity for cause", {"cause_id": mapping.causeId})
        return {"matched": False}

    # Update transaction
    transaction.status = TransactionStatus.MATCHED
    transaction.matchedMappingId = mapping.id

    # Create donation
    donation = Donation(
        id=generate_cuid(),
        userId=user_id,
        transactionId=transaction_id,
        charityId=charity.id,
        charitySlug=charity.everyOrgSlug,
        charityName=charity.name,
        amount=donation_amount,
        status=DonationStatus.PENDING,
        createdAt=datetime.now(timezone.utc),
    )
    db.add(donation)

    # Update user's current month total
    user.currentMonthTotal += donation_amount

    await db.flush()

    return {"matched": True, "donation_id": donation.id}
