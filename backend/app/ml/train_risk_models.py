"""
Novelle v1.5 — Train ML Risk Models on Synthetic Data (SDV)

Trains:
  1. XGBoost — Mental Health Risk Classifier
  2. XGBoost Ensemble — Physical/Maternal Health Risk Classifier
  3. LightGBM — Fetal Health (CTG) Risk Classifier

Synthetic data is generated using SDV (Synthetic Data Vault) GaussianCopula
seeded with clinically-informed base distributions.

Usage:
    cd backend
    python -m app.ml.train_risk_models
"""

import json
import joblib
import numpy as np
import pandas as pd
from pathlib import Path
from sklearn.model_selection import train_test_split, StratifiedKFold
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import classification_report, accuracy_score

# Fix for scikit-learn 1.8.0 + XGBoost 2.0.3 compatibility
try:
    from xgboost import XGBClassifier
    if hasattr(XGBClassifier, "__sklearn_tags__"):
        _orig_tags = XGBClassifier.__sklearn_tags__
        def _patched_tags(self):
            tags = _orig_tags(self)
            if tags.estimator_type is None:
                tags.estimator_type = "classifier"
            return tags
        XGBClassifier.__sklearn_tags__ = _patched_tags
except ImportError:
    pass
# SMOTE is imported lazily inside _apply_smote to avoid hard dependency at module import

np.random.seed(42)
MODEL_DIR = Path(__file__).parent / "models"
MODEL_DIR.mkdir(exist_ok=True)

N_SAMPLES = 5000


# ═══════════════════════════════════════════════════════════
#  SYNTHETIC DATA GENERATION (SDV-inspired)
# ═══════════════════════════════════════════════════════════

def _try_sdv_augment(df: pd.DataFrame, n_target: int) -> pd.DataFrame:
    """Attempt SDV augmentation; fall back to bootstrap if unavailable."""
    try:
        from sdv.metadata import Metadata
        from sdv.single_table import GaussianCopulaSynthesizer

        metadata = Metadata.detect_from_dataframe(data=df)
        
        synth = GaussianCopulaSynthesizer(metadata, enforce_min_max_values=True)
        synth.fit(df)
        synthetic = synth.sample(num_rows=n_target)
        print(f"  ✅ SDV GaussianCopula generated {len(synthetic)} rows")
        return synthetic
    except ImportError:
        print("  ⚠️  SDV not installed, using bootstrap resampling")
        return df.sample(n=n_target, replace=True, random_state=42).reset_index(drop=True)
    except Exception as e:
        print(f"  ⚠️  SDV failed ({e}), using bootstrap resampling")
        return df.sample(n=n_target, replace=True, random_state=42).reset_index(drop=True)


def generate_mental_health_data(n: int = N_SAMPLES) -> pd.DataFrame:
    """Generate synthetic mental health assessment data."""
    print("\n📊 Generating mental health synthetic data...")

    records = []
    for _ in range(n):
        risk = np.random.choice(["LOW", "MEDIUM", "HIGH"], p=[0.50, 0.30, 0.20])

        if risk == "HIGH":
            phq9 = np.clip(np.random.normal(18, 4), 10, 27)
            gad7 = np.clip(np.random.normal(14, 4), 8, 21)
            mood = np.clip(np.random.normal(3, 1.2), 1, 6)
            stress = np.clip(np.random.normal(8, 1), 5, 10)
            social = np.clip(np.random.normal(3, 1.5), 1, 6)
        elif risk == "MEDIUM":
            phq9 = np.clip(np.random.normal(11, 3), 5, 19)
            gad7 = np.clip(np.random.normal(9, 3), 4, 16)
            mood = np.clip(np.random.normal(5, 1.5), 2, 8)
            stress = np.clip(np.random.normal(6, 1.5), 3, 9)
            social = np.clip(np.random.normal(5, 1.5), 2, 8)
        else:
            phq9 = np.clip(np.random.normal(4, 2.5), 0, 10)
            gad7 = np.clip(np.random.normal(3, 2), 0, 8)
            mood = np.clip(np.random.normal(7.5, 1), 5, 10)
            stress = np.clip(np.random.normal(3, 1.5), 1, 6)
            social = np.clip(np.random.normal(7, 1.5), 4, 10)

        age = np.clip(np.random.normal(28, 5), 18, 45)
        preg_week = np.random.randint(4, 42)
        prev_preg = np.random.choice([0, 1, 2, 3, 4], p=[0.35, 0.30, 0.20, 0.10, 0.05])

        records.append({
            "phq9_score": round(phq9),
            "gad7_score": round(gad7),
            "mood_score": round(mood, 1),
            "stress_level": round(stress, 1),
            "social_support_score": round(social, 1),
            "age": round(age),
            "pregnancy_week": preg_week,
            "previous_pregnancies": prev_preg,
            "risk_level": risk,
        })

    df = pd.DataFrame(records)
    return _try_sdv_augment(df, n)


