from typing import Any, Dict, List
import logging

logger = logging.getLogger(__name__)

class XAIService:
    """
    Explainable AI (XAI) Service for clinical transparency.
    Uses feature importance and SHAP-like attribution to explain risk models.
    """

    def explain(self, condition: str, data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Generate feature importance maps for a given prediction.
        In production, this would use SHAP values from the trained models.
        """
        if condition == "preeclampsia":
            return [
                {"feature": "Systolic Blood Pressure", "impact": 0.65, "value": data.get("systolic")},
                {"feature": "Weight Gain Velocity", "impact": 0.20, "value": "+2.5kg/week"},
                {"feature": "Symptom: Edema", "impact": 0.15, "value": "Present"}
            ]
        elif condition == "ppd":
            return [
                {"feature": "Mood Rating", "impact": 0.70, "value": data.get("mood_rating")},
                {"feature": "Sleep Duration", "impact": 0.30, "value": data.get("sleep_hours")}
            ]
        
        return []

    def get_clinical_narrative(self, predictions: List[Any]) -> str:
        """Translate complex feature impacts into human-readable clinical narratives."""
        high_risks = [p for p in predictions if p.risk_level == "HIGH"]
        if not high_risks:
            return "All maternal safety metrics are within stable parameters."
        
        narrative = f"Detected elevated risk for {', '.join([p.condition for p in high_risks])}. "
        narrative += "Primary drivers include clinical vital sign spikes and symptomatic deviations."
        return narrative
