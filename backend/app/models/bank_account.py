from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship

from app.database import Base


class BankAccount(Base):
    __tablename__ = "BankAccount"

    id = Column(String, primary_key=True)
    plaidItemId = Column(String, ForeignKey("PlaidItem.id", ondelete="CASCADE"), nullable=False)
    plaidAccountId = Column(String, unique=True, nullable=False)
    name = Column(String, nullable=False)
    officialName = Column(String, nullable=True)
    type = Column(String, nullable=False)  # checking, savings, credit
    subtype = Column(String, nullable=True)
    mask = Column(String, nullable=True)  # Last 4 digits
    isActive = Column(Boolean, default=True)
    createdAt = Column(DateTime, nullable=False)

    # ACH payment fields (for auto-donations via Stripe)
    stripePaymentMethodId = Column(String, nullable=True)
    achEnabled = Column(Boolean, default=False)
    achAuthorizedAt = Column(DateTime, nullable=True)

    plaid_item = relationship("PlaidItem", back_populates="bank_accounts")
    transactions = relationship("Transaction", back_populates="bank_account")
