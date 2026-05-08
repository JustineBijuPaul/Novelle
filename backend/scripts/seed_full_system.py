"""
Novelle — Full System Seed Script
Populates PostgreSQL and MongoDB with comprehensive realistic data.

Usage:
    cd backend && source venv/bin/activate && python scripts/seed_full_system.py
"""

import sys
import os
import random
from datetime import datetime, timezone, timedelta, date

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import psycopg2
import psycopg2.extras
from pymongo import MongoClient
from bson import ObjectId

# ─────────────────────────────────────────────────────────────────────────────
# Configuration
# ─────────────────────────────────────────────────────────────────────────────

PG_DSN = "postgresql://neondb_owner:npg_L6xgaFW3lAwy@ep-late-glade-a1jpp3io.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"
MONGO_URI = "mongodb://novelle_user:novelle_mongo_pwd@localhost:27017/novelle_db?authSource=admin"
MONGO_DB = "novelle_db"

PASSWORD_HASH = "$2b$12$RPND8FgOZbx.57x5JEIhsOT3RJjWNKtSO99JfWyC95/FyVQNT8qGa"

NOW = datetime.now(timezone.utc)
TODAY = date.today()

# ─────────────────────────────────────────────────────────────────────────────
# Realistic Data Pools
# ─────────────────────────────────────────────────────────────────────────────

PATIENT_DATA = [
    {"full_name": "Meera Venkatesh", "email": "meera.v@novelle.app", "phone": "+91-9845012345", "city": "Bengaluru", "state": "Karnataka", "role": "pregnant_user"},
    {"full_name": "Sneha Patil", "email": "sneha.p@novelle.app", "phone": "+91-9823056789", "city": "Pune", "state": "Maharashtra", "role": "pregnant_user"},
    {"full_name": "Ritu Malhotra", "email": "ritu.m@novelle.app", "phone": "+91-9811034567", "city": "New Delhi", "state": "Delhi", "role": "pregnant_user"},
    {"full_name": "Kavitha Nair", "email": "kavitha.n@novelle.app", "phone": "+91-9447012890", "city": "Mumbai", "state": "Maharashtra", "role": "pregnant_user"},
    {"full_name": "Deepa Reddy", "email": "deepa.r@novelle.app", "phone": "+91-9876501234", "city": "Bengaluru", "state": "Karnataka", "role": "pregnant_user"},
    {"full_name": "Anjali Gupta", "email": "anjali.g@novelle.app", "phone": "+91-9810023456", "city": "New Delhi", "state": "Delhi", "role": "postpartum_user"},
    {"full_name": "Fatima Sheikh", "email": "fatima.s@novelle.app", "phone": "+91-9820067890", "city": "Mumbai", "state": "Maharashtra", "role": "pregnant_user"},
]

DOCTOR_DATA = [
    {"full_name": "Dr. Rekha Iyer", "email": "dr.rekha@novelle.app", "phone": "+91-9845098765", "city": "Bengaluru", "state": "Karnataka", "specialty": "OB-GYN", "license": "KMC-OBG-2012-0198"},
    {"full_name": "Dr. Pooja Mehta", "email": "dr.pooja@novelle.app", "phone": "+91-9821034567", "city": "Mumbai", "state": "Maharashtra", "specialty": "Maternal-Fetal Medicine", "license": "MMC-MFM-2018-0054"},
    {"full_name": "Dr. Sunita Arora", "email": "dr.sunita@novelle.app", "phone": "+91-9811056789", "city": "New Delhi", "state": "Delhi", "specialty": "OB-GYN", "license": "DMC-OBG-2010-0311"},
]

PREGNANCY_PROFILES = [
    {"age": 26, "height_cm": 158.0, "weight_kg": 60.0, "week": 12, "trimester": "first", "blood_group": "B+", "prev_preg": 0, "hb": 11.8, "gd": False, "thyroid": "none", "hypertension": False},
    {"age": 30, "height_cm": 165.0, "weight_kg": 68.0, "week": 28, "trimester": "third", "blood_group": "A+", "prev_preg": 1, "hb": 10.5, "gd": True, "thyroid": "hypothyroid", "hypertension": False},
    {"age": 24, "height_cm": 155.0, "weight_kg": 55.0, "week": 18, "trimester": "second", "blood_group": "O+", "prev_preg": 0, "hb": 12.3, "gd": False, "thyroid": "none", "hypertension": False},
    {"age": 32, "height_cm": 160.0, "weight_kg": 72.0, "week": 34, "trimester": "third", "blood_group": "AB+", "prev_preg": 2, "hb": 9.8, "gd": True, "thyroid": "none", "hypertension": True},
    {"age": 27, "height_cm": 163.0, "weight_kg": 62.0, "week": 22, "trimester": "second", "blood_group": "B-", "prev_preg": 0, "hb": 11.5, "gd": False, "thyroid": "none", "hypertension": False},
    {"age": 35, "height_cm": 157.0, "weight_kg": 65.0, "week": 38, "trimester": "third", "blood_group": "O-", "prev_preg": 1, "hb": 10.2, "gd": False, "thyroid": "hyperthyroid", "hypertension": False},
    {"age": 29, "height_cm": 161.0, "weight_kg": 58.0, "week": 8, "trimester": "first", "blood_group": "A-", "prev_preg": 0, "hb": 12.0, "gd": False, "thyroid": "none", "hypertension": False},
]

SYMPTOMS_POOL = ["nausea", "edema", "cramps", "headache", "back pain", "fatigue", "heartburn"]
STRESS_REASONS = [
    "Work pressure and long commutes",
    "Concerns about baby's health",
    "Financial worries about delivery costs",
    "Lack of sleep affecting daily routine",
    "Family expectations and advice overload",
    "Fear of labor and delivery complications",
]

