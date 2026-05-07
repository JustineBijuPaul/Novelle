"""Clinical schemas — notes, appointments, medications."""

from pydantic import BaseModel, Field
from typing import Optional, List, Any
from datetime import datetime, date


class ClinicalNoteCreate(BaseModel):
    note_type: str = "consultation"
    content: str = Field(..., min_length=1, max_length=2000)


class ClinicalNoteResponse(BaseModel):
    id: int
    patient_id: int
    doctor_id: int
    note_type: str
    content: str
    ai_summary: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class AppointmentCreate(BaseModel):
    appointment_date: datetime
    reason: Optional[str] = None
    appointment_type: str = "routine_checkup"
    telemedicine_link: Optional[str] = None


class AppointmentResponse(BaseModel):
    id: int
    patient_id: int
    doctor_id: int
    appointment_date: datetime
    reason: Optional[str] = None
    status: str
    appointment_type: str
    telemedicine_link: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class MedicationCreate(BaseModel):
    name: str
    dosage: Optional[str] = None
    frequency: Optional[str] = None
    instructions: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None


class MedicationResponse(BaseModel):
    id: int
    patient_id: int
    doctor_id: int
    name: str
    dosage: Optional[str] = None
    frequency: Optional[str] = None
    instructions: Optional[str] = None
    start_date: date
    end_date: Optional[date] = None
    is_active: bool
    adherence_data: Optional[Any] = None
    created_at: datetime

    model_config = {"from_attributes": True}
