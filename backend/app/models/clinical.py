"""Clinical models — notes, appointments, medications."""

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Date, JSON, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime, timezone, date
from app.core.database import Base


class ClinicalNote(Base):
    __tablename__ = "clinical_notes"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    doctor_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    note_type = Column(String(50), default="consultation") # consultation, diagnosis, follow-up
    content = Column(String(2000), nullable=False)
    ai_summary = Column(String(500), nullable=True)
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), onupdate=lambda: datetime.now(timezone.utc))

    patient = relationship("User", foreign_keys=[patient_id])
    doctor = relationship("User", foreign_keys=[doctor_id])


class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    doctor_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    appointment_date = Column(DateTime(timezone=True), nullable=False)
    reason = Column(String(255), nullable=True)
    status = Column(String(20), default="scheduled") # scheduled, completed, missed, cancelled
    appointment_type = Column(String(50), default="routine_checkup") # scan, blood_test, follow_up, video_call
    
    telemedicine_link = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class Medication(Base):
    __tablename__ = "medications"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    doctor_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    name = Column(String(255), nullable=False)
    dosage = Column(String(100), nullable=True)
    frequency = Column(String(100), nullable=True) # daily, twice_daily, etc
    instructions = Column(String(500), nullable=True)
    
    start_date = Column(Date, default=date.today)
    end_date = Column(Date, nullable=True)
    is_active = Column(Boolean, default=True)
    
    adherence_data = Column(JSON, nullable=True) # log of taken/missed
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
