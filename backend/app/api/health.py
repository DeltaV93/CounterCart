"""Health check endpoints."""

from datetime import datetime, timezone
from fastapi import APIRouter
from sqlalchemy import text

from app.database import AsyncSessionLocal
from app.config import settings

router = APIRouter(tags=["health"])


@router.get("/health")
async def health_check():
    """Basic health check - verifies database connection and scheduler status.

    Returns 200 OK even if DB is unhealthy so Railway health checks pass.
    The response body contains the actual status.
    """
    db_status = "unconfigured"
    scheduler_status = "unknown"

    # Check database only if configured
    if settings.DATABASE_URL:
        try:
            async with AsyncSessionLocal() as db:
                await db.execute(text("SELECT 1"))
                db_status = "healthy"
        except Exception as e:
            db_status = f"unhealthy: {str(e)[:100]}"

    # Check scheduler (imported lazily to avoid circular imports)
    try:
        from app.main import scheduler
        scheduler_status = "running" if scheduler.running else "stopped"
    except Exception:
        scheduler_status = "unknown"

    overall = "healthy" if db_status == "healthy" else "degraded"

    return {
        "status": overall,
        "database": db_status,
        "scheduler": scheduler_status,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/health/ready")
async def readiness_check():
    """Readiness probe for Railway/Kubernetes."""
    if not settings.DATABASE_URL:
        return {"ready": False, "reason": "DATABASE_URL not configured"}

    try:
        async with AsyncSessionLocal() as db:
            await db.execute(text("SELECT 1"))
        return {"ready": True}
    except Exception as e:
        return {"ready": False, "reason": str(e)[:100]}


@router.get("/health/live")
async def liveness_check():
    """Liveness probe - just confirms the app is running."""
    return {"alive": True}
