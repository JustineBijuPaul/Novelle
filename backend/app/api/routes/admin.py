"""Admin routes — user management, hospital management, doctor management."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func
from datetime import datetime, timezone
from app.core.database import get_db
from app.models.user import User, UserRole
from app.models.hospital import Hospital
from app.models.doctor import Doctor
from app.models.profile import PregnancyProfile
from app.models.risk import RiskScore
from app.api.routes.auth import _current_user
from pydantic import BaseModel, Field
from typing import Optional, List


router = APIRouter(prefix="/admin", tags=["Admin Portal"])


def _require_admin(user: User):
    role_val = user.role.value if isinstance(user.role, UserRole) else user.role
    if role_val != UserRole.platform_admin.value:
        raise HTTPException(status_code=403, detail="Admin access required")


# ── User Management ──────────────────────────────────────


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None
    city: Optional[str] = None
    state: Optional[str] = None


@router.get("/users")
async def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    role: Optional[str] = None,
    search: Optional[str] = None,
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_admin(user)
    query = select(User)
    if role:
        query = query.where(User.role == role)
    if search:
        query = query.where(
            User.full_name.ilike(f"%{search}%") | User.email.ilike(f"%{search}%")
        )
    query = query.order_by(desc(User.created_at)).offset(skip).limit(limit)
    result = await db.execute(query)
    users = result.scalars().all()

    count_query = select(func.count(User.id))
    if role:
        count_query = count_query.where(User.role == role)
    if search:
        count_query = count_query.where(
            User.full_name.ilike(f"%{search}%") | User.email.ilike(f"%{search}%")
        )
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    return {
        "users": [
            {
                "id": u.id,
                "email": u.email,
                "full_name": u.full_name,
                "phone": u.phone,
                "role": u.role.value if isinstance(u.role, UserRole) else u.role,
                "is_active": u.is_active,
                "city": u.city,
                "state": u.state,
                "created_at": u.created_at.isoformat() if u.created_at else None,
            }
            for u in users
        ],
        "total": total,
    }


@router.put("/users/{user_id}")
async def update_user(
    user_id: int,
    data: UserUpdate,
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_admin(user)
    result = await db.execute(select(User).where(User.id == user_id))
    target = result.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    if data.full_name is not None:
        target.full_name = data.full_name
    if data.role is not None:
        target.role = data.role
    if data.is_active is not None:
        target.is_active = data.is_active
    if data.city is not None:
        target.city = data.city
    if data.state is not None:
        target.state = data.state

    await db.commit()
    await db.refresh(target)
    return {
        "id": target.id,
        "email": target.email,
        "full_name": target.full_name,
        "role": target.role.value if isinstance(target.role, UserRole) else target.role,
        "is_active": target.is_active,
    }


@router.delete("/users/{user_id}")
async def deactivate_user(
    user_id: int,
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_admin(user)
    if user_id == user.id:
        raise HTTPException(status_code=400, detail="Cannot deactivate yourself")
    result = await db.execute(select(User).where(User.id == user_id))
    target = result.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    target.is_active = False
    await db.commit()
    return {"status": "deactivated", "user_id": user_id}


@router.get("/stats")
async def get_admin_stats(
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_admin(user)

    total_users = (await db.execute(select(func.count(User.id)))).scalar() or 0
    active_users = (await db.execute(
        select(func.count(User.id)).where(User.is_active == True)
    )).scalar() or 0
    total_doctors = (await db.execute(
        select(func.count(User.id)).where(
            User.role == UserRole.doctor.value
        )
    )).scalar() or 0
    total_hospitals = (await db.execute(select(func.count(Hospital.id)))).scalar() or 0
    total_patients = (await db.execute(
        select(func.count(User.id)).where(
            User.role.in_([UserRole.pregnant_user.value, UserRole.postpartum_user.value])
        )
    )).scalar() or 0

    role_counts = {}
    for role in UserRole:
        count = (await db.execute(
            select(func.count(User.id)).where(User.role == role.value)
        )).scalar() or 0
        role_counts[role.value] = count

    return {
        "total_users": total_users,
        "active_users": active_users,
        "total_doctors": total_doctors,
        "total_hospitals": total_hospitals,
        "total_patients": total_patients,
        "role_counts": role_counts,
    }


# ── Hospital Management ──────────────────────────────────


class HospitalCreate(BaseModel):
    name: str = Field(..., min_length=1)
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    phone: Optional[str] = None
    location_lat: Optional[float] = None
    location_lng: Optional[float] = None
    has_obgyn: bool = False
    has_nicu: bool = False
    is_emergency_capable: bool = False
    is_24x7: bool = False
    hospital_type: str = "general"
    specialties: Optional[List[str]] = None
    rating: Optional[float] = None


class HospitalUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    phone: Optional[str] = None
    location_lat: Optional[float] = None
    location_lng: Optional[float] = None
    has_obgyn: Optional[bool] = None
    has_nicu: Optional[bool] = None
    is_emergency_capable: Optional[bool] = None
    is_24x7: Optional[bool] = None
    hospital_type: Optional[str] = None
    specialties: Optional[List[str]] = None
    rating: Optional[float] = None


@router.get("/hospitals")
async def list_hospitals(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    search: Optional[str] = None,
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_admin(user)
    query = select(Hospital)
    if search:
        query = query.where(
            Hospital.name.ilike(f"%{search}%") | Hospital.city.ilike(f"%{search}%")
        )
    query = query.order_by(desc(Hospital.created_at)).offset(skip).limit(limit)
    result = await db.execute(query)
    hospitals = result.scalars().all()

    count_query = select(func.count(Hospital.id))
    if search:
        count_query = count_query.where(
            Hospital.name.ilike(f"%{search}%") | Hospital.city.ilike(f"%{search}%")
        )
    total = (await db.execute(count_query)).scalar() or 0

    return {
        "hospitals": [
            {
                "id": h.id, "name": h.name, "address": h.address,
                "city": h.city, "state": h.state, "pincode": h.pincode,
                "phone": h.phone, "has_obgyn": h.has_obgyn, "has_nicu": h.has_nicu,
                "is_emergency_capable": h.is_emergency_capable, "is_24x7": h.is_24x7,
                "hospital_type": h.hospital_type, "specialties": h.specialties,
                "rating": h.rating,
                "location_lat": h.location_lat, "location_lng": h.location_lng,
            }
            for h in hospitals
        ],
        "total": total,
    }


@router.post("/hospitals", status_code=201)
async def create_hospital(
    data: HospitalCreate,
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_admin(user)
    hospital = Hospital(**data.model_dump(exclude_none=True))
    db.add(hospital)
    await db.commit()
    await db.refresh(hospital)
    return {
        "id": hospital.id, "name": hospital.name, "city": hospital.city,
        "status": "created",
    }


@router.put("/hospitals/{hospital_id}")
async def update_hospital(
    hospital_id: int,
    data: HospitalUpdate,
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_admin(user)
    result = await db.execute(select(Hospital).where(Hospital.id == hospital_id))
    hospital = result.scalar_one_or_none()
    if not hospital:
        raise HTTPException(status_code=404, detail="Hospital not found")

    update_data = data.model_dump(exclude_none=True)
    for key, value in update_data.items():
        setattr(hospital, key, value)

    await db.commit()
    await db.refresh(hospital)
    return {"id": hospital.id, "name": hospital.name, "status": "updated"}


@router.delete("/hospitals/{hospital_id}")
async def delete_hospital(
    hospital_id: int,
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_admin(user)
    result = await db.execute(select(Hospital).where(Hospital.id == hospital_id))
    hospital = result.scalar_one_or_none()
    if not hospital:
        raise HTTPException(status_code=404, detail="Hospital not found")
    await db.delete(hospital)
    await db.commit()
    return {"status": "deleted", "hospital_id": hospital_id}


# ── Doctor Management ────────────────────────────────────


class DoctorCreate(BaseModel):
    name: str = Field(..., min_length=1)
    email: Optional[str] = None
    specialty: str = "OB-GYN"
    hospital_id: Optional[int] = None
    contact: Optional[str] = None
    license_number: Optional[str] = None
    user_id: Optional[int] = None
    available_for_escalation: bool = True


class DoctorUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    specialty: Optional[str] = None
    hospital_id: Optional[int] = None
    contact: Optional[str] = None
    license_number: Optional[str] = None
    available_for_escalation: Optional[bool] = None


@router.get("/doctors")
async def list_doctors(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    search: Optional[str] = None,
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_admin(user)
    query = select(Doctor)
    if search:
        query = query.where(
            Doctor.name.ilike(f"%{search}%") | Doctor.email.ilike(f"%{search}%")
        )
    query = query.order_by(desc(Doctor.created_at)).offset(skip).limit(limit)
    result = await db.execute(query)
    doctors = result.scalars().all()

    count_query = select(func.count(Doctor.id))
    if search:
        count_query = count_query.where(
            Doctor.name.ilike(f"%{search}%") | Doctor.email.ilike(f"%{search}%")
        )
    total = (await db.execute(count_query)).scalar() or 0

    doctor_list = []
    for d in doctors:
        hospital_name = None
        if d.hospital_id:
            h_result = await db.execute(select(Hospital.name).where(Hospital.id == d.hospital_id))
            hospital_name = h_result.scalar_one_or_none()

        doctor_list.append({
            "id": d.id, "name": d.name, "email": d.email,
            "specialty": d.specialty, "contact": d.contact,
            "license_number": d.license_number,
            "hospital_id": d.hospital_id,
            "hospital_name": hospital_name,
            "user_id": d.user_id,
            "available_for_escalation": d.available_for_escalation,
        })

    return {"doctors": doctor_list, "total": total}


@router.post("/doctors", status_code=201)
async def create_doctor(
    data: DoctorCreate,
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_admin(user)
    doctor = Doctor(**data.model_dump(exclude_none=True))
    db.add(doctor)
    await db.commit()
    await db.refresh(doctor)
    return {"id": doctor.id, "name": doctor.name, "status": "created"}


@router.put("/doctors/{doctor_id}")
async def update_doctor(
    doctor_id: int,
    data: DoctorUpdate,
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_admin(user)
    result = await db.execute(select(Doctor).where(Doctor.id == doctor_id))
    doctor = result.scalar_one_or_none()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")

    update_data = data.model_dump(exclude_none=True)
    for key, value in update_data.items():
        setattr(doctor, key, value)

    await db.commit()
    await db.refresh(doctor)
    return {"id": doctor.id, "name": doctor.name, "status": "updated"}


@router.delete("/doctors/{doctor_id}")
async def delete_doctor(
    doctor_id: int,
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_admin(user)
    result = await db.execute(select(Doctor).where(Doctor.id == doctor_id))
    doctor = result.scalar_one_or_none()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    await db.delete(doctor)
    await db.commit()
    return {"status": "deleted", "doctor_id": doctor_id}
