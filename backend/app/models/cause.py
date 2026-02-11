from sqlalchemy import Column, String, Boolean, DateTime
from sqlalchemy.orm import relationship

from app.database import Base


class Cause(Base):
    __tablename__ = "Cause"

    id = Column(String, primary_key=True)
    name = Column(String, unique=True, nullable=False)
    slug = Column(String, unique=True, nullable=False)
    description = Column(String, nullable=True)
    iconName = Column(String, nullable=True)  # Lucide icon name
    color = Column(String, nullable=True)  # Tailwind color class
    isActive = Column(Boolean, default=True)
    createdAt = Column(DateTime, nullable=False)

    user_causes = relationship("UserCause", back_populates="cause")
    business_mappings = relationship("BusinessMapping", back_populates="cause")
    charities = relationship("Charity", back_populates="cause")
    donations = relationship("Donation", back_populates="designatedCause")
