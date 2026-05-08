from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime

class RiskPrediction(BaseModel):
    condition: str # e.g. "Preeclampsia", "PPD"
    probability: float = Field(..., ge=0, le=1)
    risk_level: str # "LOW", "MEDIUM", "HIGH", "CRITICAL"
    confidence_score: float = Field(..., ge=0, le=1)
    top_features: List[Dict[str, Any]] # For Explainable AI (XAI)

class InferenceResponse(BaseModel):
    user_id: int
    timestamp: datetime
    predictions: List[RiskPrediction]
    global_risk_score: float
    clinical_advice: List[str]
    alert_triggered: bool

class ModelMetadata(BaseModel):
    model_name: str
    version: str
    last_trained: datetime
    accuracy_metric: float
    gpu_enabled: bool
