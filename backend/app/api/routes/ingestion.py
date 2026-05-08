from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from typing import Dict, Any, List
from app.api.routes.auth import _current_user
from app.models.user import User
from app.schemas.ingestion import (
    BloodPressureLog, WeightLog, MentalHealthSurvey, 
    SymptomLog, SleepActivityLog, FetalMovementLog
)
from app.services.ingestion.processor import ingestion_processor

router = APIRouter()

@router.post("/blood-pressure")
async def ingest_blood_pressure(
    log: BloodPressureLog,
    user: User = Depends(_current_user)
):
    if log.user_id != user.id:
        raise HTTPException(status_code=403, detail="Unauthorized data ingestion")
    await ingestion_processor.enqueue_data(log.dict(), "blood_pressure")
    return {"status": "enqueued", "type": "blood_pressure"}

@router.post("/weight")
async def ingest_weight(
    log: WeightLog,
    user: User = Depends(_current_user)
):
    if log.user_id != user.id:
        raise HTTPException(status_code=403, detail="Unauthorized data ingestion")
    await ingestion_processor.enqueue_data(log.dict(), "weight")
    return {"status": "enqueued", "type": "weight"}

@router.post("/mental-health")
async def ingest_mental_health(
    log: MentalHealthSurvey,
    user: User = Depends(_current_user)
):
    if log.user_id != user.id:
        raise HTTPException(status_code=403, detail="Unauthorized data ingestion")
    await ingestion_processor.enqueue_data(log.dict(), "mental_health")
    return {"status": "enqueued", "type": "mental_health"}

@router.post("/symptoms")
async def ingest_symptoms(
    log: SymptomLog,
    user: User = Depends(_current_user)
):
    if log.user_id != user.id:
        raise HTTPException(status_code=403, detail="Unauthorized data ingestion")
    await ingestion_processor.enqueue_data(log.dict(), "symptoms")
    return {"status": "enqueued", "type": "symptoms"}

@router.post("/fetal-movement")
async def ingest_fetal_movement(
    log: FetalMovementLog,
    user: User = Depends(_current_user)
):
    if log.user_id != user.id:
        raise HTTPException(status_code=403, detail="Unauthorized data ingestion")
    await ingestion_processor.enqueue_data(log.dict(), "fetal_movement")
    return {"status": "enqueued", "type": "fetal_movement"}

@router.get("/queue-status")
async def get_ingestion_status(user: User = Depends(_current_user)):
    """Check the health and size of the ingestion queue."""
    if user.role != "platform_admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return {
        "queue_size": ingestion_processor.processing_queue.qsize(),
        "status": "healthy" if ingestion_processor.processing_queue.qsize() < 1000 else "congested"
    }
