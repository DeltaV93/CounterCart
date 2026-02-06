from sqlalchemy import Column, String, Boolean, Numeric, DateTime
from sqlalchemy.orm import relationship
from app.database import Base


class User(Base):
    __tablename__ = "User"

    id = Column(String, primary_key=True)
    email = Column(String, unique=True, nullable=False)
    name = Column(String, nullable=True)
    stripeCustomerId = Column(String, unique=True, nullable=True)
    subscriptionTier = Column(String, default="free")
    subscriptionStatus = Column(String, nullable=True)
    donationMultiplier = Column(Numeric(3, 2), default=1.0)
    monthlyLimit = Column(Numeric(10, 2), nullable=True)
    currentMonthTotal = Column(Numeric(10, 2), default=0)
    autoDonateEnabled = Column(Boolean, default=False)
    onboardingComplete = Column(Boolean, default=False)
    createdAt = Column(DateTime, nullable=False)
    updatedAt = Column(DateTime, nullable=False)

    # Change API integration
    changeCustomerId = Column(String, unique=True, nullable=True)

    plaid_items = relationship("PlaidItem", back_populates="user")
    user_causes = relationship("UserCause", back_populates="user")
    transactions = relationship("Transaction", back_populates="user")
    donations = relationship("Donation", back_populates="user")
    donation_batches = relationship("DonationBatch", back_populates="user")
