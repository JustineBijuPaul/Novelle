from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict, Any
from app.api.routes.auth import _current_user
from app.models.user import User, UserRole
from app.schemas.mlops import ModelVersion, ModelStatus, ValidationMetrics, DriftReport
from app.services.mlops.registry import mlops_registry
from app.services.mlops.monitor import drift_monitor

router = APIRouter(tags=["MLOps Governance"])

def _require_platform_admin(user: User):
    if user.role != UserRole.platform_admin.value:
        raise HTTPException(status_code=403, detail="Platform Admin access required for AI Governance")

@router.get("/models")
async def list_model_registry(user: User = Depends(_current_user)):
    _require_platform_admin(user)
    return list(mlops_registry.registry.values())

@router.post("/models/register")
async def register_new_model(
    name: str, 
    artifact_path: str, 
    metrics: ValidationMetrics,
    user: User = Depends(_current_user)
):
    _require_platform_admin(user)
    return await mlops_registry.register_candidate(name, artifact_path, metrics, user.email)

@router.post("/models/{model_id}/promote")
async def promote_model_lifecycle(
    model_id: str,
    target_status: str, # "STAGING" or "PRODUCTION"
    user: User = Depends(_current_user)
):
    _require_platform_admin(user)
    try:
        if target_status == "STAGING":
            await mlops_registry.promote_to_staging(model_id)
        elif target_status == "PRODUCTION":
            await mlops_registry.promote_to_production(model_id, user.full_name)
        return {"status": "SUCCESS", "new_status": target_status}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/models/{model_name}/rollback")
async def trigger_emergency_rollback(
    model_name: str,
    user: User = Depends(_current_user)
):
    _require_platform_admin(user)
    try:
        await mlops_registry.rollback(model_name)
        return {"status": "SUCCESS", "message": f"Rollback completed for {model_name}"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/monitoring/drift/{model_name}")
async def get_model_drift_report(
    model_name: str,
    user: User = Depends(_current_user)
):
    _require_platform_admin(user)
    # In production, pass recent inference data
    return await drift_monitor.analyze_drift(model_name, [])
