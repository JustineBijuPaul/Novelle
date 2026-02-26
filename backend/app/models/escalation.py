"""Escalation model — clinical escalation tracking."""

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.core.database import Base


class Escalation(Base):
    __tablename__ = "escalations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    triggered_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    risk_type = Column(String(30), nullable=False)  # mental / physical / fetal
    risk_level = Column(String(10), nullable=False)  # LOW / MEDIUM / HIGH
    severity = Column(String(20), nullable=True)
    escalation_reason = Column(Text, nullable=True)
    assigned_doctor_id = Column(Integer, ForeignKey("doctors.id"), nullable=True)
    status = Column(String(30), default="pending")  # pending / acknowledged / resolved / expired
    doctor_notes = Column(Text, nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    user = relationship("User", back_populates="escalations", foreign_keys=[user_id])
