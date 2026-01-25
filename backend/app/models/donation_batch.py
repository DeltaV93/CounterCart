from sqlalchemy import Column, String, Enum, Numeric, DateTime, Date, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
import enum

from app.database import Base


class DonationBatchStatus(enum.Enum):
    PENDING = "PENDING"
    READY = "READY"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class DonationBatch(Base):
    __tablename__ = "DonationBatch"

    id = Column(String, primary_key=True)
    userId = Column(String, ForeignKey("User.id", ondelete="CASCADE"), nullable=False)
    weekOf = Column(Date, nullable=False)  # Sunday of the week
    totalAmount = Column(Numeric(10, 2), nullable=False)
    status = Column(Enum(DonationBatchStatus), default=DonationBatchStatus.PENDING)
    processedAt = Column(DateTime, nullable=True)
    createdAt = Column(DateTime, nullable=False)
    updatedAt = Column(DateTime, nullable=False)

    user = relationship("User", back_populates="donation_batches")
    donations = relationship("Donation", back_populates="batch")

    __table_args__ = (
        UniqueConstraint("userId", "weekOf", name="DonationBatch_userId_weekOf_key"),
    )
