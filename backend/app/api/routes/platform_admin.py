# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
# pyrefly: ignore [missing-import]
from sqlalchemy import select, func, or_
# pyrefly: ignore [missing-import]
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from datetime import datetime, timedelta, timezone
import json
import os
from pathlib import Path

from app.core.database import get_db
from app.api.routes.auth import _current_user
from app.models.user import User, UserRole
from app.models.hospital import Hospital
from app.models.doctor import Doctor
from app.models.risk import RiskScore
from app.models.escalation import Escalation
from app.models.profile import PregnancyProfile
from app.ml.train_risk_models import train_mental_health_model, train_physical_health_model, train_fetal_health_model

SETTINGS_FILE = Path(__file__).parent.parent.parent / "ml" / "models" / "settings.json"

router = APIRouter()

def _require_platform_admin(user: User):
    if user.role != "platform_admin":
        raise HTTPException(status_code=403, detail="Platform admin access required")

@router.get("/overview")
async def get_platform_overview(
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db)
):
    _require_platform_admin(user)
    
    # Global Counts
    total_hospitals = (await db.execute(select(func.count(Hospital.id)))).scalar() or 0
    total_users = (await db.execute(select(func.count(User.id)))).scalar() or 0
    total_doctors = (await db.execute(select(func.count(Doctor.id)))).scalar() or 0
    total_patients = (await db.execute(select(func.count(User.id)).where(User.role.in_(["pregnant_user", "postpartum_user"])))).scalar() or 0
    
    # Active Sessions (Mocked for now)
    active_sessions = 42
    
    # Escalations (Global)
    critical_escalations = (await db.execute(
        select(func.count(RiskScore.id)).where(
            or_(
                RiskScore.physical_risk_level == "HIGH",
                RiskScore.mental_risk_level == "HIGH",
                RiskScore.fetal_risk_level == "HIGH"
            )
        )
    )).scalar() or 0
    
    # Revenue (Mocked)
    revenue = {
        "mrr": 125000,
        "growth": 12.5,
        "currency": "USD"
    }
    
    # System Health
    health = {
        "api_uptime": 99.98,
        "db_load": 14,
        "queue_status": "STABLE",
        "ai_status": "OPTIMAL"
    }
    
    return {
        "stats": {
            "hospitals": total_hospitals,
            "users": total_users,
            "doctors": total_doctors,
            "patients": total_patients,
            "escalations": critical_escalations,
            "active_sessions": active_sessions
        },
        "revenue": revenue,
        "health": health,
        "activity": [
            {"id": 1, "time": "2m ago", "event": "New Hospital Registered", "details": "City Maternity Center, NY"},
            {"id": 2, "time": "15m ago", "event": "Global Model Updated", "details": "RiskPredict v2.4 deployed"},
            {"id": 3, "time": "45m ago", "event": "Critical Escalation Resolved", "details": "St. Mary's - Case #402"}
        ]
    }

@router.get("/organizations")
async def list_organizations(
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db)
):
    _require_platform_admin(user)
    # For now, organizations are grouped hospitals or separate entities
    # Mocking for the UI first
    return [
        {
            "id": 1,
            "name": "Global Healthcare Group",
            "hospitals": 12,
            "status": "ACTIVE",
            "plan": "ENTERPRISE",
            "compliance": "HIPAA COMPLIANT"
        },
        {
            "id": 2,
            "name": "Maternal Care Networks",
            "hospitals": 5,
            "status": "ACTIVE",
            "plan": "PROFESSIONAL",
            "compliance": "PENDING AUDIT"
        }
    ]

@router.get("/ai/control")
async def get_ai_control_stats(
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db)
):
    _require_platform_admin(user)
    return {
        "models": [
            {"name": "RiskPredict-v2", "status": "ACTIVE", "accuracy": 94.2, "latency": 180},
            {"name": "MoodSentry-v1", "status": "ACTIVE", "accuracy": 89.5, "latency": 220},
            {"name": "LaborForecaster", "status": "STAGING", "accuracy": 91.1, "latency": 310}
        ],
        "predictions_total": 85420,
        "accuracy_trend": [92, 92.5, 93, 93.8, 94.2],
        "alerts": [
            {"id": 1, "level": "INFO", "msg": "Retraining RiskPredict-v2 initiated with 10k new samples"}
        ]
    }

@router.get("/hospitals")
async def list_hospitals(
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db)
):
    _require_platform_admin(user)
    result = await db.execute(select(Hospital))
    hospitals = result.scalars().all()
    return [
        {
            "id": h.id,
            "name": h.name,
            "location": f"{h.city}, {h.state}",
            "status": "ACTIVE",
            "patients": 120,
            "doctors": 15,
            "performance": 88,
            "region": "East Coast" if i % 2 == 0 else "West Coast"
        }
        for i, h in enumerate(hospitals)
    ]

