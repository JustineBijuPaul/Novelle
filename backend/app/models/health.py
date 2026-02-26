"""HealthLog model — daily vitals and symptoms."""

from sqlalchemy import Column, Integer, Float, String, Boolean, DateTime, ForeignKey, Date
from sqlalchemy.orm import relationship
from datetime import datetime, timezone, date
from app.core.database import Base


class HealthLog(Base):
    __tablename__ = "health_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    log_date = Column(Date, default=date.today, nullable=False)

    # Vitals
    bp_systolic = Column(Integer, nullable=True)
    bp_diastolic = Column(Integer, nullable=True)
    blood_sugar_fasting = Column(Float, nullable=True)
    blood_sugar_postmeal = Column(Float, nullable=True)
    weight_kg = Column(Float, nullable=True)
    sleep_quality = Column(Integer, nullable=True)  # 1-5

    # Pain
    pain_score = Column(Integer, default=0)  # 0-10
    pain_location = Column(String(100), nullable=True)

    # Symptoms
    nausea_count = Column(Integer, default=0)
    nausea_severity = Column(Integer, default=0)
    dizziness = Column(Boolean, default=False)
    edema_flag = Column(Boolean, default=False)
    edema_location = Column(String(100), nullable=True)
    bleeding_flag = Column(Boolean, default=False)
    bleeding_severity = Column(String(20), nullable=True)  # light/moderate/heavy
    cramps_flag = Column(Boolean, default=False)
    cramps_intensity = Column(Integer, default=0)  # 0-10

    # Fetal
    fetal_movement_count = Column(Integer, nullable=True)

    # Lifestyle
    appetite_score = Column(Integer, nullable=True)  # 1-5
    hydration_ml = Column(Integer, nullable=True)
    pregnancy_week = Column(Integer, nullable=True)
    notes = Column(String(1000), nullable=True)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    user = relationship("User", back_populates="health_logs")
