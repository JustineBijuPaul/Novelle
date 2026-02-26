"""
Novelle — ML utilities: model loading, feature preparation, inference.
Loads trained .joblib models from app/ml/models/ directory.
"""

import joblib
import numpy as np
from pathlib import Path
from typing import Optional, Dict, Any
from app.core.config import settings

MODEL_DIR = Path(settings.ML_MODEL_DIR)

# Cache loaded models
_model_cache: Dict[str, Any] = {}


def _load(name: str):
    """Load a joblib model with caching."""
    if name not in _model_cache:
        path = MODEL_DIR / name
        if path.exists():
            _model_cache[name] = joblib.load(path)
        else:
            return None
    return _model_cache[name]


def get_mental_model():
    return _load("mental_health_xgb.joblib")

def get_mental_scaler():
    return _load("mental_health_scaler.joblib")

def get_mental_encoder():
    return _load("mental_health_label_encoder.joblib")

def get_physical_model():
    return _load("physical_health_ensemble.joblib")

def get_physical_scaler():
    return _load("physical_health_scaler.joblib")

def get_physical_encoder():
    return _load("physical_health_label_encoder.joblib")

def get_fetal_model():
    return _load("fetal_health_lgbm.joblib")

def get_fetal_scaler():
    return _load("fetal_health_scaler.joblib")

def get_fetal_encoder():
    return _load("fetal_health_label_encoder.joblib")


def predict_mental_risk(features: dict) -> Optional[dict]:
    """Predict mental health risk from feature dict."""
    model = get_mental_model()
    scaler = get_mental_scaler()
    encoder = get_mental_encoder()
    if not model or not scaler or not encoder:
        return None

    feature_names = [
        "phq9_score", "gad7_score", "mood_avg_7d",
        "stress_avg_7d", "journal_sentiment_avg",
    ]
    X = np.array([[features.get(f, 0) for f in feature_names]])
    X_scaled = scaler.transform(X)
    pred = model.predict(X_scaled)[0]
    proba = model.predict_proba(X_scaled)[0]
    label = encoder.inverse_transform([pred])[0]

    return {
        "risk_level": label,
        "confidence": float(max(proba)),
        "probabilities": {encoder.inverse_transform([i])[0]: float(p) for i, p in enumerate(proba)},
    }


def predict_physical_risk(features: dict) -> Optional[dict]:
    """Predict physical health risk from feature dict."""
    model_data = get_physical_model()
    scaler = get_physical_scaler()
    encoder = get_physical_encoder()
    if not model_data or not scaler or not encoder:
        return None

    feature_names = [
        "bp_systolic_avg", "bp_diastolic_avg", "bp_slope",
        "sugar_fasting_avg", "sugar_postmeal_avg", "sugar_variability",
        "weight_deviation", "hemoglobin", "edema_frequency",
        "pain_frequency", "age", "bmi", "pregnancy_week",
        "past_complications_count",
    ]
    X = np.array([[features.get(f, 0) for f in feature_names]])
    X_scaled = scaler.transform(X)

    # Handle ensemble dict or direct model
    if isinstance(model_data, dict):
        weights = np.array(model_data["weights"], dtype=float)
        weights /= weights.sum()
        proba = sum(
            w * m.predict_proba(X_scaled)
            for w, m in zip(weights, [model_data["xgb"], model_data["rf"], model_data["lr"]])
        )
        pred = np.argmax(proba, axis=1)[0]
        proba = proba[0]
    else:
        pred = model_data.predict(X_scaled)[0]
        proba = model_data.predict_proba(X_scaled)[0]

    label = encoder.inverse_transform([pred])[0]
    return {
        "risk_level": label,
        "confidence": float(max(proba)),
        "probabilities": {encoder.inverse_transform([i])[0]: float(p) for i, p in enumerate(proba)},
    }


def predict_fetal_risk(features: dict) -> Optional[dict]:
    """Predict fetal health risk from feature dict."""
    model = get_fetal_model()
    scaler = get_fetal_scaler()
    encoder = get_fetal_encoder()
    if not model or not scaler or not encoder:
        return None

    feature_names = [
        "fetal_movement_avg", "fetal_movement_min", "maternal_age",
        "pregnancy_week", "bmi", "previous_preterm",
        "chronic_hypertension", "gestational_diabetes", "hemoglobin",
        "bp_systolic_avg", "bp_diastolic_avg", "previous_pregnancies",
        "bleeding_frequency", "cramps_frequency",
    ]
    X = np.array([[features.get(f, 0) for f in feature_names]])
    X_scaled = scaler.transform(X)
    pred = model.predict(X_scaled)[0]
    proba = model.predict_proba(X_scaled)[0]
    label = encoder.inverse_transform([pred])[0]

    return {
        "risk_level": label,
        "confidence": float(max(proba)),
        "probabilities": {encoder.inverse_transform([i])[0]: float(p) for i, p in enumerate(proba)},
    }


def models_available() -> dict:
    """Check which ML models are available."""
    return {
        "mental_health": (MODEL_DIR / "mental_health_xgb.joblib").exists(),
        "physical_health": (MODEL_DIR / "physical_health_ensemble.joblib").exists(),
        "fetal_health": (MODEL_DIR / "fetal_health_lgbm.joblib").exists(),
    }
