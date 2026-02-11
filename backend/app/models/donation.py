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
    everyOrgId = Column(String, unique=True, nullable=True)  # Every.org donation ID (manual donations)
    changeId = Column(String, unique=True, nullable=True)  # Change API donation ID (auto-donations)
    receiptUrl = Column(String, nullable=True)
    errorMessage = Column(String, nullable=True)
    createdAt = Column(DateTime, nullable=False)
    completedAt = Column(DateTime, nullable=True)

    # Fiscal sponsor tracking
    designatedCauseId = Column(String, ForeignKey("Cause.id"), nullable=True)
    fiscalSponsorName = Column(String, default="Tech by Choice", nullable=False)

    # Grant tracking (Every.org Partner API disbursement)
    grantStatus = Column(String, nullable=True)  # "pending" | "granted" | "failed"
    everyOrgGrantId = Column(String, nullable=True)  # Every.org grant reference for this donation
    grantedAt = Column(DateTime, nullable=True)  # When this donation was granted to charity

    user = relationship("User", back_populates="donations")
    batch = relationship("DonationBatch", back_populates="donations")
    transaction = relationship("Transaction", back_populates="donation")
    charity = relationship("Charity", back_populates="donations")
    designatedCause = relationship("Cause", back_populates="donations")
