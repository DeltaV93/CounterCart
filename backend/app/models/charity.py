from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship

from app.database import Base


class Charity(Base):
    __tablename__ = "Charity"

    id = Column(String, primary_key=True)
    causeId = Column(String, ForeignKey("Cause.id"), nullable=False)
    everyOrgSlug = Column(String, unique=True, nullable=False)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    ein = Column(String, nullable=True)  # Tax ID
    logoUrl = Column(String, nullable=True)
    websiteUrl = Column(String, nullable=True)
    isDefault = Column(Boolean, default=False)
    isActive = Column(Boolean, default=True)
    createdAt = Column(DateTime, nullable=False)

    cause = relationship("Cause", back_populates="charities")
    donations = relationship("Donation", back_populates="charity")
