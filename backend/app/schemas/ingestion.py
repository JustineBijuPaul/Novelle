from pydantic import BaseModel, Field, validator
from typing import List, Optional, Dict, Any
from datetime import datetime

class IngestionBase(BaseModel):
    user_id: int
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    device_id: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

class BloodPressureLog(IngestionBase):
    systolic: float = Field(..., gt=0, lt=300)
    diastolic: float = Field(..., gt=0, lt=200)
    pulse: Optional[float] = Field(None, gt=0, lt=250)

class WeightLog(IngestionBase):
    weight_kg: float = Field(..., gt=20, lt=300)
    unit: str = "kg"

class MentalHealthSurvey(IngestionBase):
    survey_type: str = "PHQ-9"
    responses: Dict[str, int]
    total_score: int
    mood_rating: int = Field(..., ge=1, le=10)

class SymptomLog(IngestionBase):
    symptoms: List[str]
    severity: Dict[str, int] # symptom_name -> 1-5 scale
    notes: Optional[str] = None

class SleepActivityLog(IngestionBase):
    sleep_hours: float = Field(..., ge=0, le=24)
    steps: Optional[int] = Field(None, ge=0)
    active_minutes: Optional[int] = Field(None, ge=0)

class FetalMovementLog(IngestionBase):
    kick_count: int = Field(..., ge=0)
    duration_minutes: int = Field(..., gt=0)

class IngestionBatch(BaseModel):
    batch_id: str
    logs: List[Dict[str, Any]]
    source: str = "mobile_app"
