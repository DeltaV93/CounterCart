"""Job trigger API endpoints."""

from fastapi import APIRouter, Depends, BackgroundTasks, HTTPException, Header
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db, AsyncSessionLocal
from app.config import settings
from app.schemas.jobs import (
    SyncPlaidItemRequest,
    HandlePlaidWebhookRequest,
    CompleteDonationRequest,
    RetryWebhooksRequest,
    JobResponse,
    ScheduledJobsResponse,
    ScheduledJobInfo,
    WebhookEventsResponse,
    WebhookEventInfo,
)
from app.jobs import sync_transactions, process_donations, webhooks
from app.models import WebhookEvent
from app.utils.logger import logger

router = APIRouter(prefix="/jobs", tags=["jobs"])


def verify_internal_token(x_internal_token: str = Header(...)):
    """Verify internal API token from Next.js."""
    if x_internal_token != settings.INTERNAL_API_TOKEN:
        raise HTTPException(status_code=401, detail="Invalid internal token")
    return x_internal_token


# ============ ON-DEMAND JOBS ============


@router.post("/sync-plaid-item", response_model=JobResponse)
async def trigger_sync_plaid_item(
    request: SyncPlaidItemRequest,
    background_tasks: BackgroundTasks,
    _: str = Depends(verify_internal_token),
):
    """Trigger transaction sync for a single Plaid item."""

    async def run_job():
        async with AsyncSessionLocal() as session:
            try:
                await sync_transactions.sync_plaid_item_transactions(
                    session, request.plaid_item_id
                )
            except Exception as e:
                logger.error("Sync job failed", {"plaid_item_id": request.plaid_item_id}, e)

    background_tasks.add_task(run_job)

    return JobResponse(
        status="queued",
        job="sync_plaid_item_transactions",
        details={"plaid_item_id": request.plaid_item_id},
    )


@router.post("/handle-plaid-webhook", response_model=JobResponse)
async def trigger_handle_plaid_webhook(
    request: HandlePlaidWebhookRequest,
    background_tasks: BackgroundTasks,
    _: str = Depends(verify_internal_token),
):
    """Handle Plaid webhook event asynchronously."""

    async def run_job():
        async with AsyncSessionLocal() as session:
            try:
                await webhooks.handle_plaid_webhook(session, request.webhook_event_id)
            except Exception as e:
                logger.error("Webhook job failed", {"event_id": request.webhook_event_id}, e)

    background_tasks.add_task(run_job)

    return JobResponse(
        status="queued",
        job="handle_plaid_webhook",
        details={"webhook_event_id": request.webhook_event_id},
    )


@router.post("/complete-donation", response_model=JobResponse)
async def trigger_complete_donation(
    request: CompleteDonationRequest,
    background_tasks: BackgroundTasks,
    _: str = Depends(verify_internal_token),
):
    """Mark donation completed from Every.org webhook."""

    async def run_job():
        async with AsyncSessionLocal() as session:
            try:
                await process_donations.complete_donation(
                    session,
                    request.donation_id,
                    request.batch_id,
                    request.user_id,
                    request.every_org_id,
                )
            except Exception as e:
                logger.error("Complete donation job failed", {"every_org_id": request.every_org_id}, e)

    background_tasks.add_task(run_job)

    return JobResponse(
        status="queued",
        job="complete_donation",
        details={"every_org_id": request.every_org_id},
    )


@router.post("/retry-failed-webhooks", response_model=JobResponse)
async def trigger_retry_failed_webhooks(
    request: RetryWebhooksRequest = RetryWebhooksRequest(),
    background_tasks: BackgroundTasks = None,
    _: str = Depends(verify_internal_token),
):
    """Retry failed webhook events."""

    async def run_job():
        async with AsyncSessionLocal() as session:
            try:
                await webhooks.retry_failed_webhooks(session, request.max_retries)
            except Exception as e:
                logger.error("Retry webhooks job failed", {}, e)

    background_tasks.add_task(run_job)

    return JobResponse(
        status="queued",
        job="retry_failed_webhooks",
        details={"max_retries": request.max_retries},
    )


# ============ MANUAL TRIGGER FOR SCHEDULED JOBS ============


@router.post("/daily-transaction-sync", response_model=JobResponse)
async def trigger_daily_sync(
    background_tasks: BackgroundTasks,
    _: str = Depends(verify_internal_token),
):
    """Manually trigger daily transaction sync."""

    async def run_job():
        async with AsyncSessionLocal() as session:
            try:
                await sync_transactions.daily_transaction_sync(session)
            except Exception as e:
                logger.error("Daily sync job failed", {}, e)

    background_tasks.add_task(run_job)

    return JobResponse(status="queued", job="daily_transaction_sync")


@router.post("/weekly-donation-processing", response_model=JobResponse)
async def trigger_weekly_donations(
    background_tasks: BackgroundTasks,
    _: str = Depends(verify_internal_token),
):
    """Manually trigger weekly donation processing."""

    async def run_job():
        async with AsyncSessionLocal() as session:
            try:
                await process_donations.weekly_donation_processing(session)
            except Exception as e:
                logger.error("Weekly donations job failed", {}, e)

    background_tasks.add_task(run_job)

    return JobResponse(status="queued", job="weekly_donation_processing")


@router.post("/reset-monthly-totals", response_model=JobResponse)
async def trigger_reset_totals(
    background_tasks: BackgroundTasks,
    _: str = Depends(verify_internal_token),
):
    """Manually trigger monthly totals reset."""

    async def run_job():
        async with AsyncSessionLocal() as session:
            try:
                await process_donations.reset_monthly_totals(session)
            except Exception as e:
                logger.error("Reset totals job failed", {}, e)

    background_tasks.add_task(run_job)

    return JobResponse(status="queued", job="reset_monthly_totals")


# ============ STATUS ENDPOINTS ============


@router.get("/scheduled", response_model=ScheduledJobsResponse)
async def get_scheduled_jobs(_: str = Depends(verify_internal_token)):
    """List all scheduled jobs and their next run times."""
    from app.main import scheduler

    jobs = []
    for job in scheduler.get_jobs():
        jobs.append(
            ScheduledJobInfo(
                id=job.id,
                name=job.name or job.id,
                next_run=job.next_run_time.isoformat() if job.next_run_time else None,
                trigger=str(job.trigger),
            )
        )
    return ScheduledJobsResponse(jobs=jobs)


@router.get("/webhook-events", response_model=WebhookEventsResponse)
async def get_recent_webhook_events(
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(verify_internal_token),
):
    """Get recent webhook events for monitoring."""
    result = await db.execute(
        select(WebhookEvent).order_by(WebhookEvent.createdAt.desc()).limit(limit)
    )
    events = result.scalars().all()

    return WebhookEventsResponse(
        events=[
            WebhookEventInfo(
                id=e.id,
                source=e.source,
                eventType=e.eventType,
                status=e.status.value,
                retryCount=e.retryCount,
                error=e.error,
                createdAt=e.createdAt.isoformat(),
            )
            for e in events
        ]
    )
