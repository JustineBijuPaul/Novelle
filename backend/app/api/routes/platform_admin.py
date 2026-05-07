from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from datetime import datetime, timedelta, timezone

from app.core.database import get_db
from app.api.routes.auth import _current_user
from app.models.user import User
from app.models.hospital import Hospital
from app.models.doctor import Doctor
from app.models.risk import RiskScore

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
    critical_escalations = (await db.execute(select(func.count(RiskScore.id)).where(RiskScore.physical_risk_level == "HIGH"))).scalar() or 0
    
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

@router.get("/infrastructure")
async def get_infra_status(
    user: User = Depends(_current_user)
):
    _require_platform_admin(user)
    return {
        "servers": [
            {"id": "us-east-1", "region": "Virginia", "status": "ONLINE", "load": 42},
            {"id": "eu-west-1", "region": "Ireland", "status": "ONLINE", "load": 28}
        ],
        "databases": [
            {"name": "Novelle-Prod", "engine": "PostgreSQL", "status": "HEALTHY", "size": "1.2 TB"},
            {"name": "Novelle-Analytics", "engine": "BigQuery", "status": "HEALTHY", "size": "45 TB"}
        ],
        "latency": [45, 48, 52, 49, 47]
    }
