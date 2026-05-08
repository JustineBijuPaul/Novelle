from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from enum import Enum

class SessionStatus(str, Enum):
    SCHEDULED = "SCHEDULED"
    WAITING = "WAITING"
    ACTIVE = "ACTIVE"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"

class TelemedicineSession(BaseModel):
    id: str
    appointment_id: int
    doctor_id: int
    patient_id: int
    room_url: str
    status: SessionStatus
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    access_token: str

class ChatMessage(BaseModel):
    id: str
    session_id: Optional[str] = None # For live consultation chat
    sender_id: int
    receiver_id: int
    content: str
    content_type: str = "TEXT" # TEXT, IMAGE, FILE
    file_url: Optional[str] = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_read: bool = False

class ConsultationSummary(BaseModel):
    session_id: str
    clinical_notes: str
    recommendations: List[str]
    follow_up_needed: bool
    follow_up_date: Optional[datetime] = None
