"""Doctor routes — full doctor portal: dashboard, patients, appointments,
escalations, monitoring, clinical notes, prescriptions, telehealth,
AI copilot, reports, communication, tasks, settings."""

from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func, and_
from datetime import datetime, timezone, timedelta, date
from typing import Optional, List
from pydantic import BaseModel

from app.core.database import get_db, get_mongo_db
from app.models.user import User, UserRole
from app.models.escalation import Escalation
from app.models.risk import RiskScore
from app.models.health import HealthLog
from app.models.mental import MentalHealthAssessment
from app.models.profile import PregnancyProfile
from app.models.clinical import ClinicalNote, Appointment, Medication
from app.models.doctor import Doctor
from app.schemas.features import EscalationResponse, EscalationResolve
from app.schemas.clinical import (
    ClinicalNoteCreate, ClinicalNoteResponse,
    AppointmentCreate, AppointmentResponse,
    MedicationCreate, MedicationResponse
)
from app.api.routes.auth import _current_user

router = APIRouter(prefix="/doctor", tags=["Doctor Portal"])


async def _get_doctor_identity_ids(db: AsyncSession, user: User) -> list[int]:
    doctor_profile = (
        await db.execute(select(Doctor).where(Doctor.user_id == user.id))
    ).scalar_one_or_none()
    identity_ids = [user.id]
    if doctor_profile:
        identity_ids.append(doctor_profile.id)
    return list(dict.fromkeys(identity_ids))


