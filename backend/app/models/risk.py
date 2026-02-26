"""RiskScore model — tri-domain risk assessment output."""

from sqlalchemy import Column, Integer, Float, String, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.core.database import Base


class RiskScore(Base):
    __tablename__ = "risk_scores"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    scored_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Mental health
    mental_risk_level = Column(String(10), nullable=True)   # LOW / MEDIUM / HIGH
    mental_confidence = Column(Float, nullable=True)
    depression_risk = Column(String(10), nullable=True)
    anxiety_risk = Column(String(10), nullable=True)
    isolation_detected = Column(Boolean, default=False)
    postpartum_risk = Column(String(10), nullable=True)

    # Physical health
    physical_risk_level = Column(String(10), nullable=True)
    physical_confidence = Column(Float, nullable=True)
    diabetes_risk = Column(String(10), nullable=True)
    hypertension_risk = Column(String(10), nullable=True)
    anemia_risk = Column(String(10), nullable=True)
    infection_risk = Column(String(10), nullable=True)
    nutrition_risk = Column(String(10), nullable=True)

    # Fetal health
    fetal_risk_level = Column(String(10), nullable=True)
    fetal_confidence = Column(Float, nullable=True)
    preterm_risk = Column(String(10), nullable=True)
    low_birth_weight_risk = Column(String(10), nullable=True)
    growth_abnormality_risk = Column(String(10), nullable=True)
    missed_care_risk = Column(String(10), nullable=True)

    # Meta
    shap_features_json = Column(JSON, nullable=True)
    flagged_for_escalation = Column(Boolean, default=False)
    crisis_flag = Column(String(20), default="SAFE")  # SAFE / REVIEW_NEEDED / URGENT

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    user = relationship("User", back_populates="risk_scores")
