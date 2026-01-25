"""Health check endpoints."""

from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.jobs import HealthResponse

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
async def health_check(db: AsyncSession = Depends(get_db)):
    """Basic health check - verifies database connection and scheduler status."""
    # Check database
    try:
        await db.execute(text("SELECT 1"))
        db_status = "healthy"
    except Exception:
        db_status = "unhealthy"

    # Check scheduler (imported lazily to avoid circular imports)
    try:
        from app.main import scheduler
        scheduler_status = "running" if scheduler.running else "stopped"
    except Exception:
        scheduler_status = "unknown"

    overall = "healthy" if db_status == "healthy" else "unhealthy"

    return HealthResponse(
        status=overall,
        database=db_status,
        scheduler=scheduler_status,
        timestamp=datetime.now(timezone.utc).isoformat(),
    )


@router.get("/health/ready")
async def readiness_check(db: AsyncSession = Depends(get_db)):
    """Readiness probe for Railway/Kubernetes."""
    await db.execute(text("SELECT 1"))
    return {"ready": True}


@router.get("/health/live")
async def liveness_check():
    """Liveness probe - just confirms the app is running."""
    return {"alive": True}