@router.get("/dashboard")
async def get_dashboard(
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Get all pregnant/postpartum users as patients
    patient_roles = [UserRole.pregnant_user.value, UserRole.postpartum_user.value]
    patients_result = await db.execute(
        select(User).where(User.role.in_(patient_roles), User.is_active == True)
    )
    patient_users = patients_result.scalars().all()

    patients = []
    for p in patient_users:
        prof_result = await db.execute(
            select(PregnancyProfile).where(PregnancyProfile.user_id == p.id)
        )
        profile = prof_result.scalar_one_or_none()

        risk_result = await db.execute(
            select(RiskScore)
            .where(RiskScore.user_id == p.id)
            .order_by(desc(RiskScore.scored_at))
            .limit(1)
        )
        latest_risk = risk_result.scalars().first()

        patients.append({
            "user_id": p.id,
            "name": p.full_name,
            "email": p.email,
            "phone": p.phone,
            "city": p.city,
            "pregnancy_week": profile.pregnancy_week if profile else None,
            "trimester": profile.trimester if profile else None,
            "age": profile.age if profile else None,
            "latest_risk": {
                "mental_risk_level": latest_risk.mental_risk_level if latest_risk else None,
                "physical_risk_level": latest_risk.physical_risk_level if latest_risk else None,
                "fetal_risk_level": latest_risk.fetal_risk_level if latest_risk else None,
                "crisis_flag": latest_risk.crisis_flag if latest_risk else "SAFE",
                "depression_risk": latest_risk.depression_risk if latest_risk else None,
                "anxiety_risk": latest_risk.anxiety_risk if latest_risk else None,
                "hypertension_risk": latest_risk.hypertension_risk if latest_risk else None,
                "diabetes_risk": latest_risk.diabetes_risk if latest_risk else None,
                "anemia_risk": latest_risk.anemia_risk if latest_risk else None,
                "preterm_risk": latest_risk.preterm_risk if latest_risk else None,
                "low_birth_weight_risk": latest_risk.low_birth_weight_risk if latest_risk else None,
                "growth_abnormality_risk": latest_risk.growth_abnormality_risk if latest_risk else None,
                "mental_confidence": latest_risk.mental_confidence if latest_risk else None,
                "physical_confidence": latest_risk.physical_confidence if latest_risk else None,
                "fetal_confidence": latest_risk.fetal_confidence if latest_risk else None,
                "scored_at": str(latest_risk.scored_at) if latest_risk else None,
            } if latest_risk else None,
        })

    # Get pending escalations
    result = await db.execute(
        select(Escalation)
        .where(Escalation.status.in_(["pending", "acknowledged"]))
        .order_by(desc(Escalation.triggered_at))
        .limit(20)
    )
    escalations = result.scalars().all()

    # Stats
    total_result = await db.execute(select(func.count(Escalation.id)))
    total = total_result.scalar() or 0

    pending_result = await db.execute(
        select(func.count(Escalation.id)).where(Escalation.status == "pending")
    )
    pending = pending_result.scalar() or 0

    resolved_result = await db.execute(
        select(func.count(Escalation.id)).where(Escalation.status == "resolved")
    )
    resolved = resolved_result.scalar() or 0

    return {
        "patients": patients,
        "escalations": [EscalationResponse.model_validate(e) for e in escalations],
        "stats": {
            "total_patients": len(patients),
            "high_risk": len([p for p in patients if p.get("latest_risk") and (
                p["latest_risk"]["mental_risk_level"] == "HIGH"
                or p["latest_risk"]["physical_risk_level"] == "HIGH"
                or p["latest_risk"]["fetal_risk_level"] == "HIGH"
            )]),
            "total_escalations": total,
            "pending": pending,
            "resolved": resolved,
        },
    }


@router.get("/patient/{patient_id}/predictions")
async def get_patient_ai_predictions(
    patient_id: int,
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get detailed AI predictions for a specific patient."""
    prof_result = await db.execute(
        select(PregnancyProfile).where(PregnancyProfile.user_id == patient_id)
    )
    profile = prof_result.scalar_one_or_none()

    risk_result = await db.execute(
        select(RiskScore)
        .where(RiskScore.user_id == patient_id)
        .order_by(desc(RiskScore.scored_at))
        .limit(1)
    )
    risk = risk_result.scalars().first()

    since = date.today() - timedelta(days=7)
    logs_result = await db.execute(
        select(HealthLog)
        .where(HealthLog.user_id == patient_id, HealthLog.log_date >= since)
        .order_by(desc(HealthLog.log_date))
    )
    logs = logs_result.scalars().all()

    mental_result = await db.execute(
        select(MentalHealthAssessment)
        .where(MentalHealthAssessment.user_id == patient_id)
        .order_by(desc(MentalHealthAssessment.assessment_date))
        .limit(7)
    )
    mental = mental_result.scalars().all()

    risk_history_result = await db.execute(
        select(RiskScore)
        .where(RiskScore.user_id == patient_id)
        .order_by(desc(RiskScore.scored_at))
        .limit(10)
    )
    risk_history = risk_history_result.scalars().all()

    fetal_predictions = None
    physical_predictions = None
    mental_predictions = None

    if risk:
        fetal_predictions = {
            "overall_risk": risk.fetal_risk_level,
            "confidence": risk.fetal_confidence,
            "preterm_risk": risk.preterm_risk,
            "low_birth_weight_risk": risk.low_birth_weight_risk,
            "growth_abnormality_risk": risk.growth_abnormality_risk,
            "missed_care_risk": risk.missed_care_risk,
            "recommendations": _get_fetal_recommendations(risk),
        }
        physical_predictions = {
            "overall_risk": risk.physical_risk_level,
            "confidence": risk.physical_confidence,
            "hypertension_risk": risk.hypertension_risk,
            "diabetes_risk": risk.diabetes_risk,
            "anemia_risk": risk.anemia_risk,
            "infection_risk": risk.infection_risk,
            "nutrition_risk": risk.nutrition_risk,
            "recommendations": _get_physical_recommendations(risk),
        }
        mental_predictions = {
            "overall_risk": risk.mental_risk_level,
            "confidence": risk.mental_confidence,
            "depression_risk": risk.depression_risk,
            "anxiety_risk": risk.anxiety_risk,
            "isolation_detected": risk.isolation_detected,
            "postpartum_risk": risk.postpartum_risk,
            "crisis_flag": risk.crisis_flag,
            "recommendations": _get_mental_recommendations(risk),
        }

    # Clinical data
    notes_result = await db.execute(
        select(ClinicalNote).where(ClinicalNote.patient_id == patient_id).order_by(desc(ClinicalNote.created_at))
    )
    notes = notes_result.scalars().all()

    appointments_result = await db.execute(
        select(Appointment).where(Appointment.patient_id == patient_id).order_by(Appointment.appointment_date)
    )
    appointments = appointments_result.scalars().all()

    medications_result = await db.execute(
        select(Medication).where(Medication.patient_id == patient_id, Medication.is_active == True)
    )
    medications = medications_result.scalars().all()

    return {
        "patient_id": patient_id,
        "profile": {
            "age": profile.age if profile else None,
            "pregnancy_week": profile.pregnancy_week if profile else None,
            "trimester": profile.trimester if profile else None,
            "bmi": profile.bmi if profile else None,
            "hemoglobin": profile.hemoglobin_level if profile else None,
            "gestational_diabetes": profile.gestational_diabetes if profile else None,
            "chronic_hypertension": profile.chronic_hypertension if profile else None,
            "past_complications": profile.past_complications if profile else [],
            "due_date": str(profile.due_date) if profile and profile.due_date else None,
        } if profile else None,
        "fetal_predictions": fetal_predictions,
        "physical_predictions": physical_predictions,
        "mental_predictions": mental_predictions,
        "recent_vitals": [
            {
                "date": str(l.log_date),
                "bp_systolic": l.bp_systolic,
                "bp_diastolic": l.bp_diastolic,
                "sugar_fasting": l.blood_sugar_fasting,
                "weight": l.weight_kg,
                "fetal_movements": l.fetal_movement_count,
            }
            for l in logs
        ],
        "mental_health_history": [
            {
                "date": str(m.assessment_date),
                "phq9": m.phq9_score,
                "gad7": m.gad7_score,
                "mood": m.mood_score,
                "stress": m.stress_level,
            }
            for m in mental
        ],
        "risk_trend": [
            {
                "scored_at": str(r.scored_at),
                "mental": r.mental_risk_level,
                "physical": r.physical_risk_level,
                "fetal": r.fetal_risk_level,
            }
            for r in risk_history
        ],
        "shap_analysis": risk.shap_features_json if risk else None,
        "clinical_notes": [ClinicalNoteResponse.model_validate(n) for n in notes],
        "appointments": [AppointmentResponse.model_validate(a) for a in appointments],
        "medications": [MedicationResponse.model_validate(m) for m in medications],
    }


def _get_fetal_recommendations(risk: RiskScore) -> list[str]:
    recs = []
    if risk.fetal_risk_level == "HIGH":
        recs.append("Fetal health indicators need urgent attention. Recommend immediate ultrasound and NST.")
    elif risk.fetal_risk_level == "MEDIUM":
        recs.append("Monitor fetal movements closely. Consider scheduling an additional growth scan.")
    if risk.preterm_risk in ("HIGH", "MEDIUM"):
        recs.append("Preterm risk detected. Assess cervical length and consider progesterone therapy if indicated.")
    if risk.low_birth_weight_risk in ("HIGH", "MEDIUM"):
        recs.append("Low birth weight risk present. Review nutritional intake and growth trajectory.")
    if risk.growth_abnormality_risk in ("HIGH", "MEDIUM"):
        recs.append("Growth abnormality risk flagged. Serial growth scans recommended every 2 weeks.")
    if not recs:
        recs.append("Fetal health indicators are within normal range. Continue routine monitoring.")
    return recs


def _get_physical_recommendations(risk: RiskScore) -> list[str]:
    recs = []
    if risk.physical_risk_level == "HIGH":
        recs.append("Physical health at high risk. Comprehensive review of vitals and labs recommended.")
    elif risk.physical_risk_level == "MEDIUM":
        recs.append("Moderate physical risk. Increase monitoring frequency for BP and blood sugar.")
    if risk.hypertension_risk in ("HIGH", "MEDIUM"):
        recs.append("Hypertension risk elevated. Monitor BP twice daily. Consider antihypertensive if sustained.")
    if risk.diabetes_risk in ("HIGH", "MEDIUM"):
        recs.append("Diabetes risk detected. Review glucose tolerance and consider dietary counseling.")
    if risk.anemia_risk in ("HIGH", "MEDIUM"):
        recs.append("Anemia risk present. Check ferritin levels and consider iron supplementation.")
    if not recs:
        recs.append("Physical health indicators within normal limits. Continue routine check-ups.")
    return recs


def _get_mental_recommendations(risk: RiskScore) -> list[str]:
    recs = []
    if risk.mental_risk_level == "HIGH":
        recs.append("High mental health risk. Recommend urgent psychiatric/psychological consultation.")
    elif risk.mental_risk_level == "MEDIUM":
        recs.append("Moderate mental health concerns. Consider supportive counseling referral.")
    if risk.depression_risk in ("HIGH", "MEDIUM"):
        recs.append("Depression indicators elevated. Screen with PHQ-9 and assess for treatment options.")
    if risk.anxiety_risk in ("HIGH", "MEDIUM"):
        recs.append("Anxiety indicators present. GAD-7 follow-up and relaxation techniques recommended.")
    if risk.isolation_detected:
        recs.append("Social isolation detected. Encourage support group participation and family involvement.")
    if risk.crisis_flag == "URGENT":
        recs.append("CRISIS FLAG: Patient may be in acute distress. Immediate intervention recommended.")
    if not recs:
        recs.append("Mental health indicators are stable. Continue supportive check-ins.")
    return recs


@router.get("/patient/{patient_id}/summary")
async def get_patient_summary(
    patient_id: int,
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Get patient profile
    prof_result = await db.execute(
        select(PregnancyProfile).where(PregnancyProfile.user_id == patient_id)
    )
    profile = prof_result.scalar_one_or_none()

    # Get recent health logs (7 days)
    from datetime import date as d
    since = d.today() - timedelta(days=7)
    logs_result = await db.execute(
        select(HealthLog)
        .where(HealthLog.user_id == patient_id, HealthLog.log_date >= since)
        .order_by(desc(HealthLog.log_date))
    )
    logs = logs_result.scalars().all()

    # Get latest risk score
    risk_result = await db.execute(
        select(RiskScore)
        .where(RiskScore.user_id == patient_id)
        .order_by(desc(RiskScore.scored_at))
        .limit(1)
    )
    risk = risk_result.scalars().first()

    # Get recent mental health
    mental_result = await db.execute(
        select(MentalHealthAssessment)
        .where(MentalHealthAssessment.user_id == patient_id)
        .order_by(desc(MentalHealthAssessment.assessment_date))
        .limit(7)
    )
    mental = mental_result.scalars().all()

    # Get escalation history
    esc_result = await db.execute(
        select(Escalation)
        .where(Escalation.user_id == patient_id)
        .order_by(desc(Escalation.triggered_at))
        .limit(10)
    )
    escalations = esc_result.scalars().all()

    return {
        "patient_id": patient_id,
        "profile": {
            "age": profile.age if profile else None,
            "pregnancy_week": profile.pregnancy_week if profile else None,
            "trimester": profile.trimester if profile else None,
            "bmi": profile.bmi if profile else None,
            "hemoglobin": profile.hemoglobin_level if profile else None,
            "gestational_diabetes": profile.gestational_diabetes if profile else None,
            "chronic_hypertension": profile.chronic_hypertension if profile else None,
            "past_complications": profile.past_complications if profile else [],
        } if profile else None,
        "recent_vitals": [
            {
                "date": str(l.log_date),
                "bp": f"{l.bp_systolic}/{l.bp_diastolic}" if l.bp_systolic else None,
                "sugar_fasting": l.blood_sugar_fasting,
                "weight": l.weight_kg,
                "fetal_movements": l.fetal_movement_count,
            }
            for l in logs
        ],
        "latest_risk": {
            "mental": risk.mental_risk_level,
            "physical": risk.physical_risk_level,
            "fetal": risk.fetal_risk_level,
            "crisis_flag": risk.crisis_flag,
            "scored_at": str(risk.scored_at),
        } if risk else None,
        "mental_health": [
            {
                "date": str(m.assessment_date),
                "phq9": m.phq9_score,
                "gad7": m.gad7_score,
                "mood": m.mood_score,
                "stress": m.stress_level,
            }
            for m in mental
        ],
        "escalations": [EscalationResponse.model_validate(e) for e in escalations],
    }


@router.put("/escalation/{escalation_id}", response_model=EscalationResponse)
async def update_escalation(
    escalation_id: int,
    data: EscalationResolve,
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Escalation).where(Escalation.id == escalation_id))
    esc = result.scalar_one_or_none()
    if not esc:
        raise HTTPException(status_code=404, detail="Escalation not found")

    esc.status = data.status
    if data.doctor_notes or data.notes:
        esc.doctor_notes = data.doctor_notes or data.notes
    if data.status == "resolved":
        esc.resolved_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(esc)
    return EscalationResponse.model_validate(esc)

@router.post("/patient/{patient_id}/notes", response_model=ClinicalNoteResponse)
async def add_clinical_note(
    patient_id: int,
    data: ClinicalNoteCreate,
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db),
):
    note = ClinicalNote(
        patient_id=patient_id,
        doctor_id=user.id,
        note_type=data.note_type,
        content=data.content
    )
    db.add(note)
    await db.commit()
    await db.refresh(note)
    return ClinicalNoteResponse.model_validate(note)


@router.post("/patient/{patient_id}/appointments", response_model=AppointmentResponse)
async def schedule_appointment(
    patient_id: int,
    data: AppointmentCreate,
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db),
):
    appo = Appointment(
        patient_id=patient_id,
        doctor_id=user.id,
        appointment_date=data.appointment_date,
        reason=data.reason,
        appointment_type=data.appointment_type,
        telemedicine_link=data.telemedicine_link
    )
    db.add(appo)
    await db.commit()
    await db.refresh(appo)
    return AppointmentResponse.model_validate(appo)


@router.post("/patient/{patient_id}/medications", response_model=MedicationResponse)
async def prescribe_medication(
    patient_id: int,
    data: MedicationCreate,
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db),
):
    from datetime import date
    med = Medication(
        patient_id=patient_id,
        doctor_id=user.id,
        name=data.name,
        dosage=data.dosage,
        frequency=data.frequency,
        instructions=data.instructions,
        start_date=data.start_date or date.today(),
        end_date=data.end_date
    )
    db.add(med)
    await db.commit()
    await db.refresh(med)
    return MedicationResponse.model_validate(med)


# ═══════════════════════════════════════════════════════════════
#  APPOINTMENTS (Doctor view) — /doctor/appointments
# ═══════════════════════════════════════════════════════════════

@router.get("/appointments")
async def list_doctor_appointments(
    status: Optional[str] = None,
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db),
):
    doctor_ids = await _get_doctor_identity_ids(db, user)

    query = select(Appointment).where(Appointment.doctor_id.in_(doctor_ids))
    if status and status != "all":
        if status == "upcoming":
            now = datetime.now(timezone.utc)
            query = query.where(
                Appointment.appointment_date >= now,
                Appointment.status.in_(["pending", "confirmed", "scheduled"]),
            )
        else:
            query = query.where(Appointment.status == status)
    query = query.order_by(desc(Appointment.appointment_date))
    result = await db.execute(query)
    appointments = result.scalars().all()

    enriched = []
    for a in appointments:
        patient = (await db.execute(select(User).where(User.id == a.patient_id))).scalar_one_or_none()
        enriched.append({
            "id": a.id,
            "patient_id": a.patient_id,
            "patient_name": patient.full_name if patient else "Unknown",
            "appointment_date": a.appointment_date.isoformat() if a.appointment_date else None,
            "date": a.appointment_date.isoformat() if a.appointment_date else None,
            "reason": a.reason,
            "status": a.status,
            "appointment_type": a.appointment_type,
            "type": a.appointment_type,
            "telemedicine_link": a.telemedicine_link,
            "doctor_id": a.doctor_id,
        })
    return enriched


@router.put("/appointments/{appointment_id}/status")
async def update_appointment_status(
    appointment_id: int,
    status: str = Body(..., embed=True),
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db),
):
    normalized_status = (status or "").strip().lower()
    allowed_statuses = {"pending", "scheduled", "confirmed", "completed", "cancelled", "missed"}
    if normalized_status not in allowed_statuses:
        raise HTTPException(status_code=400, detail=f"Unsupported appointment status: {status}")

    doctor_ids = await _get_doctor_identity_ids(db, user)
    result = await db.execute(
        select(Appointment).where(
            Appointment.id == appointment_id,
            Appointment.doctor_id.in_(doctor_ids),
        )
    )
    appo = result.scalar_one_or_none()
    if not appo:
        raise HTTPException(status_code=404, detail="Appointment not found")
    appo.status = normalized_status
    await db.commit()
    return {"id": appo.id, "status": appo.status}


# ═══════════════════════════════════════════════════════════════
#  MONITORING — /doctor/monitoring
# ═══════════════════════════════════════════════════════════════

@router.get("/monitoring")
async def get_monitoring_dashboard(
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Real-time patient monitoring: high-risk patients, recent alerts, vital trends."""
    patient_roles = [UserRole.pregnant_user.value, UserRole.postpartum_user.value]
    patients_result = await db.execute(
        select(User).where(User.role.in_(patient_roles), User.is_active == True)
    )
    all_patients = patients_result.scalars().all()

    high_risk_patients = []
    critical_alerts = []

    for p in all_patients:
        risk = (await db.execute(
            select(RiskScore).where(RiskScore.user_id == p.id)
            .order_by(desc(RiskScore.scored_at)).limit(1)
        )).scalar_one_or_none()

        if risk and (risk.physical_risk_level == "HIGH" or risk.mental_risk_level == "HIGH"
                     or risk.fetal_risk_level == "HIGH" or risk.crisis_flag == "URGENT"):
            latest_health = (await db.execute(
                select(HealthLog).where(HealthLog.user_id == p.id)
                .order_by(desc(HealthLog.log_date)).limit(1)
            )).scalar_one_or_none()

            high_risk_patients.append({
                "patient_id": p.id,
                "name": p.full_name,
                "risk_level": "CRITICAL" if risk.crisis_flag == "URGENT" else "HIGH",
                "physical": risk.physical_risk_level,
                "mental": risk.mental_risk_level,
                "fetal": risk.fetal_risk_level,
                "crisis_flag": risk.crisis_flag,
                "bp": f"{latest_health.bp_systolic}/{latest_health.bp_diastolic}" if latest_health and latest_health.bp_systolic else None,
                "last_log": latest_health.log_date.isoformat() if latest_health and latest_health.log_date else None,
            })

            if risk.crisis_flag == "URGENT":
                critical_alerts.append({
                    "patient_id": p.id,
                    "patient_name": p.full_name,
                    "type": "CRISIS",
                    "message": "Patient flagged for urgent crisis intervention",
                    "time": risk.scored_at.isoformat() if risk.scored_at else None,
                })

    pending_escalations = (await db.execute(
        select(func.count(Escalation.id)).where(Escalation.status == "pending")
    )).scalar() or 0

    return {
        "high_risk_patients": high_risk_patients,
        "critical_alerts": critical_alerts,
        "summary": {
            "total_monitored": len(all_patients),
            "high_risk_count": len(high_risk_patients),
            "critical_count": len(critical_alerts),
            "pending_escalations": pending_escalations,
        },
    }


# ═══════════════════════════════════════════════════════════════
#  CLINICAL NOTES (list all) — /doctor/clinical-notes
# ═══════════════════════════════════════════════════════════════

@router.get("/clinical-notes")
async def list_all_clinical_notes(
    limit: int = Query(50, ge=1, le=200),
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db),
):
    doctor_ids = await _get_doctor_identity_ids(db, user)
    result = await db.execute(
        select(ClinicalNote).where(ClinicalNote.doctor_id.in_(doctor_ids))
        .order_by(desc(ClinicalNote.created_at)).limit(limit)
    )
    notes = result.scalars().all()

    enriched = []
    for n in notes:
        patient = (await db.execute(select(User).where(User.id == n.patient_id))).scalar_one_or_none()
        enriched.append({
            "id": n.id,
            "patient_id": n.patient_id,
            "patient_name": patient.full_name if patient else "Unknown",
            "note_type": n.note_type,
            "content": n.content,
            "ai_summary": n.ai_summary,
            "created_at": n.created_at.isoformat() if n.created_at else None,
        })
    return enriched


# ═══════════════════════════════════════════════════════════════
#  PRESCRIPTIONS — /doctor/prescriptions
# ═══════════════════════════════════════════════════════════════

@router.get("/prescriptions")
async def list_all_prescriptions(
    active_only: bool = Query(True),
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db),
):
    doctor_ids = await _get_doctor_identity_ids(db, user)
    query = select(Medication).where(Medication.doctor_id.in_(doctor_ids))
    if active_only:
        query = query.where(Medication.is_active == True)
    query = query.order_by(desc(Medication.created_at))
    result = await db.execute(query)
    meds = result.scalars().all()

    enriched = []
    for m in meds:
        patient = (await db.execute(select(User).where(User.id == m.patient_id))).scalar_one_or_none()
        enriched.append({
            "id": m.id,
            "patient_id": m.patient_id,
            "patient_name": patient.full_name if patient else "Unknown",
            "name": m.name,
            "dosage": m.dosage,
            "frequency": m.frequency,
            "instructions": m.instructions,
            "start_date": m.start_date.isoformat() if m.start_date else None,
            "end_date": m.end_date.isoformat() if m.end_date else None,
            "is_active": m.is_active,
        })
    return enriched