CLINICAL_NOTES_CONTENT = [
    ("consultation", "Patient presents at 28 weeks with mild ankle edema. BP within normal range. Fetal heartbeat regular at 142 bpm. Advised compression stockings and elevation. Follow-up in 2 weeks."),
    ("follow_up", "Follow-up visit post glucose tolerance test. GDM confirmed. Started on dietary management plan. Referred to nutritionist. Blood sugar monitoring log reviewed — fasting values trending higher."),
    ("assessment", "Third trimester assessment: Weight gain appropriate. Baby in cephalic presentation. Cervix long and closed. NST reactive. No signs of preeclampsia. Continue current medication regimen."),
    ("consultation", "Patient reports increased fetal movements and Braxton Hicks contractions. Cervical length adequate. No cervical changes. Reassured patient. Advised to monitor contraction frequency."),
    ("follow_up", "Post-iron infusion follow-up. Hemoglobin improved from 9.2 to 10.8 g/dL over 3 weeks. Fatigue significantly reduced. Continue oral iron supplementation."),
]

MEDICATION_LIST = [
    ("Folic Acid 5mg", "5mg", "once_daily", "Take after breakfast"),
    ("Ferrous Sulphate 200mg", "200mg", "twice_daily", "Take with vitamin C for better absorption"),
    ("Calcium + Vitamin D3", "500mg + 250IU", "once_daily", "Take after dinner"),
    ("Prenatal Multivitamin", "1 tablet", "once_daily", "Take with food in the morning"),
    ("Progesterone 200mg", "200mg", "once_daily", "Insert vaginally at bedtime"),
    ("Thyronorm 50mcg", "50mcg", "once_daily", "Take on empty stomach, 30 min before food"),
]


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def rand_bp():
    return random.randint(110, 140), random.randint(70, 90)

def rand_sugar():
    return round(random.uniform(80, 110), 1), round(random.uniform(100, 145), 1)

def rand_date_within(days_back):
    return NOW - timedelta(days=random.randint(0, days_back))

def rand_past_date(days_back):
    return TODAY - timedelta(days=random.randint(1, days_back))


# ─────────────────────────────────────────────────────────────────────────────
# PostgreSQL Seeding
# ─────────────────────────────────────────────────────────────────────────────

