"""Pydantic schemas for job API requests/responses."""

from pydantic import BaseModel
from typing import Any


class SyncPlaidItemRequest(BaseModel):
    plaid_item_id: str


class HandlePlaidWebhookRequest(BaseModel):
    webhook_event_id: str


class CompleteDonationRequest(BaseModel):
    donation_id: str | None = None
    batch_id: str | None = None
    user_id: str | None = None
    every_org_id: str


class RetryWebhooksRequest(BaseModel):
    max_retries: int = 3


class JobResponse(BaseModel):
    status: str
    job: str
    details: dict[str, Any] | None = None


class HealthResponse(BaseModel):
    status: str
    database: str
    scheduler: str
    timestamp: str


class ScheduledJobInfo(BaseModel):
    id: str
    name: str
    next_run: str | None
    trigger: str


class ScheduledJobsResponse(BaseModel):
    jobs: list[ScheduledJobInfo]


class WebhookEventInfo(BaseModel):
    id: str
    source: str
    eventType: str
    status: str
    retryCount: int
    error: str | None
    createdAt: str


class WebhookEventsResponse(BaseModel):
    events: list[WebhookEventInfo]
