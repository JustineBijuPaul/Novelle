import logging
import json
import re
from datetime import datetime, timezone
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.user import User
from app.models.health import HealthLog
from app.models.risk import RiskScore
from app.models.profile import PregnancyProfile
from app.services.maternal_rag import maternal_rag
from app.services.companion_ai import companion
from app.core.database import get_db

logger = logging.getLogger(__name__)

class MaternalAIPlatform:
    def __init__(self):
        self.companion = companion

    async def generate_response(self, user_id: int, message: str, db: AsyncSession) -> dict:
        # 1. Fetch Clinical Data Context
        user_res = await db.execute(select(User).where(User.id == user_id))
        user = user_res.scalar_one_or_none()
        
        prof_res = await db.execute(select(PregnancyProfile).where(PregnancyProfile.user_id == user_id))
        profile = prof_res.scalar_one_or_none()
        
        health_res = await db.execute(
            select(HealthLog).where(HealthLog.user_id == user_id).order_by(desc(HealthLog.log_date)).limit(1)
        )
        latest_health = health_res.scalar_one_or_none()
        
        risk_res = await db.execute(
            select(RiskScore).where(RiskScore.user_id == user_id).order_by(desc(RiskScore.scored_at)).limit(1)
        )
        latest_risk = risk_res.scalar_one_or_none()

        # 2. Safety Layer & Emergency Detection
        emergency_trigger = self._detect_emergency(latest_health, latest_risk)
        if emergency_trigger:
            return self._emergency_response(emergency_trigger)

        # 3. Build Clinical Context for LLM
        clinical_context = self._build_clinical_context(user, profile, latest_health, latest_risk)

        # 4. RAG: Retrieve Relevant Medical Knowledge
        # We query RAG with both the user message and the clinical context (e.g., "high bp")
        rag_query = f"{message} {clinical_context}"
        retrieved_knowledge = maternal_rag.retrieve(rag_query)
        
        knowledge_text = "\n".join([f"- {k['topic']}: {k['content']}" for k in retrieved_knowledge])

        # 5. Enhanced Prompt for LLM
        enhanced_prompt = f"""
[CLINICAL DATA]
{clinical_context}

[MEDICAL GUIDELINES (RAG)]
{knowledge_text}

[USER QUESTION]
{message}

Please respond to the user following our safety protocols.
"""
        # We reuse the existing companion logic but with the enhanced prompt
        # We pass the enhanced prompt as the "message" but preserve the original for history
        response = self.companion.generate_response(enhanced_prompt, user, context={"original_message": message})
        
        # Clean up response if it mentions [CLINICAL DATA] etc.
        # (The companion system prompt should handle this but let's be safe)
        
        return {
            "response": response["response"],
            "clinical_summary": clinical_context,
            "risk_level": self._get_overall_risk_level(latest_risk),
            "emergency_flag": False,
            "sentiment": response.get("sentiment", "neutral"),
            "crisis_flag": response.get("crisis_flag", "SAFE")
        }

    async def get_personalized_recommendations(self, user_id: str, db: AsyncSession):
        """Generates AI-driven recommendations based on recent health data and risks using Mistral-7B."""
        from app.models.health import HealthLog
        from app.models.risk import RiskScore
        from app.models.profile import PregnancyProfile
        
        # 1. Fetch current context
        latest_health = (await db.execute(
            select(HealthLog).where(HealthLog.user_id == user_id)
            .order_by(desc(HealthLog.log_date)).limit(1)
        )).scalar_one_or_none()
        
        latest_risk = (await db.execute(
            select(RiskScore).where(RiskScore.user_id == user_id)
            .order_by(desc(RiskScore.scored_at)).limit(1)
        )).scalar_one_or_none()
        
        profile = (await db.execute(
            select(PregnancyProfile).where(PregnancyProfile.user_id == user_id)
        )).scalar_one_or_none()

        health_summary = "No recent vitals."
        if latest_health:
            health_summary = f"BP: {latest_health.bp_systolic}/{latest_health.bp_diastolic}, Weight: {latest_health.weight_kg}kg, Sugar: {latest_health.blood_sugar_fasting}."

        risk_summary = "No recent risk scores."
        if latest_risk:
            risk_summary = f"Physical: {latest_risk.physical_risk_level}, Mental: {latest_risk.mental_risk_level}, Preterm: {latest_risk.preterm_risk}."

        prompt = f"""
        Generate 3 clinical health recommendations for a pregnant woman (Week {profile.pregnancy_week if profile else 'Unknown'}).
        
        Current Vitals: {health_summary}
        Current Risks: {risk_summary}
        
        Return the response as a JSON array of objects with keys: "category", "title", "detail".
        Categories should be: Physical, Mental, Nutrition, or Fetal.
        Use Mistral-7B's clinical reasoning capabilities.
        """

        # Call companion with forced model hint if possible (using Mistral)
        response = self.companion.generate_response(prompt, user=None, context={})
        
        try:
            # Attempt to parse JSON from AI response
            json_match = re.search(r'\[.*\]', response["response"], re.DOTALL)
            if json_match:
                recommendations = json.loads(json_match.group(0))
                return recommendations
        except:
            pass
            
        return []

    def _detect_emergency(self, health: HealthLog, risk: RiskScore) -> str | None:
        if not health:
            return None
        
        # Severe Blood Pressure
        if health.bp_systolic and health.bp_systolic >= 160:
            return "Critical Blood Pressure (Systolic >= 160)"
        if health.bp_diastolic and health.bp_diastolic >= 110:
            return "Critical Blood Pressure (Diastolic >= 110)"
            
        # Fetal Movement
        if health.fetal_movement_count is not None and health.fetal_movement_count < 4:
            # Assuming this is a very low count for a period
            return "Reduced Fetal Movement"
            
        # High Risk from Model
        if risk and (risk.physical_risk_level == "HIGH" or risk.fetal_risk_level == "HIGH"):
            return "Model-detected High Clinical Risk"
            
        if risk and risk.crisis_flag == "URGENT":
            return "Mental Health Crisis Detected"
            
        return None

    def _emergency_response(self, trigger: str) -> dict:
        return {
            "response": f"🚨 EMERGENCY ALERT: I've detected {trigger}. This is a critical situation. Please seek immediate in-person medical care at the nearest hospital or call emergency services (e.g., 102/108/911). Do not wait for a response from your doctor.",
            "emergency_flag": True,
            "risk_level": "CRITICAL",
            "clinical_summary": f"Emergency Triggered: {trigger}",
            "sentiment": "negative",
            "crisis_flag": "URGENT"
        }

    def _build_clinical_context(self, user: User, profile: PregnancyProfile, health: HealthLog, risk: RiskScore) -> str:
        ctx = []
        if profile:
            ctx.append(f"Pregnancy Week: {profile.pregnancy_week}")
            ctx.append(f"Trimester: {profile.trimester}")
        if health:
            ctx.append(f"Latest BP: {health.bp_systolic}/{health.bp_diastolic}")
            ctx.append(f"Latest Glucose: {health.blood_sugar_fasting}")
            ctx.append(f"Weight: {health.weight_kg}kg")
        if risk:
            overall = self._get_overall_risk_level(risk)
            ctx.append(f"AI Risk Assessment: {overall}")
            if risk.physical_risk_level != "LOW":
                ctx.append(f"Physical Risk: {risk.physical_risk_level}")
            if risk.mental_risk_level != "LOW":
                ctx.append(f"Mental Risk: {risk.mental_risk_level}")
        
        return ", ".join(ctx)

    def _get_overall_risk_level(self, risk: RiskScore) -> str:
        if not risk:
            return "LOW"
        levels = [risk.physical_risk_level, risk.mental_risk_level, risk.fetal_risk_level]
        if "HIGH" in levels or risk.crisis_flag == "URGENT":
            return "HIGH"
        if "MEDIUM" in levels:
            return "MEDIUM"
        return "LOW"

maternal_ai = MaternalAIPlatform()
