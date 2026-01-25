from sqlalchemy import Column, String, Enum, DateTime, Date, Numeric, ForeignKey, ARRAY
from sqlalchemy.orm import relationship
import enum

from app.database import Base


class TransactionStatus(enum.Enum):
    PENDING = "PENDING"
    MATCHED = "MATCHED"
    BATCHED = "BATCHED"
    DONATED = "DONATED"
    SKIPPED = "SKIPPED"
    FAILED = "FAILED"


class Transaction(Base):
    __tablename__ = "Transaction"

    id = Column(String, primary_key=True)
    userId = Column(String, ForeignKey("User.id", ondelete="CASCADE"), nullable=False)
    bankAccountId = Column(String, ForeignKey("BankAccount.id"), nullable=False)
    plaidTransactionId = Column(String, unique=True, nullable=False)
    merchantName = Column(String, nullable=False)
    merchantNameNorm = Column(String, nullable=False)  # Normalized for matching
    amount = Column(Numeric(10, 2), nullable=False)
    date = Column(Date, nullable=False)
    category = Column(ARRAY(String), default=[])
    matchedMappingId = Column(String, ForeignKey("BusinessMapping.id"), nullable=True)
    status = Column(Enum(TransactionStatus), default=TransactionStatus.PENDING)
    createdAt = Column(DateTime, nullable=False)

    user = relationship("User", back_populates="transactions")
    bank_account = relationship("BankAccount", back_populates="transactions")
    matched_mapping = relationship("BusinessMapping", back_populates="transactions")
    donation = relationship("Donation", back_populates="transaction", uselist=False)
