"""
Novelle — ML utilities: model loading, feature preparation, inference.
Loads trained .joblib models from app/ml/models/ directory.

Models:
- mental_health_xgb.joblib: XGBoost mental health risk classifier
- physical_health_ensemble.joblib: XGBoost physical/maternal health classifier
- fetal_health_lgbm.joblib: LightGBM fetal health (CTG) classifier
"""

import json
import joblib
import pandas as pd
from pathlib import Path
from typing import Optional, Dict, Any
from app.core.config import settings

MODEL_DIR = Path(settings.ML_MODEL_DIR)

# Cache loaded models and features
_model_cache: Dict[str, Any] = {}
_feature_cache: Dict[str, list] = {}


def _load(name: str):
    """Load a joblib model with caching."""
    if name not in _model_cache:
        path = MODEL_DIR / name
        if path.exists():
            _model_cache[name] = joblib.load(path)
        else:
            return None
    return _model_cache[name]


def _load_features(name: str) -> list:
    """Load feature column names from JSON."""
    if name not in _feature_cache:
        path = MODEL_DIR / name
        if path.exists():
            with open(path, 'r') as f:
                _feature_cache[name] = json.load(f)
        else:
            return []
    return _feature_cache[name]


# ── Model loaders ───────────────────────────────────────────
def get_mental_model():
    return _load("mental_health_xgb.joblib")

def get_mental_scaler():
    return _load("mental_health_scaler.joblib")

def get_mental_encoder():
    return _load("mental_health_label_encoder.joblib")

def get_mental_features():
    return _load_features("mental_health_features.json")

def get_physical_model():
    return _load("physical_health_ensemble.joblib")

def get_physical_scaler():
    return _load("physical_health_scaler.joblib")

def get_physical_encoder():
    return _load("physical_health_label_encoder.joblib")

def get_physical_features():
    return _load_features("physical_health_features.json")

def get_fetal_model():
    return _load("fetal_health_lgbm.joblib")

def get_fetal_scaler():
    return _load("fetal_health_scaler.joblib")

def get_fetal_encoder():
    return _load("fetal_health_label_encoder.joblib")

def get_fetal_features():
    return _load_features("fetal_health_features.json")


# ── Mental Health Prediction ────────────────────────────────
def predict_mental_risk(features: dict) -> Optional[dict]:
    """
    Predict mental health risk from assessment features.
    
    Expected features (from MentalHealthAssessment):
    - phq9_score: PHQ-9 depression score (0-27)
    - gad7_score: GAD-7 anxiety score (0-21)
    - mood_score: Daily mood (1-10)
    - stress_level: Stress level (1-10)
    - social_support_score: Social support (1-10)
    - age: User age
    - pregnancy_week: Current pregnancy week
    - previous_pregnancies: Number of previous pregnancies
    """
    model = get_mental_model()
    scaler = get_mental_scaler()
    encoder = get_mental_encoder()
    feature_cols = get_mental_features()
    
    if not model or not scaler or not encoder or not feature_cols:
        return None
    
    try:
        # Extract base features with defaults
        phq9 = features.get("phq9_score", 0) or 0
        gad7 = features.get("gad7_score", 0) or 0
        mood = features.get("mood_score", 5) or 5
        stress = features.get("stress_level", 5) or 5
        social = features.get("social_support_score", 5) or 5
        age = features.get("age", 28) or 28
        preg_week = features.get("pregnancy_week", 20) or 20
        prev_preg = features.get("previous_pregnancies", 0) or 0
        
        # Compute engineered features (matching training notebook)
        phq9_gad7_combined = phq9 + gad7
        mood_stress_ratio = mood / max(stress, 1)
        support_deficit = max(0, 5 - social) if social < 5 else 0
        
        # Depression severity (0-3 scale)
        if phq9 >= 20:
            depression_severity = 3
        elif phq9 >= 15:
            depression_severity = 2
        elif phq9 >= 10:
            depression_severity = 1
        else:
            depression_severity = 0
            
        # Anxiety severity (0-3 scale)
        if gad7 >= 15:
            anxiety_severity = 3
        elif gad7 >= 10:
            anxiety_severity = 2
        elif gad7 >= 5:
            anxiety_severity = 1
        else:
            anxiety_severity = 0
            
        # Trimester (1-3)
        if preg_week <= 12:
            trimester_num = 1
        elif preg_week <= 27:
            trimester_num = 2
        else:
            trimester_num = 3
        
        # Build feature vector in correct order
        feature_dict = {
            "phq9_score": phq9,
            "gad7_score": gad7,
            "mood_score": mood,
            "stress_level": stress,
            "social_support_score": social,
            "phq9_gad7_combined": phq9_gad7_combined,
            "mood_stress_ratio": mood_stress_ratio,
            "support_deficit": support_deficit,
            "depression_severity": depression_severity,
            "anxiety_severity": anxiety_severity,
            "age": age,
            "pregnancy_week": preg_week,
            "trimester_num": trimester_num,
            "previous_pregnancies": prev_preg,
        }
        
        X = pd.DataFrame([[feature_dict.get(f, 0) for f in feature_cols]], columns=feature_cols)
        X_scaled = scaler.transform(X)
        
        pred = model.predict(X_scaled)[0]
        proba = model.predict_proba(X_scaled)[0]
        label = encoder.inverse_transform([pred])[0]
        
        return {
            "risk_level": label,
            "confidence": round(float(max(proba)), 3),
            "probabilities": {
                encoder.inverse_transform([i])[0]: round(float(p), 3) 
                for i, p in enumerate(proba)
            },
        }
    except Exception as e:
        print(f"Mental health prediction error: {e}")
        return None


