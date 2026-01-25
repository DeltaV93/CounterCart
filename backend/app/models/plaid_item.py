from sqlalchemy import Column, String, Enum, DateTime, ForeignKey
from sqlalchemy.orm import relationship
import enum

from app.database import Base


class PlaidItemStatus(enum.Enum):
    ACTIVE = "ACTIVE"
    LOGIN_REQUIRED = "LOGIN_REQUIRED"
    ERROR = "ERROR"
    DISCONNECTED = "DISCONNECTED"


class PlaidItem(Base):
    __tablename__ = "PlaidItem"

    id = Column(String, primary_key=True)
    userId = Column(String, ForeignKey("User.id", ondelete="CASCADE"), nullable=False)
    accessToken = Column(String, nullable=False)  # Encrypted with AES-256-GCM
    itemId = Column(String, unique=True, nullable=False)
    institutionId = Column(String, nullable=False)
    institutionName = Column(String, nullable=False)
    cursor = Column(String, nullable=True)
    status = Column(Enum(PlaidItemStatus), default=PlaidItemStatus.ACTIVE)
    errorCode = Column(String, nullable=True)
    createdAt = Column(DateTime, nullable=False)
    updatedAt = Column(DateTime, nullable=False)

    user = relationship("User", back_populates="plaid_items")
    bank_accounts = relationship("BankAccount", back_populates="plaid_item")