def generate_physical_health_data(n: int = N_SAMPLES) -> pd.DataFrame:
    """Generate synthetic maternal physical health data."""
    print("\n📊 Generating physical health synthetic data...")

    records = []
    for _ in range(n):
        risk = np.random.choice(["LOW", "MEDIUM", "HIGH"], p=[0.50, 0.30, 0.20])

        if risk == "HIGH":
            age = np.clip(np.random.normal(34, 5), 18, 45)
            systolic = np.clip(np.random.normal(150, 15), 130, 200)
            diastolic = np.clip(np.random.normal(95, 10), 80, 130)
            bs = np.clip(np.random.normal(10, 3), 7, 20)
            body_temp = np.clip(np.random.normal(99.5, 1), 97, 104)
            heart_rate = np.clip(np.random.normal(95, 15), 50, 140)
        elif risk == "MEDIUM":
            age = np.clip(np.random.normal(30, 5), 18, 45)
            systolic = np.clip(np.random.normal(130, 10), 115, 155)
            diastolic = np.clip(np.random.normal(85, 8), 70, 100)
            bs = np.clip(np.random.normal(7, 1.5), 5.5, 12)
            body_temp = np.clip(np.random.normal(98.8, 0.6), 97, 101)
            heart_rate = np.clip(np.random.normal(82, 10), 55, 115)
        else:
            age = np.clip(np.random.normal(27, 4), 18, 40)
            systolic = np.clip(np.random.normal(115, 8), 90, 130)
            diastolic = np.clip(np.random.normal(75, 6), 55, 88)
            bs = np.clip(np.random.normal(5.2, 0.8), 3.5, 7)
            body_temp = np.clip(np.random.normal(98.4, 0.3), 97, 99.5)
            heart_rate = np.clip(np.random.normal(75, 8), 55, 95)

        records.append({
            "Age": round(age),
            "SystolicBP": round(systolic),
            "DiastolicBP": round(diastolic),
            "BS": round(bs, 1),
            "BodyTemp": round(body_temp, 1),
            "HeartRate": round(heart_rate),
            "risk_level": risk,
        })

    df = pd.DataFrame(records)
    return _try_sdv_augment(df, n)


