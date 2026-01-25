from sqlalchemy import Column, String, Boolean, Numeric, DateTime, ForeignKey
from sqlalchemy.orm import relationship

from app.database import Base


class BusinessMapping(Base):
    __tablename__ = "BusinessMapping"

    id = Column(String, primary_key=True)
    merchantPattern = Column(String, nullable=False)  # Pattern to match (case-insensitive)
    merchantName = Column(String, nullable=False)  # Human-readable display name
    causeId = Column(String, ForeignKey("Cause.id"), nullable=False)
    charitySlug = Column(String, nullable=False)  # Every.org charity slug
    charityName = Column(String, nullable=False)
    reason = Column(String, nullable=True)  # Why this business maps to this cause
    confidence = Column(Numeric(3, 2), default=1.0)
    source = Column(String, default="manual")  # manual | community | verified
    isActive = Column(Boolean, default=True)
    createdAt = Column(DateTime, nullable=False)
    updatedAt = Column(DateTime, nullable=False)

    cause = relationship("Cause", back_populates="business_mappings")
    transactions = relationship("Transaction", back_populates="matched_mapping")