def seed_postgres():
    print("\n" + "=" * 60)
    print("  SEEDING POSTGRESQL")
    print("=" * 60)

    conn = psycopg2.connect(PG_DSN)
    conn.autocommit = False
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    try:
        # ── 1. Seed Patient Users ────────────────────────────────────────────
        print("\n[1/9] Creating patient users...")
        patient_ids = []
        for p in PATIENT_DATA:
            cur.execute("""
                INSERT INTO users (email, password_hash, full_name, phone, role, is_active, is_verified, city, state, country)
                VALUES (%(email)s, %(pwd)s, %(name)s, %(phone)s, %(role)s, TRUE, TRUE, %(city)s, %(state)s, 'India')
                ON CONFLICT (email) DO NOTHING
                RETURNING id
            """, {"email": p["email"], "pwd": PASSWORD_HASH, "name": p["full_name"],
                  "phone": p["phone"], "role": p["role"], "city": p["city"], "state": p["state"]})
            row = cur.fetchone()
            if row:
                patient_ids.append(row["id"])
                print(f"   + {p['full_name']} (id={row['id']})")
            else:
                cur.execute("SELECT id FROM users WHERE email = %s", (p["email"],))
                patient_ids.append(cur.fetchone()["id"])
                print(f"   ~ {p['full_name']} (already exists)")

        # ── 2. Seed Doctor Users ─────────────────────────────────────────────
        print("\n[2/9] Creating doctor users...")
        doctor_user_ids = []
        for d in DOCTOR_DATA:
            cur.execute("""
                INSERT INTO users (email, password_hash, full_name, phone, role, is_active, is_verified, city, state, country)
                VALUES (%(email)s, %(pwd)s, %(name)s, %(phone)s, 'doctor', TRUE, TRUE, %(city)s, %(state)s, 'India')
                ON CONFLICT (email) DO NOTHING
                RETURNING id
            """, {"email": d["email"], "pwd": PASSWORD_HASH, "name": d["full_name"],
                  "phone": d["phone"], "city": d["city"], "state": d["state"]})
            row = cur.fetchone()
            if row:
                doctor_user_ids.append(row["id"])
                print(f"   + {d['full_name']} (id={row['id']})")
            else:
                cur.execute("SELECT id FROM users WHERE email = %s", (d["email"],))
                doctor_user_ids.append(cur.fetchone()["id"])
                print(f"   ~ {d['full_name']} (already exists)")

        # Insert into doctors table
        cur.execute("SELECT id FROM hospitals LIMIT 3")
        hospital_ids = [r["id"] for r in cur.fetchall()] or [None]

        for i, d in enumerate(DOCTOR_DATA):
            h_id = hospital_ids[i % len(hospital_ids)]
            cur.execute("""
                INSERT INTO doctors (user_id, name, specialty, hospital_id, contact, email, license_number, available_for_escalation)
                VALUES (%(uid)s, %(name)s, %(spec)s, %(hid)s, %(contact)s, %(email)s, %(lic)s, TRUE)
                ON CONFLICT (user_id) DO NOTHING
            """, {"uid": doctor_user_ids[i], "name": d["full_name"], "spec": d["specialty"],
                  "hid": h_id, "contact": d["phone"], "email": d["email"], "lic": d["license"]})

        # Get all doctor IDs from the doctors table for FK references
        cur.execute("SELECT id FROM doctors")
        all_doctor_ids = [r["id"] for r in cur.fetchall()]
        if not all_doctor_ids:
            all_doctor_ids = [1]

        # Get existing user id=3 (dr.anita) as a doctor user_id for clinical data
        cur.execute("SELECT id FROM users WHERE email = 'dr.anita@novelle.app'")
        dr_anita_row = cur.fetchone()
        dr_anita_user_id = dr_anita_row["id"] if dr_anita_row else doctor_user_ids[0]

        # Include testuser (id=1) in patients for full data coverage
        cur.execute("SELECT id FROM users WHERE email = 'testuser@novelle.app'")
        test_user_row = cur.fetchone()
        if test_user_row:
            all_patient_ids = [test_user_row["id"]] + patient_ids
        else:
            all_patient_ids = patient_ids

        # ── 3. Seed Pregnancy Profiles ───────────────────────────────────────
        print("\n[3/9] Creating pregnancy profiles...")
        for i, pid in enumerate(patient_ids):
            prof = PREGNANCY_PROFILES[i % len(PREGNANCY_PROFILES)]
            h_m = prof["height_cm"] / 100
            bmi = round(prof["weight_kg"] / (h_m * h_m), 1)
            due_date = NOW + timedelta(days=(40 - prof["week"]) * 7)
            lmp = NOW - timedelta(days=prof["week"] * 7)
            completion = random.randint(70, 100)

            cur.execute("""
                INSERT INTO pregnancy_profiles (
                    user_id, age, height_cm, weight_kg, bmi, pregnancy_week, trimester,
                    due_date, last_menstrual_period, blood_group, previous_pregnancies,
                    hemoglobin_level, gestational_diabetes, thyroid_disorder,
                    chronic_hypertension, profile_completion_score
                ) VALUES (
                    %(uid)s, %(age)s, %(h)s, %(w)s, %(bmi)s, %(wk)s, %(tri)s,
                    %(due)s, %(lmp)s, %(bg)s, %(pp)s,
                    %(hb)s, %(gd)s, %(thy)s, %(ht)s, %(score)s
                ) ON CONFLICT (user_id) DO NOTHING
            """, {
                "uid": pid, "age": prof["age"], "h": prof["height_cm"], "w": prof["weight_kg"],
                "bmi": bmi, "wk": prof["week"], "tri": prof["trimester"],
                "due": due_date, "lmp": lmp, "bg": prof["blood_group"],
                "pp": prof["prev_preg"], "hb": prof["hb"], "gd": prof["gd"],
                "thy": prof["thyroid"], "ht": prof["hypertension"], "score": completion,
            })
        print(f"   Created {len(patient_ids)} pregnancy profiles")

        # ── 4. Seed Health Logs ──────────────────────────────────────────────
        print("\n[4/9] Creating health logs...")
        health_count = 0
        for pid in all_patient_ids:
            num_logs = random.randint(5, 10)
            for day_offset in random.sample(range(14), min(num_logs, 14)):
                sys_bp, dia_bp = rand_bp()
                fasting, postmeal = rand_sugar()
                weight = round(random.uniform(55, 85), 1)
                sleep = random.randint(3, 9)
                fetal = random.randint(5, 20)
                has_nausea = random.random() < 0.3
                has_edema = random.random() < 0.2
                has_cramps = random.random() < 0.25
                log_d = TODAY - timedelta(days=day_offset)

                cur.execute("""
                    INSERT INTO health_logs (
                        user_id, log_date, bp_systolic, bp_diastolic,
                        blood_sugar_fasting, blood_sugar_postmeal, weight_kg,
                        sleep_quality, pain_score, nausea_count, nausea_severity, dizziness,
                        edema_flag, edema_location, bleeding_flag, cramps_flag, cramps_intensity,
                        fetal_movement_count, appetite_score, hydration_ml, pregnancy_week, notes
                    ) VALUES (
                        %(uid)s, %(dt)s, %(sys)s, %(dia)s,
                        %(fast)s, %(post)s, %(wt)s,
                        %(sleep)s, %(pain)s, %(nc)s, %(ns)s, %(dizzy)s,
                        %(edema)s, %(eloc)s, %(bleed)s, %(cramp)s, %(ci)s,
                        %(fetal)s, %(app)s, %(hydra)s, %(wk)s, %(notes)s
                    ) ON CONFLICT DO NOTHING
                """, {
                    "uid": pid, "dt": log_d, "sys": sys_bp, "dia": dia_bp,
                    "fast": fasting, "post": postmeal, "wt": weight,
                    "sleep": sleep, "pain": random.randint(0, 3),
                    "nc": random.randint(1, 4) if has_nausea else 0,
                    "ns": random.randint(2, 5) if has_nausea else 0,
                    "dizzy": random.random() < 0.1,
                    "edema": has_edema, "eloc": "ankles" if has_edema else None,
                    "bleed": False, "cramp": has_cramps,
                    "ci": random.randint(2, 6) if has_cramps else 0,
                    "fetal": fetal, "app": random.randint(3, 5),
                    "hydra": random.randint(1500, 2800),
                    "wk": random.randint(8, 38),
                    "notes": random.choice(["Feeling good today", "Mild discomfort", "Baby very active", "Rested well", None]),
                })
                health_count += 1
        print(f"   Created {health_count} health log entries")

        # ── 5. Seed Mental Health Assessments ────────────────────────────────
        print("\n[5/9] Creating mental health assessments...")
        mental_count = 0
        mood_emojis = ["😊", "😐", "😔", "😟", "🙂", "😌", "😰"]
        for pid in all_patient_ids:
            num_assessments = random.randint(3, 5)
            for day_offset in random.sample(range(30), min(num_assessments, 30)):
                phq9 = random.randint(2, 18)
                gad7 = random.randint(1, 15)
                mood = random.randint(3, 9)
                stress = random.randint(2, 8)
                a_date = TODAY - timedelta(days=day_offset)

                cur.execute("""
                    INSERT INTO mental_health_assessments (
                        user_id, assessment_date, phq9_score, gad7_score,
                        mood_score, mood_emoji, stress_level, stress_reason,
                        social_support_score, assessment_type
                    ) VALUES (
                        %(uid)s, %(dt)s, %(phq)s, %(gad)s,
                        %(mood)s, %(emoji)s, %(stress)s, %(reason)s,
                        %(social)s, %(type)s
                    ) ON CONFLICT DO NOTHING
                """, {
                    "uid": pid, "dt": a_date, "phq": phq9, "gad": gad7,
                    "mood": mood, "emoji": random.choice(mood_emojis),
                    "stress": stress, "reason": random.choice(STRESS_REASONS),
                    "social": random.randint(2, 5),
                    "type": random.choice(["daily", "weekly_phq9", "weekly_gad7"]),
                })
                mental_count += 1
        print(f"   Created {mental_count} mental health assessments")

        # ── 6. Seed Risk Scores ──────────────────────────────────────────────
        print("\n[6/9] Creating risk scores...")
        risk_count = 0
        risk_levels = ["LOW", "LOW", "LOW", "MEDIUM", "MEDIUM", "HIGH"]
        for idx, pid in enumerate(all_patient_ids):
            num_scores = random.randint(2, 4)
            # Make 2 patients HIGH risk to trigger escalation workflows
            is_high_risk = idx in (1, 3)
            for day_offset in random.sample(range(14), min(num_scores, 14)):
                if is_high_risk:
                    mental_level = random.choice(["HIGH", "HIGH", "MEDIUM"])
                    physical_level = random.choice(["HIGH", "MEDIUM"])
                    fetal_level = random.choice(["MEDIUM", "HIGH", "LOW"])
                else:
                    mental_level = random.choice(risk_levels)
                    physical_level = random.choice(risk_levels)
                    fetal_level = random.choice(risk_levels)

                flagged = "HIGH" in (mental_level, physical_level, fetal_level)
                crisis = "URGENT" if (mental_level == "HIGH" and physical_level == "HIGH") else ("REVIEW_NEEDED" if flagged else "SAFE")

                scored_dt = NOW - timedelta(days=day_offset, hours=random.randint(0, 12))
                cur.execute("""
                    INSERT INTO risk_scores (
                        user_id, scored_at,
                        mental_risk_level, mental_confidence, depression_risk, anxiety_risk, isolation_detected, postpartum_risk,
                        physical_risk_level, physical_confidence, diabetes_risk, hypertension_risk, anemia_risk, infection_risk, nutrition_risk,
                        fetal_risk_level, fetal_confidence, preterm_risk, low_birth_weight_risk, growth_abnormality_risk, missed_care_risk,
                        flagged_for_escalation, crisis_flag
                    ) VALUES (
                        %(uid)s, %(scored)s,
                        %(ml)s, %(mc)s, %(dep)s, %(anx)s, %(iso)s, %(pp)s,
                        %(pl)s, %(pc)s, %(dia)s, %(ht)s, %(ane)s, %(inf)s, %(nut)s,
                        %(fl)s, %(fc)s, %(pre)s, %(lbw)s, %(grow)s, %(miss)s,
                        %(flag)s, %(crisis)s
                    ) ON CONFLICT DO NOTHING
                """, {
                    "uid": pid, "scored": scored_dt,
                    "ml": mental_level, "mc": round(random.uniform(0.6, 0.95), 2),
                    "dep": mental_level, "anx": random.choice(["LOW", "MEDIUM", mental_level]),
                    "iso": random.random() < 0.15, "pp": random.choice(["LOW", "MEDIUM"]),
                    "pl": physical_level, "pc": round(random.uniform(0.6, 0.95), 2),
                    "dia": physical_level if random.random() < 0.5 else "LOW",
                    "ht": random.choice(["LOW", physical_level]),
                    "ane": random.choice(["LOW", "MEDIUM"]),
                    "inf": "LOW", "nut": random.choice(["LOW", "MEDIUM"]),
                    "fl": fetal_level, "fc": round(random.uniform(0.6, 0.95), 2),
                    "pre": fetal_level, "lbw": random.choice(["LOW", fetal_level]),
                    "grow": random.choice(["LOW", "LOW", "MEDIUM"]),
                    "miss": random.choice(["LOW", "MEDIUM"]),
                    "flag": flagged, "crisis": crisis,
                })
                risk_count += 1
        print(f"   Created {risk_count} risk score entries")

        # ── 7. Seed Escalations ──────────────────────────────────────────────
        print("\n[7/9] Creating escalations...")
        escalation_data = [
            {"user_idx": 1, "risk_type": "mental", "level": "HIGH", "status": "pending",
             "reason": "PHQ-9 score elevated to 16. Patient reports persistent sadness and loss of interest for 2+ weeks."},
            {"user_idx": 3, "risk_type": "physical", "level": "HIGH", "status": "acknowledged",
             "reason": "Systolic BP consistently above 140 mmHg. Risk of preeclampsia flagged by ML model."},
            {"user_idx": 1, "risk_type": "fetal", "level": "MEDIUM", "status": "resolved",
             "reason": "Reduced fetal movement count (4 kicks in 2 hours). Patient advised to attend urgent scan."},
            {"user_idx": 0, "risk_type": "mental", "level": "MEDIUM", "status": "pending",
             "reason": "GAD-7 score at 14 with increasing anxiety trend over last 3 assessments."},
            {"user_idx": 3, "risk_type": "emergency", "level": "HIGH", "status": "resolved",
             "reason": "Patient reported severe headache with visual disturbances. BP was 155/98. Admitted for observation."},
            {"user_idx": 5, "risk_type": "physical", "level": "MEDIUM", "status": "acknowledged",
             "reason": "Hemoglobin dropped to 8.9 g/dL. Severe anemia requiring iron infusion consideration."},
        ]

        for esc in escalation_data:
            pid = all_patient_ids[esc["user_idx"] % len(all_patient_ids)]
            doc_id = random.choice(all_doctor_ids)
            triggered = NOW - timedelta(days=random.randint(1, 10))
            resolved_at = (triggered + timedelta(days=random.randint(1, 3))) if esc["status"] == "resolved" else None
            doc_notes = None
            if esc["status"] in ("acknowledged", "resolved"):
                doc_notes = random.choice([
                    "Reviewed patient records. Scheduling in-person consultation within 48 hours.",
                    "Patient contacted via telemedicine. Medication adjusted. Monitoring closely.",
                    "Urgent referral issued. Patient seen same day. Condition stabilized.",
                    "Follow-up lab work ordered. Patient counselled on warning signs.",
                ])

            cur.execute("""
                INSERT INTO escalations (
                    user_id, triggered_at, risk_type, risk_level, severity,
                    escalation_reason, assigned_doctor_id, status, doctor_notes, resolved_at
                ) VALUES (
                    %(uid)s, %(trig)s, %(rt)s, %(rl)s, %(sev)s,
                    %(reason)s, %(doc)s, %(status)s, %(notes)s, %(resolved)s
                ) ON CONFLICT DO NOTHING
            """, {
                "uid": pid, "trig": triggered, "rt": esc["risk_type"],
                "rl": esc["level"], "sev": esc["level"].lower(),
                "reason": esc["reason"], "doc": doc_id,
                "status": esc["status"], "notes": doc_notes, "resolved": resolved_at,
            })
        print(f"   Created {len(escalation_data)} escalations")

        # ── 8. Seed Appointments ─────────────────────────────────────────────
        print("\n[8/9] Creating appointments...")
        appointment_data = [
            {"patient_idx": 0, "days_offset": 5, "reason": "Routine antenatal checkup", "type": "routine_checkup", "status": "scheduled"},
            {"patient_idx": 1, "days_offset": -7, "reason": "Anomaly scan review", "type": "scan", "status": "completed"},
            {"patient_idx": 2, "days_offset": 3, "reason": "Blood test follow-up", "type": "blood_test", "status": "scheduled"},
            {"patient_idx": 3, "days_offset": -3, "reason": "High BP monitoring", "type": "follow_up", "status": "completed"},
            {"patient_idx": 0, "days_offset": 14, "reason": "Growth scan", "type": "scan", "status": "scheduled"},
            {"patient_idx": 4, "days_offset": 1, "reason": "Telemedicine consultation", "type": "video_call", "status": "scheduled"},
            {"patient_idx": 5, "days_offset": -14, "reason": "Postpartum follow-up", "type": "follow_up", "status": "completed"},
            {"patient_idx": 1, "days_offset": -21, "reason": "GTT appointment", "type": "blood_test", "status": "cancelled"},
        ]

        for appt in appointment_data:
            pid = all_patient_ids[appt["patient_idx"] % len(all_patient_ids)]
            appt_dt = NOW + timedelta(days=appt["days_offset"])
            tele_link = f"https://meet.novelle.app/{random.randint(100000, 999999)}" if appt["type"] == "video_call" else None

            cur.execute("""
                INSERT INTO appointments (
                    patient_id, doctor_id, appointment_date, reason,
                    status, appointment_type, telemedicine_link
                ) VALUES (
                    %(pid)s, %(doc)s, %(dt)s, %(reason)s,
                    %(status)s, %(type)s, %(link)s
                ) ON CONFLICT DO NOTHING
            """, {
                "pid": pid, "doc": dr_anita_user_id,
                "dt": appt_dt, "reason": appt["reason"],
                "status": appt["status"], "type": appt["type"], "link": tele_link,
            })
        print(f"   Created {len(appointment_data)} appointments")

        # ── 9. Seed Medications ──────────────────────────────────────────────
        print("\n[9/9] Creating medications and clinical notes...")
        med_count = 0
        for i, (name, dosage, freq, instructions) in enumerate(MEDICATION_LIST):
            pid = all_patient_ids[i % len(all_patient_ids)]
            start = TODAY - timedelta(days=random.randint(7, 60))
            end = start + timedelta(days=90) if random.random() < 0.3 else None
            is_active = end is None or end > TODAY

            cur.execute("""
                INSERT INTO medications (
                    patient_id, doctor_id, name, dosage, frequency, instructions,
                    start_date, end_date, is_active
                ) VALUES (
                    %(pid)s, %(doc)s, %(name)s, %(dosage)s, %(freq)s, %(instr)s,
                    %(start)s, %(end)s, %(active)s
                ) ON CONFLICT DO NOTHING
            """, {
                "pid": pid, "doc": dr_anita_user_id,
                "name": name, "dosage": dosage, "freq": freq, "instr": instructions,
                "start": start, "end": end, "active": is_active,
            })
            med_count += 1
        print(f"   Created {med_count} medications")

        # Clinical Notes
        note_count = 0
        for note_type, content in CLINICAL_NOTES_CONTENT:
            pid = all_patient_ids[note_count % len(all_patient_ids)]
            cur.execute("""
                INSERT INTO clinical_notes (patient_id, doctor_id, note_type, content, ai_summary)
                VALUES (%(pid)s, %(doc)s, %(type)s, %(content)s, %(summary)s)
                ON CONFLICT DO NOTHING
            """, {
                "pid": pid, "doc": dr_anita_user_id,
                "type": note_type, "content": content,
                "summary": content[:120] + "...",
            })
            note_count += 1
        print(f"   Created {note_count} clinical notes")

        conn.commit()
        print("\n✓ PostgreSQL seeding complete!")

    except Exception as e:
        conn.rollback()
        print(f"\n✗ PostgreSQL error: {e}")
        raise
    finally:
        cur.close()
        conn.close()


