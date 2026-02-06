"""Change API service for automated donations."""

import httpx
from typing import Any
from app.config import settings
from app.utils.logger import logger


CHANGE_API_URL = "https://api.getchange.io/v1"


class ChangeApiError(Exception):
    """Error from Change API."""

    def __init__(self, message: str, status_code: int, response: dict | None = None):
        super().__init__(message)
        self.status_code = status_code
        self.response = response


class ChangeService:
    """Service for interacting with Change API."""

    def __init__(self):
        self.api_key = settings.CHANGE_API_KEY

    async def _request(
        self,
        method: str,
        endpoint: str,
        json_data: dict | None = None,
    ) -> dict[str, Any]:
        """Make a request to the Change API."""
        if not self.api_key:
            raise ChangeApiError("CHANGE_API_KEY is not configured", 500)

        url = f"{CHANGE_API_URL}{endpoint}"

        async with httpx.AsyncClient() as client:
            response = await client.request(
                method,
                url,
                json=json_data,
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
                timeout=30.0,
            )

            if not response.is_success:
                error_body = None
                try:
                    error_body = response.json()
                except Exception:
                    pass
                raise ChangeApiError(
                    error_body.get("message") if error_body else f"API error: {response.status_code}",
                    response.status_code,
                    error_body,
                )

            return response.json()

    async def search_nonprofit(self, query: str) -> list[dict[str, Any]]:
        """Search for nonprofits by name or EIN."""
        response = await self._request("GET", f"/nonprofits/search?q={query}")
        return response.get("nonprofits", [])

    async def get_nonprofit(self, nonprofit_id: str) -> dict[str, Any]:
        """Get a nonprofit by ID."""
        return await self._request("GET", f"/nonprofits/{nonprofit_id}")

    async def get_nonprofit_by_ein(self, ein: str) -> dict[str, Any] | None:
        """Get a nonprofit by EIN."""
        try:
            nonprofits = await self.search_nonprofit(ein)
            for np in nonprofits:
                if np.get("ein") == ein:
                    return np
            return None
        except ChangeApiError:
            return None

    async def create_donation(
        self,
        nonprofit_id: str,
        amount: int,  # in cents
        metadata: dict[str, str] | None = None,
    ) -> dict[str, Any]:
        """Create a donation to a nonprofit."""
        response = await self._request(
            "POST",
            "/donations",
            json_data={
                "nonprofit_id": nonprofit_id,
                "amount": amount,
                "metadata": metadata or {},
            },
        )

        logger.info(
            "Created Change donation",
            {
                "donation_id": response.get("id"),
                "nonprofit_id": nonprofit_id,
                "amount": amount,
            },
        )

        return response

    async def get_donation(self, donation_id: str) -> dict[str, Any]:
        """Get a donation by ID."""
        return await self._request("GET", f"/donations/{donation_id}")


# Singleton instance
change_service = ChangeService()