# ── Physical Health Prediction ──────────────────────────────
def predict_physical_risk(features: dict) -> Optional[dict]:
    """
    Predict physical/maternal health risk.
    
    Expected features (from HealthLog):
    - Age: User age
    - SystolicBP: Systolic blood pressure (mmHg)
    - DiastolicBP: Diastolic blood pressure (mmHg)
    - BS: Blood sugar (mmol/L) - fasting or average
    - BodyTemp: Body temperature (°F)
    - HeartRate: Heart rate (bpm)
    """
    model = get_physical_model()
    scaler = get_physical_scaler()
    encoder = get_physical_encoder()
    feature_cols = get_physical_features()
    
    if not model or not scaler or not encoder or not feature_cols:
        return None
    
    try:
        # Extract base features
        age = features.get("Age", features.get("age", 28)) or 28
        systolic = features.get("SystolicBP", features.get("bp_systolic", 120)) or 120
        diastolic = features.get("DiastolicBP", features.get("bp_diastolic", 80)) or 80
        bs = features.get("BS", features.get("blood_sugar", 5.5)) or 5.5
        body_temp = features.get("BodyTemp", features.get("body_temp", 98.6)) or 98.6
        heart_rate = features.get("HeartRate", features.get("heart_rate", 75)) or 75
        
        # Compute engineered features (matching training notebook)
        bp_mean = (systolic + diastolic) / 2
        bp_pulse_pressure = systolic - diastolic
        hypertension_flag = 1 if (systolic >= 140 or diastolic >= 90) else 0
        hyperglycemia_flag = 1 if bs >= 7.8 else 0
        fever_flag = 1 if body_temp > 99.5 else 0
        tachycardia_flag = 1 if heart_rate > 100 else 0
        bradycardia_flag = 1 if heart_rate < 60 else 0
        age_risk = 1 if (age < 18 or age > 35) else 0
        
        # Blood sugar severity
        if bs < 6.1:
            bs_severity = 0
        elif bs < 7.8:
            bs_severity = 1
        elif bs < 11.1:
            bs_severity = 2
        else:
            bs_severity = 3
        
        # Build feature vector
        feature_dict = {
            "Age": age,
            "SystolicBP": systolic,
            "DiastolicBP": diastolic,
            "BS": bs,
            "BodyTemp": body_temp,
            "HeartRate": heart_rate,
            "bp_mean": bp_mean,
            "bp_pulse_pressure": bp_pulse_pressure,
            "hypertension_flag": hypertension_flag,
            "hyperglycemia_flag": hyperglycemia_flag,
            "fever_flag": fever_flag,
            "tachycardia_flag": tachycardia_flag,
            "bradycardia_flag": bradycardia_flag,
            "age_risk": age_risk,
            "bs_severity": bs_severity,
        }
        
        X = pd.DataFrame([[feature_dict.get(f, 0) for f in feature_cols]], columns=feature_cols)
        X_scaled = scaler.transform(X)
        
        pred = model.predict(X_scaled)[0]
        proba = model.predict_proba(X_scaled)[0]
        label = encoder.inverse_transform([pred])[0]
        
        return {
            "risk_level": label,
            "confidence": round(float(max(proba)), 3),
            "probabilities": {
                encoder.inverse_transform([i])[0]: round(float(p), 3) 
                for i, p in enumerate(proba)
            },
        }
    except Exception as e:
        print(f"Physical health prediction error: {e}")
        return None


