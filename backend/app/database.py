from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from typing import AsyncGenerator, Optional
import ssl

from app.config import settings

Base = declarative_base()

# Only create engine if DATABASE_URL is configured
engine: Optional[object] = None
AsyncSessionLocal: Optional[async_sessionmaker] = None

if settings.DATABASE_URL:
    # Configure SSL context for Railway PostgreSQL
    connect_args = {}
    if not settings.is_railway:
        # For external connections (public URL), use SSL
        ssl_context = ssl.create_default_context()
        ssl_context.check_hostname = False
        ssl_context.verify_mode = ssl.CERT_NONE
        connect_args["ssl"] = ssl_context

    engine = create_async_engine(
        settings.async_database_url,
        echo=settings.DEBUG,
        pool_size=5,
        max_overflow=10,
        connect_args=connect_args,
    )

    AsyncSessionLocal = async_sessionmaker(
        engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    if AsyncSessionLocal is None:
        raise RuntimeError("Database not configured - DATABASE_URL is empty")
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
