from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from enum import Enum

class ModelStatus(str, Enum):
    CANDIDATE = "CANDIDATE"
    STAGING = "STAGING"
    PRODUCTION = "PRODUCTION"
    DEPRECATED = "DEPRECATED"
    ARCHIVED = "ARCHIVED"

class ValidationMetrics(BaseModel):
    accuracy: float
    precision: float
    recall: float
    f1_score: float
    fairness_score: float # Measures bias across demographics
    explainability_score: float # Consistency of XAI insights

class ModelVersion(BaseModel):
    version: str
    model_name: str
    artifact_path: str
    metrics: ValidationMetrics
    status: ModelStatus
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    promoted_at: Optional[datetime] = None
    created_by: str

class DeploymentApproval(BaseModel):
    model_id: str
    approver: str
    comments: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class DriftReport(BaseModel):
    model_name: str
    drift_score: float
    is_drift_critical: bool
    features_affected: List[str]
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
