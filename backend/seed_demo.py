import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.core.database import AsyncSessionLocal, engine
from app.models.user import User, UserRole
from app.models.profile import PregnancyProfile
from app.models.clinical import ClinicalNote, Appointment, Medication
from app.models.risk import RiskScore
from app.models.health import HealthLog
from app.models.mental import MentalHealthAssessment
from datetime import datetime, timedelta, date, timezone
from app.core.security import hash_password

async def seed_demo():
    async with AsyncSessionLocal() as db:
        print("🌱 Seeding Demo Data...")
        
        # 1. Create Demo Doctor
        doctor_email = "doctor@novelle.com"
        doctor_res = await db.execute(text(f"SELECT id FROM users WHERE email='{doctor_email}'"))
        doctor = doctor_res.fetchone()
        
        if not doctor:
            print(f"Creating doctor: {doctor_email}")
            doctor_user = User(
                email=doctor_email,
                password_hash=hash_password("Password123"),
                full_name="Dr. Arsha Suresh",
                role=UserRole.doctor.value,
                is_active=True,
                is_verified=True
            )
            db.add(doctor_user)
            await db.flush()
            doctor_id = doctor_user.id
        else:
            doctor_id = doctor[0]

        # 2. Create Demo Patient
        patient_email = "patient@novelle.com"
        patient_res = await db.execute(text(f"SELECT id FROM users WHERE email='{patient_email}'"))
        patient = patient_res.fetchone()
        
        if not patient:
            print(f"Creating patient: {patient_email}")
            patient_user = User(
                email=patient_email,
                password_hash=hash_password("Password123"),
                full_name="Priya Sharma",
                role=UserRole.pregnant_user.value,
                is_active=True,
                is_verified=True,
                city="Bengaluru"
            )
            db.add(patient_user)
            await db.flush()
            patient_id = patient_user.id
            
            # Create Profile
            profile = PregnancyProfile(
                user_id=patient_id,
                age=28,
                pregnancy_week=24,
                trimester="second",
                due_date=date(2026, 8, 15)
            )
            db.add(profile)
        else:
            patient_id = patient[0]

        # Ensure profile exists
        prof_check = await db.execute(text(f"SELECT id FROM pregnancy_profiles WHERE user_id={patient_id}"))
        if not prof_check.fetchone():
            print("Creating pregnancy profile for patient...")
            profile = PregnancyProfile(
                user_id=patient_id,
                age=28,
                pregnancy_week=24,
                trimester="second",
                due_date=date(2026, 8, 15)
            )
            db.add(profile)
            await db.flush()

        # 3. Add Clinical Data
        # Notes
        notes = [
            ClinicalNote(patient_id=patient_id, doctor_id=doctor_id, note_type="routine", content="Patient reports mild fatigue. Vitals stable. Advised increased hydration."),
            ClinicalNote(patient_id=patient_id, doctor_id=doctor_id, note_type="emergency", content="Contacted regarding slight swelling in ankles. Recommended elevation and compression socks.")
        ]
        
        # Appointments
        appointments = [
            Appointment(patient_id=patient_id, doctor_id=doctor_id, appointment_date=datetime.now() + timedelta(days=5), reason="Routine Prenatal Checkup", status="scheduled"),
            Appointment(patient_id=patient_id, doctor_id=doctor_id, appointment_date=datetime.now() + timedelta(days=20), reason="Anomaly Scan Review", status="scheduled")
        ]
        
        # Medications
        medications = [
            Medication(patient_id=patient_id, doctor_id=doctor_id, name="Folic Acid", dosage="400mcg", frequency="Daily", instructions="Take with breakfast", is_active=True),
            Medication(patient_id=patient_id, doctor_id=doctor_id, name="Iron Supplement", dosage="60mg", frequency="Daily", instructions="Do not take with milk", is_active=True)
        ]
        
        # Risk Scores
        risk_scores = [
            RiskScore(
                user_id=patient_id,
                mental_risk_level="LOW",
                physical_risk_level="MEDIUM",
                fetal_risk_level="LOW",
                physical_confidence=0.92,
                mental_confidence=0.88,
                shap_features_json={"physical": {"bp_systolic": 0.12, "weight": 0.04}},
                scored_at=datetime.now(timezone.utc)
            )
        ]

        # Health Logs (for trends)
        today = date.today()
        logs = []
        for i in range(14):
            logs.append(HealthLog(
                user_id=patient_id,
                log_date=today - timedelta(days=i),
                bp_systolic=115 + (i % 5),
                bp_diastolic=75 + (i % 3),
                weight_kg=62.0 + (i * 0.1),
                pregnancy_week=24
            ))

        db.add_all(notes)
        db.add_all(appointments)
        db.add_all(medications)
        db.add_all(risk_scores)
        db.add_all(logs)
        
        await db.commit()
        print("✅ Demo data seeded successfully!")

if __name__ == "__main__":
    asyncio.run(seed_demo())