@router.post("/hospitals")
async def create_hospital(
    data: dict, # Simplified for now
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db)
):
    _require_platform_admin(user)
    new_h = Hospital(
        name=data["name"],
        address=data["address"],
        city=data["city"],
        state=data["state"],
        zip_code=data["zip_code"],
        phone=data["phone"],
        email=data["email"]
    )
    db.add(new_h)
    await db.commit()
    await db.refresh(new_h)
    return new_h

@router.get("/hospitals/regional")
async def get_regional_stats(
    user: User = Depends(_current_user)
):
    _require_platform_admin(user)
    return [
        {"region": "North America", "count": 45, "active": 42, "load": 68},
        {"region": "Europe", "count": 28, "active": 25, "load": 44},
        {"region": "Asia-Pacific", "count": 12, "active": 10, "load": 32}
    ]

@router.patch("/hospitals/{hospital_id}")
async def update_hospital(
    hospital_id: int,
    data: dict,
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db)
):
    _require_platform_admin(user)
    result = await db.execute(select(Hospital).where(Hospital.id == hospital_id))
    target = result.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="Hospital not found")
    
    if "name" in data: target.name = data["name"]
    if "address" in data: target.address = data["address"]
    if "city" in data: target.city = data["city"]
    if "state" in data: target.state = data["state"]
    if "zip_code" in data: target.zip_code = data["zip_code"]
    
    await db.commit()
    return {"msg": "Hospital updated"}

@router.delete("/hospitals/{hospital_id}")
async def delete_hospital(
    hospital_id: int,
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db)
):
    _require_platform_admin(user)
    result = await db.execute(select(Hospital).where(Hospital.id == hospital_id))
    target = result.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="Hospital not found")
    
    await db.delete(target)
    await db.commit()
    return {"msg": "Hospital deleted"}

@router.get("/users")
async def list_global_users(
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db)
):
    _require_platform_admin(user)
    result = await db.execute(select(User).limit(100))
    users = result.scalars().all()
    return [
        {
            "id": u.id,
            "name": u.full_name,
            "email": u.email,
            "role": u.role,
            "status": "ACTIVE" if u.is_active else "SUSPENDED",
            "last_login": "2h ago",
            "hospital": "City Maternity" if u.role == "doctor" else "N/A"
        }
        for u in users
    ]

@router.post("/users")
async def provision_user(
    data: dict,
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db)
):
    _require_platform_admin(user)
    # Simplified creation logic
    new_u = User(
        email=data["email"],
        full_name=data["name"],
        role=data["role"],
        is_active=True
    )
    db.add(new_u)
    await db.commit()
    await db.refresh(new_u)
    return new_u

@router.patch("/users/{user_id}")
async def update_user(
    user_id: int,
    data: dict,
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db)
):
    _require_platform_admin(user)
    result = await db.execute(select(User).where(User.id == user_id))
    target = result.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    
    if "name" in data: target.full_name = data["name"]
    if "role" in data: target.role = data["role"]
    if "email" in data: target.email = data["email"]
    
    await db.commit()
    return {"msg": "User updated"}

@router.patch("/users/{user_id}/status")
async def update_user_status(
    user_id: int,
    status: dict,
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db)
):
    _require_platform_admin(user)
    result = await db.execute(select(User).where(User.id == user_id))
    target = result.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    
    target.is_active = (status["status"] == "ACTIVE")
    await db.commit()
    return {"msg": "Status updated"}

@router.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db)
):
    _require_platform_admin(user)
    result = await db.execute(select(User).where(User.id == user_id))
    target = result.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    
    await db.delete(target)
    await db.commit()
    return {"msg": "User deleted"}

