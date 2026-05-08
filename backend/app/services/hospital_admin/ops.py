import logging
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, or_
from app.models.user import User
from app.models.doctor import Doctor
from app.models.escalation import Escalation
from app.models.risk import RiskScore

logger = logging.getLogger(__name__)

class HospitalOperationsService:
    """
    Enterprise Hospital Operations Service.
    Manages doctor assignments, escalation routing, and institutional compliance.
    """

    async def get_departmental_load(self, db: AsyncSession, hospital_id: int) -> List[Dict[str, Any]]:
        """Calculate real-time workload distribution across hospital departments."""
        # Query active escalations grouped by doctor specialty (department proxy)
        query = (
            select(Doctor.specialty, func.count(Escalation.id))
            .join(Escalation, Doctor.id == Escalation.assigned_doctor_id)
            .where(Doctor.hospital_id == hospital_id)
            .where(Escalation.status == "pending")
            .group_by(Doctor.specialty)
        )
        result = await db.execute(query)
        return [{"department": row[0], "active_escalations": row[1]} for row in result]

    async def get_doctor_workload_matrix(self, db: AsyncSession, hospital_id: int) -> List[Dict[str, Any]]:
        """Identify doctors with high workload for load balancing."""
        query = (
            select(Doctor.id, Doctor.name, Doctor.specialty, func.count(Escalation.id))
            .outerjoin(Escalation, Doctor.id == Escalation.assigned_doctor_id)
            .where(Doctor.hospital_id == hospital_id)
            .where(or_(Escalation.status == "pending", Escalation.status == None))
            .group_by(Doctor.id)
            .order_by(desc(func.count(Escalation.id)))
        )
        result = await db.execute(query)
        return [
            {
                "doctor_id": row[0],
                "name": row[1],
                "department": row[2],
                "case_count": row[3],
                "status": "OVERLOADED" if row[3] > 10 else "OPTIMAL" if row[3] > 0 else "AVAILABLE"
            }
            for row in result
        ]

    async def get_compliance_sla_report(self, db: AsyncSession, hospital_id: int) -> Dict[str, Any]:
        """Audit institutional response times against clinical SLA targets."""
        # Calculate average response time for resolved escalations
        query = (
            select(Escalation.triggered_at, Escalation.resolved_at)
            .join(User, Escalation.user_id == User.id)
            .where(User.hospital_id == hospital_id)
            .where(Escalation.status == "resolved")
        )
        result = await db.execute(query)
        durations = []
        for start, end in result:
            if end:
                durations.append((end - start).total_seconds() / 60) # minutes
        
        avg_wait = sum(durations) / len(durations) if durations else 0
        sla_target = 15 # minutes
        
        return {
            "avg_response_time_min": round(avg_wait, 1),
            "sla_compliance_rate": round((len([d for d in durations if d <= sla_target]) / len(durations)) * 100, 1) if durations else 100,
            "sla_target_min": sla_target,
            "status": "COMPLIANT" if avg_wait <= sla_target else "NON_COMPLIANT"
        }

    async def auto_route_escalation(self, db: AsyncSession, escalation: Escalation) -> Optional[int]:
        """Intelligent routing: Assign escalation to the most available doctor in the relevant department."""
        dept_mapping = {
            "PHYSICAL": ["OB-GYN", "Cardiology"],
            "MENTAL": ["Psychiatrist", "Mental Health Specialist"],
            "FETAL": ["Fetal Medicine Specialist", "OB-GYN"]
        }
        target_depts = dept_mapping.get(escalation.risk_type.upper(), ["OB-GYN"])
        
        # Find available doctor in department with lowest workload
        query = (
            select(Doctor.id)
            .where(Doctor.hospital_id == 1) # Simplified for demo
            .where(Doctor.specialty.in_(target_depts))
            .where(Doctor.available_for_escalation == True)
            .outerjoin(Escalation, Doctor.id == Escalation.assigned_doctor_id)
            .group_by(Doctor.id)
            .order_by(func.count(Escalation.id).asc())
            .limit(1)
        )
        result = await db.execute(query)
        doctor_id = result.scalar_one_or_none()
        
        if doctor_id:
            escalation.assigned_doctor_id = doctor_id
            await db.commit()
            return doctor_id
        return None

hospital_ops_service = HospitalOperationsService()