# ── Fetal Health Prediction ─────────────────────────────────
def predict_fetal_risk(features: dict) -> Optional[dict]:
    """
    Predict fetal health risk from CTG features.
    
    Expected features (CTG monitoring data):
    - baseline value: Baseline fetal heart rate (bpm)
    - accelerations: Number of accelerations
    - fetal_movement: Fetal movement count
    - uterine_contractions: Contraction count
    - light_decelerations, severe_decelerations, prolongued_decelerations
    - abnormal_short_term_variability, mean_value_of_short_term_variability
    - percentage_of_time_with_abnormal_long_term_variability
    - mean_value_of_long_term_variability
    - histogram_* features
    """
    model = get_fetal_model()
    scaler = get_fetal_scaler()
    encoder = get_fetal_encoder()
    feature_cols = get_fetal_features()
    
    if not model or not scaler or not encoder or not feature_cols:
        return None
    
    try:
        # Extract base features with CTG defaults
        baseline = features.get("baseline value", features.get("baseline_fhr", 133)) or 133
        accelerations = features.get("accelerations", 0.004) or 0.004
        fetal_movement = features.get("fetal_movement", 0.003) or 0.003
        uterine_cont = features.get("uterine_contractions", 0.004) or 0.004
        light_decel = features.get("light_decelerations", 0) or 0
        severe_decel = features.get("severe_decelerations", 0) or 0
        prolonged_decel = features.get("prolongued_decelerations", 0) or 0
        abnormal_stv = features.get("abnormal_short_term_variability", 30) or 30
        mean_stv = features.get("mean_value_of_short_term_variability", 1.5) or 1.5
        pct_abnormal_ltv = features.get("percentage_of_time_with_abnormal_long_term_variability", 10) or 10
        mean_ltv = features.get("mean_value_of_long_term_variability", 8) or 8
        
        # Histogram features
        hist_width = features.get("histogram_width", 70) or 70
        hist_min = features.get("histogram_min", 62) or 62
        hist_max = features.get("histogram_max", 180) or 180
        hist_peaks = features.get("histogram_number_of_peaks", 4) or 4
        hist_zeroes = features.get("histogram_number_of_zeroes", 0) or 0
        hist_mode = features.get("histogram_mode", 136) or 136
        hist_mean = features.get("histogram_mean", 135) or 135
        hist_median = features.get("histogram_median", 138) or 138
        hist_variance = features.get("histogram_variance", 12) or 12
        hist_tendency = features.get("histogram_tendency", 0) or 0
        
        # Engineered features
        total_decel = light_decel + severe_decel + prolonged_decel
        decel_severity_ratio = (severe_decel + prolonged_decel) / total_decel if total_decel > 0 else 0
        variability_score = (mean_stv + mean_ltv) / 2
        abnormal_variability = (abnormal_stv + pct_abnormal_ltv) / 2
        histogram_range = hist_max - hist_min
        histogram_skewness = hist_mean - hist_median
        reactivity_score = accelerations * 1000
        
        # Build feature vector
        feature_dict = {
            "baseline value": baseline,
            "accelerations": accelerations,
            "fetal_movement": fetal_movement,
            "uterine_contractions": uterine_cont,
            "light_decelerations": light_decel,
            "severe_decelerations": severe_decel,
            "prolongued_decelerations": prolonged_decel,
            "abnormal_short_term_variability": abnormal_stv,
            "mean_value_of_short_term_variability": mean_stv,
            "percentage_of_time_with_abnormal_long_term_variability": pct_abnormal_ltv,
            "mean_value_of_long_term_variability": mean_ltv,
            "histogram_width": hist_width,
            "histogram_min": hist_min,
            "histogram_max": hist_max,
            "histogram_number_of_peaks": hist_peaks,
            "histogram_number_of_zeroes": hist_zeroes,
            "histogram_mode": hist_mode,
            "histogram_mean": hist_mean,
            "histogram_median": hist_median,
            "histogram_variance": hist_variance,
            "histogram_tendency": hist_tendency,
            "total_decelerations": total_decel,
            "decel_severity_ratio": decel_severity_ratio,
            "variability_score": variability_score,
            "abnormal_variability": abnormal_variability,
            "histogram_range": histogram_range,
            "histogram_skewness": histogram_skewness,
            "reactivity_score": reactivity_score,
        }
        
        X = pd.DataFrame([[feature_dict.get(f, 0) for f in feature_cols]], columns=feature_cols)
        X_scaled = scaler.transform(X)
        
        # LightGBM expects DataFrame for feature names
        X_df = pd.DataFrame(X_scaled, columns=feature_cols)
        
        pred = model.predict(X_df)[0]
        proba = model.predict_proba(X_df)[0]
        label = encoder.inverse_transform([pred])[0]
        
        return {
            "risk_level": label,
            "confidence": round(float(max(proba)), 3),
            "probabilities": {
                encoder.inverse_transform([i])[0]: round(float(p), 3) 
                for i, p in enumerate(proba)
            },
        }
    except Exception as e:
        print(f"Fetal health prediction error: {e}")
        return None


