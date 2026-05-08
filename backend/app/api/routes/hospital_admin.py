"""Hospital Admin routes — operational stats and management."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from datetime import datetime, timezone, timedelta
from app.core.database import get_db
from app.models.user import User, UserRole
from app.models.hospital import Hospital
from app.models.doctor import Doctor
from app.models.profile import PregnancyProfile
from app.models.risk import RiskScore
from app.models.clinical import Appointment
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
    
    staff_list = []
    for d in doctors:
        # Mocking workload and performance for demo
        staff_list.append({
            "id": d.id,
            "name": d.name,
            "email": d.email,
            "specialty": d.specialty,
            "license": d.license_number,
            "status": "Active" if d.available_for_escalation else "Offline",
            "workload": 12 if d.specialty == "OB-GYN" else 5,
            "performance": 95,
            "department": "Maternity"
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
    # For now, we'll return all patients for the demo hospital
    
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
        
        patient_list.append({
            "id": u.id,
            "full_name": u.full_name,
            "email": u.email,
            "phone": u.phone,
            "trimester": u.profile.trimester if u.profile else "N/A",
            "risk_level": risk_score.physical_risk_level if risk_score else "LOW",
            "last_active": u.updated_at.isoformat() if u.updated_at else None,
            "doctor_id": None # In real app, join with assignments
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
        password_hash="[MOCKED_PWD]", # In real app, send invite email
        is_active=True,
        is_verified=True
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
    doctor_id: int,
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_hospital_admin(user)
    # Logic to save assignment
    return {"status": "success", "patient_id": patient_id, "doctor_id": doctor_id}

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
    appointments = []
    for row in result:
        appo, p_name, p_email = row
        appointments.append({
            "id": appo.id,
            "patient_id": appo.patient_id,
            "patient_name": p_name,
            "patient_email": p_email,
            "doctor_id": appo.doctor_id,
            "date": str(appo.appointment_date),
            "reason": appo.reason,
            "type": appo.appointment_type,
            "status": appo.status,
            "telemedicine_link": appo.telemedicine_link
        })
    return appointments

from app.schemas.clinical import AppointmentCreate

@router.post("/appointments")
async def schedule_hospital_appointment(
    payload: AppointmentCreate,
    patient_id: int,
    doctor_id: int,
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_hospital_admin(user)
    
    new_appo = Appointment(
        patient_id=patient_id,
        doctor_id=doctor_id,
        appointment_date=payload.appointment_date,
        reason=payload.reason,
        appointment_type=payload.appointment_type,
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
    
    return {
        "trimester_distribution": [
            {"name": "1st Trimester", "value": t1},
            {"name": "2nd Trimester", "value": t2},
            {"name": "3rd Trimester", "value": t3},
        ],
        "delivery_types": [
            {"name": "Vaginal", "value": 65}, # Still mock, as we don't have delivery outcomes model yet
            {"name": "C-Section", "value": 35},
        ],
        "average_stay_days": 3.2
    }

@router.get("/analytics/performance")
async def get_performance_metrics(
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_hospital_admin(user)
    return {
        "sla_response_time": "12m",
        "appointment_fulfillment": 94,
        "patient_satisfaction": 4.8,
        "staff_efficiency": 88
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
    return [
        {
            "id": 1,
            "type": "RESOURCE",
            "priority": "HIGH",
            "title": "Prep NICU Expansion",
            "description": "Based on 3rd-trimester escalation trends, we predict a shortage of NICU cots by Week 3. Recommend prepping 4 additional units.",
            "impact": "Reduces transfer delay by 85%"
        },
        {
            "id": 2,
            "type": "STAFF",
            "priority": "MEDIUM",
            "title": "Optimize Night Shift",
            "description": "AI detected a 20% spike in emergency escalations between 02:00-04:00 AM. Recommend adding one additional senior nurse to night rotation.",
            "impact": "Improves response time by 4m"
        }
    ]

@router.get("/ai/audit-logs")
async def get_ai_audit_logs(
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_hospital_admin(user)
    return [
        {"timestamp": datetime.now(timezone.utc).isoformat(), "action": "RISK_ESCALATION", "trigger": "Physical Risk Score > 0.85", "patient_id": 101, "model": "MaternalNet-v2"},
        {"timestamp": (datetime.now(timezone.utc) - timedelta(hours=2)).isoformat(), "action": "AUTONOMOUS_ALERT", "trigger": "Abnormal BP Trend Detected", "patient_id": 204, "model": "VitalsGuard-v1"},
    ]


@router.get("/reports/list")
async def list_reports(
    category: Optional[str] = None,
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        _require_hospital_admin(user)
        reports = [
            {"id": 1, "name": "April Maternal Health Audit", "category": "Patient", "format": "PDF", "date": "2026-04-30", "status": "COMPLETED", "size": "2.4 MB"},
            {"id": 2, "name": "Q1 Escalation Analytics", "category": "Escalation", "format": "Excel", "date": "2026-04-15", "status": "COMPLETED", "size": "1.8 MB"},
            {"id": 3, "name": "Facility Resource Utilization", "category": "Department", "format": "PDF", "date": "2026-05-01", "status": "COMPLETED", "size": "3.1 MB"},
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
    # Mocking generation delay/success
    return {
        "status": "QUEUED",
        "job_id": "rep_7281x92",
        "message": f"Generating {data.get('category')} report in {data.get('format')} format. You will be notified when ready."
    }

@router.get("/reports/summaries")
async def get_operational_summaries(
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        _require_hospital_admin(user)
        return {
            "total_active_patients": 412,
            "monthly_escalations": 34,
            "avg_risk_score": 0.28,
            "facility_compliance": "98.2%",
            "staff_to_patient_ratio": "1:14"
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
    return {
        "tier": "ENTERPRISE",
        "status": "ACTIVE",
        "renewal_date": "2027-01-15",
        "features": ["Multi-Branch Analytics", "AI Risk Predictive", "Unlimited Doctors", "Custom Branding"],
        "usage": {
            "patients_active": 807,
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
    return {
        "regional_risk_avg": 0.31,
        "branch_performance": [
            {"name": "Main", "rating": 4.8, "efficiency": 92},
            {"name": "West", "rating": 4.5, "efficiency": 84},
            {"name": "North", "rating": 4.7, "efficiency": 88},
        ],
        "total_admissions_trend": [120, 145, 132, 158]
    }

@router.get("/settings")
async def get_hospital_settings(
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_hospital_admin(user)
    return {
        "general": {
            "hospital_name": "St. Mary's Maternal Hospital",
            "timezone": "UTC-5",
            "language": "English (US)",
            "contact_email": "admin@stmarys-maternal.com"
        },
        "security": {
            "mfa_required": True,
            "session_timeout_min": 30,
            "password_rotation_days": 90
        },
        "ai": {
            "risk_threshold": 0.75,
            "auto_escalation": True,
            "explainability_detail": "HIGH"
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
    # Mock update
    return {"status": "success", "updated_at": datetime.now(timezone.utc).isoformat()}

@router.get("/settings/audit-logs")
async def get_system_audit_logs(
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_hospital_admin(user)
    return [
        {"id": 1, "timestamp": datetime.now(timezone.utc).isoformat(), "user": "Dr. Sarah Admin", "action": "UPDATE_AI_THRESHOLD", "target": "Risk Engine", "ip": "192.168.1.104"},
        {"id": 2, "timestamp": (datetime.now(timezone.utc) - timedelta(hours=5)).isoformat(), "user": "System", "action": "BACKUP_SUCCESS", "target": "Database", "ip": "Internal"},
        {"id": 3, "timestamp": (datetime.now(timezone.utc) - timedelta(days=1)).isoformat(), "user": "Admin Jane", "action": "LOGIN_SUCCESS", "target": "Security", "ip": "45.12.33.11"},
    ]
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