# ═══════════════════════════════════════════════════════════════
#  TELEHEALTH — /doctor/telehealth
# ═══════════════════════════════════════════════════════════════

@router.get("/telehealth")
async def list_telehealth_sessions(
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db),
):
    doctor_ids = await _get_doctor_identity_ids(db, user)
    result = await db.execute(
        select(Appointment).where(
            Appointment.doctor_id.in_(doctor_ids),
            func.lower(Appointment.appointment_type).in_(["telemedicine", "video_call"]),
        ).order_by(desc(Appointment.appointment_date))
    )
    sessions = result.scalars().all()

    enriched = []
    for s in sessions:
        patient = (await db.execute(select(User).where(User.id == s.patient_id))).scalar_one_or_none()
        enriched.append({
            "id": s.id,
            "patient_id": s.patient_id,
            "patient_name": patient.full_name if patient else "Unknown",
            "date": s.appointment_date.isoformat() if s.appointment_date else None,
            "status": s.status,
            "reason": s.reason,
            "link": s.telemedicine_link,
        })
    return enriched


# ═══════════════════════════════════════════════════════════════
#  AI COPILOT — /doctor/ai-copilot
# ═══════════════════════════════════════════════════════════════

@router.get("/ai-copilot")
async def get_ai_copilot_summary(
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db),
):
    """AI-generated insights for the doctor: population trends, risk distribution, recommendations."""
    patient_roles = [UserRole.pregnant_user.value, UserRole.postpartum_user.value]
    patients_result = await db.execute(
        select(User).where(User.role.in_(patient_roles), User.is_active == True)
    )
    all_patients = patients_result.scalars().all()

    risk_distribution = {"LOW": 0, "MEDIUM": 0, "HIGH": 0}
    top_concerns = {}
    patients_needing_attention = []

    for p in all_patients:
        risk = (await db.execute(
            select(RiskScore).where(RiskScore.user_id == p.id)
            .order_by(desc(RiskScore.scored_at)).limit(1)
        )).scalar_one_or_none()

        if risk:
            max_level = max(
                [risk.physical_risk_level or "LOW", risk.mental_risk_level or "LOW", risk.fetal_risk_level or "LOW"],
                key=lambda x: {"LOW": 0, "MEDIUM": 1, "HIGH": 2}.get(x, 0)
            )
            risk_distribution[max_level] = risk_distribution.get(max_level, 0) + 1

            if risk.hypertension_risk and risk.hypertension_risk > 0.6:
                top_concerns["Hypertension"] = top_concerns.get("Hypertension", 0) + 1
            if risk.diabetes_risk and risk.diabetes_risk > 0.6:
                top_concerns["Gestational Diabetes"] = top_concerns.get("Gestational Diabetes", 0) + 1
            if risk.depression_risk and risk.depression_risk > 0.6:
                top_concerns["Depression"] = top_concerns.get("Depression", 0) + 1
            if risk.anemia_risk and risk.anemia_risk > 0.5:
                top_concerns["Anemia"] = top_concerns.get("Anemia", 0) + 1
            if risk.preterm_risk and risk.preterm_risk > 0.5:
                top_concerns["Preterm Risk"] = top_concerns.get("Preterm Risk", 0) + 1

            if max_level == "HIGH":
                patients_needing_attention.append({
                    "patient_id": p.id,
                    "name": p.full_name,
                    "primary_concern": (
                        "Mental Health" if risk.mental_risk_level == "HIGH"
                        else "Physical Health" if risk.physical_risk_level == "HIGH"
                        else "Fetal Health"
                    ),
                })

    sorted_concerns = sorted(top_concerns.items(), key=lambda x: x[1], reverse=True)[:5]

    ai_recommendations = []
    if risk_distribution.get("HIGH", 0) > 2:
        ai_recommendations.append("Multiple high-risk patients detected. Consider scheduling group review meeting.")
    if top_concerns.get("Hypertension", 0) > 1:
        ai_recommendations.append("Hypertension trend observed. Review BP management protocols for your cohort.")
    if top_concerns.get("Depression", 0) > 1:
        ai_recommendations.append("Mental health concerns rising. Consider integrating counseling referrals.")
    if not ai_recommendations:
        ai_recommendations.append("Patient cohort is stable. Continue routine monitoring schedules.")

    return {
        "risk_distribution": risk_distribution,
        "top_concerns": [{"condition": c[0], "count": c[1]} for c in sorted_concerns],
        "patients_needing_attention": patients_needing_attention[:10],
        "ai_recommendations": ai_recommendations,
        "cohort_stats": {
            "total_patients": len(all_patients),
            "high_risk_percent": round((risk_distribution.get("HIGH", 0) / max(len(all_patients), 1)) * 100, 1),
        },
    }


