"""Doctor routes — dashboard, patient summary, escalation management."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func
from datetime import datetime, timezone, timedelta
from app.core.database import get_db
from app.models.user import User
from app.models.escalation import Escalation
from app.models.risk import RiskScore
from app.models.health import HealthLog
from app.models.mental import MentalHealthAssessment
from app.models.profile import PregnancyProfile
from app.schemas.features import EscalationResponse, EscalationResolve
from app.api.routes.auth import _current_user

router = APIRouter(prefix="/doctor", tags=["Doctor Portal"])


@router.get("/dashboard")
async def get_dashboard(
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Get pending escalations
    result = await db.execute(
        select(Escalation)
        .where(Escalation.status.in_(["pending", "acknowledged"]))
        .order_by(desc(Escalation.triggered_at))
        .limit(20)
    )
    escalations = result.scalars().all()

    # Stats
    total_result = await db.execute(select(func.count(Escalation.id)))
    total = total_result.scalar() or 0

    pending_result = await db.execute(
        select(func.count(Escalation.id)).where(Escalation.status == "pending")
    )
    pending = pending_result.scalar() or 0

    resolved_result = await db.execute(
        select(func.count(Escalation.id)).where(Escalation.status == "resolved")
    )
    resolved = resolved_result.scalar() or 0

    return {
        "escalations": [EscalationResponse.model_validate(e) for e in escalations],
        "stats": {
            "total_escalations": total,
            "pending": pending,
            "resolved": resolved,
            "acknowledged": total - pending - resolved,
        },
    }


@router.get("/patient/{patient_id}/summary")
async def get_patient_summary(
    patient_id: int,
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Get patient profile
    prof_result = await db.execute(
        select(PregnancyProfile).where(PregnancyProfile.user_id == patient_id)
    )
    profile = prof_result.scalar_one_or_none()

    # Get recent health logs (7 days)
    from datetime import date as d
    since = d.today() - timedelta(days=7)
    logs_result = await db.execute(
        select(HealthLog)
        .where(HealthLog.user_id == patient_id, HealthLog.log_date >= since)
        .order_by(desc(HealthLog.log_date))
    )
    logs = logs_result.scalars().all()

    # Get latest risk score
    risk_result = await db.execute(
        select(RiskScore)
        .where(RiskScore.user_id == patient_id)
        .order_by(desc(RiskScore.scored_at))
        .limit(1)
    )
    risk = risk_result.scalars().first()

    # Get recent mental health
    mental_result = await db.execute(
        select(MentalHealthAssessment)
        .where(MentalHealthAssessment.user_id == patient_id)
        .order_by(desc(MentalHealthAssessment.assessment_date))
        .limit(7)
    )
    mental = mental_result.scalars().all()

    # Get escalation history
    esc_result = await db.execute(
        select(Escalation)
        .where(Escalation.user_id == patient_id)
        .order_by(desc(Escalation.triggered_at))
        .limit(10)
    )
    escalations = esc_result.scalars().all()

    return {
        "patient_id": patient_id,
        "profile": {
            "age": profile.age if profile else None,
            "pregnancy_week": profile.pregnancy_week if profile else None,
            "trimester": profile.trimester if profile else None,
            "bmi": profile.bmi if profile else None,
            "hemoglobin": profile.hemoglobin_level if profile else None,
            "gestational_diabetes": profile.gestational_diabetes if profile else None,
            "chronic_hypertension": profile.chronic_hypertension if profile else None,
            "past_complications": profile.past_complications if profile else [],
        } if profile else None,
        "recent_vitals": [
            {
                "date": str(l.log_date),
                "bp": f"{l.bp_systolic}/{l.bp_diastolic}" if l.bp_systolic else None,
                "sugar_fasting": l.blood_sugar_fasting,
                "weight": l.weight_kg,
                "fetal_movements": l.fetal_movement_count,
            }
            for l in logs
        ],
        "latest_risk": {
            "mental": risk.mental_risk_level,
            "physical": risk.physical_risk_level,
            "fetal": risk.fetal_risk_level,
            "crisis_flag": risk.crisis_flag,
            "scored_at": str(risk.scored_at),
        } if risk else None,
        "mental_health": [
            {
                "date": str(m.assessment_date),
                "phq9": m.phq9_score,
                "gad7": m.gad7_score,
                "mood": m.mood_score,
                "stress": m.stress_level,
            }
            for m in mental
        ],
        "escalations": [EscalationResponse.model_validate(e) for e in escalations],
    }


@router.put("/escalation/{escalation_id}", response_model=EscalationResponse)
async def update_escalation(
    escalation_id: int,
    data: EscalationResolve,
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Escalation).where(Escalation.id == escalation_id))
    esc = result.scalar_one_or_none()
    if not esc:
        raise HTTPException(status_code=404, detail="Escalation not found")

    esc.status = data.status
    if data.doctor_notes or data.notes:
        esc.doctor_notes = data.doctor_notes or data.notes
    if data.status == "resolved":
        esc.resolved_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(esc)
    return EscalationResponse.model_validate(esc)
