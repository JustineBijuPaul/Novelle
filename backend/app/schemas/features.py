"""Feature schemas — journal, companion, hospital, reminder, escalation."""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


# ── Journal ──────────────────────────────────────────
class JournalCreate(BaseModel):
    entry_date: Optional[str] = None
    title: Optional[str] = None
    content: Optional[str] = None
    text_content: Optional[str] = None
    mood: Optional[str] = None
    emotions: Optional[List[str]] = None
    emotion_tags: Optional[List[str]] = None
    tags: Optional[List[str]] = None


class JournalResponse(BaseModel):
    id: str
    user_id: int
    entry_date: str
    title: Optional[str] = None
    content: Optional[str] = None
    text_content: Optional[str] = None
    mood: Optional[str] = None
    emotions: Optional[List[str]] = None
    emotion_tags: Optional[List[str]] = None
    tags: Optional[List[str]] = None
    sentiment_score: Optional[float] = None
    sentiment_label: Optional[str] = None
    crisis_flag: Optional[str] = "SAFE"
    shared_with_doctor: bool = False
    created_at: str


class JournalShare(BaseModel):
    entry_id: str
    share: bool


# ── AI Companion ─────────────────────────────────────
class CompanionRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    context: Optional[Dict[str, Any]] = None


class CompanionResponse(BaseModel):
    response: str
    disclaimer: str = "⚠️ This system does not replace professional medical advice."
    sentiment: Optional[str] = None
    crisis_flag: Optional[str] = "SAFE"
    crisis_detected: bool = False
    suggested_action: Optional[str] = None


# ── Hospital ─────────────────────────────────────────
class HospitalResponse(BaseModel):
    id: int
    name: str
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    location_lat: Optional[float] = None
    location_lng: Optional[float] = None
    phone: Optional[str] = None
    has_obgyn: bool = False
    has_nicu: bool = False
    is_emergency_capable: bool = False
    emergency_available: Optional[bool] = None
    is_24x7: bool = False
    hospital_type: Optional[str] = None
    specialties: Optional[List[str]] = None
    rating: Optional[float] = None
    distance_km: Optional[float] = None

    model_config = {"from_attributes": True}


# ── Reminder ─────────────────────────────────────────
class ReminderCreate(BaseModel):
    reminder_type: str
    title: str
    description: Optional[str] = None
    scheduled_at: datetime
    recurring: bool = False
    recurrence_pattern: Optional[str] = None


class ReminderResponse(BaseModel):
    id: int
    user_id: int
    reminder_type: str
    title: str
    description: Optional[str] = None
    scheduled_at: datetime
    recurring: bool = False
    recurrence_pattern: Optional[str] = None
    is_active: bool = True
    is_completed: bool = False
    is_recurring: Optional[bool] = None
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Escalation ───────────────────────────────────────
class EscalationCreate(BaseModel):
    risk_type: str
    risk_level: str
    escalation_reason: str


class EscalationResponse(BaseModel):
    id: int
    user_id: int
    triggered_at: datetime
    risk_type: str
    risk_level: str
    severity: Optional[str] = None
    reason: Optional[str] = None
    escalation_reason: Optional[str] = None
    assigned_doctor_id: Optional[int] = None
    status: str
    doctor_notes: Optional[str] = None
    resolved_at: Optional[datetime] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class EscalationResolve(BaseModel):
    status: str
    notes: Optional[str] = None
    doctor_notes: Optional[str] = None
