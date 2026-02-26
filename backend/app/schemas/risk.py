"""Risk score schemas."""

from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime


class RiskScoreResponse(BaseModel):
    id: int
    user_id: int
    scored_at: datetime

    mental_risk_level: Optional[str] = None
    mental_confidence: Optional[float] = None
    depression_risk: Optional[str] = None
    anxiety_risk: Optional[str] = None
    isolation_detected: bool = False
    postpartum_risk: Optional[str] = None

    physical_risk_level: Optional[str] = None
    physical_confidence: Optional[float] = None
    diabetes_risk: Optional[str] = None
    hypertension_risk: Optional[str] = None
    anemia_risk: Optional[str] = None
    infection_risk: Optional[str] = None
    nutrition_risk: Optional[str] = None

    fetal_risk_level: Optional[str] = None
    fetal_confidence: Optional[float] = None
    preterm_risk: Optional[str] = None
    low_birth_weight_risk: Optional[str] = None
    growth_abnormality_risk: Optional[str] = None
    missed_care_risk: Optional[str] = None

    shap_features_json: Optional[Dict[str, Any]] = None
    shap_features: Optional[Dict[str, Dict[str, float]]] = None
    flagged_for_escalation: bool = False
    crisis_flag: Optional[str] = "SAFE"
    created_at: datetime

    model_config = {"from_attributes": True}


class RiskDashboard(BaseModel):
    latest_risk: Optional[RiskScoreResponse] = None
    risk_history: List[RiskScoreResponse] = []
    recommendations: List[str] = []
    escalation_triggered: bool = False
    disclaimer: str = "⚠️ This is a risk likelihood estimate — not a medical diagnosis. Please consult your doctor."