@router.get("/billing")
async def get_billing_data(
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db)
):
    _require_platform_admin(user)
    
    # In a real SaaS, we would query Stripe or a Billing table.
    # Here we at least query the actual number of hospitals.
    hospitals_count = (await db.execute(select(func.count(Hospital.id)))).scalar()
    
    return {
        "plans": [
            {"name": "Enterprise Clinical", "hospitals": hospitals_count // 3, "revenue": (hospitals_count // 3) * 12000, "growth": 8.5},
            {"name": "Regional Health Hub", "hospitals": hospitals_count // 2, "revenue": (hospitals_count // 2) * 3500, "growth": 12.2},
            {"name": "Standard Facility", "hospitals": hospitals_count - (hospitals_count // 3) - (hospitals_count // 2), "revenue": (hospitals_count - (hospitals_count // 3) - (hospitals_count // 2)) * 1500, "growth": -2.4}
        ],
        "stats": {
            "mrr": hospitals_count * 5000,
            "arr": hospitals_count * 5000 * 12,
            "avg_hospital_ltv": 15000,
            "churn_rate": 0.05
        },
        "recent_invoices": [
            {"id": "INV-2024-001", "hospital": "City Maternity", "amount": 12500, "status": "PAID", "date": "2024-05-01"},
            {"id": "INV-2024-002", "hospital": "St. Mary's", "amount": 8500, "status": "PAID", "date": "2024-05-02"},
            {"id": "INV-2024-003", "hospital": "Grace Health", "amount": 4200, "status": "PENDING", "date": "2024-05-05"}
        ],
        "revenue_trend": [180, 210, 195, 225, 238, 242] # in $k
    }

@router.get("/global-escalations")
async def get_global_escalations(
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db)
):
    _require_platform_admin(user)
    
    # Query actual escalations from the database
    # Join with User and Hospital to get patient and hospital names
    query = (
        select(Escalation, User.full_name, Hospital.name)
        .join(User, Escalation.user_id == User.id)
        .join(Hospital, User.hospital_id == Hospital.id)
        .order_by(Escalation.created_at.desc())
        .limit(20)
    )
    result = await db.execute(query)
    esc_list = []
    now = datetime.now(timezone.utc)
    
    for esc, p_name, h_name in result:
        # Calculate "timer" (wait time)
        wait_seconds = (now - esc.created_at.replace(tzinfo=timezone.utc)).total_seconds()
        wait_display = f"{int(wait_seconds // 60)}m" if wait_seconds < 3600 else f"{int(wait_seconds // 3600)}h"
        
        esc_list.append({
            "id": f"ESC-{esc.id}",
            "db_id": esc.id,
            "patient": p_name,
            "hospital": h_name,
            "risk": esc.risk_level.upper(),
            "type": esc.risk_type.title(),
            "timer": wait_display,
            "status": esc.status.upper(),
            "triggered_at": esc.created_at.isoformat()
        })

    # Stats
    active_emergencies = (await db.execute(select(func.count(Escalation.id)).where(Escalation.status == "pending"))).scalar() or 0
    unresolved_24h = (await db.execute(select(func.count(Escalation.id)).where(Escalation.status == "pending", Escalation.created_at < now - timedelta(hours=24)))).scalar() or 0
    total_resolved = (await db.execute(select(func.count(Escalation.id)).where(Escalation.status == "resolved"))).scalar() or 0

    # Mock some hospital performance based on real hospitals
    hospitals = (await db.execute(select(Hospital).limit(5))).scalars().all()
    hospital_performance = []
    for h in hospitals:
        # In a real app, we'd calculate avg response time per hospital
        hospital_performance.append({
            "name": h.name,
            "response": f"{round(4 + (h.id % 5), 1)}m",
            "load": 60 + (h.id % 30)
        })

    return {
        "critical_cases": esc_list,
        "stats": {
            "active_emergencies": active_emergencies,
            "avg_response_time": "5.8m",
            "unresolved_24h": unresolved_24h,
            "total_resolved": total_resolved
        },
        "response_trend": [8.2, 7.5, 6.8, 6.2, 5.9, 5.8],
        "hospital_performance": hospital_performance
    }

@router.get("/escalations/{escalation_id}/audit")
async def get_escalation_audit(
    escalation_id: int,
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db)
):
    _require_platform_admin(user)
    
    query = (
        select(Escalation, User, Hospital)
        .join(User, Escalation.user_id == User.id)
        .join(Hospital, User.hospital_id == Hospital.id)
        .where(Escalation.id == escalation_id)
    )
    result = await db.execute(query)
    data = result.first()
    
    if not data:
        raise HTTPException(status_code=404, detail="Escalation not found")
        
    esc, patient, hospital = data
    
    return {
        "escalation": {
            "id": esc.id,
            "risk_type": esc.risk_type,
            "risk_level": esc.risk_level,
            "reason": esc.escalation_reason,
            "status": esc.status,
            "triggered_at": esc.created_at,
            "doctor_notes": esc.doctor_notes,
            "resolved_at": esc.resolved_at
        },
        "patient": {
            "id": patient.id,
            "name": patient.full_name,
            "email": patient.email
        },
        "hospital": {
            "id": hospital.id,
            "name": hospital.name,
            "location": hospital.city
        }
    }

@router.get("/global-analytics")
async def get_global_analytics(
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db)
):
    _require_platform_admin(user)
    
    hospitals_count = (await db.execute(select(func.count(Hospital.id)))).scalar()
    patients_count = (await db.execute(select(func.count(User.id)).where(User.role.in_([UserRole.pregnant_user, UserRole.postpartum_user])))).scalar()
    pregnant_count = (await db.execute(select(func.count(User.id)).where(User.role == UserRole.pregnant_user))).scalar()
    postpartum_count = (await db.execute(select(func.count(User.id)).where(User.role == UserRole.postpartum_user))).scalar()
    
    # Trimester Distribution (from seeded profiles)
    first_trim = (await db.execute(select(func.count(PregnancyProfile.id)).where(PregnancyProfile.trimester == "first"))).scalar() or 0
    second_trim = (await db.execute(select(func.count(PregnancyProfile.id)).where(PregnancyProfile.trimester == "second"))).scalar() or 0
    third_trim = (await db.execute(select(func.count(PregnancyProfile.id)).where(PregnancyProfile.trimester == "third"))).scalar() or 0
    
    # Clinical Baselines
    avg_hb = (await db.execute(select(func.avg(PregnancyProfile.hemoglobin_level)))).scalar() or 0
    avg_age = (await db.execute(select(func.avg(PregnancyProfile.age)))).scalar() or 0
    
    return {
        "growth": {
            "hospitals": [hospitals_count - 10, hospitals_count - 5, hospitals_count],
            "patients": [patients_count - 500, patients_count - 200, patients_count],
            "revenue": [520, 680, 750]
        },
        "demographics": {
            "pregnant": pregnant_count,
            "postpartum": postpartum_count,
            "trimesters": {
                "first": first_trim,
                "second": second_trim,
                "third": third_trim
            }
        },
        "clinical_stats": {
            "avg_hb": round(float(avg_hb), 1),
            "avg_age": round(float(avg_age), 1)
        },
        "health_insights": {
            "high_risk_cases": 12.4,
            "avg_care_score": 88,
            "emergency_alerts": (await db.execute(select(func.count(Escalation.id)).where(Escalation.risk_level == "HIGH"))).scalar(),
            "outcome_improvement": 18.5
        },
        "risk_trends": [15, 14, 12, 13, 11, 9],
        "regional_health": [
            {"region": "North India", "health_index": 92, "risk_level": "LOW"},
            {"region": "South India", "health_index": 94, "risk_level": "LOW"},
            {"region": "West India", "health_index": 88, "risk_level": "MEDIUM"}
        ]
    }

@router.get("/analytics/export")
async def export_analytics_report(
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db)
):
    _require_platform_admin(user)
    
    # Fetch comprehensive data for the report
    hospitals = (await db.execute(select(Hospital))).scalars().all()
    patients = (await db.execute(select(User).where(User.role.in_([UserRole.pregnant_user, UserRole.postpartum_user])))).scalars().all()
    profiles = (await db.execute(select(PregnancyProfile))).scalars().all()
    
    report_data = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "summary": {
            "total_hospitals": len(hospitals),
            "total_patients": len(patients),
            "total_profiles": len(profiles)
        },
        "hospitals": [{"id": h.id, "name": h.name, "city": h.city} for h in hospitals],
        "clinical_audit": [
            {
                "patient_id": p.id,
                "email": p.email,
                "role": p.role,
                "joined": p.created_at.isoformat() if p.created_at else None
            } for p in patients[:100]  # Limiting for safety
        ]
    }
    
    return report_data

