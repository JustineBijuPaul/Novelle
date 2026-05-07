import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import AsyncSessionLocal, engine
from app.models.user import User
from app.models.clinical import ClinicalNote, Appointment, Medication
from app.models.risk import RiskScore
from datetime import datetime, timedelta, date, timezone

async def seed_clinical():
    async with AsyncSessionLocal() as db:
        # Get patient and doctor
        result = await db.execute(User.__table__.select().where(User.email == "patient@novelle.com"))
        patient = result.fetchone()
        
        result = await db.execute(User.__table__.select().where(User.email == "doctor@novelle.com"))
        doctor = result.fetchone()
        
        if not patient or not doctor:
            print("Patient or Doctor not found. Please run seed_users.py first.")
            return

        # 1. Add Clinical Notes
        notes = [
            ClinicalNote(
                patient_id=patient.id,
                doctor_id=doctor.id,
                note_type="consultation",
                content="Patient reported mild nausea in the mornings. BP is stable. Recommend increasing hydration and smaller, more frequent meals.",
                ai_summary="Stable condition. Morning nausea reported. Recommended hydration & diet changes."
            ),
            ClinicalNote(
                patient_id=patient.id,
                doctor_id=doctor.id,
                note_type="follow-up",
                content="Second trimester screening completed. Fetal growth is on track. Hemoglobin levels slightly low, starting iron supplements.",
                ai_summary="Fetal growth normal. Low hemoglobin detected; iron supplements prescribed."
            )
        ]
        
        # 2. Add Appointments
        appointments = [
            Appointment(
                patient_id=patient.id,
                doctor_id=doctor.id,
                appointment_date=datetime.now() + timedelta(days=4, hours=2),
                reason="Routine Checkup & Scan",
                appointment_type="scan"
            ),
            Appointment(
                patient_id=patient.id,
                doctor_id=doctor.id,
                appointment_date=datetime.now() + timedelta(days=12),
                reason="Telehealth Follow-up",
                appointment_type="video_call",
                telemedicine_link="https://meet.novelle.ai/patient-123"
            )
        ]
        
        # 3. Add Medications
        medications = [
            Medication(
                patient_id=patient.id,
                doctor_id=doctor.id,
                name="Prenatal Vitamins",
                dosage="1 tablet",
                frequency="daily",
                instructions="Take with food in the morning",
                start_date=date.today() - timedelta(days=30)
            ),
            Medication(
                patient_id=patient.id,
                doctor_id=doctor.id,
                name="Iron Supplement",
                dosage="200mg",
                frequency="daily",
                instructions="Take on empty stomach for better absorption",
                start_date=date.today() - timedelta(days=2)
            )
        ]
        
        # 4. Add Risk Scores with SHAP features
        risk_scores = [
            RiskScore(
                user_id=patient.id,
                mental_risk_level="MEDIUM",
                physical_risk_level="MEDIUM",
                fetal_risk_level="LOW",
                mental_confidence=0.88,
                physical_confidence=0.91,
                fetal_confidence=0.94,
                shap_features_json={
                    "physical": {
                        "bp_systolic": 0.15,
                        "weight_gain": 0.05,
                        "age": 0.02
                    },
                    "mental": {
                        "mood_score": -0.12,
                        "stress_level": 0.08,
                        "sleep_quality": 0.04
                    }
                },
                scored_at=datetime.now(timezone.utc) - timedelta(days=1)
            ),
            RiskScore(
                user_id=patient.id,
                mental_risk_level="LOW",
                physical_risk_level="LOW",
                fetal_risk_level="LOW",
                mental_confidence=0.92,
                physical_confidence=0.94,
                scored_at=datetime.now(timezone.utc) - timedelta(days=5)
            )
        ]
        
        db.add_all(notes)
        db.add_all(appointments)
        db.add_all(medications)
        db.add_all(risk_scores)
        await db.commit()
        print("✅ Clinical and Risk dummy data seeded successfully")

if __name__ == "__main__":
    asyncio.run(seed_clinical())
