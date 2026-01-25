"""Plaid API client wrapper."""

import re
from plaid.api import plaid_api
from plaid.api_client import ApiClient
from plaid.configuration import Configuration
from plaid.model.transactions_sync_request import TransactionsSyncRequest
from plaid.model.transactions_sync_response import TransactionsSyncResponse

from app.config import settings

# Configure Plaid client
PLAID_ENVIRONMENTS = {
    "sandbox": "https://sandbox.plaid.com",
    "development": "https://development.plaid.com",
    "production": "https://production.plaid.com",
}

configuration = Configuration(
    host=PLAID_ENVIRONMENTS.get(settings.PLAID_ENV, PLAID_ENVIRONMENTS["sandbox"]),
    api_key={
        "clientId": settings.PLAID_CLIENT_ID,
        "secret": settings.PLAID_SECRET,
    },
)

api_client = ApiClient(configuration)
plaid_client = plaid_api.PlaidApi(api_client)


def normalize_merchant_name(name: str) -> str:
    """
    Normalize merchant name for matching.
    Matches the Next.js implementation.
    """
    # Convert to uppercase
    normalized = name.upper()
    # Remove special characters except spaces
    normalized = re.sub(r"[^A-Z0-9\s]", "", normalized)
    # Collapse multiple spaces
    normalized = re.sub(r"\s+", " ", normalized)
    # Trim
    return normalized.strip()


async def sync_transactions(
    access_token: str, cursor: str | None = None, count: int = 100
) -> TransactionsSyncResponse:
    """
    Sync transactions from Plaid.

    Returns the sync response with added, modified, removed transactions.
    """
    request = TransactionsSyncRequest(
        access_token=access_token,
        cursor=cursor,
        count=count,
    )
    return plaid_client.transactions_sync(request)