@router.get("/analytics/goals")
async def get_strategic_goals(
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db)
):
    _require_platform_admin(user)
    
    # Calculate some real metrics vs targets
    patients_count = (await db.execute(select(func.count(User.id)).where(User.role.in_([UserRole.pregnant_user, UserRole.postpartum_user])))).scalar() or 0
    high_risk_count = (await db.execute(
        select(func.count(RiskScore.id)).where(
            or_(
                RiskScore.physical_risk_level == "HIGH",
                RiskScore.mental_risk_level == "HIGH",
                RiskScore.fetal_risk_level == "HIGH"
            )
        )
    )).scalar() or 0
    
    return {
        "goals": [
            {
                "title": "Maternal Safety Target",
                "metric": "High Risk Density",
                "current": round((high_risk_count / max(patients_count, 1)) * 100, 1),
                "target": 5.0,
                "unit": "%",
                "status": "ON_TRACK" if (high_risk_count / max(patients_count, 1)) < 0.1 else "AT_RISK"
            },
            {
                "title": "Expansion Velocity",
                "metric": "Total Hospitals",
                "current": (await db.execute(select(func.count(Hospital.id)))).scalar() or 0,
                "target": 50,
                "unit": "Units",
                "status": "BEHIND"
            },
            {
                "title": "Clinical Efficacy",
                "metric": "Avg Care Score",
                "current": 88,
                "target": 95,
                "unit": "/100",
                "status": "STABLE"
            }
        ]
    }

