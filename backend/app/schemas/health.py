"""Health log schemas."""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from datetime import date, datetime


class HealthLogCreate(BaseModel):
    log_date: Optional[date] = None
    bp_systolic: Optional[int] = None
    bp_diastolic: Optional[int] = None
    blood_sugar_fasting: Optional[float] = None
    blood_sugar_postmeal: Optional[float] = None
    weight_kg: Optional[float] = None
    sleep_quality: Optional[int] = Field(None, ge=1, le=5)
    pain_score: int = 0
    pain_location: Optional[str] = None
    nausea_count: int = 0
    nausea_severity: int = 0
    dizziness: bool = False
    edema_flag: bool = False
    edema_location: Optional[str] = None
    bleeding_flag: bool = False
    bleeding_severity: Optional[str] = None
    cramps_flag: bool = False
    cramps_intensity: int = 0
    fetal_movement_count: Optional[int] = None
    appetite_score: Optional[int] = Field(None, ge=1, le=5)
    hydration_ml: Optional[int] = None
    pregnancy_week: Optional[int] = None
    notes: Optional[str] = None


class HealthLogResponse(BaseModel):
    id: int
    user_id: int
    log_date: date
    bp_systolic: Optional[int] = None
    bp_diastolic: Optional[int] = None
    blood_sugar_fasting: Optional[float] = None
    blood_sugar_postmeal: Optional[float] = None
    weight_kg: Optional[float] = None
    sleep_quality: Optional[int] = None
    pain_score: int = 0
    pain_location: Optional[str] = None
    nausea_count: int = 0
    edema_flag: bool = False
    bleeding_flag: bool = False
    cramps_flag: bool = False
    fetal_movement_count: Optional[int] = None
    appetite_score: Optional[int] = None
    hydration_ml: Optional[int] = None
    pregnancy_week: Optional[int] = None
    notes: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class HealthLogSummary(BaseModel):
    total_logs: int
    avg_bp_systolic: Optional[float] = None
    avg_bp_diastolic: Optional[float] = None
    avg_sleep_quality: Optional[float] = None
    weight_trend: List[Dict[str, object]] = []
    bp_trend: List[Dict[str, object]] = []
    sugar_trend: List[Dict[str, object]] = []
    symptom_flags: Dict[str, int] = {}
