from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str

    # Encryption
    ENCRYPTION_SECRET: str

    # Plaid
    PLAID_CLIENT_ID: str
    PLAID_SECRET: str
    PLAID_ENV: str = "sandbox"

    # Every.org
    EVERYORG_WEBHOOK_TOKEN: str = ""

    # Internal API
    INTERNAL_API_TOKEN: str

    # App
    APP_URL: str = "http://localhost:3000"

    # Logging
    LOG_LEVEL: str = "info"
    ENVIRONMENT: str = "development"

    @property
    def DEBUG(self) -> bool:
        return self.ENVIRONMENT == "development"

    @property
    def async_database_url(self) -> str:
        """Convert postgres:// to postgresql+asyncpg:// and add SSL params"""
        url = self.DATABASE_URL
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql+asyncpg://", 1)
        elif url.startswith("postgresql://"):
            url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
        return url

    @property
    def is_railway(self) -> bool:
        """Check if running on Railway (internal network)"""
        return ".railway.internal" in self.DATABASE_URL

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