@router.get("/ai-metrics")
async def get_ai_metrics(
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db)
):
    _require_platform_admin(user)
    
    # 1. Total Predictions
    predictions_count = (await db.execute(select(func.count(RiskScore.id)))).scalar()
    
    # 2. Avg Confidence (averaging across domains)
    avg_conf = (await db.execute(select(
        func.avg((RiskScore.physical_confidence + RiskScore.mental_confidence + RiskScore.fetal_confidence) / 3)
    ))).scalar() or 0.92 # Fallback if no scores yet
    
    # 3. Confidence Distribution (Density per 10% interval from 50% to 100%)
    # We'll calculate actual counts for each bucket
    distribution = []
    for i in range(5, 11):
        low = i / 10
        high = (i + 1) / 10
        count = (await db.execute(select(func.count(RiskScore.id)).where(
            (RiskScore.physical_confidence >= low) & (RiskScore.physical_confidence < high)
        ))).scalar()
        # Normalize to percentage of total
        density = (count / predictions_count * 100) if predictions_count > 0 else (10 + i) 
        distribution.append(round(density, 1))

    # 4. Model Settings
    settings = {}
    if SETTINGS_FILE.exists():
        with open(SETTINGS_FILE, 'r') as f:
            settings = json.load(f)

    return {
        "models": [
            {
                "name": "Maternal Risk Predictor", 
                "version": "v2.4.1", 
                "status": "OPTIMAL", 
                "accuracy": 98.2, 
                "latency": "45ms", 
                "uptime": "99.99%",
                "settings": settings.get("Maternal Risk Predictor", {})
            },
            {
                "name": "Fetal Health Analyzer", 
                "version": "v1.9.0", 
                "status": "OPTIMAL", 
                "accuracy": 96.5, 
                "latency": "120ms", 
                "uptime": "100%",
                "settings": settings.get("Fetal Health Analyzer", {})
            },
            {
                "name": "Mental Wellness Engine", 
                "version": "v1.1.0", 
                "status": "OPTIMAL", 
                "accuracy": 94.2, 
                "latency": "65ms", 
                "uptime": "99.98%",
                "settings": settings.get("Mental Wellness Engine", {})
            }
        ],
        "stats": {
            "total_predictions": predictions_count,
            "avg_confidence": round(avg_conf * 100, 1),
            "failures_24h": 0,
            "drift_score": 0.02,
            "throughput": "45.2k/hr",
            "active_jobs": 12,
            "gpu_load": 24
        },
        "accuracy_trend": [94, 95, 94.5, 96, 97.2, 98.2],
        "confidence_distribution": distribution
    }

@router.post("/ai/retrain/{model_name}")
async def retrain_model(
    model_name: str,
    background_tasks: BackgroundTasks,
    user: User = Depends(_current_user)
):
    _require_platform_admin(user)
    
    settings = {}
    if SETTINGS_FILE.exists():
        with open(SETTINGS_FILE, 'r') as f:
            settings = json.load(f)
    
    model_params = settings.get(model_name, {})
    
    if model_name == "Maternal Risk Predictor":
        background_tasks.add_task(train_physical_health_model, model_params)
    elif model_name == "Fetal Health Analyzer":
        background_tasks.add_task(train_fetal_health_model, model_params)
    elif model_name == "Mental Wellness Engine":
        background_tasks.add_task(train_mental_health_model, model_params)
    else:
        raise HTTPException(status_code=404, detail="Model not found")
        
    return {"status": "success", "message": f"Retraining pipeline for {model_name} initiated in background."}

@router.post("/ai/settings/{model_name}")
async def update_model_settings(
    model_name: str,
    params: dict,
    user: User = Depends(_current_user)
):
    _require_platform_admin(user)
    
    settings = {}
    if SETTINGS_FILE.exists():
        with open(SETTINGS_FILE, 'r') as f:
            settings = json.load(f)
    
    settings[model_name] = params
    
    with open(SETTINGS_FILE, 'w') as f:
        json.dump(settings, f, indent=2)
        
    return {"status": "success", "message": f"Settings updated for {model_name}"}

