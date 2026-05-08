import logging
from datetime import datetime, timezone
from typing import Dict, List, Optional
from pydantic import BaseModel

logger = logging.getLogger(__name__)

class UserConsent(BaseModel):
    user_id: int
    data_sharing_approved: bool
    ai_research_approved: bool
    emergency_contact_sharing: bool
    consented_at: datetime
    ip_address: str

class ConsentManager:
    """
    Patient Consent & Autonomy Manager.
    Governs how patient data is used across the AI and hospital networks.
    """

    def __init__(self):
        self.consent_store: Dict[int, UserConsent] = {}

    async def update_consent(self, user_id: int, sharing: bool, research: bool, emergency: bool, ip: str):
        """Record or update patient consent preferences."""
        consent = UserConsent(
            user_id=user_id,
            data_sharing_approved=sharing,
            ai_research_approved=research,
            emergency_contact_sharing=emergency,
            consented_at=datetime.now(timezone.utc),
            ip_address=ip
        )
        self.consent_store[user_id] = consent
        logger.info(f"Consent updated for user {user_id}")
        
        # Log to Audit Trail
        from app.services.compliance.auditor import auditor
        await auditor.log_access(user_id, "UPDATE_CONSENT", "USER_CONSENT", str(user_id), metadata=consent.dict())

    async def check_consent(self, user_id: int, feature: str) -> bool:
        """Verify if a patient has granted consent for a specific platform feature."""
        consent = self.consent_store.get(user_id)
        if not consent:
            return False # Default to non-consent (Privacy First)
        
        if feature == "AI_RESEARCH":
            return consent.ai_research_approved
        if feature == "DATA_SHARING":
            return consent.data_sharing_approved
        
        return False

# Global Consent Manager
consent_manager = ConsentManager()
