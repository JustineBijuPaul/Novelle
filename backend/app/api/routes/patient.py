"""
Patient Portal — All endpoints powering the patient sidebar navigation.
Covers: Dashboard, My Pregnancy, AI Insights, Symptoms, Daily Goals,
Emergency Support, Settings, and wires real DB + ML model data.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func, and_
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel

from app.core.database import get_db, get_mongo_db
from app.models.user import User, UserRole
from app.models.profile import PregnancyProfile
from app.models.clinical import Appointment, Medication
from app.models.doctor import Doctor
from app.models.hospital import Hospital
from app.models.health import HealthLog
from app.models.mental import MentalHealthAssessment
from app.models.risk import RiskScore
from app.models.escalation import Escalation
from app.api.routes.auth import _current_user
from app.utils.fetalData import get_milestone_for_week

router = APIRouter(prefix="/patient", tags=["Patient Portal"])


# ═══════════════════════════════════════════════════════════════
#  DASHBOARD SUMMARY — /patient/dashboard/summary
# ═══════════════════════════════════════════════════════════════

@router.get("/dashboard/summary")
async def get_dashboard_summary(
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db),
):
    latest_risk = (await db.execute(
        select(RiskScore).where(RiskScore.user_id == user.id).order_by(desc(RiskScore.scored_at)).limit(1)
    )).scalar_one_or_none()

    latest_health = (await db.execute(
        select(HealthLog).where(HealthLog.user_id == user.id).order_by(desc(HealthLog.log_date)).limit(1)
    )).scalar_one_or_none()

    latest_mental = (await db.execute(
        select(MentalHealthAssessment).where(MentalHealthAssessment.user_id == user.id)
        .order_by(desc(MentalHealthAssessment.assessment_date)).limit(1)
    )).scalar_one_or_none()

    now = datetime.now(timezone.utc)
    next_appointment = (await db.execute(
        select(Appointment)
        .where(Appointment.patient_id == user.id, Appointment.appointment_date >= now)
        .order_by(Appointment.appointment_date).limit(1)
    )).scalar_one_or_none()

    active_meds = (await db.execute(
        select(Medication).where(Medication.patient_id == user.id, Medication.is_active == True)
    )).scalars().all()

    week = user.profile.pregnancy_week if user.profile else 24
    milestone = get_milestone_for_week(week)

    return {
        "user_id": user.id,
        "pregnancy_week": week,
        "trimester": user.profile.trimester if user.profile else 2,
        "due_date": user.profile.due_date.isoformat() if user.profile and user.profile.due_date else None,
        "milestone": milestone,
        "risk": {
            "physical": latest_risk.physical_risk_level if latest_risk else "LOW",
            "mental": latest_risk.mental_risk_level if latest_risk else "LOW",
            "fetal": latest_risk.fetal_risk_level if latest_risk else "LOW",
            "physical_confidence": latest_risk.physical_confidence if latest_risk else None,
            "mental_confidence": latest_risk.mental_confidence if latest_risk else None,
            "fetal_confidence": latest_risk.fetal_confidence if latest_risk else None,
        },
        "health": {
            "bp_systolic": latest_health.bp_systolic if latest_health else None,
            "bp_diastolic": latest_health.bp_diastolic if latest_health else None,
            "weight": latest_health.weight_kg if latest_health else None,
            "blood_sugar": latest_health.blood_sugar_fasting if latest_health else None,
            "fetal_movements": latest_health.fetal_movement_count if latest_health else None,
            "sleep_quality": latest_health.sleep_quality if latest_health else None,
            "log_date": latest_health.log_date.isoformat() if latest_health and latest_health.log_date else None,
        },
        "mental": {
            "mood_score": latest_mental.mood_score if latest_mental else None,
            "mood_emoji": latest_mental.mood_emoji if latest_mental else None,
            "stress_level": latest_mental.stress_level if latest_mental else None,
            "phq9_score": latest_mental.phq9_score if latest_mental else None,
            "gad7_score": latest_mental.gad7_score if latest_mental else None,
        },
        "next_appointment": {
            "id": next_appointment.id,
            "date": next_appointment.appointment_date.isoformat(),
            "type": next_appointment.appointment_type,
            "reason": next_appointment.reason,
            "status": next_appointment.status,
        } if next_appointment else None,
        "medication_count": len(active_meds),
    }


# ═══════════════════════════════════════════════════════════════
#  MY PREGNANCY — /patient/my-pregnancy
# ═══════════════════════════════════════════════════════════════

@router.get("/my-pregnancy")
async def get_my_pregnancy(
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db),
):
    profile = user.profile
    if not profile:
        raise HTTPException(status_code=404, detail="Pregnancy profile not found. Complete onboarding first.")

    week = profile.pregnancy_week
    milestone = get_milestone_for_week(week)

    weight_history = (await db.execute(
        select(HealthLog.log_date, HealthLog.weight_kg)
        .where(HealthLog.user_id == user.id, HealthLog.weight_kg.isnot(None))
        .order_by(HealthLog.log_date).limit(20)
    )).all()

    days_remaining = (profile.due_date - datetime.now(timezone.utc).date()).days if profile.due_date else None

    return {
        "profile": {
            "age": profile.age,
            "pregnancy_week": week,
            "trimester": profile.trimester,
            "due_date": profile.due_date.isoformat() if profile.due_date else None,
            "days_remaining": days_remaining,
            "blood_group": profile.blood_group,
            "bmi": float(profile.bmi) if profile.bmi else None,
            "height_cm": float(profile.height_cm) if profile.height_cm else None,
            "weight_kg": float(profile.weight_kg) if profile.weight_kg else None,
            "hemoglobin_level": float(profile.hemoglobin_level) if profile.hemoglobin_level else None,
            "gestational_diabetes": profile.gestational_diabetes,
            "chronic_hypertension": profile.chronic_hypertension,
            "thyroid_disorder": profile.thyroid_disorder,
            "previous_pregnancies": profile.previous_pregnancies,
            "past_complications": profile.past_complications,
            "profile_completion": profile.profile_completion_score,
        },
        "milestone": milestone,
        "weight_trend": [
            {"date": str(row[0]), "weight": float(row[1])} for row in weight_history
        ],
        "progress_percent": round((week / 40) * 100, 1),
    }


# ═══════════════════════════════════════════════════════════════
#  AI INSIGHTS — /patient/ai-insights
# ═══════════════════════════════════════════════════════════════

@router.get("/ai-insights")
async def get_ai_insights(
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db),
):
    risk_history = (await db.execute(
        select(RiskScore).where(RiskScore.user_id == user.id)
        .order_by(desc(RiskScore.scored_at)).limit(10)
    )).scalars().all()

    latest_risk = risk_history[0] if risk_history else None

    recent_health = (await db.execute(
        select(HealthLog).where(HealthLog.user_id == user.id)
        .order_by(desc(HealthLog.log_date)).limit(7)
    )).scalars().all()

    recent_mental = (await db.execute(
        select(MentalHealthAssessment).where(MentalHealthAssessment.user_id == user.id)
        .order_by(desc(MentalHealthAssessment.assessment_date)).limit(5)
    )).scalars().all()

    recommendations = []
    alerts = []

    if latest_risk:
        if latest_risk.physical_risk_level == "HIGH":
            alerts.append({"type": "physical", "level": "HIGH", "message": "Elevated physical health risk detected. Please consult your doctor."})
        if latest_risk.mental_risk_level == "HIGH":
            alerts.append({"type": "mental", "level": "HIGH", "message": "Your mental health scores indicate elevated risk. Consider speaking with a counselor."})
        if latest_risk.fetal_risk_level == "HIGH":
            alerts.append({"type": "fetal", "level": "HIGH", "message": "Fetal health indicators require attention. Schedule an ultrasound."})

        if latest_risk.hypertension_risk:
            try:
                if float(latest_risk.hypertension_risk) > 0.6:
                    recommendations.append({"category": "Physical", "title": "Monitor Blood Pressure", "detail": "Your BP trend suggests risk. Measure twice daily and reduce sodium intake."})
            except (ValueError, TypeError):
                pass
        if latest_risk.anemia_risk:
            try:
                if float(latest_risk.anemia_risk) > 0.5:
                    recommendations.append({"category": "Nutrition", "title": "Increase Iron Intake", "detail": "Take iron supplements with Vitamin C for better absorption."})
            except (ValueError, TypeError):
                pass
        if latest_risk.depression_risk:
            try:
                if float(latest_risk.depression_risk) > 0.5:
                    recommendations.append({"category": "Mental", "title": "Mood Support", "detail": "Practice mindfulness and reach out to your support network."})
            except (ValueError, TypeError):
                pass
        if latest_risk.preterm_risk:
            try:
                if float(latest_risk.preterm_risk) > 0.5:
                    recommendations.append({"category": "Fetal", "title": "Preterm Prevention", "detail": "Rest more, avoid strenuous activity, and attend all prenatal visits."})
            except (ValueError, TypeError):
                pass

    if not recommendations:
        recommendations = [
            {"category": "General", "title": "Stay Hydrated", "detail": "Aim for 2.5-3 liters of water daily for optimal amniotic fluid levels."},
            {"category": "Exercise", "title": "Daily Walk", "detail": "A 20-minute walk improves circulation and mood."},
            {"category": "Nutrition", "title": "Prenatal Vitamins", "detail": "Take your folic acid and iron supplements daily."},
        ]

    avg_bp_systolic = None
    avg_sleep = None
    if recent_health:
        bp_values = [h.bp_systolic for h in recent_health if h.bp_systolic]
        avg_bp_systolic = round(sum(bp_values) / len(bp_values), 1) if bp_values else None
        sleep_values = [h.sleep_quality for h in recent_health if h.sleep_quality]
        avg_sleep = round(sum(sleep_values) / len(sleep_values), 1) if sleep_values else None

    return {
        "risk_summary": {
            "physical": latest_risk.physical_risk_level if latest_risk else "LOW",
            "mental": latest_risk.mental_risk_level if latest_risk else "LOW",
            "fetal": latest_risk.fetal_risk_level if latest_risk else "LOW",
            "scored_at": latest_risk.scored_at.isoformat() if latest_risk else None,
        },
        "sub_risks": {
            "depression": latest_risk.depression_risk if latest_risk else None,
            "anxiety": latest_risk.anxiety_risk if latest_risk else None,
            "hypertension": latest_risk.hypertension_risk if latest_risk else None,
            "diabetes": latest_risk.diabetes_risk if latest_risk else None,
            "anemia": latest_risk.anemia_risk if latest_risk else None,
            "preterm": latest_risk.preterm_risk if latest_risk else None,
        },
        "alerts": alerts,
        "recommendations": recommendations,
        "weekly_stats": {
            "avg_bp_systolic": avg_bp_systolic,
            "avg_sleep_quality": avg_sleep,
            "health_logs_count": len(recent_health),
            "mental_assessments_count": len(recent_mental),
        },
        "risk_trend": [
            {
                "date": r.scored_at.isoformat() if r.scored_at else None,
                "physical": r.physical_risk_level,
                "mental": r.mental_risk_level,
                "fetal": r.fetal_risk_level,
            }
            for r in reversed(risk_history)
        ],
    }


# ═══════════════════════════════════════════════════════════════
#  SYMPTOMS — /patient/symptoms
# ═══════════════════════════════════════════════════════════════

@router.get("/symptoms")
async def list_my_symptoms(
    limit: int = Query(30, ge=1, le=100),
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(HealthLog)
        .where(HealthLog.user_id == user.id)
        .order_by(desc(HealthLog.log_date))
        .limit(limit)
    )
    logs = result.scalars().all()

    symptoms = []
    for log in logs:
        log_date = log.log_date.isoformat() if log.log_date else None
        if log.nausea_severity and log.nausea_severity > 0:
            symptoms.append({"date": log_date, "name": "Nausea", "severity": log.nausea_severity, "category": "digestive"})
        if log.dizziness:
            symptoms.append({"date": log_date, "name": "Dizziness", "severity": 3, "category": "neurological"})
        if log.edema_flag:
            symptoms.append({"date": log_date, "name": f"Edema ({log.edema_location or 'general'})", "severity": 2, "category": "cardiovascular"})
        if log.bleeding_flag:
            symptoms.append({"date": log_date, "name": "Bleeding", "severity": 5, "category": "urgent", "detail": log.bleeding_severity})
        if log.cramps_flag:
            symptoms.append({"date": log_date, "name": "Cramps", "severity": log.cramps_intensity or 3, "category": "musculoskeletal"})
        if log.pain_score and log.pain_score > 0:
            symptoms.append({"date": log_date, "name": f"Pain ({log.pain_location or 'general'})", "severity": log.pain_score, "category": "pain"})

    return {"symptoms": symptoms[:limit], "total": len(symptoms)}


# ═══════════════════════════════════════════════════════════════
#  APPOINTMENTS — /patient/appointments
# ═══════════════════════════════════════════════════════════════

@router.get("/appointments")
async def list_my_appointments(
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Appointment).where(Appointment.patient_id == user.id)
        .order_by(desc(Appointment.appointment_date))
    )
    appointments = result.scalars().all()
    return [
        {
            "id": a.id,
            "date": a.appointment_date.isoformat() if a.appointment_date else None,
            "reason": a.reason,
            "status": a.status,
            "type": a.appointment_type,
            "telemedicine_link": a.telemedicine_link,
            "doctor_id": a.doctor_id,
        }
        for a in appointments
    ]


class AppointmentRequest(BaseModel):
    doctor_id: int
    appointment_date: str
    reason: Optional[str] = None
    appointment_type: Optional[str] = "in_person"


@router.post("/appointments")
async def create_appointment(
    data: AppointmentRequest,
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db),
):
    doc = (await db.execute(select(Doctor).where(Doctor.id == data.doctor_id))).scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Doctor not found")

    appo = Appointment(
        patient_id=user.id,
        doctor_id=data.doctor_id,
        appointment_date=datetime.fromisoformat(data.appointment_date),
        reason=data.reason,
        appointment_type=data.appointment_type,
        status="pending",
    )
    db.add(appo)
    await db.commit()
    await db.refresh(appo)
    return {"id": appo.id, "status": "pending", "message": "Appointment requested successfully"}


# ═══════════════════════════════════════════════════════════════
#  DOCTORS — /patient/doctors
# ═══════════════════════════════════════════════════════════════

@router.get("/doctors")
async def list_available_doctors(
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Doctor))
    doctors = result.scalars().all()

    hospital_ids = {d.hospital_id for d in doctors if d.hospital_id}
    hospitals = {}
    if hospital_ids:
        h_result = await db.execute(select(Hospital).where(Hospital.id.in_(hospital_ids)))
        hospitals = {h.id: h.name for h in h_result.scalars().all()}

    return [
        {
            "id": d.id,
            "name": d.name,
            "specialty": d.specialty,
            "hospital": hospitals.get(d.hospital_id, "Independent"),
            "available": d.available_for_escalation,
            "contact": d.contact,
        }
        for d in doctors
    ]


# ═══════════════════════════════════════════════════════════════
#  MEDICATIONS — /patient/medications
# ═══════════════════════════════════════════════════════════════

@router.get("/medications")
async def list_my_medications(
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Medication).where(Medication.patient_id == user.id, Medication.is_active == True)
    )
    meds = result.scalars().all()
    return [
        {
            "id": m.id,
            "name": m.name,
            "dosage": m.dosage,
            "frequency": m.frequency,
            "instructions": m.instructions,
            "start_date": m.start_date.isoformat() if m.start_date else None,
            "end_date": m.end_date.isoformat() if m.end_date else None,
        }
        for m in meds
    ]


# ═══════════════════════════════════════════════════════════════
#  BABY GROWTH — /patient/baby-growth
# ═══════════════════════════════════════════════════════════════

@router.get("/baby-growth")
async def get_baby_growth(
    week: Optional[int] = Query(None),
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db),
):
    target_week = week or (user.profile.pregnancy_week if user.profile else 24)
    milestone = get_milestone_for_week(target_week)
    if not milestone:
        raise HTTPException(status_code=404, detail=f"No data for week {target_week}")

    kick_data = (await db.execute(
        select(HealthLog.log_date, HealthLog.fetal_movement_count)
        .where(HealthLog.user_id == user.id, HealthLog.fetal_movement_count.isnot(None))
        .order_by(desc(HealthLog.log_date)).limit(14)
    )).all()

    return {
        "current_week": target_week,
        "milestone": milestone,
        "kick_history": [
            {"date": str(row[0]), "count": row[1]} for row in reversed(kick_data)
        ],
    }


# ═══════════════════════════════════════════════════════════════
#  DAILY GOALS — /patient/daily-goals
# ═══════════════════════════════════════════════════════════════

@router.get("/daily-goals")
async def get_daily_goals(
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db),
):
    mongo = get_mongo_db()
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    goals_doc = None
    if mongo:
        goals_doc = await mongo.daily_goals.find_one({"user_id": user.id, "date": today})

    if goals_doc:
        goals = goals_doc.get("goals", [])
    else:
        today_health = (await db.execute(
            select(HealthLog).where(
                HealthLog.user_id == user.id,
                HealthLog.log_date >= datetime.now(timezone.utc).date()
            )
        )).scalar_one_or_none()

        goals = [
            {"id": "vitals", "text": "Log morning vitals", "completed": today_health is not None, "category": "health"},
            {"id": "water", "text": "Drink 2.5L water", "completed": False, "category": "nutrition"},
            {"id": "vitamins", "text": "Take prenatal vitamins", "completed": False, "category": "medication"},
            {"id": "walk", "text": "15 minute walk", "completed": False, "category": "exercise"},
            {"id": "meditation", "text": "5 min breathing exercise", "completed": False, "category": "wellness"},
            {"id": "kicks", "text": "Count baby kicks (10 in 2hrs)", "completed": False, "category": "baby"},
        ]

        if user.profile and user.profile.pregnancy_week and user.profile.pregnancy_week >= 28:
            goals.append({"id": "kicks_count", "text": "Record kick count session", "completed": False, "category": "baby"})

    completed = sum(1 for g in goals if g.get("completed"))
    return {
        "date": today,
        "goals": goals,
        "completed": completed,
        "total": len(goals),
        "progress_percent": round((completed / len(goals)) * 100) if goals else 0,
    }


class GoalUpdate(BaseModel):
    goal_id: str
    completed: bool


@router.post("/daily-goals/update")
async def update_daily_goal(
    data: GoalUpdate,
    user: User = Depends(_current_user),
):
    mongo = get_mongo_db()
    if not mongo:
        raise HTTPException(status_code=503, detail="Goals service unavailable")

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    existing = await mongo.daily_goals.find_one({"user_id": user.id, "date": today})
    if existing:
        await mongo.daily_goals.update_one(
            {"user_id": user.id, "date": today, "goals.id": data.goal_id},
            {"$set": {"goals.$.completed": data.completed}},
        )
    else:
        goals = [
            {"id": "vitals", "text": "Log morning vitals", "completed": False, "category": "health"},
            {"id": "water", "text": "Drink 2.5L water", "completed": False, "category": "nutrition"},
            {"id": "vitamins", "text": "Take prenatal vitamins", "completed": False, "category": "medication"},
            {"id": "walk", "text": "15 minute walk", "completed": False, "category": "exercise"},
            {"id": "meditation", "text": "5 min breathing exercise", "completed": False, "category": "wellness"},
            {"id": "kicks", "text": "Count baby kicks (10 in 2hrs)", "completed": False, "category": "baby"},
        ]
        for g in goals:
            if g["id"] == data.goal_id:
                g["completed"] = data.completed
        await mongo.daily_goals.insert_one({"user_id": user.id, "date": today, "goals": goals})

    return {"status": "updated", "goal_id": data.goal_id, "completed": data.completed}


# ═══════════════════════════════════════════════════════════════
#  WELLNESS HUB — /patient/wellness/hub
# ═══════════════════════════════════════════════════════════════

@router.get("/wellness/hub")
async def get_wellness_hub(
    user: User = Depends(_current_user),
):
    week = user.profile.pregnancy_week if user.profile else 24
    trimester = user.profile.trimester if user.profile else 2

    meditations = [
        {"id": 1, "title": "Morning Calm", "duration": "5m", "category": "breathing"},
        {"id": 2, "title": "Deep Sleep for Moms", "duration": "15m", "category": "sleep"},
        {"id": 3, "title": "Anxiety Relief", "duration": "10m", "category": "stress"},
        {"id": 4, "title": "Body Scan Relaxation", "duration": "12m", "category": "relaxation"},
    ]

    workouts = {
        1: [
            {"id": 1, "title": "Gentle Stretching", "duration": "10m", "intensity": "Low"},
            {"id": 2, "title": "Walking Plan", "duration": "20m", "intensity": "Low"},
        ],
        2: [
            {"id": 3, "title": "Prenatal Yoga Flow", "duration": "25m", "intensity": "Low"},
            {"id": 4, "title": "Pelvic Floor Strength", "duration": "15m", "intensity": "Low"},
            {"id": 5, "title": "Aqua Fitness", "duration": "30m", "intensity": "Medium"},
        ],
        3: [
            {"id": 6, "title": "Birth Prep Stretches", "duration": "15m", "intensity": "Low"},
            {"id": 7, "title": "Breathing for Labor", "duration": "10m", "intensity": "Low"},
            {"id": 8, "title": "Gentle Walk", "duration": "15m", "intensity": "Low"},
        ],
    }

    nutrition_by_trimester = {
        1: {"focus": "Folic Acid & Hydration", "foods": ["Leafy greens", "Citrus fruits", "Whole grains", "Lean protein"], "avoid": ["Raw fish", "Alcohol", "Unpasteurized dairy"]},
        2: {"focus": "Iron & Calcium", "foods": ["Spinach", "Lentils", "Dairy", "Eggs", "Almonds"], "avoid": ["Excess caffeine", "Processed foods"]},
        3: {"focus": "Protein & DHA", "foods": ["Fish (low-mercury)", "Nuts", "Avocado", "Whole milk", "Dates"], "avoid": ["Large meals before bed", "High-sodium foods"]},
    }

    articles = [
        {"id": 1, "title": "Understanding Your Changing Body", "category": "education", "read_time": "5 min"},
        {"id": 2, "title": "Managing Pregnancy Anxiety", "category": "mental_health", "read_time": "4 min"},
        {"id": 3, "title": "Preparing for Your Baby's Arrival", "category": "planning", "read_time": "7 min"},
        {"id": 4, "title": "Safe Exercises by Trimester", "category": "fitness", "read_time": "6 min"},
    ]

    return {
        "trimester": trimester,
        "week": week,
        "meditations": meditations,
        "workouts": workouts.get(trimester, workouts[2]),
        "nutrition": nutrition_by_trimester.get(trimester, nutrition_by_trimester[2]),
        "articles": articles,
    }


# ═══════════════════════════════════════════════════════════════
#  EMERGENCY SUPPORT — /patient/emergency
# ═══════════════════════════════════════════════════════════════

@router.get("/emergency")
async def get_emergency_info(
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db),
):
    escalations = (await db.execute(
        select(Escalation).where(Escalation.user_id == user.id)
        .order_by(desc(Escalation.created_at)).limit(5)
    )).scalars().all()

    latest_risk = (await db.execute(
        select(RiskScore).where(RiskScore.user_id == user.id)
        .order_by(desc(RiskScore.scored_at)).limit(1)
    )).scalar_one_or_none()

    return {
        "helplines": [
            {"name": "KIRAN Mental Health", "number": "1800-599-0019", "type": "mental_health", "available": "24/7"},
            {"name": "iCall", "number": "9152987821", "type": "counseling", "available": "Mon-Sat 8AM-10PM"},
            {"name": "Vandrevala Foundation", "number": "1860-2662-345", "type": "crisis", "available": "24/7"},
            {"name": "Women Helpline", "number": "181", "type": "women_safety", "available": "24/7"},
            {"name": "Ambulance", "number": "108", "type": "emergency", "available": "24/7"},
        ],
        "danger_signs": [
            "Heavy vaginal bleeding",
            "Severe headache or blurred vision",
            "Sudden swelling of face or hands",
            "High fever (>101°F / 38.3°C)",
            "Severe abdominal pain",
            "Decreased or no fetal movement",
            "Leaking amniotic fluid",
            "Seizures or convulsions",
        ],
        "current_risk_level": latest_risk.physical_risk_level if latest_risk else "LOW",
        "recent_escalations": [
            {
                "id": e.id,
                "type": e.risk_type,
                "level": e.risk_level,
                "status": e.status,
                "date": e.created_at.isoformat() if e.created_at else None,
            }
            for e in escalations
        ],
    }


class SOSRequest(BaseModel):
    reason: str
    severity: Optional[str] = "HIGH"


@router.post("/emergency/sos")
async def trigger_sos(
    data: SOSRequest,
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db),
):
    escalation = Escalation(
        user_id=user.id,
        triggered_at=datetime.now(timezone.utc),
        risk_type="emergency",
        risk_level=data.severity,
        severity=data.severity,
        escalation_reason=data.reason,
        status="open",
    )
    db.add(escalation)
    await db.commit()
    await db.refresh(escalation)
    return {
        "id": escalation.id,
        "status": "open",
        "message": "Emergency alert sent. A healthcare professional will contact you shortly.",
    }


# ═══════════════════════════════════════════════════════════════
#  SETTINGS — /patient/settings
# ═══════════════════════════════════════════════════════════════

@router.get("/settings")
async def get_settings(
    user: User = Depends(_current_user),
):
    mongo = get_mongo_db()
    prefs = None
    if mongo:
        prefs = await mongo.user_settings.find_one({"user_id": user.id})

    return {
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "phone": user.phone,
            "city": user.city,
            "state": user.state,
            "country": user.country,
            "avatar_url": user.avatar_url,
        },
        "preferences": {
            "notifications_enabled": prefs.get("notifications_enabled", True) if prefs else True,
            "reminder_time": prefs.get("reminder_time", "08:00") if prefs else "08:00",
            "language": prefs.get("language", "en") if prefs else "en",
            "theme": prefs.get("theme", "light") if prefs else "light",
            "share_data_with_doctor": prefs.get("share_data_with_doctor", True) if prefs else True,
            "emergency_contact_name": prefs.get("emergency_contact_name", "") if prefs else "",
            "emergency_contact_phone": prefs.get("emergency_contact_phone", "") if prefs else "",
        },
    }


class SettingsUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    notifications_enabled: Optional[bool] = None
    reminder_time: Optional[str] = None
    language: Optional[str] = None
    theme: Optional[str] = None
    share_data_with_doctor: Optional[bool] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None


@router.put("/settings")
async def update_settings(
    data: SettingsUpdate,
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db),
):
    if data.full_name is not None:
        user.full_name = data.full_name
    if data.phone is not None:
        user.phone = data.phone
    if data.city is not None:
        user.city = data.city
    if data.state is not None:
        user.state = data.state
    await db.commit()

    mongo = get_mongo_db()
    if mongo:
        prefs_update = {}
        for field in ["notifications_enabled", "reminder_time", "language", "theme",
                      "share_data_with_doctor", "emergency_contact_name", "emergency_contact_phone"]:
            val = getattr(data, field, None)
            if val is not None:
                prefs_update[field] = val
        if prefs_update:
            await mongo.user_settings.update_one(
                {"user_id": user.id},
                {"$set": prefs_update},
                upsert=True,
            )

    return {"status": "updated", "message": "Settings saved successfully"}