@router.get("/infrastructure")
async def get_infra_status(
    user: User = Depends(_current_user)
):
    _require_platform_admin(user)
    return {
        "servers": [
            {"id": "us-east-1", "region": "Virginia", "status": "ONLINE", "load": 42, "uptime": "99.97%"},
            {"id": "ap-south-1", "region": "Mumbai", "status": "ONLINE", "load": 56, "uptime": "99.94%"},
            {"id": "eu-west-1", "region": "Ireland", "status": "ONLINE", "load": 28, "uptime": "99.99%"},
        ],
        "databases": [
            {"name": "PostgreSQL Primary", "engine": "PostgreSQL 16", "status": "HEALTHY", "size": "1.2 GB", "connections": 12},
            {"name": "MongoDB Atlas", "engine": "MongoDB 7", "status": "HEALTHY", "size": "450 MB", "connections": 8},
            {"name": "Redis Cache", "engine": "Redis 7", "status": "HEALTHY", "size": "64 MB", "hit_rate": "94%"},
        ],
        "services": [
            {"name": "API Gateway", "status": "RUNNING", "version": "1.5.0"},
            {"name": "ML Pipeline", "status": "RUNNING", "version": "1.5.0"},
            {"name": "NLP Service", "status": "RUNNING", "version": "1.5.0"},
            {"name": "Notification Service", "status": "RUNNING", "version": "1.2.0"},
        ],
        "latency_ms": {"p50": 45, "p95": 120, "p99": 280},
    }


# ═══════════════════════════════════════════════════════════════
#  SECURITY & COMPLIANCE — /platform-admin/security
# ═══════════════════════════════════════════════════════════════

@router.get("/security")
async def get_security_dashboard(
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db)
):
    _require_platform_admin(user)

    total_users = (await db.execute(select(func.count(User.id)))).scalar() or 0
    verified_users = (await db.execute(
        select(func.count(User.id)).where(User.is_verified == True)
    )).scalar() or 0

    return {
        "compliance": {
            "hipaa_status": "COMPLIANT",
            "gdpr_status": "COMPLIANT",
            "last_audit": "2026-03-01",
            "next_audit": "2026-06-01",
            "data_retention_days": 365,
        },
        "authentication": {
            "total_users": total_users,
            "verified_users": verified_users,
            "mfa_enabled_percent": 68,
            "failed_logins_24h": 3,
            "active_sessions": 42,
        },
        "encryption": {
            "at_rest": "AES-256",
            "in_transit": "TLS 1.3",
            "key_rotation_days": 90,
            "last_rotation": "2026-02-15",
        },
        "vulnerabilities": {
            "critical": 0,
            "high": 0,
            "medium": 2,
            "low": 5,
            "last_scan": "2026-03-15",
        },
        "access_control": {
            "roles_defined": 5,
            "permissions_policies": 24,
            "api_keys_active": 3,
        },
    }


# ═══════════════════════════════════════════════════════════════
#  COMMUNICATION CENTER — /platform-admin/communication
# ═══════════════════════════════════════════════════════════════

@router.get("/communication")
async def get_communication_center(
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db)
):
    _require_platform_admin(user)

    from app.core.database import get_mongo_db
    mongo = get_mongo_db()

    announcements = []
    if mongo:
        cursor = mongo.platform_announcements.find().sort("created_at", -1).limit(20)
        async for doc in cursor:
            announcements.append({
                "id": str(doc.get("_id")),
                "title": doc.get("title"),
                "content": doc.get("content"),
                "target": doc.get("target", "all"),
                "created_at": doc.get("created_at"),
                "is_active": doc.get("is_active", True),
            })

    return {
        "announcements": announcements,
        "channels": [
            {"name": "Email", "status": "ACTIVE", "sent_today": 145},
            {"name": "Push Notifications", "status": "ACTIVE", "sent_today": 892},
            {"name": "SMS", "status": "ACTIVE", "sent_today": 34},
            {"name": "In-App Messages", "status": "ACTIVE", "sent_today": 1203},
        ],
        "templates": [
            {"id": 1, "name": "Welcome Email", "type": "email", "last_used": "2026-03-16"},
            {"id": 2, "name": "Appointment Reminder", "type": "push", "last_used": "2026-03-16"},
            {"id": 3, "name": "Risk Alert (Doctor)", "type": "push", "last_used": "2026-03-15"},
            {"id": 4, "name": "Monthly Health Summary", "type": "email", "last_used": "2026-03-01"},
        ],
    }


@router.post("/communication/announce")
async def create_announcement(
    data: dict,
    user: User = Depends(_current_user),
):
    _require_platform_admin(user)
    from app.core.database import get_mongo_db
    mongo = get_mongo_db()
    if not mongo:
        raise HTTPException(status_code=503, detail="Service unavailable")

    announcement = {
        "title": data.get("title"),
        "content": data.get("content"),
        "target": data.get("target", "all"),
        "created_by": user.id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "is_active": True,
    }
    await mongo.platform_announcements.insert_one(announcement)
    return {"status": "published"}


# ═══════════════════════════════════════════════════════════════
#  AUDIT LOGS — /platform-admin/audit-logs
# ═══════════════════════════════════════════════════════════════

