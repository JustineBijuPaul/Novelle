import asyncio
import sys
import os
from datetime import datetime, timezone, timedelta, date

# Add the parent directory to sys.path to import app
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.database import AsyncSessionLocal, init_db
from app.models.user import User, UserRole
from app.models.clinical import Appointment, Medication
from app.models.doctor import Doctor
from app.models.health import HealthLog
from app.models.mental import MentalHealthAssessment
from app.models.risk import RiskScore
from app.models.hospital import Hospital
from app.models.profile import PregnancyProfile
from app.core.security import hash_password

async def seed():
    print("🌱 Seeding patient data...")
    async with AsyncSessionLocal() as db:
        # 1. Create a Hospital
        hosp_res = await db.execute(select(Hospital).limit(1))
        hospital = hosp_res.scalar_one_or_none()
        if not hospital:
            hospital = Hospital(
                name="Central Maternity Hospital",
                address="123 Care Ave, Health City",
                contact_number="+1-800-MATERNAL",
                is_emergency_capable=True
            )
            db.add(hospital)
            await db.commit()
            await db.refresh(hospital)
            print(f"✅ Created hospital: {hospital.name}")

        # 2. Create a Patient
        patient_email = "patient@example.com"
        res = await db.execute(select(User).where(User.email == patient_email))
        patient = res.scalar_one_or_none()
        if not patient:
            patient = User(
                email=patient_email,
                password_hash=hash_password("password123"),
                full_name="Justine Paul",
                role=UserRole.pregnant_user,
                is_active=True
            )
            db.add(patient)
            await db.commit()
            await db.refresh(patient)
            print(f"✅ Created patient: {patient.full_name}")

        # 3. Create a Doctor
        doc_email = "doctor@example.com"
        res = await db.execute(select(User).where(User.email == doc_email))
        doc_user = res.scalar_one_or_none()
        if not doc_user:
            doc_user = User(
                email=doc_email,
                password_hash=hash_password("password123"),
                full_name="Dr. Sarah Wilson",
                role=UserRole.doctor,
                is_active=True
            )
            db.add(doc_user)
            await db.commit()
            await db.refresh(doc_user)

        res = await db.execute(select(Doctor).where(Doctor.id == doc_user.id))
        doctor = res.scalar_one_or_none()
        if not doctor:
            doctor = Doctor(
                id=doc_user.id,
                name="Dr. Sarah Wilson",
                specialty="Obstetrics & Gynecology",
                hospital_id=hospital.id,
                available_for_escalation=True
            )
            db.add(doctor)
            await db.commit()
            print(f"✅ Created doctor: {doctor.name}")

        # 4. Create Risk History
        print("📊 Creating risk history...")
        for i in range(10):
            risk = RiskScore(
                user_id=patient.id,
                overall_risk_level="MEDIUM" if i % 3 == 0 else "LOW",
                physical_risk_level="LOW",
                mental_risk_level="MEDIUM" if i % 2 == 0 else "LOW",
                fetal_risk_level="LOW",
                physical_confidence=0.85 + (i * 0.01),
                mental_confidence=0.75 + (i * 0.02),
                scored_at=datetime.now(timezone.utc) - timedelta(days=i)
            )
            db.add(risk)

        # 5. Create Health Logs
        print("📈 Creating health logs...")
        for i in range(14):
            log = HealthLog(
                user_id=patient.id,
                log_date=date.today() - timedelta(days=i),
                bp_systolic=110 + (i % 5),
                bp_diastolic=70 + (i % 3),
                weight_kg=64.5 + (i * 0.1),
                blood_sugar_fasting=92.0 + (i % 4),
                sleep_quality=4,
                nausea_severity=1 if i % 4 == 0 else 0,
                hydration_ml=2000 + (i * 50),
                pregnancy_week=24 - (i // 7)
            )
            db.add(log)

        # 6. Create Mental Assessments
        print("🧠 Creating mental assessments...")
        for i in range(7):
            assessment = MentalHealthAssessment(
                user_id=patient.id,
                assessment_date=date.today() - timedelta(days=i),
                mood_score=7 + (i % 3),
                stress_level=3 + (i % 2),
                social_support_score=5,
                phq9_score=2,
                gad7_score=1
            )
            db.add(assessment)

        # 7. Create Medications
        print("💊 Creating medications...")
        meds = [
            ("Prenatal Vitamins", "1 pill", "Daily"),
            ("Iron Supplement", "1 tablet", "Daily"),
            ("Folic Acid", "400mcg", "Daily")
        ]
        for name, dose, freq in meds:
            med = Medication(
                patient_id=patient.id,
                doctor_id=doc_user.id,
                name=name,
                dosage=dose,
                frequency=freq,
                is_active=True
            )
            db.add(med)

        # 8. Create Appointments
        print("📅 Creating appointments...")
        appos = [
            (datetime.now(timezone.utc) + timedelta(days=3), "Routine Checkup", "routine_checkup"),
            (datetime.now(timezone.utc) + timedelta(days=14), "Anomaly Scan", "scan"),
            (datetime.now(timezone.utc) - timedelta(days=10), "Follow-up", "follow_up")
        ]
        for dt, reason, type in appos:
            appo = Appointment(
                patient_id=patient.id,
                doctor_id=doc_user.id,
                appointment_date=dt,
                reason=reason,
                appointment_type=type,
                status="scheduled" if dt > datetime.now(timezone.utc) else "completed"
            )
            db.add(appo)

        await db.commit()
        print("✨ Database seeded successfully!")

from sqlalchemy import select

if __name__ == "__main__":
    asyncio.run(seed())
