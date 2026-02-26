"""Mental health routes — assessments, mood trends, history."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from datetime import date, timedelta
from app.core.database import get_db
from app.models.user import User
from app.models.mental import MentalHealthAssessment
from app.schemas.mental import MentalAssessmentCreate, MentalAssessmentResponse, MoodTrendResponse
from app.api.routes.auth import _current_user

router = APIRouter(prefix="/mental", tags=["Mental Health"])


@router.post("/assessment", response_model=MentalAssessmentResponse, status_code=201)
@router.post("/", response_model=MentalAssessmentResponse, status_code=201)
async def submit_assessment(
    data: MentalAssessmentCreate,
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db),
):
    assessment_data = data.model_dump()
    if assessment_data.get("assessment_date") is None:
        assessment_data["assessment_date"] = date.today()

    assessment = MentalHealthAssessment(user_id=user.id, **assessment_data)
    db.add(assessment)
    await db.commit()
    await db.refresh(assessment)
    return MentalAssessmentResponse.model_validate(assessment)


@router.get("/history", response_model=list[MentalAssessmentResponse])
async def get_history(
    days: int = Query(30, ge=1, le=365),
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db),
):
    since = date.today() - timedelta(days=days)
    result = await db.execute(
        select(MentalHealthAssessment)
        .where(MentalHealthAssessment.user_id == user.id, MentalHealthAssessment.assessment_date >= since)
        .order_by(desc(MentalHealthAssessment.assessment_date))
    )
    return [MentalAssessmentResponse.model_validate(a) for a in result.scalars().all()]


@router.get("/latest", response_model=MentalAssessmentResponse)
async def get_latest(
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(MentalHealthAssessment)
        .where(MentalHealthAssessment.user_id == user.id)
        .order_by(desc(MentalHealthAssessment.created_at))
        .limit(1)
    )
    assessment = result.scalars().first()
    if not assessment:
        raise HTTPException(status_code=404, detail="No mental health assessment found")
    return MentalAssessmentResponse.model_validate(assessment)


@router.get("/mood-trend", response_model=MoodTrendResponse)
async def get_mood_trend(
    days: int = Query(14, ge=1, le=365),
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db),
):
    since = date.today() - timedelta(days=days)
    result = await db.execute(
        select(MentalHealthAssessment)
        .where(MentalHealthAssessment.user_id == user.id, MentalHealthAssessment.assessment_date >= since)
        .order_by(MentalHealthAssessment.assessment_date)
    )
    assessments = result.scalars().all()

    mood_trend = []
    mood_scores = []
    stress_scores = []

    for a in assessments:
        entry = {"date": str(a.assessment_date)}
        if a.mood_score is not None:
            entry["mood_score"] = a.mood_score
            mood_scores.append(a.mood_score)
        if a.stress_level is not None:
            entry["stress_level"] = a.stress_level
            stress_scores.append(a.stress_level)
        if a.mood_emoji:
            entry["mood_emoji"] = a.mood_emoji
        mood_trend.append(entry)

    return MoodTrendResponse(
        mood_trend=mood_trend,
        average_mood=round(sum(mood_scores) / len(mood_scores), 1) if mood_scores else None,
        average_stress=round(sum(stress_scores) / len(stress_scores), 1) if stress_scores else None,
    )
