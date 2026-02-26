"""Health log routes — daily vitals logging, history, summary."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from datetime import date, timedelta
from app.core.database import get_db
from app.models.user import User
from app.models.health import HealthLog
from app.schemas.health import HealthLogCreate, HealthLogResponse, HealthLogSummary
from app.api.routes.auth import _current_user

router = APIRouter(prefix="/health", tags=["Health Logs"])


@router.post("/log", response_model=HealthLogResponse, status_code=201)
@router.post("/", response_model=HealthLogResponse, status_code=201)
async def create_health_log(
    data: HealthLogCreate,
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db),
):
    log_data = data.model_dump()
    if log_data.get("log_date") is None:
        log_data["log_date"] = date.today()

    log = HealthLog(user_id=user.id, **log_data)
    db.add(log)
    await db.commit()
    await db.refresh(log)
    return HealthLogResponse.model_validate(log)


@router.get("/history", response_model=list[HealthLogResponse])
async def get_history(
    days: int = Query(7, ge=1, le=365),
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db),
):
    since = date.today() - timedelta(days=days)
    result = await db.execute(
        select(HealthLog)
        .where(HealthLog.user_id == user.id, HealthLog.log_date >= since)
        .order_by(desc(HealthLog.log_date))
    )
    return [HealthLogResponse.model_validate(r) for r in result.scalars().all()]


@router.get("/today", response_model=HealthLogResponse)
async def get_today(
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(HealthLog)
        .where(HealthLog.user_id == user.id, HealthLog.log_date == date.today())
        .order_by(desc(HealthLog.created_at))
    )
    log = result.scalars().first()
    if not log:
        raise HTTPException(status_code=404, detail="No health log for today")
    return HealthLogResponse.model_validate(log)


@router.get("/summary", response_model=HealthLogSummary)
async def get_summary(
    days: int = Query(7, ge=1, le=365),
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db),
):
    since = date.today() - timedelta(days=days)
    result = await db.execute(
        select(HealthLog)
        .where(HealthLog.user_id == user.id, HealthLog.log_date >= since)
        .order_by(HealthLog.log_date)
    )
    logs = result.scalars().all()

    if not logs:
        return HealthLogSummary(total_logs=0)

    # Compute trends
    bp_vals = [(l.bp_systolic, l.bp_diastolic) for l in logs if l.bp_systolic]
    sleep_vals = [l.sleep_quality for l in logs if l.sleep_quality]

    weight_trend = [
        {"date": str(l.log_date), "weight": l.weight_kg}
        for l in logs if l.weight_kg
    ]
    bp_trend = [
        {"date": str(l.log_date), "systolic": l.bp_systolic, "diastolic": l.bp_diastolic}
        for l in logs if l.bp_systolic and l.bp_diastolic
    ]
    sugar_trend = [
        {"date": str(l.log_date), "fasting": l.blood_sugar_fasting or 0, "postmeal": l.blood_sugar_postmeal or 0}
        for l in logs if l.blood_sugar_fasting or l.blood_sugar_postmeal
    ]

    symptom_flags = {
        "edema": sum(1 for l in logs if l.edema_flag),
        "bleeding": sum(1 for l in logs if l.bleeding_flag),
        "cramps": sum(1 for l in logs if l.cramps_flag),
        "dizziness": sum(1 for l in logs if l.dizziness),
        "nausea": sum(1 for l in logs if l.nausea_count > 0),
    }

    return HealthLogSummary(
        total_logs=len(logs),
        avg_bp_systolic=round(sum(s for s, d in bp_vals) / len(bp_vals), 1) if bp_vals else None,
        avg_bp_diastolic=round(sum(d for s, d in bp_vals) / len(bp_vals), 1) if bp_vals else None,
        avg_sleep_quality=round(sum(sleep_vals) / len(sleep_vals), 1) if sleep_vals else None,
        weight_trend=weight_trend,
        bp_trend=bp_trend,
        sugar_trend=sugar_trend,
        symptom_flags=symptom_flags,
    )