def generate_fetal_health_data(n: int = N_SAMPLES) -> pd.DataFrame:
    """Generate synthetic CTG-based fetal health data."""
    print("\n📊 Generating fetal health (CTG) synthetic data...")

    records = []
    for _ in range(n):
        risk = np.random.choice(["LOW", "MEDIUM", "HIGH"], p=[0.55, 0.25, 0.20])

        if risk == "HIGH":
            baseline = np.clip(np.random.normal(155, 20), 100, 200)
            accel = np.clip(np.random.exponential(0.001), 0, 0.01)
            fetal_mv = np.clip(np.random.exponential(0.001), 0, 0.01)
            uterine = np.clip(np.random.exponential(0.003), 0, 0.015)
            light_d = np.clip(np.random.exponential(0.003), 0, 0.01)
            severe_d = np.clip(np.random.exponential(0.002), 0, 0.01)
            prolonged_d = np.clip(np.random.exponential(0.001), 0, 0.005)
            abnormal_stv = np.clip(np.random.normal(65, 15), 30, 100)
            mean_stv = np.clip(np.random.normal(0.7, 0.3), 0.1, 3)
            pct_abnormal_ltv = np.clip(np.random.normal(50, 20), 0, 100)
            mean_ltv = np.clip(np.random.normal(3, 2), 0, 10)
        elif risk == "MEDIUM":
            baseline = np.clip(np.random.normal(140, 12), 110, 170)
            accel = np.clip(np.random.normal(0.003, 0.002), 0, 0.01)
            fetal_mv = np.clip(np.random.normal(0.003, 0.002), 0, 0.01)
            uterine = np.clip(np.random.normal(0.004, 0.002), 0, 0.015)
            light_d = np.clip(np.random.exponential(0.001), 0, 0.005)
            severe_d = np.clip(np.random.exponential(0.0005), 0, 0.003)
            prolonged_d = np.clip(np.random.exponential(0.0003), 0, 0.002)
            abnormal_stv = np.clip(np.random.normal(45, 12), 15, 80)
            mean_stv = np.clip(np.random.normal(1.2, 0.5), 0.3, 4)
            pct_abnormal_ltv = np.clip(np.random.normal(25, 15), 0, 70)
            mean_ltv = np.clip(np.random.normal(6, 3), 1, 15)
        else:
            baseline = np.clip(np.random.normal(133, 8), 110, 155)
            accel = np.clip(np.random.normal(0.005, 0.003), 0, 0.02)
            fetal_mv = np.clip(np.random.normal(0.005, 0.003), 0, 0.02)
            uterine = np.clip(np.random.normal(0.004, 0.002), 0, 0.015)
            light_d = np.clip(np.random.exponential(0.0005), 0, 0.003)
            severe_d = 0.0
            prolonged_d = 0.0
            abnormal_stv = np.clip(np.random.normal(25, 10), 0, 55)
            mean_stv = np.clip(np.random.normal(2.0, 0.6), 0.5, 5)
            pct_abnormal_ltv = np.clip(np.random.normal(8, 6), 0, 30)
            mean_ltv = np.clip(np.random.normal(10, 3), 3, 25)

        hist_mode = np.clip(np.random.normal(135, 15), 60, 190)
        hist_mean = hist_mode + np.random.normal(0, 3)
        hist_median = hist_mode + np.random.normal(0, 2)
        hist_width = np.clip(np.random.normal(70, 25), 5, 180)
        hist_min = np.clip(hist_mode - hist_width / 2, 50, 170)
        hist_max = hist_min + hist_width

        records.append({
            "baseline value": round(baseline),
            "accelerations": round(accel, 4),
            "fetal_movement": round(fetal_mv, 4),
            "uterine_contractions": round(uterine, 4),
            "light_decelerations": round(light_d, 4),
            "severe_decelerations": round(severe_d, 4),
            "prolongued_decelerations": round(prolonged_d, 4),
            "abnormal_short_term_variability": round(abnormal_stv),
            "mean_value_of_short_term_variability": round(mean_stv, 1),
            "percentage_of_time_with_abnormal_long_term_variability": round(pct_abnormal_ltv),
            "mean_value_of_long_term_variability": round(mean_ltv, 1),
            "histogram_width": round(hist_width),
            "histogram_min": round(hist_min),
            "histogram_max": round(hist_max),
            "histogram_number_of_peaks": np.random.randint(0, 12),
            "histogram_number_of_zeroes": np.random.randint(0, 8),
            "histogram_mode": round(hist_mode),
            "histogram_mean": round(hist_mean),
            "histogram_median": round(hist_median),
            "histogram_variance": np.clip(round(np.random.exponential(8), 1), 0, 50),
            "histogram_tendency": np.random.choice([-1, 0, 1], p=[0.2, 0.6, 0.2]),
            "risk_level": risk,
        })

    df = pd.DataFrame(records)
    return _try_sdv_augment(df, n)


# ═══════════════════════════════════════════════════════════
#  FEATURE ENGINEERING
# ═══════════════════════════════════════════════════════════

def engineer_mental_features(df: pd.DataFrame) -> tuple[pd.DataFrame, list]:
    """Add engineered features for mental health model."""
    df = df.copy()
    df["phq9_gad7_combined"] = df["phq9_score"] + df["gad7_score"]
    df["mood_stress_ratio"] = df["mood_score"] / df["stress_level"].clip(lower=1)
    df["support_deficit"] = (5 - df["social_support_score"]).clip(lower=0)

    df["depression_severity"] = pd.cut(
        df["phq9_score"], bins=[-1, 9, 14, 19, 27], labels=[0, 1, 2, 3]
    ).astype(int)
    df["anxiety_severity"] = pd.cut(
        df["gad7_score"], bins=[-1, 4, 9, 14, 21], labels=[0, 1, 2, 3]
    ).astype(int)
    df["trimester_num"] = pd.cut(
        df["pregnancy_week"], bins=[0, 12, 27, 42], labels=[1, 2, 3]
    ).astype(int)

    feature_cols = [
        "phq9_score", "gad7_score", "mood_score", "stress_level",
        "social_support_score", "phq9_gad7_combined", "mood_stress_ratio",
        "support_deficit", "depression_severity", "anxiety_severity",
        "age", "pregnancy_week", "trimester_num", "previous_pregnancies",
    ]
    return df, feature_cols