# ─────────────────────────────────────────────────────────────────────────────
# MongoDB Seeding
# ─────────────────────────────────────────────────────────────────────────────

def seed_mongodb():
    print("\n" + "=" * 60)
    print("  SEEDING MONGODB")
    print("=" * 60)

    client = MongoClient(MONGO_URI)
    db = client[MONGO_DB]

    # ── journals ─────────────────────────────────────────────────────────────
    print("\n[1/9] Seeding journals...")
    journals = [
        {
            "user_id": 1,
            "title": "Feeling the baby kick!",
            "content": "Today was amazing — I felt the baby kick for the first time during my afternoon rest. It was like tiny butterflies at first, then a proper thump! Showed Rahul and he got so emotional.",
            "mood": "joyful",
            "tags": ["milestone", "baby_movement", "family"],
            "created_at": NOW - timedelta(days=2),
        },
        {
            "user_id": 1,
            "title": "Anxious about the scan tomorrow",
            "content": "My anomaly scan is scheduled for tomorrow morning. I keep telling myself everything will be fine, but the anxiety is creeping in. Spoke to Amma and she calmed me down a bit. Going to try some deep breathing before bed.",
            "mood": "anxious",
            "tags": ["anxiety", "scan", "self_care"],
            "created_at": NOW - timedelta(days=5),
        },
        {
            "user_id": 1,
            "title": "Pregnancy yoga helping a lot",
            "content": "Started prenatal yoga classes last week and already feeling the difference. My back pain has reduced and I sleep slightly better. The instructor taught us breathing techniques for labor prep.",
            "mood": "calm",
            "tags": ["exercise", "yoga", "wellness"],
            "created_at": NOW - timedelta(days=8),
        },
        {
            "user_id": 1,
            "title": "Nausea returned unexpectedly",
            "content": "Thought morning sickness was behind me but it came back today. Could barely eat lunch. Dr. Anita said it can happen in the second trimester too sometimes. Ginger tea helped a bit.",
            "mood": "uncomfortable",
            "tags": ["symptoms", "nausea", "food"],
            "created_at": NOW - timedelta(days=12),
        },
        {
            "user_id": 1,
            "title": "Baby shopping with friends",
            "content": "Went to Commercial Street with Divya and Neha for baby shopping. Got the cutest onesies and a crib mobile with stars. It's all feeling so real now! 16 weeks to go.",
            "mood": "happy",
            "tags": ["shopping", "friends", "preparation"],
            "created_at": NOW - timedelta(days=15),
        },
    ]
    db.journals.delete_many({"user_id": 1})
    db.journals.insert_many(journals)
    print(f"   Inserted {len(journals)} journal entries")

    # ── chat_history ─────────────────────────────────────────────────────────
    print("\n[2/9] Seeding chat_history...")
    chat_messages = [
        {"user_id": 1, "role": "user", "content": "I'm feeling some cramping in my lower abdomen. Is this normal at 24 weeks?", "timestamp": NOW - timedelta(hours=48)},
        {"user_id": 1, "role": "assistant", "content": "Mild cramping can be normal at 24 weeks — these are often Braxton Hicks contractions or round ligament pain as your uterus grows. However, if the cramping is regular, severe, or accompanied by bleeding or fluid leakage, please contact your doctor immediately. Would you like me to help you track the frequency?", "timestamp": NOW - timedelta(hours=47, minutes=59)},
        {"user_id": 1, "role": "user", "content": "It's not regular, just occasional. What foods should I eat for iron? My hemoglobin was a bit low.", "timestamp": NOW - timedelta(hours=24)},
        {"user_id": 1, "role": "assistant", "content": "For improving iron levels, I'd recommend: spinach, beetroot, dates, jaggery, pomegranate, lentils (dal), and ragi. Pair iron-rich foods with vitamin C (lemon, amla) for better absorption. Avoid tea/coffee within an hour of meals as they inhibit iron absorption. Your doctor may also recommend an iron supplement.", "timestamp": NOW - timedelta(hours=23, minutes=58)},
        {"user_id": 1, "role": "user", "content": "How much water should I be drinking daily?", "timestamp": NOW - timedelta(hours=12)},
        {"user_id": 1, "role": "assistant", "content": "During pregnancy, aim for 2.3-3 litres (about 8-12 glasses) of water daily. You may need more if you're in a warm climate or exercising. Signs of good hydration: pale yellow urine. I can set up hydration reminders for you if you'd like!", "timestamp": NOW - timedelta(hours=11, minutes=58)},
        {"user_id": 1, "role": "user", "content": "Yes please, set a reminder every 2 hours", "timestamp": NOW - timedelta(hours=11, minutes=55)},
        {"user_id": 1, "role": "assistant", "content": "Done! I've set up hydration reminders every 2 hours from 8 AM to 8 PM. You'll get a gentle notification to drink a glass of water. Stay hydrated, Priya! 💧", "timestamp": NOW - timedelta(hours=11, minutes=54)},
        {"user_id": 1, "role": "user", "content": "Can I sleep on my back? I find it comfortable but read it's not safe.", "timestamp": NOW - timedelta(hours=4)},
        {"user_id": 1, "role": "assistant", "content": "After 20 weeks, sleeping on your back for extended periods isn't recommended as the weight of the uterus can compress the vena cava (a major blood vessel), potentially reducing blood flow to you and baby. Left-side sleeping is ideal as it optimizes blood flow to the placenta. Try placing a pillow between your knees and behind your back for support.", "timestamp": NOW - timedelta(hours=3, minutes=58)},
    ]
    db.chat_history.delete_many({"user_id": 1})
    db.chat_history.insert_many(chat_messages)
    print(f"   Inserted {len(chat_messages)} chat messages")

    # ── daily_goals ──────────────────────────────────────────────────────────
    print("\n[3/9] Seeding daily_goals...")
    daily_goals = {
        "user_id": 1,
        "date": TODAY.isoformat(),
        "goals": [
            {"id": "g1", "title": "Drink 2.5L water", "category": "hydration", "completed": False, "target": 2500, "current": 1200},
            {"id": "g2", "title": "Take prenatal vitamins", "category": "medication", "completed": True, "completed_at": (NOW - timedelta(hours=8)).isoformat()},
            {"id": "g3", "title": "30 min walk", "category": "exercise", "completed": False, "target_minutes": 30, "current_minutes": 0},
            {"id": "g4", "title": "Fetal kick count", "category": "monitoring", "completed": False, "target": 10, "current": 0},
            {"id": "g5", "title": "Eat iron-rich meal", "category": "nutrition", "completed": True, "completed_at": (NOW - timedelta(hours=5)).isoformat()},
            {"id": "g6", "title": "Pregnancy journal entry", "category": "wellness", "completed": False},
        ],
        "created_at": NOW,
        "updated_at": NOW,
    }
    db.daily_goals.delete_many({"user_id": 1, "date": TODAY.isoformat()})
    db.daily_goals.insert_one(daily_goals)
    print("   Inserted daily goals for test user")

    # ── doctor_tasks ─────────────────────────────────────────────────────────
    print("\n[4/9] Seeding doctor_tasks...")
    doctor_tasks = [
        {
            "doctor_email": "dr.anita@novelle.app",
            "doctor_id": 3,
            "title": "Review Sneha Patil's glucose readings",
            "description": "Patient's fasting glucose has been trending above 110 for 3 consecutive days. Consider medication adjustment.",
            "priority": "high",
            "status": "pending",
            "patient_id": None,
            "due_date": (NOW + timedelta(days=1)).isoformat(),
            "created_at": NOW - timedelta(hours=6),
        },
        {
            "doctor_email": "dr.anita@novelle.app",
            "doctor_id": 3,
            "title": "Call Kavitha Nair — missed appointment",
            "description": "Patient missed scheduled appointment on Monday. Two previous escalations on file. Needs follow-up.",
            "priority": "medium",
            "status": "pending",
            "patient_id": None,
            "due_date": (NOW + timedelta(days=2)).isoformat(),
            "created_at": NOW - timedelta(hours=18),
        },
        {
            "doctor_email": "dr.anita@novelle.app",
            "doctor_id": 3,
            "title": "Complete Priya Sharma's monthly report",
            "description": "Monthly progress report due for Priya's second trimester review. All vitals and assessments collected.",
            "priority": "low",
            "status": "in_progress",
            "patient_id": 1,
            "due_date": (NOW + timedelta(days=5)).isoformat(),
            "created_at": NOW - timedelta(days=2),
        },
        {
            "doctor_email": "dr.anita@novelle.app",
            "doctor_id": 3,
            "title": "Refer Deepa Reddy to nutritionist",
            "description": "BMI elevated, weight gain above recommended range. Nutritional counselling referral needed.",
            "priority": "medium",
            "status": "completed",
            "patient_id": None,
            "completed_at": (NOW - timedelta(hours=3)).isoformat(),
            "created_at": NOW - timedelta(days=3),
        },
    ]
    db.doctor_tasks.delete_many({"doctor_email": "dr.anita@novelle.app"})
    db.doctor_tasks.insert_many(doctor_tasks)
    print(f"   Inserted {len(doctor_tasks)} doctor tasks")

    # ── doctor_messages ──────────────────────────────────────────────────────
    print("\n[5/9] Seeding doctor_messages...")
    doctor_messages = [
        {
            "from_doctor_id": 3,
            "to_patient_id": 1,
            "subject": "Scan report looks great!",
            "content": "Hi Priya, I've reviewed your anomaly scan report. Everything looks perfectly normal — baby's growth is on track and all measurements are within expected range. Keep up the good work with your nutrition and exercise!",
            "read": True,
            "read_at": (NOW - timedelta(days=1)).isoformat(),
            "created_at": NOW - timedelta(days=3),
        },
        {
            "from_doctor_id": 3,
            "to_patient_id": 1,
            "subject": "Iron supplement dosage update",
            "content": "Based on your latest blood work, I'm increasing your iron supplement from once to twice daily for the next 4 weeks. Please take it with orange juice for better absorption. Let me know if you experience any stomach discomfort.",
            "read": False,
            "created_at": NOW - timedelta(hours=8),
        },
        {
            "from_patient_id": 1,
            "to_doctor_id": 3,
            "subject": "Question about travel",
            "content": "Hi Dr. Anita, my in-laws want us to visit them in Chennai next week (flight is 1 hour). Is it safe for me to fly at 24 weeks? Any precautions I should take?",
            "read": True,
            "read_at": (NOW - timedelta(hours=2)).isoformat(),
            "created_at": NOW - timedelta(hours=5),
        },
    ]
    db.doctor_messages.delete_many({})
    db.doctor_messages.insert_many(doctor_messages)
    print(f"   Inserted {len(doctor_messages)} doctor messages")

    # ── audit_logs ───────────────────────────────────────────────────────────
    print("\n[6/9] Seeding audit_logs...")
    audit_actions = [
        ("user.login", 1, "User logged in from Bengaluru, Karnataka"),
        ("user.login", 3, "Doctor logged in from Bengaluru, Karnataka"),
        ("health_log.create", 1, "New health log entry submitted"),
        ("risk_score.computed", 1, "ML risk scoring completed — result: MEDIUM"),
        ("escalation.triggered", 1, "Mental health escalation created for user"),
        ("escalation.acknowledged", 3, "Dr. Anita acknowledged escalation #12"),
        ("appointment.created", 3, "New appointment scheduled for patient Priya Sharma"),
        ("medication.prescribed", 3, "Iron supplement prescribed to patient"),
        ("user.login", 2, "Admin logged in"),
        ("admin.dashboard_viewed", 2, "Platform admin viewed analytics dashboard"),
        ("user.profile_updated", 1, "Pregnancy profile updated — week 24"),
        ("chat.session_started", 1, "AI companion chat session initiated"),
        ("journal.created", 1, "New journal entry saved"),
        ("escalation.resolved", 3, "Escalation #10 resolved by Dr. Anita"),
        ("user.login", 1, "User logged in from mobile app"),
    ]
    audit_logs = []
    for i, (action, user_id, description) in enumerate(audit_actions):
        audit_logs.append({
            "action": action,
            "user_id": user_id,
            "description": description,
            "ip_address": f"192.168.1.{random.randint(10, 200)}",
            "user_agent": random.choice([
                "NovelleMobile/2.1.0 (Android 14)",
                "NovelleMobile/2.1.0 (iOS 17.4)",
                "Mozilla/5.0 (Chrome/125.0) NovelleDashboard",
            ]),
            "timestamp": NOW - timedelta(hours=i * 3, minutes=random.randint(0, 59)),
        })
    db.audit_logs.delete_many({})
    db.audit_logs.insert_many(audit_logs)
    print(f"   Inserted {len(audit_logs)} audit log entries")

    # ── platform_announcements ───────────────────────────────────────────────
    print("\n[7/9] Seeding platform_announcements...")
    announcements = [
        {
            "title": "Novelle v2.1 — New Mental Wellness Features",
            "content": "We're excited to announce new guided meditation exercises, mood journaling prompts, and an improved PHQ-9 assessment flow. These features are now available for all users.",
            "priority": "normal",
            "target_roles": ["pregnant_user", "postpartum_user"],
            "is_active": True,
            "created_by": 2,
            "created_at": NOW - timedelta(days=5),
        },
        {
            "title": "Scheduled Maintenance — May 12, 2AM-4AM IST",
            "content": "Our systems will undergo scheduled maintenance for database optimization. The app may be briefly unavailable during this window. Emergency features will remain active.",
            "priority": "high",
            "target_roles": ["pregnant_user", "postpartum_user", "doctor"],
            "is_active": True,
            "created_by": 2,
            "created_at": NOW - timedelta(days=1),
        },
        {
            "title": "Welcome Dr. Sunita Arora to the Novelle Team",
            "content": "Dr. Sunita Arora (OB-GYN, 14 years experience, Delhi) has joined our doctor network. She specializes in high-risk pregnancies and will be available for telemedicine consultations.",
            "priority": "normal",
            "target_roles": ["doctor", "platform_admin"],
            "is_active": True,
            "created_by": 2,
            "created_at": NOW - timedelta(days=10),
        },
    ]
    db.platform_announcements.delete_many({})
    db.platform_announcements.insert_many(announcements)
    print(f"   Inserted {len(announcements)} announcements")

    # ── support_tickets ──────────────────────────────────────────────────────
    print("\n[8/9] Seeding support_tickets...")
    tickets = [
        {
            "user_id": 1,
            "subject": "Cannot upload scan report",
            "description": "I'm trying to upload my anomaly scan PDF but keep getting a 'file too large' error. The file is 4.2MB.",
            "category": "bug",
            "status": "open",
            "priority": "medium",
            "created_at": NOW - timedelta(days=2),
        },
        {
            "user_id": 4,
            "subject": "Request for Hindi language support",
            "description": "I would prefer using the app in Hindi. My mother-in-law also wants to help track my progress but she doesn't read English well.",
            "category": "feature_request",
            "status": "open",
            "priority": "low",
            "created_at": NOW - timedelta(days=7),
        },
        {
            "user_id": 1,
            "subject": "Medication reminder not triggering",
            "description": "My evening iron supplement reminder stopped working 3 days ago. Morning reminders are fine.",
            "category": "bug",
            "status": "in_progress",
            "priority": "high",
            "assigned_to": 2,
            "admin_notes": "Investigating notification service logs. Possible timezone handling issue.",
            "created_at": NOW - timedelta(days=4),
            "updated_at": NOW - timedelta(days=1),
        },
        {
            "user_id": 3,
            "subject": "Dashboard loading slow on mobile",
            "description": "The doctor dashboard takes 8-10 seconds to load patient list on my phone (Galaxy S23). Desktop is fine.",
            "category": "performance",
            "status": "resolved",
            "priority": "medium",
            "resolution": "Optimized patient list query and added pagination. Response time now < 2s.",
            "resolved_at": (NOW - timedelta(days=1)).isoformat(),
            "created_at": NOW - timedelta(days=10),
        },
    ]
    db.support_tickets.delete_many({})
    db.support_tickets.insert_many(tickets)
    print(f"   Inserted {len(tickets)} support tickets")

    # ── user_settings ────────────────────────────────────────────────────────
    print("\n[9/9] Seeding user_settings...")
    user_settings = {
        "user_id": 1,
        "notifications": {
            "push_enabled": True,
            "email_enabled": True,
            "sms_enabled": False,
            "medication_reminders": True,
            "appointment_reminders": True,
            "kick_count_reminders": True,
            "wellness_tips": True,
            "quiet_hours": {"enabled": True, "start": "22:00", "end": "07:00"},
        },
        "preferences": {
            "language": "en",
            "units": {"weight": "kg", "height": "cm", "temperature": "celsius"},
            "theme": "light",
            "font_size": "medium",
            "dashboard_widgets": ["health_summary", "upcoming_appointments", "daily_goals", "baby_size"],
        },
        "privacy": {
            "share_data_with_doctor": True,
            "anonymous_research_participation": True,
            "show_profile_to_community": False,
        },
        "companion_ai": {
            "personality": "warm",
            "response_length": "moderate",
            "proactive_check_ins": True,
            "check_in_frequency": "daily",
        },
        "updated_at": NOW,
    }
    db.user_settings.delete_many({"user_id": 1})
    db.user_settings.insert_one(user_settings)
    print("   Inserted user settings for test user")

    client.close()
    print("\n✓ MongoDB seeding complete!")


# ─────────────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("╔══════════════════════════════════════════════════════════════╗")
    print("║         NOVELLE — Full System Seed Script                   ║")
    print("╠══════════════════════════════════════════════════════════════╣")
    print(f"║  Timestamp: {NOW.strftime('%Y-%m-%d %H:%M:%S UTC'):<48}║")
    print("╚══════════════════════════════════════════════════════════════╝")

    seed_postgres()
    seed_mongodb()

    print("\n" + "=" * 60)
    print("  ALL DONE — Database fully seeded!")
    print("=" * 60)
    print("\nTest credentials:")
    print("  Patient:  testuser@novelle.app / TestUser@123")
    print("  Doctor:   dr.anita@novelle.app / TestUser@123")
    print("  Admin:    admin@novelle.app    / TestUser@123")
    print()
