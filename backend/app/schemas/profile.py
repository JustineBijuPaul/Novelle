"""Pregnancy profile schemas."""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class ProfileCreate(BaseModel):
    age: int = Field(..., ge=13, le=55)
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    pregnancy_week: int = Field(1, ge=1, le=42)
    due_date: Optional[datetime] = None
    last_menstrual_period: Optional[datetime] = None
    blood_group: Optional[str] = None
    previous_pregnancies: int = 0
    pregnancy_history: List[str] = []
    lifestyle_indicators: List[str] = []
    hemoglobin_level: Optional[float] = None
    gestational_diabetes: bool = False
    thyroid_disorder: str = "none"
    past_complications: List[str] = []
    chronic_hypertension: bool = False


class ProfileUpdate(BaseModel):
    age: Optional[int] = None
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    pregnancy_week: Optional[int] = None
    due_date: Optional[datetime] = None
    last_menstrual_period: Optional[datetime] = None
    blood_group: Optional[str] = None
    previous_pregnancies: Optional[int] = None
    pregnancy_history: Optional[List[str]] = None
    lifestyle_indicators: Optional[List[str]] = None
    hemoglobin_level: Optional[float] = None
    gestational_diabetes: Optional[bool] = None
    thyroid_disorder: Optional[str] = None
    past_complications: Optional[List[str]] = None
    chronic_hypertension: Optional[bool] = None


class ProfileResponse(BaseModel):
    id: int
    user_id: int
    age: int
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    bmi: Optional[float] = None
    pregnancy_week: int
    trimester: str
    due_date: Optional[datetime] = None
    blood_group: Optional[str] = None
    previous_pregnancies: int
    pregnancy_history: List[str] = []
    lifestyle_indicators: List[str] = []
    hemoglobin_level: Optional[float] = None
    gestational_diabetes: bool
    thyroid_disorder: Optional[str] = None
    past_complications: List[str] = []
    chronic_hypertension: bool
    profile_completion_score: int
    created_at: datetime

    model_config = {"from_attributes": True}
