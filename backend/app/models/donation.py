from sqlalchemy import Column, String, Enum, Numeric, DateTime, ForeignKey
from sqlalchemy.orm import relationship
import enum

from app.database import Base


class DonationStatus(enum.Enum):
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    REFUNDED = "REFUNDED"


class Donation(Base):
    __tablename__ = "Donation"

    id = Column(String, primary_key=True)
    userId = Column(String, ForeignKey("User.id", ondelete="CASCADE"), nullable=False)
    batchId = Column(String, ForeignKey("DonationBatch.id"), nullable=True)
    transactionId = Column(String, ForeignKey("Transaction.id"), unique=True, nullable=True)
    charityId = Column(String, ForeignKey("Charity.id"), nullable=False)
    charitySlug = Column(String, nullable=False)
    charityName = Column(String, nullable=False)
    amount = Column(Numeric(10, 2), nullable=False)
    status = Column(Enum(DonationStatus), default=DonationStatus.PENDING)
    everyOrgId = Column(String, unique=True, nullable=True)
    receiptUrl = Column(String, nullable=True)
    errorMessage = Column(String, nullable=True)
    createdAt = Column(DateTime, nullable=False)
    completedAt = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="donations")
    batch = relationship("DonationBatch", back_populates="donations")
    transaction = relationship("Transaction", back_populates="donation")
    charity = relationship("Charity", back_populates="donations")