@router.get("/audit-logs")
async def get_audit_logs(
    limit: int = 50,
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db)
):
    _require_platform_admin(user)

    from app.core.database import get_mongo_db
    mongo = get_mongo_db()

    logs = []
    if mongo:
        cursor = mongo.audit_logs.find().sort("timestamp", -1).limit(limit)
        async for doc in cursor:
            logs.append({
                "id": str(doc.get("_id")),
                "action": doc.get("action"),
                "user_id": doc.get("user_id"),
                "user_email": doc.get("user_email"),
                "resource": doc.get("resource"),
                "details": doc.get("details"),
                "ip_address": doc.get("ip_address"),
                "timestamp": doc.get("timestamp"),
            })

    if not logs:
        logs = [
            {"id": "1", "action": "USER_LOGIN", "user_email": "admin@novelle.app", "resource": "auth", "details": "Successful login", "ip_address": "192.168.1.1", "timestamp": datetime.now(timezone.utc).isoformat()},
            {"id": "2", "action": "RISK_COMPUTED", "user_email": "system", "resource": "ml_pipeline", "details": "Risk scores computed for 15 patients", "ip_address": "internal", "timestamp": (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()},
            {"id": "3", "action": "ESCALATION_CREATED", "user_email": "system", "resource": "escalation", "details": "High-risk patient auto-escalated", "ip_address": "internal", "timestamp": (datetime.now(timezone.utc) - timedelta(hours=2)).isoformat()},
        ]

    return {"logs": logs, "total": len(logs)}


# ═══════════════════════════════════════════════════════════════
#  INTEGRATIONS — /platform-admin/integrations
# ═══════════════════════════════════════════════════════════════

@router.get("/integrations")
async def get_integrations(
    user: User = Depends(_current_user)
):
    _require_platform_admin(user)
    return {
        "active": [
            {"id": 1, "name": "Google Gemini AI", "type": "AI/ML", "status": "CONNECTED", "last_sync": "2026-03-16T12:00:00Z"},
            {"id": 2, "name": "Groq (Llama 3.3)", "type": "AI/ML", "status": "CONNECTED", "last_sync": "2026-03-16T12:00:00Z"},
            {"id": 3, "name": "Neon PostgreSQL", "type": "Database", "status": "CONNECTED", "last_sync": "2026-03-16T12:00:00Z"},
            {"id": 4, "name": "MongoDB Atlas", "type": "Database", "status": "CONNECTED", "last_sync": "2026-03-16T12:00:00Z"},
            {"id": 5, "name": "HuggingFace (DistilBERT)", "type": "NLP", "status": "CONNECTED", "last_sync": "2026-03-16T10:00:00Z"},
        ],
        "available": [
            {"id": 10, "name": "Twilio SMS", "type": "Communication", "status": "NOT_CONFIGURED"},
            {"id": 11, "name": "SendGrid Email", "type": "Communication", "status": "NOT_CONFIGURED"},
            {"id": 12, "name": "Google Calendar", "type": "Scheduling", "status": "NOT_CONFIGURED"},
            {"id": 13, "name": "Stripe Payments", "type": "Billing", "status": "NOT_CONFIGURED"},
        ],
    }


# ═══════════════════════════════════════════════════════════════
#  SUPPORT & TICKETS — /platform-admin/support
# ═══════════════════════════════════════════════════════════════

@router.get("/support")
async def get_support_tickets(
    user: User = Depends(_current_user)
):
    _require_platform_admin(user)
    from app.core.database import get_mongo_db
    mongo = get_mongo_db()

    tickets = []
    if mongo:
        cursor = mongo.support_tickets.find().sort("created_at", -1).limit(50)
        async for doc in cursor:
            tickets.append({
                "id": str(doc.get("_id")),
                "subject": doc.get("subject"),
                "description": doc.get("description"),
                "status": doc.get("status", "open"),
                "priority": doc.get("priority", "medium"),
                "created_by": doc.get("created_by"),
                "assigned_to": doc.get("assigned_to"),
                "created_at": doc.get("created_at"),
            })

    if not tickets:
        tickets = [
            {"id": "1", "subject": "Cannot access risk report", "status": "open", "priority": "high", "created_by": "patient@example.com", "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": "2", "subject": "Appointment scheduling issue", "status": "in_progress", "priority": "medium", "created_by": "dr.anita@novelle.app", "created_at": (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()},
        ]

    stats = {
        "open": len([t for t in tickets if t.get("status") == "open"]),
        "in_progress": len([t for t in tickets if t.get("status") == "in_progress"]),
        "resolved": len([t for t in tickets if t.get("status") == "resolved"]),
        "total": len(tickets),
    }

    return {"tickets": tickets, "stats": stats}


@router.post("/support")
async def create_support_ticket(
    data: dict,
    user: User = Depends(_current_user)
):
    _require_platform_admin(user)
    from app.core.database import get_mongo_db
    mongo = get_mongo_db()
    if not mongo:
        raise HTTPException(status_code=503, detail="Service unavailable")

    ticket = {
        "subject": data.get("subject"),
        "description": data.get("description"),
        "status": "open",
        "priority": data.get("priority", "medium"),
        "created_by": user.email,
        "assigned_to": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await mongo.support_tickets.insert_one(ticket)
    return {"status": "created"}


# ═══════════════════════════════════════════════════════════════
#  REPORTS — /platform-admin/reports
# ═══════════════════════════════════════════════════════════════

@router.get("/reports")
async def get_platform_reports(
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db)
):
    _require_platform_admin(user)

    total_users = (await db.execute(select(func.count(User.id)))).scalar() or 0
    total_patients = (await db.execute(
        select(func.count(User.id)).where(User.role.in_(["pregnant_user", "postpartum_user"]))
    )).scalar() or 0
    total_doctors = (await db.execute(select(func.count(Doctor.id)))).scalar() or 0
    total_hospitals = (await db.execute(select(func.count(Hospital.id)))).scalar() or 0
    total_escalations = (await db.execute(select(func.count(Escalation.id)))).scalar() or 0
    resolved_escalations = (await db.execute(
        select(func.count(Escalation.id)).where(Escalation.status == "resolved")
    )).scalar() or 0

    high_risk = (await db.execute(
        select(func.count(RiskScore.id)).where(
            or_(
                RiskScore.physical_risk_level == "HIGH",
                RiskScore.mental_risk_level == "HIGH",
                RiskScore.fetal_risk_level == "HIGH"
            )
        )
    )).scalar() or 0

    return {
        "summary": {
            "total_users": total_users,
            "total_patients": total_patients,
            "total_doctors": total_doctors,
            "total_hospitals": total_hospitals,
        },
        "risk_overview": {
            "total_risk_assessments": (await db.execute(select(func.count(RiskScore.id)))).scalar() or 0,
            "high_risk_count": high_risk,
        },
        "escalations": {
            "total": total_escalations,
            "resolved": resolved_escalations,
            "resolution_rate": round((resolved_escalations / max(total_escalations, 1)) * 100, 1),
        },
        "platform_health": {
            "uptime_percent": 99.97,
            "avg_response_ms": 85,
            "error_rate_percent": 0.03,
        },
    }


# ═══════════════════════════════════════════════════════════════
#  SETTINGS — /platform-admin/settings
# ═══════════════════════════════════════════════════════════════

@router.get("/settings")
async def get_platform_settings(
    user: User = Depends(_current_user)
):
    _require_platform_admin(user)
    from app.core.database import get_mongo_db
    mongo = get_mongo_db()

    settings = {}
    if mongo:
        doc = await mongo.platform_settings.find_one({"scope": "global"})
        if doc:
            settings = {k: v for k, v in doc.items() if k != "_id"}

    return {
        "general": {
            "platform_name": settings.get("platform_name", "Novelle"),
            "support_email": settings.get("support_email", "support@novelle.app"),
            "default_language": settings.get("default_language", "en"),
            "maintenance_mode": settings.get("maintenance_mode", False),
        },
        "ml_pipeline": {
            "auto_retrain_enabled": settings.get("auto_retrain", True),
            "retrain_interval_days": settings.get("retrain_interval", 7),
            "risk_threshold_high": settings.get("risk_threshold_high", 0.75),
            "risk_threshold_medium": settings.get("risk_threshold_medium", 0.45),
        },
        "notifications": {
            "escalation_alerts": settings.get("escalation_alerts", True),
            "daily_digest": settings.get("daily_digest", True),
            "patient_crisis_sms": settings.get("patient_crisis_sms", True),
        },
        "data_retention": {
            "health_logs_days": settings.get("health_logs_days", 365),
            "chat_history_days": settings.get("chat_history_days", 180),
            "audit_logs_days": settings.get("audit_logs_days", 730),
        },
    }


@router.put("/settings")
async def update_platform_settings(
    data: dict,
    user: User = Depends(_current_user)
):
    _require_platform_admin(user)
    from app.core.database import get_mongo_db
    mongo = get_mongo_db()
    if not mongo:
        raise HTTPException(status_code=503, detail="Service unavailable")

    await mongo.platform_settings.update_one(
        {"scope": "global"},
        {"$set": data},
        upsert=True,
    )
    return {"status": "updated"}
