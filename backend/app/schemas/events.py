from pydantic import BaseModel, Field
from typing import Any, Dict, Optional
from datetime import datetime
from enum import Enum

class EventPriority(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

class ClinicalEvent(BaseModel):
    event_id: str
    event_type: str # e.g. "RISK_ALERT", "MISSED_MEDICATION", "EMERGENCY_ESCALATION"
    user_id: int
    priority: EventPriority
    payload: Dict[str, Any]
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    source: str # e.g. "AI_INFERENCE_ENGINE", "INGESTION_LAYER"

class NotificationPayload(BaseModel):
    event_id: str
    user_id: int
    channel: str # "SMS", "EMAIL", "PUSH", "IN_APP"
    title: str
    body: str
    deep_link: Optional[str] = None
    priority: EventPriority
