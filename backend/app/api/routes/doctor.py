"""Doctor routes — dashboard, patient summary, escalation management, AI predictions."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func
from datetime import datetime, timezone, timedelta, date
from app.core.database import get_db
from app.models.user import User, UserRole
from app.models.escalation import Escalation
from app.models.risk import RiskScore
from app.models.health import HealthLog
from app.models.mental import MentalHealthAssessment
from app.models.profile import PregnancyProfile
from app.models.clinical import ClinicalNote, Appointment, Medication
from app.schemas.features import EscalationResponse, EscalationResolve
from app.schemas.clinical import (
    ClinicalNoteCreate, ClinicalNoteResponse,
    AppointmentCreate, AppointmentResponse,
    MedicationCreate, MedicationResponse
)
from app.api.routes.auth import _current_user

router = APIRouter(prefix="/doctor", tags=["Doctor Portal"])


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
