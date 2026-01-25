"""FastAPI application entry point."""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from app.api import health, jobs
from app.database import AsyncSessionLocal
from app.jobs import sync_transactions, process_donations
from app.config import settings
from app.utils.logger import logger

# Global scheduler instance
scheduler = AsyncIOScheduler()


async def run_daily_transaction_sync():
    """Wrapper for daily transaction sync job."""
    logger.info("Starting scheduled daily transaction sync")
    async with AsyncSessionLocal() as session:
        try:
            result = await sync_transactions.daily_transaction_sync(session)
            logger.info("Scheduled daily transaction sync completed", result)
        except Exception as e:
            logger.error("Scheduled daily transaction sync failed", {}, e)


async def run_weekly_donation_processing():
    """Wrapper for weekly donation processing job."""
    logger.info("Starting scheduled weekly donation processing")
    async with AsyncSessionLocal() as session:
        try:
            result = await process_donations.weekly_donation_processing(session)
            logger.info("Scheduled weekly donation processing completed", result)
        except Exception as e:
            logger.error("Scheduled weekly donation processing failed", {}, e)


async def run_reset_monthly_totals():
    """Wrapper for monthly totals reset job."""
    logger.info("Starting scheduled monthly totals reset")
    async with AsyncSessionLocal() as session:
        try:
            result = await process_donations.reset_monthly_totals(session)
            logger.info("Scheduled monthly totals reset completed", result)
        except Exception as e:
            logger.error("Scheduled monthly totals reset failed", {}, e)


def configure_scheduler():
    """Configure all scheduled jobs."""
    # Daily transaction sync - 6 AM UTC
    scheduler.add_job(
        run_daily_transaction_sync,
        CronTrigger(hour=6, minute=0, timezone="UTC"),
        id="daily_transaction_sync",
        name="Daily Transaction Sync",
        replace_existing=True,
    )

    # Weekly donation processing - Sunday 8 PM UTC
    scheduler.add_job(
        run_weekly_donation_processing,
        CronTrigger(day_of_week="sun", hour=20, minute=0, timezone="UTC"),
        id="weekly_donation_processing",
        name="Weekly Donation Processing",
        replace_existing=True,
    )

    # Monthly totals reset - 1st of month at midnight UTC
    scheduler.add_job(
        run_reset_monthly_totals,
        CronTrigger(day=1, hour=0, minute=0, timezone="UTC"),
        id="reset_monthly_totals",
        name="Reset Monthly Totals",
        replace_existing=True,
    )

    logger.info(
        "Scheduler configured",
        {"jobs": [job.id for job in scheduler.get_jobs()]},
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle - start/stop scheduler."""
    logger.info(
        "Starting FastAPI application",
        {"environment": settings.ENVIRONMENT, "debug": settings.DEBUG},
    )

    configure_scheduler()
    scheduler.start()
    logger.info("Scheduler started")

    yield

    scheduler.shutdown(wait=True)
    logger.info("Scheduler shutdown")
    logger.info("FastAPI application shutdown")


app = FastAPI(
    title="CounterCart Background Jobs",
    description="Background job service for CounterCart",
    version="1.0.0",
    lifespan=lifespan,
)

# Include routers
app.include_router(health.router)
app.include_router(jobs.router)


@app.get("/")
async def root():
    """Root endpoint - redirect to docs or return info."""
    return {
        "service": "CounterCart Background Jobs",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health",
    }
