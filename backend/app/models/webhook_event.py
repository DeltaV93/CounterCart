from sqlalchemy import Column, String, Enum, Integer, DateTime, JSON, UniqueConstraint
import enum

from app.database import Base


class WebhookStatus(enum.Enum):
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class WebhookEvent(Base):
    __tablename__ = "WebhookEvent"

    id = Column(String, primary_key=True)
    source = Column(String, nullable=False)  # plaid | stripe | every_org
    eventType = Column(String, nullable=False)
    eventId = Column(String, nullable=True)  # External event ID for idempotency
    payload = Column(JSON, nullable=False)
    signature = Column(String, nullable=True)
    processedAt = Column(DateTime, nullable=True)
    status = Column(Enum(WebhookStatus), default=WebhookStatus.PENDING)
    error = Column(String, nullable=True)
    retryCount = Column(Integer, default=0)
    createdAt = Column(DateTime, nullable=False)

    __table_args__ = (
        UniqueConstraint("source", "eventId", name="WebhookEvent_source_eventId_key"),
    )
