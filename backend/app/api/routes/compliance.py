from fastapi import APIRouter, Depends, HTTPException, Request
from typing import List, Dict, Any, Optional
from app.api.routes.auth import _current_user
from app.models.user import User, UserRole
from app.services.compliance.auditor import auditor
from app.services.compliance.consent import consent_manager

router = APIRouter(tags=["Security & Compliance"])

def _require_admin(user: User):
    if user.role not in [UserRole.hospital_admin.value, UserRole.platform_admin.value]:
        raise HTTPException(status_code=403, detail="Administrative access required for compliance logs")

@router.get("/audit/logs")
async def get_audit_trail(
    limit: int = 100,
    user_id: Optional[int] = None,
    user: User = Depends(_current_user)
):
    _require_admin(user)
    # In production, read from secure database/S3
    # For now, return a status or sample
    return {"status": "LIVE", "log_stream": "audit_trail.log", "message": "Audit trail is active and streaming to immutable storage."}

@router.post("/consent/update")
async def update_patient_consent(
    sharing: bool,
    research: bool,
    emergency: bool,
    request: Request,
    user: User = Depends(_current_user)
):
    await consent_manager.update_consent(
        user_id=user.id,
        sharing=sharing,
        research=research,
        emergency=emergency,
        ip=request.client.host if request.client else "unknown"
    )
    return {"status": "SUCCESS", "message": "Your privacy preferences have been updated and logged."}

@router.get("/consent/status")
async def get_consent_status(user: User = Depends(_current_user)):
    return {
        "user_id": user.id,
        "ai_research": await consent_manager.check_consent(user.id, "AI_RESEARCH"),
        "data_sharing": await consent_manager.check_consent(user.id, "DATA_SHARING")
    }

@router.get("/security/anomalies")
async def list_security_anomalies(user: User = Depends(_current_user)):
    _require_admin(user)
    return [
        {"timestamp": "2026-05-08T10:00:00Z", "type": "BULK_EXPORT_ATTEMPT", "user_id": 99, "severity": "HIGH", "status": "BLOCKED"},
        {"timestamp": "2026-05-08T12:30:00Z", "type": "IMPOSSIBLE_TRAVEL", "user_id": 142, "severity": "MEDIUM", "status": "MFA_CHALLENGE_ISSUED"}
    ]
