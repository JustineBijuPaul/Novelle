"""Profile routes — pregnancy profile CRUD."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.models.user import User
from app.models.profile import PregnancyProfile
from app.schemas.profile import ProfileCreate, ProfileUpdate, ProfileResponse
from app.api.routes.auth import _current_user

router = APIRouter(prefix="/profile", tags=["Pregnancy Profile"])


@router.post("/create", response_model=ProfileResponse, status_code=201)
@router.post("/", response_model=ProfileResponse, status_code=201)
async def create_profile(
    data: ProfileCreate,
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Check existing
    result = await db.execute(
        select(PregnancyProfile).where(PregnancyProfile.user_id == user.id)
    )
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="Profile already exists. Use PUT to update.")

    profile = PregnancyProfile(user_id=user.id, **data.model_dump())
    profile.compute_bmi()
    profile.compute_trimester()
    profile.compute_completion_score()

    db.add(profile)
    await db.commit()
    await db.refresh(profile)
    return ProfileResponse.model_validate(profile)


@router.get("/", response_model=ProfileResponse)
async def get_profile(
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(PregnancyProfile).where(PregnancyProfile.user_id == user.id)
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found. Please complete onboarding.")
    return ProfileResponse.model_validate(profile)


@router.put("/update", response_model=ProfileResponse)
@router.put("/", response_model=ProfileResponse)
async def update_profile(
    data: ProfileUpdate,
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(PregnancyProfile).where(PregnancyProfile.user_id == user.id)
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(profile, field, value)

    profile.compute_bmi()
    profile.compute_trimester()
    profile.compute_completion_score()

    await db.commit()
    await db.refresh(profile)
    return ProfileResponse.model_validate(profile)
