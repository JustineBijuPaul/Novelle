import asyncio
from sqlalchemy import select, delete
from app.core.database import AsyncSessionLocal
from app.models.user import User, UserRole
from app.models.profile import PregnancyProfile
from app.models.health import HealthLog
from app.models.risk import RiskScore
from datetime import datetime, date, timedelta, timezone

async def populate_sarah():
    async with AsyncSessionLocal() as db:
        # 1. Get Sarah
        res = await db.execute(select(User).where(User.id == 8))
        sarah = res.scalar_one_or_none()
        
        if not sarah:
            print("Sarah (ID 8) not found. Creating her...")
            sarah = User(
                id=8,
                email="sarah@example.com",
                password_hash="hashed_pwd",
                full_name="Sarah Johnson",
                role=UserRole.patient,
                is_active=True,
                is_verified=True
            )
            db.add(sarah)
            await db.commit()
            await db.refresh(sarah)

        # 2. Check/Create Pregnancy Profile
        res = await db.execute(select(PregnancyProfile).where(PregnancyProfile.user_id == 8))
        profile = res.scalar_one_or_none()
        
        # Use naive datetime for columns that are TIMESTAMP WITHOUT TIME ZONE
        due_date = datetime.now() + timedelta(days=100)
        
        if not profile:
            print("Creating pregnancy profile...")
            profile = PregnancyProfile(
                user_id=8,
                age=28,
                height_cm=165.0,
                weight_kg=68.5,
                bmi=25.2,
                pregnancy_week=24,
                trimester="second",
                due_date=due_date,
                blood_group="O+",
                previous_pregnancies=0,
                hemoglobin_level=12.5,
                profile_completion_score=85
            )
            db.add(profile)
        else:
            print("Updating pregnancy profile...")
            profile.pregnancy_week = 24
            profile.trimester = "second"
            profile.due_date = due_date
            profile.age = 28
            profile.weight_kg = 68.5
            profile.blood_group = "O+"
            profile.profile_completion_score = 90

        # 3. Add some health logs for the weight trend
        print("Adding health logs...")
        await db.execute(delete(HealthLog).where(HealthLog.user_id == 8))
        
        today = date.today()
        for i in range(10):
            log_date = today - timedelta(days=(9-i)*7)
            weight = 60.0 + (i * 0.8) # Weight gain trend
            log = HealthLog(
                user_id=8,
                log_date=log_date,
                weight_kg=weight,
                bp_systolic=110 + (i % 5),
                bp_diastolic=70 + (i % 3),
                blood_sugar_fasting=85.0 + (i % 10),
                fetal_movement_count=10 + (i % 5),
                pregnancy_week=15 + i
            )
            db.add(log)

        # 4. Add a Risk Score
        print("Adding risk score...")
        await db.execute(delete(RiskScore).where(RiskScore.user_id == 8))
        
        risk = RiskScore(
            user_id=8,
            mental_risk_level="LOW",
            physical_risk_level="LOW",
            fetal_risk_level="LOW",
            mental_confidence=0.92,
            physical_confidence=0.88,
            fetal_confidence=0.95,
            flagged_for_escalation=False,
            crisis_flag="SAFE",
            scored_at=datetime.now(timezone.utc)
        )
        db.add(risk)

        await db.commit()
        print("Successfully populated data for Sarah (ID 8)")

if __name__ == "__main__":
    import os
    import sys
    # Add project root to sys.path
    sys.path.append(os.getcwd())
    asyncio.run(populate_sarah())
