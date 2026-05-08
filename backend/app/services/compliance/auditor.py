import logging
import json
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional
from app.schemas.events import EventPriority # Reuse priority levels

logger = logging.getLogger("auditor")

class HIPAAAuditLogger:
    """
    Healthcare-Grade Audit Service.
    Generates immutable, non-repudiable records of all access to Protected Health Information (PHI).
    """

    def __init__(self):
        # In production, this would stream to a WORM (Write Once Read Many) storage like S3 Object Lock
        self.audit_log_path = "audit_trail.log"

    async def log_access(
        self,
        user_id: int,
        action: str, # READ, WRITE, DELETE, LOGIN, EXPORT
        resource_type: str, # e.g., "PATIENT_EHR", "RISK_SCORE"
        resource_id: str,
        status: str = "SUCCESS",
        metadata: Optional[Dict[str, Any]] = None
    ):
        """Create a forensic record of data access."""
        audit_entry = {
            "audit_id": str(uuid.uuid4()),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "user_id": user_id,
            "action": action,
            "resource_type": resource_type,
            "resource_id": resource_id,
            "status": status,
            "ip_address": "MOCKED_IP", # Would be extracted from request context
            "user_agent": "MOCKED_AGENT",
            "metadata": metadata or {}
        }
        
        # Log to secure stream
        logger.info(f"AUDIT_RECORD: {json.dumps(audit_entry)}")
        
        # For demo, append to a local "immutable" style log
        with open(self.audit_log_path, "a") as f:
            f.write(json.dumps(audit_entry) + "\n")

    async def log_security_anomaly(self, user_id: int, reason: str, severity: str = "HIGH"):
        """Log detected security anomalies (e.g., bulk exports or unauthorized access attempts)."""
        await self.log_access(
            user_id=user_id,
            action="SECURITY_ANOMALY",
            resource_type="SYSTEM",
            resource_id="SECURITY_ENGINE",
            status="ALERT",
            metadata={"reason": reason, "severity": severity}
        )

# Global Auditor Instance
auditor = HIPAAAuditLogger()
