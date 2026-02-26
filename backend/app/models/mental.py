"""MentalHealthAssessment model — PHQ-9, GAD-7, mood, stress."""

from sqlalchemy import Column, Integer, Float, String, DateTime, ForeignKey, Date
from sqlalchemy.orm import relationship
from datetime import datetime, timezone, date
from app.core.database import Base


class MentalHealthAssessment(Base):
    __tablename__ = "mental_health_assessments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    assessment_date = Column(Date, default=date.today, nullable=False)

    # Scores
    phq9_score = Column(Integer, nullable=True)   # 0-27
    gad7_score = Column(Integer, nullable=True)    # 0-21
    mood_score = Column(Integer, nullable=True)    # 1-10
    mood_emoji = Column(String(10), nullable=True)
    stress_level = Column(Integer, nullable=True)  # 1-10
    stress_reason = Column(String(500), nullable=True)
    social_support_score = Column(Integer, nullable=True)  # 1-5
    epds_score = Column(Integer, nullable=True)

    assessment_type = Column(String(30), default="daily")  # daily / weekly_phq9 / weekly_gad7 / epds

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    user = relationship("User", back_populates="mental_assessments")
