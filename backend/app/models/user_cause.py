from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship

from app.database import Base


class UserCause(Base):
    __tablename__ = "UserCause"

    id = Column(String, primary_key=True)
    userId = Column(String, ForeignKey("User.id", ondelete="CASCADE"), nullable=False)
    causeId = Column(String, ForeignKey("Cause.id", ondelete="CASCADE"), nullable=False)
    priority = Column(Integer, default=1)
    createdAt = Column(DateTime, nullable=False)

    user = relationship("User", back_populates="user_causes")
    cause = relationship("Cause", back_populates="user_causes")

    __table_args__ = (
        UniqueConstraint("userId", "causeId", name="UserCause_userId_causeId_key"),
    )
