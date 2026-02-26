"""
ML Pipeline stubs — placeholder for trained model inference integration.
The actual model inference is handled by app.ml.utils module.
Pipeline classes below provide a structured interface for future enhancements
like LSTM mood trajectory, anomaly detection via Isolation Forest, etc.
"""

from app.ml.utils import (
    predict_mental_risk,
    predict_physical_risk,
    predict_fetal_risk,
    models_available,
)


class MentalHealthPipeline:
    """XGBoost-based mental health risk prediction pipeline."""

    def predict(self, features: dict) -> dict:
        result = predict_mental_risk(features)
        if result is None:
            return {"risk_level": "LOW", "confidence": 0.5, "source": "rule_based"}
        result["source"] = "ml_model"
        return result


class PhysicalHealthPipeline:
    """Ensemble (XGB + RF + LR) physical health risk prediction pipeline."""

    def predict(self, features: dict) -> dict:
        result = predict_physical_risk(features)
        if result is None:
            return {"risk_level": "LOW", "confidence": 0.5, "source": "rule_based"}
        result["source"] = "ml_model"
        return result


class FetalHealthPipeline:
    """LightGBM-based fetal health risk prediction pipeline."""

    def predict(self, features: dict) -> dict:
        result = predict_fetal_risk(features)
        if result is None:
            return {"risk_level": "LOW", "confidence": 0.5, "source": "rule_based"}
        result["source"] = "ml_model"
        return result