# ═══════════════════════════════════════════════════════════════
#  REPORTS — /doctor/reports
# ═══════════════════════════════════════════════════════════════

@router.get("/reports")
async def get_doctor_reports(
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Aggregate stats for the doctor's practice."""
    doctor_ids = await _get_doctor_identity_ids(db, user)

    total_appointments = (await db.execute(
        select(func.count(Appointment.id)).where(Appointment.doctor_id.in_(doctor_ids))
    )).scalar() or 0

    completed_appointments = (await db.execute(
        select(func.count(Appointment.id)).where(
            Appointment.doctor_id.in_(doctor_ids), Appointment.status == "completed"
        )
    )).scalar() or 0

    total_notes = (await db.execute(
        select(func.count(ClinicalNote.id)).where(ClinicalNote.doctor_id.in_(doctor_ids))
    )).scalar() or 0

    total_prescriptions = (await db.execute(
        select(func.count(Medication.id)).where(Medication.doctor_id.in_(doctor_ids))
    )).scalar() or 0

    recent_escalations = (await db.execute(
        select(Escalation).order_by(desc(Escalation.created_at)).limit(10)
    )).scalars().all()

    escalation_stats = {
        "total": len(recent_escalations),
        "resolved": len([e for e in recent_escalations if e.status == "resolved"]),
        "pending": len([e for e in recent_escalations if e.status == "pending"]),
    }

    return {
        "appointments": {"total": total_appointments, "completed": completed_appointments},
        "clinical_notes": total_notes,
        "prescriptions": total_prescriptions,
        "escalations": escalation_stats,
    }


# ═══════════════════════════════════════════════════════════════
#  COMMUNICATION — /doctor/communication
# ═══════════════════════════════════════════════════════════════

@router.get("/communication")
async def get_doctor_messages(
    user: User = Depends(_current_user),
):
    mongo = get_mongo_db()
    messages = []
    if mongo is not None:
        try:
            cursor = mongo.doctor_messages.find(
                {"$or": [{"sender_id": user.id}, {"receiver_id": user.id}]}
            ).sort("timestamp", -1).limit(50)
            async for doc in cursor:
                messages.append({
                    "id": str(doc.get("_id")),
                    "sender_id": doc.get("sender_id"),
                    "receiver_id": doc.get("receiver_id"),
                    "subject": doc.get("subject", ""),
                    "content": doc.get("content", ""),
                    "is_read": doc.get("is_read", False),
                    "timestamp": doc.get("timestamp", ""),
                })
        except Exception:
            # Graceful degradation when Mongo is unavailable.
            messages = []
    return messages


class DoctorMessage(BaseModel):
    receiver_id: int
    subject: str
    content: str


@router.post("/communication")
async def send_doctor_message(
    data: DoctorMessage,
    user: User = Depends(_current_user),
):
    mongo = get_mongo_db()
    if mongo is None:
        raise HTTPException(status_code=503, detail="Messaging service unavailable")

    msg = {
        "sender_id": user.id,
        "receiver_id": data.receiver_id,
        "subject": data.subject,
        "content": data.content,
        "is_read": False,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    try:
        await mongo.doctor_messages.insert_one(msg)
    except Exception:
        raise HTTPException(status_code=503, detail="Messaging service unavailable")
    return {"status": "sent", "message": "Message delivered"}


# ═══════════════════════════════════════════════════════════════
#  TASKS — /doctor/tasks
# ═══════════════════════════════════════════════════════════════

@router.get("/tasks")
async def get_doctor_tasks(
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db),
):
    mongo = get_mongo_db()
    tasks = []

    if mongo is not None:
        try:
            cursor = mongo.doctor_tasks.find({"doctor_id": user.id}).sort("created_at", -1)
            async for doc in cursor:
                tasks.append({
                    "id": str(doc.get("_id")),
                    "title": doc.get("title"),
                    "description": doc.get("description", ""),
                    "priority": doc.get("priority", "medium"),
                    "status": doc.get("status", "pending"),
                    "patient_id": doc.get("patient_id"),
                    "due_date": doc.get("due_date"),
                    "created_at": doc.get("created_at"),
                })
        except Exception:
            tasks = []

    pending_escalations = (await db.execute(
        select(Escalation).where(Escalation.status == "pending")
        .order_by(desc(Escalation.triggered_at)).limit(10)
    )).scalars().all()

    auto_tasks = []
    for e in pending_escalations:
        patient = (await db.execute(select(User).where(User.id == e.user_id))).scalar_one_or_none()
        auto_tasks.append({
            "id": f"esc-{e.id}",
            "title": f"Review escalation: {e.risk_type} ({e.risk_level})",
            "description": e.escalation_reason or "",
            "priority": "high" if e.risk_level == "HIGH" else "medium",
            "status": "pending",
            "patient_id": e.user_id,
            "patient_name": patient.full_name if patient else "Unknown",
            "due_date": None,
            "created_at": e.triggered_at.isoformat() if e.triggered_at else None,
            "type": "escalation",
        })

    return {"manual_tasks": tasks, "auto_tasks": auto_tasks}


class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    priority: Optional[str] = "medium"
    patient_id: Optional[int] = None
    due_date: Optional[str] = None


@router.post("/tasks")
async def create_doctor_task(
    data: TaskCreate,
    user: User = Depends(_current_user),
):
    mongo = get_mongo_db()
    if mongo is None:
        raise HTTPException(status_code=503, detail="Task service unavailable")

    task = {
        "doctor_id": user.id,
        "title": data.title,
        "description": data.description,
        "priority": data.priority,
        "status": "pending",
        "patient_id": data.patient_id,
        "due_date": data.due_date,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    try:
        result = await mongo.doctor_tasks.insert_one(task)
    except Exception:
        raise HTTPException(status_code=503, detail="Task service unavailable")
    return {"id": str(result.inserted_id), "status": "created"}


@router.put("/tasks/{task_id}/status")
async def update_task_status(
    task_id: str,
    status: str = Body(..., embed=True),
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db),
):
    mongo = get_mongo_db()
    if mongo is None:
        raise HTTPException(status_code=503, detail="Task service unavailable")

    # Auto-generated escalation tasks are virtual; map completion back to escalation status.
    if task_id.startswith("esc-"):
        try:
            esc_id = int(task_id.split("-", 1)[1])
        except (ValueError, IndexError):
            raise HTTPException(status_code=400, detail="Invalid escalation task id")
        result = await db.execute(select(Escalation).where(Escalation.id == esc_id))
        esc = result.scalar_one_or_none()
        if not esc:
            raise HTTPException(status_code=404, detail="Escalation not found")
        esc.status = "resolved" if status == "completed" else "pending"
        if esc.status == "resolved":
            esc.resolved_at = datetime.now(timezone.utc)
        await db.commit()
        return {"id": task_id, "status": status}

    from bson import ObjectId
    try:
        obj_id = ObjectId(task_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid task id")

    try:
        await mongo.doctor_tasks.update_one(
            {"_id": obj_id, "doctor_id": user.id},
            {"$set": {"status": status}},
        )
    except Exception:
        raise HTTPException(status_code=503, detail="Task service unavailable")
    return {"id": task_id, "status": status}


# ═══════════════════════════════════════════════════════════════
#  SETTINGS — /doctor/settings
# ═══════════════════════════════════════════════════════════════

@router.get("/settings")
async def get_doctor_settings(
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db),
):
    doctor = (await db.execute(
        select(Doctor).where(Doctor.user_id == user.id)
    )).scalar_one_or_none()

    mongo = get_mongo_db()
    prefs = None
    if mongo is not None:
        try:
            prefs = await mongo.doctor_settings.find_one({"doctor_id": user.id})
        except Exception:
            prefs = None

    return {
        "profile": {
            "name": user.full_name,
            "email": user.email,
            "phone": user.phone,
            "specialty": doctor.specialty if doctor else None,
            "license_number": doctor.license_number if doctor else None,
            "hospital_id": doctor.hospital_id if doctor else None,
            "available_for_escalation": doctor.available_for_escalation if doctor else True,
        },
        "preferences": {
            "notifications_enabled": prefs.get("notifications_enabled", True) if prefs else True,
            "escalation_alerts": prefs.get("escalation_alerts", True) if prefs else True,
            "daily_summary_email": prefs.get("daily_summary_email", False) if prefs else False,
            "auto_accept_appointments": prefs.get("auto_accept_appointments", False) if prefs else False,
        },
    }


class DoctorSettingsUpdate(BaseModel):
    available_for_escalation: Optional[bool] = None
    notifications_enabled: Optional[bool] = None
    escalation_alerts: Optional[bool] = None
    daily_summary_email: Optional[bool] = None
    auto_accept_appointments: Optional[bool] = None


@router.put("/settings")
async def update_doctor_settings(
    data: DoctorSettingsUpdate,
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db),
):
    if data.available_for_escalation is not None:
        doctor = (await db.execute(
            select(Doctor).where(Doctor.user_id == user.id)
        )).scalar_one_or_none()
        if doctor:
            doctor.available_for_escalation = data.available_for_escalation
            await db.commit()

    mongo = get_mongo_db()
    if mongo is not None:
        prefs_update = {}
        for field in ["notifications_enabled", "escalation_alerts", "daily_summary_email", "auto_accept_appointments"]:
            val = getattr(data, field, None)
            if val is not None:
                prefs_update[field] = val
        if prefs_update:
            try:
                await mongo.doctor_settings.update_one(
                    {"doctor_id": user.id},
                    {"$set": prefs_update},
                    upsert=True,
                )
            except Exception:
                # Do not fail entire settings update when Mongo prefs store is unavailable.
                pass

    return {"status": "updated"}
