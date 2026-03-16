"""User model — authentication and identity."""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum as SAEnum
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.core.database import Base
import enum


class UserRole(str, enum.Enum):
    pregnant_user = "pregnant_user"
    postpartum_user = "postpartum_user"
    doctor = "doctor"
    hospital_admin = "hospital_admin"
    platform_admin = "platform_admin"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    phone = Column(String(20), nullable=True)
    role = Column(SAEnum(UserRole, name="user_role", create_constraint=False), default=UserRole.pregnant_user, nullable=False)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    avatar_url = Column(String(512), nullable=True)
    city = Column(String(100), nullable=True)
    state = Column(String(100), nullable=True)
    country = Column(String(100), default="India")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    profile = relationship("PregnancyProfile", back_populates="user", uselist=False, lazy="selectin")
    health_logs = relationship("HealthLog", back_populates="user", lazy="dynamic")
    mental_assessments = relationship("MentalHealthAssessment", back_populates="user", lazy="dynamic")
    risk_scores = relationship("RiskScore", back_populates="user", lazy="dynamic")
    escalations = relationship("Escalation", back_populates="user", foreign_keys="Escalation.user_id", lazy="dynamic")
    reminders = relationship("Reminder", back_populates="user", lazy="dynamic")