def engineer_physical_features(df: pd.DataFrame) -> tuple[pd.DataFrame, list]:
    """Add engineered features for physical health model."""
    df = df.copy()
    df["bp_mean"] = (df["SystolicBP"] + df["DiastolicBP"]) / 2
    df["bp_pulse_pressure"] = df["SystolicBP"] - df["DiastolicBP"]
    df["hypertension_flag"] = ((df["SystolicBP"] >= 140) | (df["DiastolicBP"] >= 90)).astype(int)
    df["hyperglycemia_flag"] = (df["BS"] >= 7.8).astype(int)
    df["fever_flag"] = (df["BodyTemp"] > 99.5).astype(int)
    df["tachycardia_flag"] = (df["HeartRate"] > 100).astype(int)
    df["bradycardia_flag"] = (df["HeartRate"] < 60).astype(int)
    df["age_risk"] = ((df["Age"] < 18) | (df["Age"] > 35)).astype(int)
    df["bs_severity"] = pd.cut(
        df["BS"], bins=[-1, 6.1, 7.8, 11.1, 100], labels=[0, 1, 2, 3]
    ).astype(int)

    feature_cols = [
        "Age", "SystolicBP", "DiastolicBP", "BS", "BodyTemp", "HeartRate",
        "bp_mean", "bp_pulse_pressure", "hypertension_flag", "hyperglycemia_flag",
        "fever_flag", "tachycardia_flag", "bradycardia_flag", "age_risk", "bs_severity",
    ]
    return df, feature_cols


def engineer_fetal_features(df: pd.DataFrame) -> tuple[pd.DataFrame, list]:
    """Add engineered features for fetal health model."""
    df = df.copy()
    df["total_decelerations"] = (
        df["light_decelerations"] + df["severe_decelerations"] + df["prolongued_decelerations"]
    )
    total_d = df["total_decelerations"].replace(0, np.nan)
    df["decel_severity_ratio"] = (
        (df["severe_decelerations"] + df["prolongued_decelerations"]) / total_d
    ).fillna(0)
    df["variability_score"] = (
        df["mean_value_of_short_term_variability"] + df["mean_value_of_long_term_variability"]
    ) / 2
    df["abnormal_variability"] = (
        df["abnormal_short_term_variability"]
        + df["percentage_of_time_with_abnormal_long_term_variability"]
    ) / 2
    df["histogram_range"] = df["histogram_max"] - df["histogram_min"]
    df["histogram_skewness"] = df["histogram_mean"] - df["histogram_median"]
    df["reactivity_score"] = df["accelerations"] * 1000

    feature_cols = [
        "baseline value", "accelerations", "fetal_movement", "uterine_contractions",
        "light_decelerations", "severe_decelerations", "prolongued_decelerations",
        "abnormal_short_term_variability", "mean_value_of_short_term_variability",
        "percentage_of_time_with_abnormal_long_term_variability",
        "mean_value_of_long_term_variability",
        "histogram_width", "histogram_min", "histogram_max",
        "histogram_number_of_peaks", "histogram_number_of_zeroes",
        "histogram_mode", "histogram_mean", "histogram_median",
        "histogram_variance", "histogram_tendency",
        "total_decelerations", "decel_severity_ratio", "variability_score",
        "abnormal_variability", "histogram_range", "histogram_skewness",
        "reactivity_score",
    ]
    return df, feature_cols


# ═══════════════════════════════════════════════════════════
#  MODEL TRAINING
# ═══════════════════════════════════════════════════════════

def _apply_smote(X: np.ndarray, y: np.ndarray, feature_cols: list) -> tuple:
    """Balance classes with SMOTE; no-op if SMOTE isn't available or fails.

    The import is performed lazily to keep editors and lightweight environments
    from reporting missing imports when the package isn't installed.
    """
    try:
        from imblearn.over_sampling import SMOTE  # type: ignore
    except Exception:
        return X, y

    try:
        min_count = min(pd.Series(y).value_counts()) - 1
        k_neighbors = max(1, min(3, int(min_count)))
        sm = SMOTE(random_state=42, k_neighbors=k_neighbors)
        X_res, y_res = sm.fit_resample(X, y)
        return X_res, y_res
    except Exception:
        return X, y


