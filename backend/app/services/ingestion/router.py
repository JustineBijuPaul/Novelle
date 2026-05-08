import logging
import json
import os
from pathlib import Path
from typing import Any, Dict
from app.core.database import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.risk import RiskScore
from app.models.profile import PregnancyProfile
from sqlalchemy import select

logger = logging.getLogger(__name__)

TRAINING_DATA_PATH = Path(__file__).parent.parent.parent / "ml" / "training_data"

class DataRouter:
    """
    Microservice Routing Engine for Processed Clinical Data.
    Routes to: Inference, Training Datastore, and Primary DB.
    """

    async def dispatch(self, data: Dict[str, Any], data_type: str):
        """Orchestrate data distribution."""
        # 1. Route to Primary Database (Persistence)
        await self.persist_to_db(data, data_type)

        # 2. Route to AI Inference Engine (Real-time Risk)
        await self.send_to_inference(data, data_type)

        # 3. Route to Training Datastore (Batch ML)
        await self.save_for_training(data, data_type)

    async def persist_to_db(self, data: Dict[str, Any], data_type: str):
        """Save to patient database for longitudinal records."""
        # Note: In a real microservice, this would call the DB service
        logger.info(f"Persisting {data_type} to primary database for user {data['user_id']}")
        # Implementation depends on specific models (e.g. HealthLog model)
        pass

    async def send_to_inference(self, data: Dict[str, Any], data_type: str):
        """Trigger real-time risk assessment via AI models."""
        logger.info(f"Routing {data_type} to AI Inference Engine")
        from app.services.inference.engine import inference_engine
        
        # Real-time risk assessment
        try:
            inference_result = await inference_engine.run_inference(data)
            if inference_result.alert_triggered:
                logger.warning(f"🚨 CLINICAL ALERT TRIGGERED for user {data['user_id']}")
                # Here we would trigger the escalation service
        except Exception as e:
            logger.error(f"Inference failure: {str(e)}")

    async def save_for_training(self, data: Dict[str, Any], data_type: str):
        """Append to training datastore for future model retraining."""
        os.makedirs(TRAINING_DATA_PATH, exist_ok=True)
        file_path = TRAINING_DATA_PATH / f"{data_type}_ingestion.jsonl"
        
        try:
            # Prepare data for serializable JSON
            serializable_data = data.copy()
            if "timestamp" in serializable_data:
                serializable_data["timestamp"] = serializable_data["timestamp"].isoformat()

            with open(file_path, "a") as f:
                f.write(json.dumps(serializable_data) + "\n")
            logger.info(f"Appended {data_type} to training datastore")
        except Exception as e:
            logger.error(f"Failed to write to training datastore: {str(e)}")
