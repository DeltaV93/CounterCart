"""Transaction sync jobs."""

from datetime import datetime, timezone
from typing import Any
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from cuid2 import cuid_wrapper
from plaid.model.transaction import Transaction as PlaidTransaction
from plaid.model.removed_transaction import RemovedTransaction

from app.models import (
    PlaidItem,
    PlaidItemStatus,
    BankAccount,
    Transaction,
    TransactionStatus,
    Donation,
)
from app.services.encryption import decrypt
from app.services.plaid_service import sync_transactions, normalize_merchant_name
from app.services.matching_service import process_transaction
from app.utils.logger import logger

generate_cuid = cuid_wrapper()


async def sync_plaid_item_transactions(
    db: AsyncSession, plaid_item_id: str
) -> dict[str, Any]:
    """
    Sync transactions for a single Plaid item.

    Returns stats: {success, stats: {added, modified, removed, matched}}
    """
    # Get PlaidItem with bank accounts
    result = await db.execute(
        select(PlaidItem)
        .options(selectinload(PlaidItem.bank_accounts))
        .where(PlaidItem.id == plaid_item_id)
    )
    plaid_item = result.scalar_one_or_none()

    if not plaid_item:
        raise ValueError(f"PlaidItem not found: {plaid_item_id}")

    if plaid_item.status != PlaidItemStatus.ACTIVE:
        return {"skipped": True, "reason": f"Item status is {plaid_item.status.value}"}

    # Decrypt access token
    access_token = decrypt(plaid_item.accessToken)

    stats = {"added": 0, "modified": 0, "removed": 0, "matched": 0}
    cursor = plaid_item.cursor
    has_more = True

    while has_more:
        # Call Plaid API
        response = sync_transactions(access_token, cursor, count=100)

        # Process added transactions
        for txn in response.added:
            created = await _process_added_transaction(
                db, plaid_item.userId, plaid_item.id, txn
            )
            if created:
                stats["added"] += 1
                # Try to match the transaction
                match_result = await process_transaction(
                    db, plaid_item.userId, created.id
                )
                if match_result.get("matched"):
                    stats["matched"] += 1

        # Process modified transactions
        for txn in response.modified:
            if await _process_modified_transaction(db, txn):
                stats["modified"] += 1

        # Process removed transactions
        for txn in response.removed:
            if await _process_removed_transaction(db, txn):
                stats["removed"] += 1

        cursor = response.next_cursor
        has_more = response.has_more

    # Update cursor
    plaid_item.cursor = cursor
    plaid_item.updatedAt = datetime.now(timezone.utc)
    await db.commit()

    logger.info(
        "Transaction sync completed",
        {"plaid_item_id": plaid_item_id, "stats": stats},
    )

    return {"success": True, "stats": stats}


async def _process_added_transaction(
    db: AsyncSession,
    user_id: str,
    plaid_item_id: str,
    txn: PlaidTransaction,
) -> Transaction | None:
    """Process an added transaction from Plaid."""
    # Skip pending transactions
    if txn.pending:
        return None

    # Check if already exists
    result = await db.execute(
        select(Transaction).where(
            Transaction.plaidTransactionId == txn.transaction_id
        )
    )
    if result.scalar_one_or_none():
        return None

    # Find bank account
    result = await db.execute(
        select(BankAccount).where(
            BankAccount.plaidAccountId == txn.account_id,
            BankAccount.plaidItemId == plaid_item_id,
        )
    )
    bank_account = result.scalar_one_or_none()

    if not bank_account:
        logger.error(
            "Bank account not found",
            {"plaid_account_id": txn.account_id, "plaid_item_id": plaid_item_id},
        )
        return None

    # Create transaction
    merchant_name = txn.merchant_name or txn.name
    transaction = Transaction(
        id=generate_cuid(),
        userId=user_id,
        bankAccountId=bank_account.id,
        plaidTransactionId=txn.transaction_id,
        merchantName=merchant_name,
        merchantNameNorm=normalize_merchant_name(merchant_name),
        amount=abs(txn.amount),  # Plaid returns negative for expenses
        date=txn.date,
        category=txn.category or [],
        status=TransactionStatus.PENDING,
        createdAt=datetime.now(timezone.utc),
    )
    db.add(transaction)
    await db.flush()

    return transaction


async def _process_modified_transaction(
    db: AsyncSession, txn: PlaidTransaction
) -> bool:
    """Process a modified transaction from Plaid."""
    result = await db.execute(
        select(Transaction).where(
            Transaction.plaidTransactionId == txn.transaction_id
        )
    )
    transaction = result.scalar_one_or_none()

    if not transaction:
        return False

    merchant_name = txn.merchant_name or txn.name
    transaction.merchantName = merchant_name
    transaction.merchantNameNorm = normalize_merchant_name(merchant_name)
    transaction.amount = abs(txn.amount)
    transaction.date = txn.date
    transaction.category = txn.category or []

    await db.flush()
    return True


async def _process_removed_transaction(
    db: AsyncSession, txn: RemovedTransaction
) -> bool:
    """Process a removed transaction from Plaid."""
    if not txn.transaction_id:
        return False

    result = await db.execute(
        select(Transaction).where(
            Transaction.plaidTransactionId == txn.transaction_id
        )
    )
    transaction = result.scalar_one_or_none()

    if not transaction:
        return False

    # Delete associated donation if exists
    result = await db.execute(
        select(Donation).where(Donation.transactionId == transaction.id)
    )
    donation = result.scalar_one_or_none()
    if donation:
        await db.delete(donation)

    # Delete transaction
    await db.delete(transaction)
    await db.flush()

    return True


async def daily_transaction_sync(db: AsyncSession) -> dict[str, Any]:
    """
    Daily sync for all active Plaid items.
    Runs at 6 AM UTC.
    """
    logger.info("Starting daily transaction sync")

    result = await db.execute(
        select(PlaidItem.id, PlaidItem.userId).where(
            PlaidItem.status == PlaidItemStatus.ACTIVE
        )
    )
    active_items = result.all()

    results = []
    errors = []

    for item_id, user_id in active_items:
        try:
            sync_result = await sync_plaid_item_transactions(db, item_id)
            results.append({"itemId": item_id, "result": sync_result})
        except Exception as e:
            logger.error("Failed to sync item", {"item_id": item_id}, e)
            errors.append({"itemId": item_id, "error": str(e)})

    summary = {
        "totalItems": len(active_items),
        "successful": len(results),
        "failed": len(errors),
        "errors": errors,
    }

    logger.info("Daily transaction sync completed", summary)
    return summary
