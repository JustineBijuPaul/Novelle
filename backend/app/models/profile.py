"""PregnancyProfile model — demographic and clinical baseline."""

from sqlalchemy import Column, Integer, Float, String, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.core.database import Base


class PregnancyProfile(Base):
    __tablename__ = "pregnancy_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    age = Column(Integer, nullable=False)
    height_cm = Column(Float, nullable=True)
    weight_kg = Column(Float, nullable=True)
    bmi = Column(Float, nullable=True)
    pregnancy_week = Column(Integer, default=1)
    trimester = Column(String(20), default="first")
    due_date = Column(DateTime, nullable=True)
    last_menstrual_period = Column(DateTime, nullable=True)
    blood_group = Column(String(10), nullable=True)
    previous_pregnancies = Column(Integer, default=0)
    pregnancy_history = Column(JSON, default=list)
    lifestyle_indicators = Column(JSON, default=list)
    hemoglobin_level = Column(Float, nullable=True)
    gestational_diabetes = Column(Boolean, default=False)
    thyroid_disorder = Column(String(30), default="none")
    past_complications = Column(JSON, default=list)
    chronic_hypertension = Column(Boolean, default=False)
    profile_completion_score = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    user = relationship("User", back_populates="profile")

    def compute_bmi(self):
        if self.height_cm and self.weight_kg and self.height_cm > 0:
            h_m = self.height_cm / 100
            self.bmi = round(self.weight_kg / (h_m * h_m), 1)

    def compute_trimester(self):
        if self.pregnancy_week:
            if self.pregnancy_week <= 12:
                self.trimester = "first"
            elif self.pregnancy_week <= 27:
                self.trimester = "second"
            elif self.pregnancy_week <= 42:
                self.trimester = "third"
            else:
                self.trimester = "postpartum"

    def compute_completion_score(self):
        fields = [
            self.age, self.height_cm, self.weight_kg, self.pregnancy_week,
            self.due_date, self.blood_group, self.hemoglobin_level,
        ]
        filled = sum(1 for f in fields if f is not None and f != 0)
        self.profile_completion_score = int((filled / len(fields)) * 100)
