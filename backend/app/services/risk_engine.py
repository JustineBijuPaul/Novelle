"""
Novelle — Risk Engine: rule-based + ML-ready tri-domain risk scoring.
Mental Health (PHQ-9, GAD-7, mood, stress, sleep, sentiment)
Physical Health (BP, blood sugar, BMI, hemoglobin, symptoms)
Fetal Health (fetal movement, maternal risk factors)
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from datetime import date, timedelta
from typing import List
from app.models.user import User
from app.models.profile import PregnancyProfile
from app.models.health import HealthLog
from app.models.mental import MentalHealthAssessment
from app.models.risk import RiskScore
from app.models.escalation import Escalation


class RiskEngine:
    def __init__(self, db: AsyncSession, user: User):
        self.db = db
        self.user = user

    async def compute_full_risk(self) -> RiskScore:
        """Compute tri-domain risk score and save to DB."""
        profile = await self._get_profile()
        health_logs = await self._get_recent_health(7)
        mental = await self._get_recent_mental(7)

        mental_result = self._score_mental(mental, profile)
        physical_result = self._score_physical(health_logs, profile)
        fetal_result = self._score_fetal(health_logs, profile)

        overall_escalation = (
            mental_result["level"] == "HIGH"
            or physical_result["level"] == "HIGH"
            or fetal_result["level"] == "HIGH"
        )

        crisis = "SAFE"
        if mental_result["level"] == "HIGH":
            crisis = "REVIEW_NEEDED"
        if mental_result.get("crisis"):
            crisis = "URGENT"

        shap_features = {
            "mental": mental_result.get("features", {}),
            "physical": physical_result.get("features", {}),
            "fetal": fetal_result.get("features", {}),
        }

        risk = RiskScore(
            user_id=self.user.id,
            mental_risk_level=mental_result["level"],
            mental_confidence=mental_result["confidence"],
            depression_risk=mental_result.get("depression", "LOW"),
            anxiety_risk=mental_result.get("anxiety", "LOW"),
            isolation_detected=mental_result.get("isolation", False),
            postpartum_risk=mental_result.get("postpartum", "LOW"),
            physical_risk_level=physical_result["level"],
            physical_confidence=physical_result["confidence"],
            diabetes_risk=physical_result.get("diabetes", "LOW"),
            hypertension_risk=physical_result.get("hypertension", "LOW"),
            anemia_risk=physical_result.get("anemia", "LOW"),
            infection_risk=physical_result.get("infection", "LOW"),
            nutrition_risk=physical_result.get("nutrition", "LOW"),
            fetal_risk_level=fetal_result["level"],
            fetal_confidence=fetal_result["confidence"],
            preterm_risk=fetal_result.get("preterm", "LOW"),
            low_birth_weight_risk=fetal_result.get("low_bw", "LOW"),
            growth_abnormality_risk=fetal_result.get("growth", "LOW"),
            missed_care_risk=fetal_result.get("missed_care", "LOW"),
            shap_features_json=shap_features,
            flagged_for_escalation=overall_escalation,
            crisis_flag=crisis,
        )

        self.db.add(risk)
        await self.db.commit()
        await self.db.refresh(risk)
        return risk

    # ── Mental Health Scoring ────────────────────────
    def _score_mental(self, assessments: list, profile) -> dict:
        if not assessments:
            return {"level": "LOW", "confidence": 0.5, "features": {}}

        latest = assessments[0]
        score = 0
        features = {}

        # PHQ-9
        if latest.phq9_score is not None:
            features["phq9_score"] = latest.phq9_score
            if latest.phq9_score >= 20:
                score += 4
            elif latest.phq9_score >= 15:
                score += 3
            elif latest.phq9_score >= 10:
                score += 2
            elif latest.phq9_score >= 5:
                score += 1

        # GAD-7
        if latest.gad7_score is not None:
            features["gad7_score"] = latest.gad7_score
            if latest.gad7_score >= 15:
                score += 3
            elif latest.gad7_score >= 10:
                score += 2
            elif latest.gad7_score >= 5:
                score += 1

        # Mood
        if latest.mood_score is not None:
            features["mood_score"] = latest.mood_score
            if latest.mood_score <= 3:
                score += 2
            elif latest.mood_score <= 5:
                score += 1

        # Stress
        if latest.stress_level is not None:
            features["stress_level"] = latest.stress_level
            if latest.stress_level >= 8:
                score += 2
            elif latest.stress_level >= 6:
                score += 1

        # Social support
        isolation = False
        if latest.social_support_score is not None:
            features["social_support"] = latest.social_support_score
            if latest.social_support_score <= 2:
                score += 2
                isolation = True

        # Mood trend (declining)
        mood_scores = [a.mood_score for a in assessments if a.mood_score]
        if len(mood_scores) >= 3:
            if all(mood_scores[i] <= mood_scores[i + 1] for i in range(min(3, len(mood_scores) - 1))):
                score += 1  # Declining trend

        # Depression & anxiety sub-risks
        dep = "LOW"
        if latest.phq9_score and latest.phq9_score >= 15:
            dep = "HIGH"
        elif latest.phq9_score and latest.phq9_score >= 10:
            dep = "MEDIUM"

        anx = "LOW"
        if latest.gad7_score and latest.gad7_score >= 15:
            anx = "HIGH"
        elif latest.gad7_score and latest.gad7_score >= 10:
            anx = "MEDIUM"

        # Postpartum
        postpartum = "LOW"
        if profile and profile.trimester == "postpartum":
            if latest.epds_score and latest.epds_score >= 13:
                postpartum = "HIGH"
            elif latest.epds_score and latest.epds_score >= 10:
                postpartum = "MEDIUM"

        # Final level
        if score >= 7:
            level, conf = "HIGH", 0.90
        elif score >= 4:
            level, conf = "MEDIUM", 0.75
        else:
            level, conf = "LOW", 0.85

        return {
            "level": level,
            "confidence": conf,
            "depression": dep,
            "anxiety": anx,
            "isolation": isolation,
            "postpartum": postpartum,
            "features": features,
        }

    # ── Physical Health Scoring ──────────────────────
    def _score_physical(self, logs: list, profile) -> dict:
        if not logs:
            return {"level": "LOW", "confidence": 0.5, "features": {}}

        score = 0
        features = {}

        # BP analysis
        bp_vals = [(l.bp_systolic, l.bp_diastolic) for l in logs if l.bp_systolic and l.bp_diastolic]
        if bp_vals:
            avg_sys = sum(s for s, d in bp_vals) / len(bp_vals)
            avg_dia = sum(d for s, d in bp_vals) / len(bp_vals)
            features["avg_bp"] = f"{avg_sys:.0f}/{avg_dia:.0f}"

            if avg_sys >= 160 or avg_dia >= 110:
                score += 4  # Severe
            elif avg_sys >= 140 or avg_dia >= 90:
                score += 3  # Stage 2
            elif avg_sys >= 130 or avg_dia >= 85:
                score += 1

        # Blood sugar
        sugar_vals = [l.blood_sugar_fasting for l in logs if l.blood_sugar_fasting]
        if sugar_vals:
            avg_sugar = sum(sugar_vals) / len(sugar_vals)
            features["avg_fasting_sugar"] = round(avg_sugar, 1)
            if avg_sugar >= 126:
                score += 3
            elif avg_sugar >= 100:
                score += 1

        # Hemoglobin (from profile)
        if profile and profile.hemoglobin_level:
            features["hemoglobin"] = profile.hemoglobin_level
            if profile.hemoglobin_level < 7:
                score += 3
            elif profile.hemoglobin_level < 10:
                score += 2
            elif profile.hemoglobin_level < 11:
                score += 1

        # BMI
        if profile and profile.bmi:
            features["bmi"] = profile.bmi
            if profile.bmi >= 35:
                score += 2
            elif profile.bmi >= 30:
                score += 1

        # Symptoms
        edema_count = sum(1 for l in logs if l.edema_flag)
        bleeding_count = sum(1 for l in logs if l.bleeding_flag)
        if edema_count >= 3:
            score += 2
            features["edema_frequency"] = edema_count
        if bleeding_count > 0:
            score += 3
            features["bleeding_detected"] = True

        # Past complications
        if profile and profile.past_complications:
            risky = {"preeclampsia", "gestational_diabetes", "prom", "placenta_previa"}
            if set(profile.past_complications) & risky:
                score += 1

        # Sub-risks
        hyp = "HIGH" if (bp_vals and (sum(s for s, d in bp_vals) / len(bp_vals)) >= 140) else "LOW"
        if bp_vals and (sum(s for s, d in bp_vals) / len(bp_vals)) >= 130:
            hyp = "MEDIUM" if hyp == "LOW" else hyp

        diab = "HIGH" if (sugar_vals and sum(sugar_vals) / len(sugar_vals) >= 126) else "LOW"
        if sugar_vals and sum(sugar_vals) / len(sugar_vals) >= 100 and diab == "LOW":
            diab = "MEDIUM"

        anemia = "LOW"
        if profile and profile.hemoglobin_level:
            if profile.hemoglobin_level < 7:
                anemia = "HIGH"
            elif profile.hemoglobin_level < 10:
                anemia = "MEDIUM"

        if score >= 7:
            level, conf = "HIGH", 0.88
        elif score >= 4:
            level, conf = "MEDIUM", 0.75
        else:
            level, conf = "LOW", 0.85

        return {
            "level": level,
            "confidence": conf,
            "hypertension": hyp,
            "diabetes": diab,
            "anemia": anemia,
            "infection": "LOW",
            "nutrition": "MEDIUM" if (profile and profile.bmi and profile.bmi < 18.5) else "LOW",
            "features": features,
        }

    # ── Fetal Health Scoring ─────────────────────────
    def _score_fetal(self, logs: list, profile) -> dict:
        if not logs:
            return {"level": "LOW", "confidence": 0.5, "features": {}}

        score = 0
        features = {}

        # Fetal movement
        fetal_vals = [l.fetal_movement_count for l in logs if l.fetal_movement_count is not None]
        week = profile.pregnancy_week if profile else 20

        if fetal_vals and week >= 28:
            avg_movements = sum(fetal_vals) / len(fetal_vals)
            features["avg_fetal_movements"] = round(avg_movements, 1)
            if avg_movements < 4:
                score += 4
            elif avg_movements < 10:
                score += 2

        # Maternal risk cascade
        if profile:
            features["pregnancy_week"] = week
            if profile.chronic_hypertension:
                score += 1
            if profile.gestational_diabetes:
                score += 1
            if profile.hemoglobin_level and profile.hemoglobin_level < 10:
                score += 1
            if profile.previous_pregnancies and profile.pregnancy_history:
                if "preterm" in str(profile.pregnancy_history):
                    score += 2
                    features["previous_preterm"] = True

        # Bleeding
        if any(l.bleeding_flag for l in logs):
            score += 2
            features["bleeding_detected"] = True

        # Cramps
        severe_cramps = sum(1 for l in logs if l.cramps_flag and l.cramps_intensity and l.cramps_intensity >= 7)
        if severe_cramps >= 2:
            score += 2
            features["severe_cramps"] = severe_cramps

        # Age risk
        if profile and profile.age:
            if profile.age >= 40:
                score += 1
            elif profile.age <= 17:
                score += 1

        # Sub-risks
        preterm = "LOW"
        if week < 37 and score >= 4:
            preterm = "HIGH"
        elif week < 37 and score >= 2:
            preterm = "MEDIUM"

        low_bw = "LOW"
        if profile and profile.bmi and profile.bmi < 18.5:
            low_bw = "MEDIUM"
        if score >= 5:
            low_bw = "HIGH"

        growth = "LOW"
        if fetal_vals and week >= 28 and sum(fetal_vals) / len(fetal_vals) < 6:
            growth = "MEDIUM"
        if fetal_vals and week >= 28 and sum(fetal_vals) / len(fetal_vals) < 3:
            growth = "HIGH"

        if score >= 6:
            level, conf = "HIGH", 0.85
        elif score >= 3:
            level, conf = "MEDIUM", 0.72
        else:
            level, conf = "LOW", 0.88

        return {
            "level": level,
            "confidence": conf,
            "preterm": preterm,
            "low_bw": low_bw,
            "growth": growth,
            "missed_care": "LOW",
            "features": features,
        }

    # ── Helpers ──────────────────────────────────────
    async def _get_profile(self):
        result = await self.db.execute(
            select(PregnancyProfile).where(PregnancyProfile.user_id == self.user.id)
        )
        return result.scalar_one_or_none()

    async def _get_recent_health(self, days: int) -> list:
        since = date.today() - timedelta(days=days)
        result = await self.db.execute(
            select(HealthLog)
            .where(HealthLog.user_id == self.user.id, HealthLog.log_date >= since)
            .order_by(desc(HealthLog.log_date))
        )
        return result.scalars().all()

    async def _get_recent_mental(self, days: int) -> list:
        since = date.today() - timedelta(days=days)
        result = await self.db.execute(
            select(MentalHealthAssessment)
            .where(MentalHealthAssessment.user_id == self.user.id, MentalHealthAssessment.assessment_date >= since)
            .order_by(desc(MentalHealthAssessment.assessment_date))
        )
        return result.scalars().all()

    def get_recommendations(self, risk: RiskScore) -> list[str]:
        recs = []

        if risk.mental_risk_level == "HIGH":
            recs.append("Your mental health indicators suggest elevated risk. Please consider speaking with a mental health professional.")
            recs.append("Practice daily breathing exercises and ensure adequate sleep.")
        elif risk.mental_risk_level == "MEDIUM":
            recs.append("Monitor your emotional well-being closely. Consider journaling daily.")

        if risk.physical_risk_level == "HIGH":
            recs.append("Your vital signs indicate elevated physical risk. Please consult your doctor immediately.")
        elif risk.physical_risk_level == "MEDIUM":
            recs.append("Stay hydrated, monitor your blood pressure regularly, and follow your doctor's advice.")

        if risk.diabetes_risk == "HIGH":
            recs.append("Your blood sugar levels are elevated. Follow a diabetic-friendly diet and consult your doctor.")

        if risk.hypertension_risk in ("HIGH", "MEDIUM"):
            recs.append("Monitor your blood pressure twice daily. Reduce salt intake and stay active.")

        if risk.anemia_risk in ("HIGH", "MEDIUM"):
            recs.append("Increase iron-rich foods in your diet. Your doctor may recommend iron supplements.")

        if risk.fetal_risk_level == "HIGH":
            recs.append("Fetal health indicators need attention. Please visit your healthcare provider soon.")
        elif risk.fetal_risk_level == "MEDIUM":
            recs.append("Continue monitoring fetal movements daily. Drink plenty of water.")

        if not recs:
            recs.append("Your health indicators look good! Keep up with regular check-ups and a balanced lifestyle.")

        recs.append("⚠️ Remember: These are risk estimates, not diagnoses. Always consult your healthcare provider.")
        return recs

    async def trigger_escalation(self, risk: RiskScore):
        """Create escalation record for HIGH risk."""
        reasons = []
        if risk.mental_risk_level == "HIGH":
            reasons.append(f"Mental health risk: HIGH (depression={risk.depression_risk}, anxiety={risk.anxiety_risk})")
        if risk.physical_risk_level == "HIGH":
            reasons.append(f"Physical risk: HIGH (BP={risk.hypertension_risk}, diabetes={risk.diabetes_risk})")
        if risk.fetal_risk_level == "HIGH":
            reasons.append(f"Fetal risk: HIGH (preterm={risk.preterm_risk})")

        if reasons:
            esc = Escalation(
                user_id=self.user.id,
                risk_type="combined" if len(reasons) > 1 else (
                    "mental" if risk.mental_risk_level == "HIGH"
                    else "physical" if risk.physical_risk_level == "HIGH"
                    else "fetal"
                ),
                risk_level="HIGH",
                severity="URGENT" if risk.crisis_flag == "URGENT" else "HIGH",
                escalation_reason="; ".join(reasons),
                status="pending",
            )
            self.db.add(esc)
            await self.db.commit()