def train_mental_health_model(params: dict = None):
    """Train XGBoost mental health risk classifier."""
    if params is None:
        params = {"n_estimators": 200, "max_depth": 6, "learning_rate": 0.1, "samples": N_SAMPLES}
    
    print("\n" + "=" * 60)
    print(f"🧠 TRAINING: Mental Health XGBoost Classifier (Params: {params})")
    print("=" * 60)

    from xgboost import XGBClassifier

    df = generate_mental_health_data(n=params.get("samples", N_SAMPLES))
    df, feature_cols = engineer_mental_features(df)

    le = LabelEncoder()
    df["label"] = le.fit_transform(df["risk_level"])

    X = df[feature_cols].values
    y = df["label"].values

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, stratify=y, random_state=42
    )

    scaler = StandardScaler()
    X_train_s = scaler.fit_transform(X_train)
    X_test_s = scaler.transform(X_test)

    X_train_s, y_train = _apply_smote(X_train_s, y_train, feature_cols)

    model = XGBClassifier(
        n_estimators=params.get("n_estimators", 200),
        max_depth=params.get("max_depth", 6),
        learning_rate=params.get("learning_rate", 0.1),
        subsample=0.8,
        colsample_bytree=0.8,
        reg_alpha=0.1,
        reg_lambda=1.0,
        eval_metric="mlogloss",
        random_state=42,
    )

    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    cv_scores = []
    for train_idx, val_idx in cv.split(X_train_s, y_train):
        model.fit(X_train_s[train_idx], y_train[train_idx])
        cv_scores.append(model.score(X_train_s[val_idx], y_train[val_idx]))
    print(f"  CV Accuracy: {np.mean(cv_scores):.4f} ± {np.std(cv_scores):.4f}")

    model.fit(X_train_s, y_train)
    y_pred = model.predict(X_test_s)
    print(f"  Test Accuracy: {accuracy_score(y_test, y_pred):.4f}")
    print(classification_report(y_test, y_pred, target_names=le.classes_))

    joblib.dump(model, MODEL_DIR / "mental_health_xgb.joblib")
    joblib.dump(scaler, MODEL_DIR / "mental_health_scaler.joblib")
    joblib.dump(le, MODEL_DIR / "mental_health_label_encoder.joblib")
    with open(MODEL_DIR / "mental_health_features.json", "w") as f:
        json.dump(feature_cols, f, indent=2)

    print("  ✅ Saved: mental_health_xgb.joblib, scaler, encoder, features")


def train_physical_health_model(params: dict = None):
    """Train XGBoost ensemble physical health risk classifier."""
    if params is None:
        params = {"n_estimators": 150, "max_depth": 5, "learning_rate": 0.1, "samples": N_SAMPLES}
        
    print("\n" + "=" * 60)
    print(f"💪 TRAINING: Physical Health XGBoost Ensemble Classifier (Params: {params})")
    print("=" * 60)

    from xgboost import XGBClassifier
    from sklearn.ensemble import VotingClassifier, RandomForestClassifier
    from sklearn.linear_model import LogisticRegression

    df = generate_physical_health_data(n=params.get("samples", N_SAMPLES))
    df, feature_cols = engineer_physical_features(df)

    le = LabelEncoder()
    df["label"] = le.fit_transform(df["risk_level"])

    X = df[feature_cols].values
    y = df["label"].values

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, stratify=y, random_state=42
    )

    scaler = StandardScaler()
    X_train_s = scaler.fit_transform(X_train)
    X_test_s = scaler.transform(X_test)

    X_train_s, y_train = _apply_smote(X_train_s, y_train, feature_cols)

    xgb = XGBClassifier(
        n_estimators=params.get("n_estimators", 150), 
        max_depth=params.get("max_depth", 5), 
        learning_rate=params.get("learning_rate", 0.1),
        subsample=0.8, colsample_bytree=0.8,
        eval_metric="mlogloss", random_state=42,
    )
    rf = RandomForestClassifier(
        n_estimators=150, max_depth=8, random_state=42, n_jobs=-1,
    )
    lr = LogisticRegression(
        max_iter=500, random_state=42,
    )

    ensemble = VotingClassifier(
        estimators=[("xgb", xgb), ("rf", rf), ("lr", lr)],
        voting="soft",
    )
    ensemble.fit(X_train_s, y_train)

    y_pred = ensemble.predict(X_test_s)
    print(f"  Test Accuracy: {accuracy_score(y_test, y_pred):.4f}")
    print(classification_report(y_test, y_pred, target_names=le.classes_))

    joblib.dump(ensemble, MODEL_DIR / "physical_health_ensemble.joblib")
    joblib.dump(scaler, MODEL_DIR / "physical_health_scaler.joblib")
    joblib.dump(le, MODEL_DIR / "physical_health_label_encoder.joblib")
    with open(MODEL_DIR / "physical_health_features.json", "w") as f:
        json.dump(feature_cols, f, indent=2)

    print("  ✅ Saved: physical_health_ensemble.joblib, scaler, encoder, features")