def models_available() -> dict:
    """Check which ML models are available."""
    nlp_ok = (
        (MODEL_DIR / "nlp_sentiment_model.joblib").exists() and
        (MODEL_DIR / "nlp_emotion_model.joblib").exists()
    )
    return {
        "mental_health": (MODEL_DIR / "mental_health_xgb.joblib").exists(),
        "physical_health": (MODEL_DIR / "physical_health_ensemble.joblib").exists(),
        "fetal_health": (MODEL_DIR / "fetal_health_lgbm.joblib").exists(),
        "nlp_sentiment": nlp_ok,
    }


# ── NLP Prediction ──────────────────────────────────────────
def predict_sentiment(text: str) -> Optional[dict]:
    """Predict positive/negative sentiment using SST-2 TF-IDF model."""
    model = _load("nlp_sentiment_model.joblib")
    vectorizer = _load("nlp_tfidf_vectorizer.joblib")
    
    if not model or not vectorizer or not text.strip():
        return None
        
    try:
        X = vectorizer.transform([text])
        pred = model.predict(X)[0]
        proba = model.predict_proba(X)[0]
        label = "Positive" if pred == 1 else "Negative"
        return {
            "sentiment": label,
            "confidence": round(float(max(proba)), 3),
            "score": round(float(proba[1]), 3)  # Probability of Positive
        }
    except Exception as e:
        print(f"Sentiment prediction error: {e}")
        return None

def predict_emotion(text: str, top_k: int = 3) -> Optional[list]:
    """Predict specific emotions using GoEmotions model."""
    model = _load("nlp_emotion_model.joblib")
    vectorizer = _load("nlp_emotion_tfidf.joblib")
    labels = _load_features("nlp_emotion_labels.json")
    
    if not model or not vectorizer or not labels or not text.strip():
        return None
        
    try:
        X = vectorizer.transform([text])
        proba = model.predict_proba(X)[0]
        
        # Zip labels with probabilities and sort
        emotion_scores = [(labels[i], round(float(p), 3)) for i, p in enumerate(proba)]
        emotion_scores.sort(key=lambda x: x[1], reverse=True)
        
        # Return top K that meet a minimum threshold
        results = [{"emotion": em, "score": score} for em, score in emotion_scores[:top_k] if score > 0.05]
        return results if results else [{"emotion": "neutral", "score": 1.0}]
    except Exception as e:
        print(f"Emotion prediction error: {e}")
        return None

