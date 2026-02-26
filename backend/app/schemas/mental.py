"""Mental health assessment schemas."""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from datetime import date, datetime


class MentalAssessmentCreate(BaseModel):
    assessment_date: Optional[date] = None
    phq9_score: Optional[int] = Field(None, ge=0, le=27)
    gad7_score: Optional[int] = Field(None, ge=0, le=21)
    mood_score: Optional[int] = Field(None, ge=1, le=10)
    mood_emoji: Optional[str] = None
    stress_level: Optional[int] = Field(None, ge=1, le=10)
    stress_reason: Optional[str] = None
    social_support_score: Optional[int] = Field(None, ge=1, le=5)
    assessment_type: str = "daily"
    epds_score: Optional[int] = None


class MentalAssessmentResponse(BaseModel):
    id: int
    user_id: int
    assessment_date: date
    phq9_score: Optional[int] = None
    gad7_score: Optional[int] = None
    mood_score: Optional[int] = None
    mood_emoji: Optional[str] = None
    stress_level: Optional[int] = None
    stress_reason: Optional[str] = None
    social_support_score: Optional[int] = None
    assessment_type: str
    epds_score: Optional[int] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class MoodTrendResponse(BaseModel):
    mood_trend: List[Dict[str, object]] = []
    average_mood: Optional[float] = None
    average_stress: Optional[float] = None
