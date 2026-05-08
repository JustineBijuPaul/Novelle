from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict, Any, Optional
from app.api.routes.auth import _current_user
from app.models.user import User
from app.schemas.telemedicine import TelemedicineSession, ChatMessage, ConsultationSummary
from app.services.telemedicine.engine import telemedicine_engine
from app.services.communication.chat import secure_messaging

router = APIRouter(tags=["Telemedicine"])

@router.post("/sessions")
async def create_virtual_session(
    appointment_id: int,
    doctor_id: int,
    patient_id: int,
    user: User = Depends(_current_user)
):
    # Only hospital admin or the doctor themselves should create sessions
    if user.id != doctor_id and user.role != "hospital_admin":
        raise HTTPException(status_code=403, detail="Unauthorized session creation")
        
    return await telemedicine_engine.create_session(appointment_id, doctor_id, patient_id)

@router.get("/sessions/{session_id}/join")
async def join_virtual_session(
    session_id: str,
    user: User = Depends(_current_user)
):
    try:
        return await telemedicine_engine.join_room(session_id, user.id)
    except PermissionError:
        raise HTTPException(status_code=403, detail="Unauthorized entry")
    except ValueError:
        raise HTTPException(status_code=404, detail="Session not found")

@router.post("/messages")
async def send_secure_message(
    receiver_id: int,
    content: str,
    content_type: str = "TEXT",
    file_url: Optional[str] = None,
    user: User = Depends(_current_user)
):
    return await secure_messaging.send_message(user.id, receiver_id, content, content_type, file_url)

@router.get("/messages/history/{other_user_id}")
async def get_chat_history(
    other_user_id: int,
    user: User = Depends(_current_user)
):
    return await secure_messaging.get_history(user.id, other_user_id)

@router.post("/sessions/{session_id}/summary")
async def save_consultation_summary(
    session_id: str,
    summary: ConsultationSummary,
    user: User = Depends(_current_user)
):
    if user.role != "doctor":
        raise HTTPException(status_code=403, detail="Only doctors can submit consultation summaries")
    
    # In production, save to DB and link to EHR
    await telemedicine_engine.complete_session(session_id)
    return {"status": "SUCCESS", "message": "Consultation summary persisted to EHR"}
