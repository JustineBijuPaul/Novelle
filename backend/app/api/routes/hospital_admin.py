"""Hospital Admin routes — operational stats and management."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from datetime import datetime, timezone, timedelta
from uuid import uuid4
from app.core.database import get_db, get_mongo_db
from app.models.user import User, UserRole
from app.models.hospital import Hospital
from app.models.doctor import Doctor
from app.models.profile import PregnancyProfile
from app.models.risk import RiskScore
from app.models.clinical import Appointment, ClinicalNote
from app.models.escalation import Escalation
from app.models.resource import HospitalResource
from app.models.communication import HospitalAnnouncement, InternalMessage
from app.api.routes.auth import _current_user
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from app.services.hospital_admin.ops import hospital_ops_service

router = APIRouter(tags=["Hospital Admin"])

def _require_hospital_admin(user: User):
    role_val = user.role.value if isinstance(user.role, UserRole) else user.role
    if role_val not in [UserRole.hospital_admin.value, UserRole.platform_admin.value]:
        raise HTTPException(status_code=403, detail="Hospital Admin access required")
    if role_val == UserRole.hospital_admin.value and not user.hospital_id:
        raise HTTPException(status_code=400, detail="Hospital admin not assigned to a hospital")


def _doctor_identity_ids(doctor: Doctor) -> list[int]:
    ids = [doctor.id]
    if doctor.user_id:
        ids.append(doctor.user_id)
    return list(dict.fromkeys(ids))


def _normalize_appointment_type(raw_type: Optional[str]) -> str:
    if not raw_type:
        return "IN_PERSON"
    normalized = raw_type.strip().upper()
    aliases = {
        "INPERSON": "IN_PERSON",
        "IN-PERSON": "IN_PERSON",
        "VIDEO": "TELEMEDICINE",
        "VIDEO_CALL": "TELEMEDICINE",
        "VIRTUAL": "TELEMEDICINE",
    }
    return aliases.get(normalized, normalized)


class HospitalAppointmentRequest(BaseModel):
    patient_id: int
    doctor_id: int
    appointment_date: datetime
    reason: Optional[str] = None
    appointment_type: Optional[str] = "IN_PERSON"
    telemedicine_link: Optional[str] = None

@router.get("/staff")
async def list_hospital_staff(
    role: Optional[str] = None,
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_hospital_admin(user)
    h_id = user.hospital_id or 1
    
    query = select(Doctor).where(Doctor.hospital_id == h_id)
    if role:
        query = query.where(Doctor.specialty == role)
        
    result = await db.execute(query)
    doctors = result.scalars().all()
    
    now = datetime.now(timezone.utc)
    thirty_days_ago = now - timedelta(days=30)

    staff_list = []
    for d in doctors:
        doctor_ids = _doctor_identity_ids(d)
        appt_count = (await db.execute(
            select(func.count(Appointment.id))
            .where(Appointment.doctor_id.in_(doctor_ids))
            .where(Appointment.appointment_date >= thirty_days_ago)
        )).scalar() or 0

        note_count = (await db.execute(
            select(func.count(ClinicalNote.id))
            .where(ClinicalNote.doctor_id.in_(doctor_ids))
            .where(ClinicalNote.created_at >= thirty_days_ago)
        )).scalar() or 0

        completed = (await db.execute(
            select(func.count(Appointment.id))
            .where(Appointment.doctor_id.in_(doctor_ids))
            .where(Appointment.status == "completed")
            .where(Appointment.appointment_date >= thirty_days_ago)
        )).scalar() or 0
        performance = round((completed / appt_count) * 100) if appt_count > 0 else 100

        staff_list.append({
            "id": d.id,
            "user_id": d.user_id,
            "appointment_doctor_id": d.user_id or d.id,
            "name": d.name,
            "email": d.email,
            "specialty": d.specialty,
            "license": d.license_number,
            "status": "Active" if d.available_for_escalation else "Offline",
            "workload": appt_count + note_count,
            "performance": performance,
            "department": d.specialty or "General"
        })

    return staff_list

@router.post("/staff")
async def add_staff(
    data: dict,
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_hospital_admin(user)
    h_id = user.hospital_id or 1
    
    doctor = Doctor(
        name=data.get("name"),
        email=data.get("email"),
        specialty=data.get("specialty"),
        license_number=data.get("license"),
        hospital_id=h_id,
        available_for_escalation=True
    )
    db.add(doctor)
    await db.commit()
    await db.refresh(doctor)
    return doctor

@router.delete("/staff/{staff_id}")
async def remove_staff(
    staff_id: int,
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_hospital_admin(user)
    result = await db.execute(select(Doctor).where(Doctor.id == staff_id))
    doctor = result.scalar_one_or_none()
    if not doctor:
        raise HTTPException(status_code=404, detail="Staff not found")
    await db.delete(doctor)
    await db.commit()
    return {"status": "removed"}

@router.get("/patients")
async def list_hospital_patients(
    risk: Optional[str] = None,
    trimester: Optional[str] = None,
    search: Optional[str] = None,
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_hospital_admin(user)
    h_id = user.hospital_id or 1
    
    query = select(User).where(
        User.role.in_([UserRole.pregnant_user.value, UserRole.postpartum_user.value]),
        User.hospital_id == h_id
    )
    mongo = get_mongo_db()
    assignments: Dict[int, int] = {}
    if mongo is not None:
        try:
            cursor = mongo.patient_assignments.find(
                {"hospital_id": h_id},
                {"_id": 0, "patient_id": 1, "doctor_id": 1},
            )
            async for doc in cursor:
                p_id = doc.get("patient_id")
                d_id = doc.get("doctor_id")
                if isinstance(p_id, int) and isinstance(d_id, int):
                    assignments[p_id] = d_id
        except Exception:
            assignments = {}

    if search:
        query = query.where(User.full_name.ilike(f"%{search}%") | User.email.ilike(f"%{search}%"))
        
    result = await db.execute(query)
    users = result.scalars().all()
    
    patient_list = []
    for u in users:
        # Get latest risk score
        risk_res = await db.execute(
            select(RiskScore).where(RiskScore.user_id == u.id).order_by(desc(RiskScore.scored_at)).limit(1)
        )
        risk_score = risk_res.scalar_one_or_none()
        
        trimester_value = (u.profile.trimester if u.profile else None) or "N/A"
        risk_level = risk_score.physical_risk_level if risk_score else "LOW"

        mapped_trimester = {
            "first": "first",
            "1st trimester": "first",
            "second": "second",
            "2nd trimester": "second",
            "third": "third",
            "3rd trimester": "third",
            "postpartum": "postpartum",
        }
        normalized_trimester = mapped_trimester.get(str(trimester_value).strip().lower(), str(trimester_value).strip().lower())

        if risk and risk_level != risk.upper():
            continue
        if trimester and normalized_trimester != trimester.strip().lower():
            continue

        patient_list.append({
            "id": u.id,
            "full_name": u.full_name,
            "email": u.email,
            "phone": u.phone,
            "trimester": trimester_value,
            "risk_level": risk_level,
            "last_active": u.updated_at.isoformat() if u.updated_at else None,
            "doctor_id": assignments.get(u.id),
        })
        
    return patient_list

@router.post("/patients")
async def add_hospital_patient(
    data: dict,
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_hospital_admin(user)
    # Check if exists
    res = await db.execute(select(User).where(User.email == data.get("email")))
    if res.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")
        
    new_user = User(
        email=data.get("email"),
        full_name=data.get("full_name"),
        phone=data.get("phone"),
        role=UserRole.pregnant_user.value,
        password_hash="$2b$12$RPND8FgOZbx.57x5JEIhsOT3RJjWNKtSO99JfWyC95/FyVQNT8qGa",
        is_active=True,
        is_verified=True,
        hospital_id=user.hospital_id or 1
    )
    db.add(new_user)
    await db.flush()
    
    # Create profile
    profile = PregnancyProfile(
        user_id=new_user.id,
        trimester=data.get("trimester", "first"),
        pregnancy_week=12 if data.get("trimester") == "first" else 24
    )
    db.add(profile)
    await db.commit()
    return {"status": "success", "id": new_user.id}

@router.post("/patients/{patient_id}/assign-doctor")
async def assign_doctor(
    patient_id: int,
    data: dict,
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_hospital_admin(user)
    doctor_id = data.get("doctor_id")
    if not isinstance(doctor_id, int):
        raise HTTPException(status_code=400, detail="doctor_id is required")

    patient = (await db.execute(select(User).where(User.id == patient_id))).scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    if user.hospital_id and patient.hospital_id and user.hospital_id != patient.hospital_id:
        raise HTTPException(status_code=400, detail="Patient is not in your hospital")

    doctor_profile = (await db.execute(
        select(Doctor).where((Doctor.id == doctor_id) | (Doctor.user_id == doctor_id))
    )).scalar_one_or_none()
    if not doctor_profile:
        raise HTTPException(status_code=404, detail="Doctor not found")
    if user.hospital_id and doctor_profile.hospital_id and user.hospital_id != doctor_profile.hospital_id:
        raise HTTPException(status_code=400, detail="Doctor is not in your hospital")

    assignment_doctor_id = doctor_profile.user_id or doctor_profile.id
    mongo = get_mongo_db()
    if mongo is None:
        raise HTTPException(status_code=503, detail="Assignment service unavailable")
    try:
        await mongo.patient_assignments.update_one(
            {"hospital_id": user.hospital_id or 1, "patient_id": patient_id},
            {
                "$set": {
                    "doctor_id": assignment_doctor_id,
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }
            },
            upsert=True,
        )
    except Exception:
        raise HTTPException(status_code=503, detail="Assignment service unavailable")

    return {"status": "success", "patient_id": patient_id, "doctor_id": assignment_doctor_id}

@router.get("/appointments")
async def list_hospital_appointments(
    status: Optional[str] = None,
    type: Optional[str] = None,
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_hospital_admin(user)
    
    # Filter appointments by patients belonging to this hospital
    query = select(Appointment, User.full_name.label("patient_name"), User.email.label("patient_email"))\
        .join(User, Appointment.patient_id == User.id)\
        .where(User.hospital_id == user.hospital_id)
    
    if status:
        query = query.where(Appointment.status == status)
    if type:
        query = query.where(Appointment.appointment_type == type)
        
    result = await db.execute(query.order_by(Appointment.appointment_date))
    rows = result.all()

    doctor_fk_ids = {row[0].doctor_id for row in rows if row[0].doctor_id}
    doctor_user_names = {}
    if doctor_fk_ids:
        user_rows = await db.execute(
            select(User.id, User.full_name, User.role).where(User.id.in_(doctor_fk_ids))
        )
        for u_id, u_name, role in user_rows.all():
            role_value = role.value if isinstance(role, UserRole) else role
            if role_value == UserRole.doctor.value:
                doctor_user_names[u_id] = u_name

    unresolved_doctor_ids = doctor_fk_ids - set(doctor_user_names.keys())
    doctor_profiles = {}
    if unresolved_doctor_ids:
        profile_rows = await db.execute(
            select(Doctor.id, Doctor.user_id, Doctor.name).where(
                (Doctor.id.in_(unresolved_doctor_ids)) | (Doctor.user_id.in_(unresolved_doctor_ids))
            )
        )
        for d_id, d_user_id, d_name in profile_rows.all():
            if d_id in unresolved_doctor_ids:
                doctor_profiles[d_id] = d_name
            if d_user_id in unresolved_doctor_ids:
                doctor_profiles[d_user_id] = d_name

    appointments = []
    for row in rows:
        appo, p_name, p_email = row
        appointment_date = appo.appointment_date.isoformat() if appo.appointment_date else None
        doctor_name = doctor_user_names.get(appo.doctor_id) or doctor_profiles.get(appo.doctor_id) or "Unknown Doctor"
        appointments.append({
            "id": appo.id,
            "patient_id": appo.patient_id,
            "patient_name": p_name,
            "patient_email": p_email,
            "doctor_id": appo.doctor_id,
            "doctor_name": doctor_name,
            "appointment_date": appointment_date,
            "date": appointment_date,
            "reason": appo.reason,
            "appointment_type": appo.appointment_type,
            "type": appo.appointment_type,
            "status": appo.status,
            "telemedicine_link": appo.telemedicine_link
        })
    return appointments

@router.post("/appointments")
async def schedule_hospital_appointment(
    payload: HospitalAppointmentRequest,
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_hospital_admin(user)

    patient = (await db.execute(select(User).where(User.id == payload.patient_id))).scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    if user.hospital_id and patient.hospital_id and patient.hospital_id != user.hospital_id:
        raise HTTPException(status_code=400, detail="Patient is not in your hospital")

    doctor_profile = (await db.execute(select(Doctor).where(Doctor.id == payload.doctor_id))).scalar_one_or_none()
    if not doctor_profile:
        doctor_profile = (await db.execute(select(Doctor).where(Doctor.user_id == payload.doctor_id))).scalar_one_or_none()
    if not doctor_profile or not doctor_profile.user_id:
        raise HTTPException(status_code=404, detail="Doctor not found")

    doctor_user = (await db.execute(select(User).where(User.id == doctor_profile.user_id))).scalar_one_or_none()
    if not doctor_user:
        raise HTTPException(status_code=400, detail="Doctor user account is missing")
    if user.hospital_id and doctor_user.hospital_id and doctor_user.hospital_id != user.hospital_id:
        raise HTTPException(status_code=400, detail="Doctor is not in your hospital")

    appointment_date = payload.appointment_date
    if appointment_date.tzinfo is None:
        appointment_date = appointment_date.replace(tzinfo=timezone.utc)

    new_appo = Appointment(
        patient_id=payload.patient_id,
        doctor_id=doctor_profile.user_id,
        appointment_date=appointment_date,
        reason=payload.reason,
        appointment_type=_normalize_appointment_type(payload.appointment_type),
        telemedicine_link=payload.telemedicine_link
    )
    db.add(new_appo)
    await db.commit()
    return {"status": "scheduled", "id": new_appo.id}

@router.get("/escalations")
async def list_hospital_escalations(
    status: Optional[str] = None,
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_hospital_admin(user)
    
    # Filter escalations by patients in this hospital
    query = select(Escalation, User.full_name.label("patient_name"))\
        .join(User, Escalation.user_id == User.id)\
        .where(User.hospital_id == user.hospital_id)
        
    if status:
        query = query.where(Escalation.status == status)
        
    result = await db.execute(query.order_by(desc(Escalation.triggered_at)))
    escalations = []
    for row in result:
        esc, p_name = row
        escalations.append({
            "id": esc.id,
            "patient_name": p_name,
            "risk_type": esc.risk_type,
            "risk_level": esc.risk_level,
            "reason": esc.escalation_reason,
            "status": esc.status,
            "triggered_at": esc.triggered_at.isoformat(),
            "assigned_doctor_id": esc.assigned_doctor_id
        })
    return escalations

@router.patch("/escalations/{escalation_id}")
async def update_hospital_escalation(
    escalation_id: int,
    data: dict,
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_hospital_admin(user)
    result = await db.execute(select(Escalation).where(Escalation.id == escalation_id))
    esc = result.scalar_one_or_none()
    if not esc:
        raise HTTPException(status_code=404, detail="Escalation not found")
        
    if "status" in data:
        esc.status = data["status"]
        if data["status"] == "resolved":
            esc.resolved_at = datetime.now(timezone.utc)
    if "assigned_doctor_id" in data:
        esc.assigned_doctor_id = data["assigned_doctor_id"]
        
    await db.commit()
    return {"status": "updated"}

@router.get("/resources")
async def list_hospital_resources(
    category: Optional[str] = None,
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_hospital_admin(user)
    h_id = user.hospital_id or 1
    
    query = select(HospitalResource).where(HospitalResource.hospital_id == h_id)
    if category:
        query = query.where(HospitalResource.category == category)
        
    result = await db.execute(query)
    resources = result.scalars().all()
    return [
        {
            "id": r.id,
            "category": r.category,
            "name": r.name,
            "total": r.total_quantity or 0,
            "available": r.available_quantity or 0,
            "unit": r.unit,
            "status": "OPERATIONAL" if (r.available_quantity or 0) > 0 else "CRITICAL"
        }
        for r in resources
    ]

@router.patch("/resources/{resource_id}")
async def update_resource(
    resource_id: int,
    data: dict,
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_hospital_admin(user)
    result = await db.execute(select(HospitalResource).where(HospitalResource.id == resource_id))
    res = result.scalar_one_or_none()
    if not res:
        raise HTTPException(status_code=404, detail="Resource not found")
        
    if "available_quantity" in data:
        res.available_quantity = data["available_quantity"]
    if "total_quantity" in data:
        res.total_quantity = data["total_quantity"]
        
    await db.commit()
    return {"status": "updated"}

@router.get("/announcements")
async def list_announcements(
    category: Optional[str] = None,
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_hospital_admin(user)
    h_id = user.hospital_id or 1
    query = select(HospitalAnnouncement).where(HospitalAnnouncement.hospital_id == h_id)
    if category:
        query = query.where(HospitalAnnouncement.category == category)
    
    result = await db.execute(query.order_by(desc(HospitalAnnouncement.created_at)))
    return result.scalars().all()

@router.post("/announcements")
async def create_announcement(
    data: dict,
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_hospital_admin(user)
    ann = HospitalAnnouncement(
        hospital_id=user.hospital_id,
        sender_id=user.id,
        title=data["title"],
        content=data["content"],
        category=data.get("category", "GENERAL")
    )
    db.add(ann)
    await db.commit()
    return ann

@router.get("/messages")
async def list_messages(
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db),
):
    h_id = user.hospital_id or 1
    query = select(InternalMessage).where(InternalMessage.hospital_id == h_id)
    query = query.order_by(desc(InternalMessage.created_at))
    
    result = await db.execute(query)
    return result.scalars().all()

@router.get("/stats")
async def get_hospital_stats(
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_hospital_admin(user)
    h_id = user.hospital_id
    
    # If platform admin, they might want to see global or a specific hospital (default to 1 for demo)
    if not h_id:
        h_id = 1

    total_patients = (await db.execute(
        select(func.count(User.id)).where(
            User.role.in_([UserRole.pregnant_user.value, UserRole.postpartum_user.value])
        ).where(User.hospital_id == h_id)
    )).scalar() or 0
    
    high_risk_patients = (await db.execute(
        select(func.count(RiskScore.id))
        .join(User, RiskScore.user_id == User.id)
        .where(RiskScore.physical_risk_level == "HIGH")
        .where(User.hospital_id == h_id)
    )).scalar() or 0
    
    total_doctors = (await db.execute(
        select(func.count(Doctor.id)).where(Doctor.hospital_id == h_id)
    )).scalar() or 0
    
    pending_escalations = (await db.execute(
        select(func.count(Escalation.id))
        .join(User, Escalation.user_id == User.id)
        .where(Escalation.status == "pending")
        .where(User.hospital_id == h_id)
    )).scalar() or 0
    
    return {
        "total_patients": total_patients,
        "high_risk": high_risk_patients,
        "doctors_online": total_doctors,
        "pending_escalations": pending_escalations,
        "hospital_id": h_id
    }

@router.get("/analytics/risk-trends")
async def get_risk_trends(
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_hospital_admin(user)
    # Real data for charts - Group by day for last 7 days
    trends = []
    for i in range(6, -1, -1):
        day = (datetime.now(timezone.utc) - timedelta(days=i)).date()
        
        high = (await db.execute(
            select(func.count(RiskScore.id))
            .where(func.date(RiskScore.scored_at) == day)
            .where(RiskScore.physical_risk_level == "HIGH")
        )).scalar() or 0
        
        med = (await db.execute(
            select(func.count(RiskScore.id))
            .where(func.date(RiskScore.scored_at) == day)
            .where(RiskScore.physical_risk_level == "MEDIUM")
        )).scalar() or 0
        
        low = (await db.execute(
            select(func.count(RiskScore.id))
            .where(func.date(RiskScore.scored_at) == day)
            .where(RiskScore.physical_risk_level == "LOW")
        )).scalar() or 0
        
        trends.append({
            "name": day.strftime("%a"),
            "high": high,
            "medium": med,
            "low": low
        })
    return trends

@router.get("/analytics/department-load")
async def get_dept_load(
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_hospital_admin(user)
    h_id = user.hospital_id or 1
    result = await db.execute(
        select(Doctor.specialty, func.count(Doctor.id))
        .where(Doctor.hospital_id == h_id)
        .group_by(Doctor.specialty)
    )
    data = result.all()
    
    colors = ["#ec4899", "#8b5cf6", "#3b82f6", "#ef4444", "#10b981", "#f59e0b"]
    return [
        {"name": row[0], "count": row[1], "color": colors[i % len(colors)]}
        for i, row in enumerate(data)
    ]

@router.get("/analytics/maternal-health")
async def get_maternal_health_stats(
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_hospital_admin(user)
    # Real trimester distribution
    t1 = (await db.execute(select(func.count(PregnancyProfile.id)).where(PregnancyProfile.trimester == "1st Trimester"))).scalar() or 0
    t2 = (await db.execute(select(func.count(PregnancyProfile.id)).where(PregnancyProfile.trimester == "2nd Trimester"))).scalar() or 0
    t3 = (await db.execute(select(func.count(PregnancyProfile.id)).where(PregnancyProfile.trimester == "3rd Trimester"))).scalar() or 0
    
    now = datetime.now(timezone.utc)
    h_id = user.hospital_id or 1

    due_passed = (await db.execute(
        select(func.count(PregnancyProfile.id))
        .join(User, PregnancyProfile.user_id == User.id)
        .where(User.hospital_id == h_id)
        .where(PregnancyProfile.due_date != None)
        .where(PregnancyProfile.due_date < now)
    )).scalar() or 0

    due_upcoming = (await db.execute(
        select(func.count(PregnancyProfile.id))
        .join(User, PregnancyProfile.user_id == User.id)
        .where(User.hospital_id == h_id)
        .where(PregnancyProfile.due_date != None)
        .where(PregnancyProfile.due_date >= now)
    )).scalar() or 0

    total_profiles = due_passed + due_upcoming or 1
    avg_week = (await db.execute(
        select(func.avg(PregnancyProfile.pregnancy_week))
        .join(User, PregnancyProfile.user_id == User.id)
        .where(User.hospital_id == h_id)
    )).scalar() or 0

    return {
        "trimester_distribution": [
            {"name": "1st Trimester", "value": t1},
            {"name": "2nd Trimester", "value": t2},
            {"name": "3rd Trimester", "value": t3},
        ],
        "delivery_types": [
            {"name": "Delivered", "value": due_passed},
            {"name": "Upcoming", "value": due_upcoming},
        ],
        "average_pregnancy_week": round(float(avg_week), 1)
    }

@router.get("/analytics/performance")
async def get_performance_metrics(
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_hospital_admin(user)
    h_id = user.hospital_id or 1
    thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)

    total_appts = (await db.execute(
        select(func.count(Appointment.id))
        .join(User, Appointment.patient_id == User.id)
        .where(User.hospital_id == h_id)
        .where(Appointment.appointment_date >= thirty_days_ago)
    )).scalar() or 0

    completed_appts = (await db.execute(
        select(func.count(Appointment.id))
        .join(User, Appointment.patient_id == User.id)
        .where(User.hospital_id == h_id)
        .where(Appointment.status == "completed")
        .where(Appointment.appointment_date >= thirty_days_ago)
    )).scalar() or 0

    missed_appts = (await db.execute(
        select(func.count(Appointment.id))
        .join(User, Appointment.patient_id == User.id)
        .where(User.hospital_id == h_id)
        .where(Appointment.status == "missed")
        .where(Appointment.appointment_date >= thirty_days_ago)
    )).scalar() or 0

    fulfillment = round((completed_appts / total_appts) * 100, 1) if total_appts > 0 else 100.0
    efficiency = round(((total_appts - missed_appts) / total_appts) * 100, 1) if total_appts > 0 else 100.0

    resolved_escalations = await db.execute(
        select(Escalation.triggered_at, Escalation.resolved_at)
        .join(User, Escalation.user_id == User.id)
        .where(User.hospital_id == h_id)
        .where(Escalation.status == "resolved")
        .where(Escalation.triggered_at >= thirty_days_ago)
    )
    durations = []
    for start, end in resolved_escalations:
        if end is not None:
            durations.append((end - start).total_seconds() / 60)
    avg_response = round(sum(durations) / len(durations), 1) if durations else 0

    return {
        "sla_response_time": f"{avg_response}m",
        "appointment_fulfillment": fulfillment,
        "patient_satisfaction": round(fulfillment / 20, 1),
        "staff_efficiency": efficiency
    }

@router.get("/ai/risk-forecasts")
async def get_risk_forecasts(
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_hospital_admin(user)
    # Real-ish forecast based on current distribution
    h_id = user.hospital_id or 1
    
    # Get current counts
    high = (await db.execute(select(func.count(RiskScore.id)).where(RiskScore.physical_risk_level == "HIGH"))).scalar() or 0
    med = (await db.execute(select(func.count(RiskScore.id)).where(RiskScore.physical_risk_level == "MEDIUM"))).scalar() or 0
    low = (await db.execute(select(func.count(RiskScore.id)).where(RiskScore.physical_risk_level == "LOW"))).scalar() or 0
    
    total = high + med + low or 1
    
    # Generate 30 day forecast with slight variations
    forecast = []
    for i in range(0, 31, 5):
        # Add a bit of "prediction" logic
        forecast.append({
            "day": f"Day {i}",
            "predicted_risk": round((high/total) * 100 + (i * 0.2), 1),
            "confidence_interval": [round(high/total * 100 - 5, 1), round(high/total * 100 + 10, 1)]
        })
    return forecast

@router.get("/ai/recommendations")
async def get_ai_recommendations(
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_hospital_admin(user)
    h_id = user.hospital_id or 1

    risk_factors = {
        "hypertension": ("hypertension_risk", "HIGH"),
        "diabetes": ("diabetes_risk", "HIGH"),
        "anemia": ("anemia_risk", "HIGH"),
        "preterm": ("preterm_risk", "HIGH"),
        "mental_health": ("mental_risk_level", "HIGH"),
    }

    recommendations = []
    rec_id = 1
    for factor_name, (column, threshold) in risk_factors.items():
        count = (await db.execute(
            select(func.count(RiskScore.id))
            .join(User, RiskScore.user_id == User.id)
            .where(User.hospital_id == h_id)
            .where(getattr(RiskScore, column) == threshold)
        )).scalar() or 0

        if count > 0:
            title_map = {
                "hypertension": ("RESOURCE", "HIGH", "Hypertension Management Alert", f"{count} patients flagged with high hypertension risk. Consider increased BP monitoring and specialist referrals.", f"Affects {count} patients"),
                "diabetes": ("RESOURCE", "HIGH", "Gestational Diabetes Screening", f"{count} patients show elevated diabetes risk. Recommend prioritizing glucose tolerance tests.", f"Affects {count} patients"),
                "anemia": ("STAFF", "MEDIUM", "Anemia Intervention Needed", f"{count} patients have high anemia risk. Consider iron supplementation program.", f"Affects {count} patients"),
                "preterm": ("RESOURCE", "HIGH", "Preterm Labor Preparedness", f"{count} patients at high preterm risk. Ensure NICU readiness and steroid protocols.", f"Affects {count} patients"),
                "mental_health": ("STAFF", "MEDIUM", "Mental Health Support Expansion", f"{count} patients flagged for high mental health risk. Recommend additional counseling resources.", f"Affects {count} patients"),
            }
            rtype, priority, title, desc, impact = title_map[factor_name]
            recommendations.append({
                "id": rec_id,
                "type": rtype,
                "priority": priority,
                "title": title,
                "description": desc,
                "impact": impact,
            })
            rec_id += 1

    if not recommendations:
        recommendations.append({
            "id": 1,
            "type": "INFO",
            "priority": "LOW",
            "title": "All Clear",
            "description": "No high-risk patterns detected across current patient cohort.",
            "impact": "No action required"
        })

    return recommendations

@router.get("/ai/audit-logs")
async def get_ai_audit_logs(
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_hospital_admin(user)
    mongo = get_mongo_db()
    if mongo is not None:
        cursor = mongo["audit_logs"].find(
            {},
            {"_id": 0, "timestamp": 1, "action": 1, "trigger": 1, "patient_id": 1, "model": 1}
        ).sort("timestamp", -1).limit(50)
        logs = await cursor.to_list(length=50)
        for log in logs:
            if isinstance(log.get("timestamp"), datetime):
                log["timestamp"] = log["timestamp"].isoformat()
        return logs

    return []


@router.get("/reports/list")
async def list_reports(
    category: Optional[str] = None,
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        _require_hospital_admin(user)
        now = datetime.now(timezone.utc)
        reports = [
            {"id": 1, "name": "Maternal Health Audit", "category": "Patient", "format": "PDF", "date": (now - timedelta(days=7)).strftime("%Y-%m-%d"), "status": "COMPLETED", "size": "2.4 MB"},
            {"id": 2, "name": "Escalation Analytics", "category": "Escalation", "format": "Excel", "date": (now - timedelta(days=14)).strftime("%Y-%m-%d"), "status": "COMPLETED", "size": "1.8 MB"},
            {"id": 3, "name": "Facility Resource Utilization", "category": "Department", "format": "PDF", "date": (now - timedelta(days=3)).strftime("%Y-%m-%d"), "status": "COMPLETED", "size": "3.1 MB"},
        ]
        if category:
            reports = [r for r in reports if r['category'] == category]
        return reports
    except Exception as e:
        import traceback
        error_msg = f"Report listing failed: {str(e)}\n{traceback.format_exc()}"
        print(error_msg)
        raise HTTPException(status_code=500, detail=error_msg)

@router.post("/reports/generate")
async def generate_report(
    data: dict,
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_hospital_admin(user)
    return {
        "status": "QUEUED",
        "job_id": str(uuid4()),
        "message": f"Generating {data.get('category')} report in {data.get('format')} format. You will be notified when ready."
    }

@router.get("/reports/summaries")
async def get_operational_summaries(
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        _require_hospital_admin(user)
        h_id = user.hospital_id or 1
        thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)

        total_patients = (await db.execute(
            select(func.count(User.id)).where(
                User.role.in_([UserRole.pregnant_user.value, UserRole.postpartum_user.value]),
                User.hospital_id == h_id,
                User.is_active == True
            )
        )).scalar() or 0

        monthly_escalations = (await db.execute(
            select(func.count(Escalation.id))
            .join(User, Escalation.user_id == User.id)
            .where(User.hospital_id == h_id)
            .where(Escalation.triggered_at >= thirty_days_ago)
        )).scalar() or 0

        avg_risk = (await db.execute(
            select(func.avg(RiskScore.physical_confidence))
            .join(User, RiskScore.user_id == User.id)
            .where(User.hospital_id == h_id)
        )).scalar() or 0

        total_staff = (await db.execute(
            select(func.count(Doctor.id)).where(Doctor.hospital_id == h_id)
        )).scalar() or 1

        ratio = f"1:{round(total_patients / total_staff)}" if total_staff > 0 else "N/A"

        return {
            "total_active_patients": total_patients,
            "monthly_escalations": monthly_escalations,
            "avg_risk_score": round(float(avg_risk), 2),
            "facility_compliance": "98.2%",
            "staff_to_patient_ratio": ratio
        }
    except Exception as e:
        import traceback
        error_msg = f"Operational summary failed: {str(e)}\n{traceback.format_exc()}"
        print(error_msg)
        raise HTTPException(status_code=500, detail=error_msg)

@router.get("/org/branches")
async def list_org_branches(
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_hospital_admin(user)
    result = await db.execute(select(Hospital))
    hospitals = result.scalars().all()
    
    branches = []
    for h in hospitals:
        # Count patients assigned to this hospital (via doctors)
        # Or more simply for demo: count users with this hospital_id
        patient_count = (await db.execute(
            select(func.count(User.id)).where(User.hospital_id == h.id)
        )).scalar() or 0
        
        branches.append({
            "id": h.id,
            "name": h.name,
            "location": h.address or "Global",
            "patients": patient_count,
            "status": "ACTIVE",
            "type": "HQ" if h.id == 1 else "BRANCH"
        })
    return branches

@router.get("/org/subscription")
async def get_org_subscription(
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_hospital_admin(user)
    h_id = user.hospital_id or 1

    patients_active = (await db.execute(
        select(func.count(User.id)).where(
            User.role.in_([UserRole.pregnant_user.value, UserRole.postpartum_user.value]),
            User.hospital_id == h_id,
            User.is_active == True
        )
    )).scalar() or 0

    return {
        "tier": "ENTERPRISE",
        "status": "ACTIVE",
        "renewal_date": "2027-01-15",
        "features": ["Multi-Branch Analytics", "AI Risk Predictive", "Unlimited Doctors", "Custom Branding"],
        "usage": {
            "patients_active": patients_active,
            "patients_limit": 5000,
            "storage_gb": 42.5,
            "storage_limit": 500
        }
    }

@router.get("/org/regional-analytics")
async def get_regional_analytics(
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_hospital_admin(user)

    avg_risk = (await db.execute(
        select(func.avg(RiskScore.physical_confidence))
    )).scalar() or 0

    result = await db.execute(select(Hospital))
    hospitals = result.scalars().all()

    branch_performance = []
    for h in hospitals:
        total = (await db.execute(
            select(func.count(Appointment.id))
            .join(User, Appointment.patient_id == User.id)
            .where(User.hospital_id == h.id)
        )).scalar() or 0

        completed = (await db.execute(
            select(func.count(Appointment.id))
            .join(User, Appointment.patient_id == User.id)
            .where(User.hospital_id == h.id)
            .where(Appointment.status == "completed")
        )).scalar() or 0

        efficiency = round((completed / total) * 100) if total > 0 else 0
        branch_performance.append({
            "name": h.name,
            "rating": h.rating or 0,
            "efficiency": efficiency
        })

    weeks = 4
    admissions_trend = []
    now = datetime.now(timezone.utc)
    for i in range(weeks - 1, -1, -1):
        week_start = now - timedelta(weeks=i + 1)
        week_end = now - timedelta(weeks=i)
        count = (await db.execute(
            select(func.count(User.id))
            .where(User.role.in_([UserRole.pregnant_user.value, UserRole.postpartum_user.value]))
            .where(User.created_at >= week_start)
            .where(User.created_at < week_end)
        )).scalar() or 0
        admissions_trend.append(count)

    return {
        "regional_risk_avg": round(float(avg_risk), 2),
        "branch_performance": branch_performance,
        "total_admissions_trend": admissions_trend
    }

@router.get("/settings")
async def get_hospital_settings(
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_hospital_admin(user)
    h_id = user.hospital_id or 1
    result = await db.execute(select(Hospital).where(Hospital.id == h_id))
    hospital = result.scalar_one_or_none()

    hospital_name = hospital.name if hospital else "Unknown Hospital"
    contact_phone = hospital.phone if hospital else ""
    mongo = get_mongo_db()
    prefs = None
    if mongo is not None:
        try:
            prefs = await mongo.hospital_settings.find_one({"hospital_id": h_id})
        except Exception:
            prefs = None
    general_prefs = (prefs or {}).get("general", {})
    security_prefs = (prefs or {}).get("security", {})
    ai_prefs = (prefs or {}).get("ai", {})

    return {
        "general": {
            "hospital_name": general_prefs.get("hospital_name", hospital_name),
            "timezone": general_prefs.get("timezone", "UTC+5:30"),
            "language": general_prefs.get("language", "English (US)"),
            "contact_phone": general_prefs.get("contact_phone", contact_phone),
            "contact_email": general_prefs.get("contact_email", user.email),
        },
        "security": {
            "mfa_required": security_prefs.get("mfa_required", True),
            "session_timeout_min": security_prefs.get("session_timeout_min", 30),
            "password_rotation_days": security_prefs.get("password_rotation_days", 90),
        },
        "ai": {
            "risk_threshold": ai_prefs.get("risk_threshold", 0.75),
            "auto_escalation": ai_prefs.get("auto_escalation", True),
            "explainability_detail": ai_prefs.get("explainability_detail", "HIGH")
        },
        "integrations": [
            {"id": "int_1", "name": "LabCorp Sync", "status": "CONNECTED", "type": "LABS"},
            {"id": "int_2", "name": "Google Health Connect", "status": "PENDING", "type": "VITALS"},
            {"id": "int_3", "name": "Twilio SMS", "status": "CONNECTED", "type": "COMMS"}
        ]
    }

@router.put("/settings")
async def update_hospital_settings(
    data: dict,
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_hospital_admin(user)
    h_id = user.hospital_id or 1
    general = data.get("general", {})
    if general:
        hospital = (await db.execute(select(Hospital).where(Hospital.id == h_id))).scalar_one_or_none()
        if hospital:
            if isinstance(general.get("hospital_name"), str) and general.get("hospital_name").strip():
                hospital.name = general["hospital_name"].strip()
            if isinstance(general.get("contact_phone"), str):
                hospital.phone = general["contact_phone"].strip()
            await db.commit()

    mongo = get_mongo_db()
    if mongo is not None:
        prefs_doc = {}
        for key in ["general", "security", "ai"]:
            value = data.get(key)
            if isinstance(value, dict):
                prefs_doc[key] = value
        if prefs_doc:
            try:
                await mongo.hospital_settings.update_one(
                    {"hospital_id": h_id},
                    {"$set": prefs_doc},
                    upsert=True,
                )
            except Exception:
                pass

    return {"status": "success", "updated_at": datetime.now(timezone.utc).isoformat()}

@router.get("/settings/audit-logs")
async def get_system_audit_logs(
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_hospital_admin(user)
    mongo = get_mongo_db()
    if mongo is not None:
        cursor = mongo["audit_logs"].find(
            {},
            {"_id": 0}
        ).sort("timestamp", -1).limit(50)
        logs = await cursor.to_list(length=50)
        for i, log in enumerate(logs):
            log["id"] = i + 1
            if isinstance(log.get("timestamp"), datetime):
                log["timestamp"] = log["timestamp"].isoformat()
        return logs

    return []
@router.get("/operations/workload")
async def get_workload_matrix(
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db)
):
    _require_hospital_admin(user)
    h_id = user.hospital_id or 1
    return await hospital_ops_service.get_doctor_workload_matrix(db, h_id)

@router.get("/operations/departments")
async def get_departmental_load(
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db)
):
    _require_hospital_admin(user)
    h_id = user.hospital_id or 1
    return await hospital_ops_service.get_departmental_load(db, h_id)

@router.get("/operations/compliance")
async def get_compliance_report(
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db)
):
    _require_hospital_admin(user)
    h_id = user.hospital_id or 1
    return await hospital_ops_service.get_compliance_sla_report(db, h_id)

@router.post("/escalations/{escalation_id}/auto-route")
async def route_escalation(
    escalation_id: int,
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db)
):
    _require_hospital_admin(user)
    res = await db.execute(select(Escalation).where(Escalation.id == escalation_id))
    esc = res.scalar_one_or_none()
    if not esc:
        raise HTTPException(status_code=404, detail="Escalation not found")
        
    doc_id = await hospital_ops_service.auto_route_escalation(db, esc)
    if not doc_id:
        return {"status": "FAILED", "message": "No available doctors found for routing"}
    
    return {"status": "ROUTED", "doctor_id": doc_id}

@router.get("/departments")
async def list_departments(
    user: User = Depends(_current_user)
):
    _require_hospital_admin(user)
    return [
        {"id": "MAT", "name": "Maternity", "head": "Dr. Sarah OB", "staff_count": 12},
        {"id": "NICU", "name": "Neonatal ICU", "head": "Dr. James P.", "staff_count": 8},
        {"id": "MNH", "name": "Mental Health", "head": "Dr. Elena M.", "staff_count": 5},
        {"id": "CRD", "name": "Cardiology (Maternal)", "head": "Dr. Robert C.", "staff_count": 4}
    ]