def train_fetal_health_model(params: dict = None):
    """Train LightGBM fetal health risk classifier."""
    if params is None:
        params = {"n_estimators": 250, "max_depth": 7, "learning_rate": 0.08, "samples": N_SAMPLES}

    print("\n" + "=" * 60)
    print(f"👶 TRAINING: Fetal Health LightGBM Classifier (Params: {params})")
    print("=" * 60)

    import lightgbm as lgb

    df = generate_fetal_health_data(n=params.get("samples", N_SAMPLES))
    df, feature_cols = engineer_fetal_features(df)

    le = LabelEncoder()
    df["label"] = le.fit_transform(df["risk_level"])

    X = df[feature_cols].values
    y = df["label"].values

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, stratify=y, random_state=42
    )

    scaler = StandardScaler()
    X_train_s = scaler.fit_transform(X_train)
    X_test_s = scaler.transform(X_test)

    X_train_s, y_train = _apply_smote(X_train_s, y_train, feature_cols)

    model = lgb.LGBMClassifier(
        n_estimators=params.get("n_estimators", 250),
        max_depth=params.get("max_depth", 7),
        learning_rate=params.get("learning_rate", 0.08),
        subsample=0.8,
        colsample_bytree=0.8,
        reg_alpha=0.05,
        reg_lambda=0.5,
        num_leaves=31,
        min_child_samples=20,
        random_state=42,
        verbose=-1,
    )

    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    cv_scores = []
    for train_idx, val_idx in cv.split(X_train_s, y_train):
        X_tr_df = pd.DataFrame(X_train_s[train_idx], columns=feature_cols)
        X_val_df = pd.DataFrame(X_train_s[val_idx], columns=feature_cols)
        model.fit(X_tr_df, y_train[train_idx])
        cv_scores.append(model.score(X_val_df, y_train[val_idx]))
    print(f"  CV Accuracy: {np.mean(cv_scores):.4f} ± {np.std(cv_scores):.4f}")

    X_train_df = pd.DataFrame(X_train_s, columns=feature_cols)
    model.fit(X_train_df, y_train)

    X_test_df = pd.DataFrame(X_test_s, columns=feature_cols)
    y_pred = model.predict(X_test_df)
    print(f"  Test Accuracy: {accuracy_score(y_test, y_pred):.4f}")
    print(classification_report(y_test, y_pred, target_names=le.classes_))

    joblib.dump(model, MODEL_DIR / "fetal_health_lgbm.joblib")
    joblib.dump(scaler, MODEL_DIR / "fetal_health_scaler.joblib")
    joblib.dump(le, MODEL_DIR / "fetal_health_label_encoder.joblib")
    with open(MODEL_DIR / "fetal_health_features.json", "w") as f:
        json.dump(feature_cols, f, indent=2)

    print("  ✅ Saved: fetal_health_lgbm.joblib, scaler, encoder, features")


# ═══════════════════════════════════════════════════════════
#  MAIN
# ═══════════════════════════════════════════════════════════

if __name__ == "__main__":
    print("🚀 Novelle v1.5 — ML Model Training Pipeline")
    print(f"   Synthetic samples per domain: {N_SAMPLES}")
    print(f"   Output directory: {MODEL_DIR}")

    train_mental_health_model()
    train_physical_health_model()
    train_fetal_health_model()

    print("\n" + "=" * 60)
    print("🎉 All models trained successfully!")
    print("=" * 60)

    available = {
        "mental_health_xgb": (MODEL_DIR / "mental_health_xgb.joblib").exists(),
        "physical_health_ensemble": (MODEL_DIR / "physical_health_ensemble.joblib").exists(),
        "fetal_health_lgbm": (MODEL_DIR / "fetal_health_lgbm.joblib").exists(),
    }
    for name, ok in available.items():
        print(f"  {'✅' if ok else '❌'} {name}")
