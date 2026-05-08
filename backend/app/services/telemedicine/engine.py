import logging
import uuid
import secrets
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from app.schemas.telemedicine import TelemedicineSession, SessionStatus

logger = logging.getLogger(__name__)

class TelemedicineEngine:
    """
    HIPAA-Compliant Virtual Care Engine.
    Manages WebRTC session lifecycle, waiting rooms, and secure room orchestration.
    """

    def __init__(self):
        self.active_rooms: Dict[str, TelemedicineSession] = {}

    async def create_session(self, appointment_id: int, doctor_id: int, patient_id: int) -> TelemedicineSession:
        """Initialize a secure virtual consultation room linked to an appointment."""
        session_id = str(uuid.uuid4())
        # In production, this would integrate with a WebRTC provider (e.g., Daily, Jitsi, or Twilio Video)
        room_url = f"https://v.novelle.ai/rooms/{secrets.token_urlsafe(16)}"
        
        session = TelemedicineSession(
            id=session_id,
            appointment_id=appointment_id,
            doctor_id=doctor_id,
            patient_id=patient_id,
            room_url=room_url,
            status=SessionStatus.SCHEDULED,
            access_token=secrets.token_hex(32)
        )
        
        self.active_rooms[session_id] = session
        logger.info(f"Telemedicine session created: {session_id} for appointment {appointment_id}")
        return session

    async def join_room(self, session_id: str, user_id: int) -> Dict[str, Any]:
        """Manage entry into the consultation waiting room and session activation."""
        if session_id not in self.active_rooms:
            raise ValueError("Invalid session ID")
        
        session = self.active_rooms[session_id]
        
        # Verify user belongs to the session
        if user_id not in [session.doctor_id, session.patient_id]:
            raise PermissionError("User not authorized for this session")

        # Update status if first person joins
        if session.status == SessionStatus.SCHEDULED:
            session.status = SessionStatus.WAITING
        elif session.status == SessionStatus.WAITING and user_id == session.doctor_id:
            session.status = SessionStatus.ACTIVE
            session.started_at = datetime.now(timezone.utc)

        return {
            "room_url": session.room_url,
            "access_token": session.access_token,
            "status": session.status,
            "is_doctor": user_id == session.doctor_id
        }

    async def complete_session(self, session_id: str):
        """Finalize the consultation and mark for archival."""
        if session_id in self.active_rooms:
            session = self.active_rooms[session_id]
            session.status = SessionStatus.COMPLETED
            session.ended_at = datetime.now(timezone.utc)
            logger.info(f"Telemedicine session completed: {session_id}")

# Global Telemedicine Instance
telemedicine_engine = TelemedicineEngine()
