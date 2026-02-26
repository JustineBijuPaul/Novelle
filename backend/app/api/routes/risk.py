"""Risk routes — full risk report, history, explain, escalation."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from datetime import datetime, timezone, timedelta, date
from app.core.database import get_db
from app.models.user import User
from app.models.risk import RiskScore
from app.models.escalation import Escalation
from app.schemas.risk import RiskScoreResponse, RiskDashboard
from app.schemas.features import EscalationCreate, EscalationResponse, EscalationResolve
from app.api.routes.auth import _current_user
from app.services.risk_engine import RiskEngine

router = APIRouter(tags=["Risk Assessment"])


# ── Full Risk Report ─────────────────────────────────
@router.get("/risk/full-report", response_model=RiskDashboard)
async def get_full_report(
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db),
):
    engine = RiskEngine(db, user)
    risk_score = await engine.compute_full_risk()

    # Get recent history
    result = await db.execute(
        select(RiskScore)
        .where(RiskScore.user_id == user.id)
        .order_by(desc(RiskScore.scored_at))
        .limit(10)
    )
    history = [RiskScoreResponse.model_validate(r) for r in result.scalars().all()]

    recommendations = engine.get_recommendations(risk_score)

    escalation_triggered = risk_score.flagged_for_escalation
    if escalation_triggered:
        await engine.trigger_escalation(risk_score)

    return RiskDashboard(
        latest_risk=RiskScoreResponse.model_validate(risk_score),
        risk_history=history,
        recommendations=recommendations,
        escalation_triggered=escalation_triggered,
    )


# ── Risk History ─────────────────────────────────────
@router.get("/risk/history", response_model=list[RiskScoreResponse])
async def get_risk_history(
    days: int = Query(30, ge=1, le=365),
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db),
):
    since = datetime.now(timezone.utc) - timedelta(days=days)
    result = await db.execute(
        select(RiskScore)
        .where(RiskScore.user_id == user.id, RiskScore.scored_at >= since)
        .order_by(desc(RiskScore.scored_at))
    )
    return [RiskScoreResponse.model_validate(r) for r in result.scalars().all()]


# ── Explain Risk ─────────────────────────────────────
@router.get("/risk/explain/{score_id}")
async def explain_risk(
    score_id: int,
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(RiskScore).where(RiskScore.id == score_id, RiskScore.user_id == user.id)
    )
    score = result.scalar_one_or_none()
    if not score:
        raise HTTPException(status_code=404, detail="Risk score not found")

    return {
        "score_id": score.id,
        "scored_at": str(score.scored_at),
        "mental": {
            "risk_level": score.mental_risk_level,
            "confidence": score.mental_confidence,
            "depression_risk": score.depression_risk,
            "anxiety_risk": score.anxiety_risk,
            "isolation_detected": score.isolation_detected,
        },
        "physical": {
            "risk_level": score.physical_risk_level,
            "confidence": score.physical_confidence,
            "diabetes_risk": score.diabetes_risk,
            "hypertension_risk": score.hypertension_risk,
            "anemia_risk": score.anemia_risk,
        },
        "fetal": {
            "risk_level": score.fetal_risk_level,
            "confidence": score.fetal_confidence,
            "preterm_risk": score.preterm_risk,
            "low_birth_weight_risk": score.low_birth_weight_risk,
            "growth_abnormality_risk": score.growth_abnormality_risk,
        },
        "shap_features": score.shap_features_json,
        "disclaimer": "⚠️ This is a risk likelihood estimate — not a medical diagnosis. Please consult your doctor.",
    }


# ── Escalation Routes ───────────────────────────────
@router.post("/escalation/trigger", response_model=EscalationResponse, status_code=201)
async def trigger_escalation(
    data: EscalationCreate,
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db),
):
    esc = Escalation(
        user_id=user.id,
        risk_type=data.risk_type,
        risk_level=data.risk_level,
        escalation_reason=data.escalation_reason,
        status="pending",
    )
    db.add(esc)
    await db.commit()
    await db.refresh(esc)
    return EscalationResponse.model_validate(esc)


@router.get("/escalation/my-escalations", response_model=list[EscalationResponse])
async def get_my_escalations(
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Escalation)
        .where(Escalation.user_id == user.id)
        .order_by(desc(Escalation.triggered_at))
    )
    return [EscalationResponse.model_validate(e) for e in result.scalars().all()]


@router.get("/escalation/list", response_model=list[EscalationResponse])
async def list_escalations(
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Escalation).order_by(desc(Escalation.triggered_at)).limit(50)
    )
    return [EscalationResponse.model_validate(e) for e in result.scalars().all()]


@router.put("/escalation/{escalation_id}/resolve", response_model=EscalationResponse)
async def resolve_escalation(
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
    if data.notes:
        esc.doctor_notes = data.notes
    if data.doctor_notes:
        esc.doctor_notes = data.doctor_notes
    if data.status in ("resolved", "closed"):
        esc.resolved_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(esc)
    return EscalationResponse.model_validate(esc)
