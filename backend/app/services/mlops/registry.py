import logging
import uuid
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from app.schemas.mlops import ModelVersion, ModelStatus, ValidationMetrics

logger = logging.getLogger(__name__)

class ModelRegistryService:
    """
    Enterprise MLOps Model Registry.
    Governs the lifecycle of maternal risk models with clinical validation gates.
    """

    def __init__(self):
        self.registry: Dict[str, ModelVersion] = {}
        self.production_aliases: Dict[str, str] = {} # model_name -> version

    async def register_candidate(self, name: str, artifact_path: str, metrics: ValidationMetrics, creator: str) -> ModelVersion:
        """Register a new retrained model as a 'CANDIDATE' for validation."""
        version = f"v{datetime.now().strftime('%Y.%m.%d.%H%M')}"
        model_id = f"{name}:{version}"
        
        m_version = ModelVersion(
            version=version,
            model_name=name,
            artifact_path=artifact_path,
            metrics=metrics,
            status=ModelStatus.CANDIDATE,
            created_by=creator
        )
        
        self.registry[model_id] = m_version
        logger.info(f"Model candidate registered: {model_id}")
        return m_version

    async def promote_to_staging(self, model_id: str):
        """Pass a candidate through clinical safety gates into STAGING."""
        if model_id not in self.registry:
            raise ValueError("Model not found")
        
        model = self.registry[model_id]
        
        # Clinical Safety Gates
        if model.metrics.recall < 0.90:
            raise ValueError("Deployment failed: Recall threshold (0.90) for clinical safety not met.")
        if model.metrics.fairness_score < 0.85:
            raise ValueError("Deployment failed: Demographic fairness threshold (0.85) not met.")

        model.status = ModelStatus.STAGING
        logger.info(f"Model promoted to STAGING: {model_id}")

    async def promote_to_production(self, model_id: str, approver: str):
        """Final human-in-the-loop approval to swap PRODUCTION models."""
        if model_id not in self.registry:
            raise ValueError("Model not found")
        
        model = self.registry[model_id]
        if model.status != ModelStatus.STAGING:
            raise ValueError("Model must be in STAGING before promoting to PRODUCTION")

        # Rollback Support: Deprecate current production model
        current_prod_id = self.production_aliases.get(model.model_name)
        if current_prod_id and current_prod_id in self.registry:
            self.registry[current_prod_id].status = ModelStatus.DEPRECATED
            logger.warning(f"Previous production model deprecated: {current_prod_id}")

        model.status = ModelStatus.PRODUCTION
        model.promoted_at = datetime.now(timezone.utc)
        self.production_aliases[model.model_name] = model_id
        
        logger.info(f"🚀 Model {model_id} IS NOW LIVE IN PRODUCTION (Approved by {approver})")

    async def rollback(self, model_name: str):
        """Emergency rollback to the last DEPRECATED version."""
        # Find the most recent DEPRECATED version
        versions = [v for v in self.registry.values() if v.model_name == model_name and v.status == ModelStatus.DEPRECATED]
        if not versions:
            raise ValueError("No viable rollback version found")
        
        latest_rollback = sorted(versions, key=lambda x: x.created_at, reverse=True)[0]
        await self.promote_to_production(f"{latest_rollback.model_name}:{latest_rollback.version}", "SYSTEM_ROLLBACK")
        logger.error(f"⚠️ EMERGENCY ROLLBACK COMPLETED for {model_name}")

# Global MLOps Registry
mlops_registry = ModelRegistryService()
