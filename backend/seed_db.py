
import asyncio
import csv
import os
import random
import sys
from datetime import datetime, timedelta, timezone

# Add parent directory to path to import app
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.database import AsyncSessionLocal, engine, Base
from app.core.security import hash_password
from app.models.user import User, UserRole
from app.models.hospital import Hospital
from app.models.doctor import Doctor
from app.models.profile import PregnancyProfile
from app.models.health import HealthLog
from app.models.escalation import Escalation

DATASET_PATH = "../ml/datasets"

async def clear_db():
    print("🧹 Clearing existing data...")
    async with engine.begin() as conn:
        # Tables to clear in order
        tables = [
            "escalations", "health_logs", "pregnancy_profiles", 
            "doctors", "users", "hospitals"
        ]
        for table in tables:
            await conn.execute(f"DELETE FROM {table}")
    print("✅ DB cleared")

async def seed():
    async with AsyncSessionLocal() as db:
        print("🏥 Creating Hospitals...")
        hospitals = []
        h_names = ["City Maternity Hub", "St. Mary's General", "Grace Women's Clinic"]
        for name in h_names:
            h = Hospital(
                name=name,
                address=f"123 {name} St",
                city="Mumbai",
                state="Maharashtra",
                is_emergency_capable=True,
                is_24x7=True,
                hospital_type="maternity" if "Maternity" in name or "Clinic" in name else "general"
            )
            db.add(h)
            hospitals.append(h)
        await db.commit()
        for h in hospitals:
            await db.refresh(h)

        print("👨‍💼 Creating Hospital Admins...")
        admins = []
        for i, h in enumerate(hospitals):
            admin = User(
                email=f"admin{i+1}@hospital.com",
                password_hash=hash_password("admin123"),
                full_name=f"{h.name} Admin",
                role=UserRole.hospital_admin,
                hospital_id=h.id,
                is_active=True,
                is_verified=True
            )
            db.add(admin)
            admins.append(admin)
        await db.commit()

        print("👨‍⚕️ Creating Doctors...")
        doctors = []
        specialties = ["OB-GYN", "Maternal-Fetal Medicine", "Lactation Specialist", "Mental Health"]
        for i in range(6):
            h = hospitals[i % 3]
            user = User(
                email=f"doctor{i+1}@novelle.com",
                password_hash=hash_password("doctor123"),
                full_name=f"Dr. {['Sharma', 'Patel', 'Reddy', 'Gupta', 'Verma', 'Nair'][i]}",
                role=UserRole.doctor,
                hospital_id=h.id,
                is_active=True,
                is_verified=True
            )
            db.add(user)
            await db.flush()
            
            doc = Doctor(
                user_id=user.id,
                name=user.full_name,
                specialty=specialties[i % len(specialties)],
                hospital_id=h.id,
                email=user.email,
                license_number=f"LIC-2024-{100+i}"
            )
            db.add(doc)
            doctors.append(doc)
        await db.commit()

        print("🤰 Creating Patients & Profiles from CSV...")
        # Load profile data from synthetic_profiles.csv
        profile_data = []
        with open(os.path.join(DATASET_PATH, "synthetic_profiles.csv"), "r") as f:
            reader = csv.DictReader(f)
            for row in reader:
                profile_data.append(row)

        patients = []
        # Create 10 pregnant, 10 postpartum
        for i in range(20):
            role = UserRole.pregnant_user if i < 10 else UserRole.postpartum_user
            h = hospitals[i % 3]
            
            user = User(
                email=f"user{i+1}@example.com",
                password_hash=hash_password("user123"),
                full_name=f"Patient {i+1}",
                role=role,
                hospital_id=h.id,
                is_active=True,
                is_verified=True
            )
            db.add(user)
            await db.flush()
            
            # Map CSV data to profile
            raw = profile_data[i % len(profile_data)]
            prof = PregnancyProfile(
                user_id=user.id,
                age=int(raw['age']),
                height_cm=float(raw['height_cm']),
                weight_kg=float(raw['weight_kg']),
                bmi=float(raw['bmi']),
                pregnancy_week=int(raw['pregnancy_week']) if role == UserRole.pregnant_user else 42,
                trimester=raw['trimester'] if role == UserRole.pregnant_user else "postpartum",
                blood_group=raw['blood_group'],
                previous_pregnancies=int(raw['previous_pregnancies']),
                hemoglobin_level=float(raw['hemoglobin_level']),
                gestational_diabetes=raw['gestational_diabetes'].lower() == 'true',
                chronic_hypertension=raw['chronic_hypertension'].lower() == 'true',
                past_complications=[] # Simplified
            )
            db.add(prof)
            patients.append(user)

        await db.commit()

        print("📝 Creating Health Logs from CSV...")
        log_data = []
        with open(os.path.join(DATASET_PATH, "synthetic_health_logs.csv"), "r") as f:
            reader = csv.DictReader(f)
            for row in reader:
                log_data.append(row)

        for i, user in enumerate(patients):
            # Add 5 logs for each user
            for j in range(5):
                raw_log = log_data[(i * 5 + j) % len(log_data)]
                log = HealthLog(
                    user_id=user.id,
                    log_date=datetime.now(timezone.utc).date() - timedelta(days=j),
                    bp_systolic=int(raw_log['bp_systolic']),
                    bp_diastolic=int(raw_log['bp_diastolic']),
                    blood_sugar_fasting=float(raw_log['blood_sugar_fasting']),
                    weight_kg=float(raw_log['weight_kg']),
                    sleep_quality=int(raw_log['sleep_quality']),
                    pain_score=int(raw_log['pain_score']),
                    fetal_movement_count=int(raw_log['fetal_movement_count']) if user.role == UserRole.pregnant_user else 0,
                    edema_flag=raw_log['edema_flag'].lower() == 'true',
                    bleeding_flag=raw_log['bleeding_flag'].lower() == 'true',
                    cramps_flag=raw_log['cramps_flag'].lower() == 'true',
                    pregnancy_week=int(raw_log['pregnancy_week'])
                )
                db.add(log)
        
        await db.commit()

        print("🚨 Creating a few Escalations for realism...")
        for i in range(3):
            p = patients[i]
            doc = random.choice([d for d in doctors if d.hospital_id == p.hospital_id])
            esc = Escalation(
                user_id=p.id,
                risk_type=random.choice(["physical", "mental"]),
                risk_level=random.choice(["HIGH", "MEDIUM"]),
                severity="URGENT",
                escalation_reason="High BP detected in logs",
                assigned_doctor_id=doc.id,
                status="pending"
            )
            db.add(esc)
        
        await db.commit()
        print("✨ Seeding complete!")

if __name__ == "__main__":
    asyncio.run(seed())
