"""
Novelle v2.0 — Train ML Models (8 new models) on Synthetic Data

Models:
   8.  XGBoost      — Preterm Birth Predictor
   9.  XGBoost      — BP Trajectory Forecaster (multi-output regressor)
  10.  LightGBM     — Gestational Diabetes (GDM) Predictor
  11.  LogisticReg  — Patient Engagement Scorer
  12.  TF-IDF+Cos   — Content-Based Recommendation Engine
  13.  XGBoost      — Escalation Priority Ranker (multi-class)
  14.  TF-IDF       — NLP Clinical Note Summarizer (extractive)
  15.  RandomForest — Appointment No-Show Predictor

Usage:
    cd backend
    python -m app.ml.train_v2_models
"""

import json
import joblib
import warnings
import numpy as np
import pandas as pd
from pathlib import Path
from sklearn.model_selection import train_test_split, StratifiedKFold
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import (
    classification_report, accuracy_score, mean_absolute_error,
    mean_squared_error, r2_score, confusion_matrix,
)
from sklearn.multioutput import MultiOutputRegressor
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

warnings.filterwarnings("ignore", category=UserWarning)

try:
    from xgboost import XGBClassifier, XGBRegressor
except ImportError:
    raise ImportError("xgboost is required — pip install xgboost")

try:
    import lightgbm as lgb
except ImportError:
    raise ImportError("lightgbm is required — pip install lightgbm")

np.random.seed(42)
MODEL_DIR = Path(__file__).parent / "models"
MODEL_DIR.mkdir(exist_ok=True)

SEPARATOR = "=" * 65


# ═══════════════════════════════════════════════════════════════════
#  Utilities
# ═══════════════════════════════════════════════════════════════════

def _apply_smote(X: np.ndarray, y: np.ndarray) -> tuple:
    """Balance classes with SMOTE when available."""
    try:
        from imblearn.over_sampling import SMOTE
    except ImportError:
        print("  (imblearn not found — skipping SMOTE)")
        return X, y

    try:
        min_count = pd.Series(y).value_counts().min()
        k = max(1, min(5, min_count - 1))
        sm = SMOTE(random_state=42, k_neighbors=k)
        X_res, y_res = sm.fit_resample(X, y)
        print(f"  SMOTE: {len(X)} → {len(X_res)} samples")
        return X_res, y_res
    except Exception:
        return X, y


def _section(emoji: str, title: str):
    print(f"\n{SEPARATOR}")
    print(f"{emoji} {title}")
    print(SEPARATOR)


# ═══════════════════════════════════════════════════════════════════
#  Model 8 — Preterm Birth Predictor (XGBoost Classifier)
# ═══════════════════════════════════════════════════════════════════

def _generate_preterm_data(n: int = 3000) -> pd.DataFrame:
    rows = []
    for _ in range(n):
        age = np.clip(np.random.normal(29, 5), 16, 45)
        bmi = np.clip(np.random.normal(26, 5), 17, 45)
        pregnancy_week = np.random.randint(20, 40)
        bp_sys = np.clip(np.random.normal(120, 15), 90, 180)
        bp_dia = np.clip(np.random.normal(78, 10), 55, 115)
        previous_preterm = np.random.choice([0, 1], p=[0.85, 0.15])
        cervical_length = np.clip(np.random.normal(35, 8), 10, 55)
        infection_flag = np.random.choice([0, 1], p=[0.90, 0.10])
        multiple_gestation = np.random.choice([0, 1], p=[0.92, 0.08])
        contractions = np.clip(np.random.exponential(2), 0, 15)
        fetal_fibronectin = np.random.choice([0, 1], p=[0.80, 0.20])

        risk_score = (
            0.25 * previous_preterm
            + 0.20 * (cervical_length < 25)
            + 0.15 * (bp_sys > 140)
            + 0.10 * infection_flag
            + 0.10 * multiple_gestation
            + 0.08 * (contractions > 6)
            + 0.05 * fetal_fibronectin
            + 0.04 * (age > 35)
            + 0.03 * (bmi > 35)
        )
        noise = np.random.normal(0, 0.08)
        preterm = int((risk_score + noise) > 0.30)

        rows.append({
            "pregnancy_week": pregnancy_week,
            "bp_systolic": round(bp_sys),
            "bp_diastolic": round(bp_dia),
            "previous_preterm": previous_preterm,
            "cervical_length": round(cervical_length, 1),
            "age": round(age),
            "bmi": round(bmi, 1),
            "infection_flag": infection_flag,
            "multiple_gestation": multiple_gestation,
            "contractions_per_hour": round(contractions, 1),
            "fetal_fibronectin": fetal_fibronectin,
            "preterm": preterm,
        })
    return pd.DataFrame(rows)


def train_preterm_predictor():
    _section("🏥", "MODEL 8: Preterm Birth Predictor (XGBoost)")

    df = _generate_preterm_data(3000)
    print(f"  Samples: {len(df)}  |  Preterm rate: {df['preterm'].mean():.2%}")

    feature_cols = [
        "pregnancy_week", "bp_systolic", "bp_diastolic", "previous_preterm",
        "cervical_length", "age", "bmi", "infection_flag", "multiple_gestation",
        "contractions_per_hour", "fetal_fibronectin",
    ]
    X = df[feature_cols].values
    y = df["preterm"].values

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, stratify=y, random_state=42,
    )
    scaler = StandardScaler()
    X_train_s = scaler.fit_transform(X_train)
    X_test_s = scaler.transform(X_test)
    X_train_s, y_train = _apply_smote(X_train_s, y_train)

    model = XGBClassifier(
        n_estimators=200, max_depth=5, learning_rate=0.1,
        subsample=0.8, colsample_bytree=0.8, reg_alpha=0.1,
        eval_metric="logloss", random_state=42, verbosity=0,
    )
    model.fit(X_train_s, y_train)

    y_pred = model.predict(X_test_s)
    print(f"  Accuracy: {accuracy_score(y_test, y_pred):.4f}")
    print(classification_report(y_test, y_pred, target_names=["Full-term", "Preterm"]))

    joblib.dump(model, MODEL_DIR / "preterm_predictor.joblib")
    joblib.dump(scaler, MODEL_DIR / "preterm_scaler.joblib")
    joblib.dump(feature_cols, MODEL_DIR / "preterm_features.joblib")
    print("  Saved: preterm_predictor.joblib, preterm_scaler.joblib, preterm_features.joblib")


# ═══════════════════════════════════════════════════════════════════
#  Model 9 — BP Trajectory Forecaster (XGBoost Multi-Output Regressor)
# ═══════════════════════════════════════════════════════════════════

def _generate_bp_trajectory_data(n: int = 2000) -> pd.DataFrame:
    rows = []
    for _ in range(n):
        age = np.clip(np.random.normal(29, 5), 18, 44)
        bmi = np.clip(np.random.normal(26, 5), 18, 42)
        pregnancy_week = np.random.randint(8, 40)
        exercise_level = np.random.choice([1, 2, 3], p=[0.3, 0.5, 0.2])
        salt_intake_flag = np.random.choice([0, 1], p=[0.6, 0.4])
        weight_gain = np.clip(np.random.normal(0.4, 0.2), 0, 1.2)

        base_sys = 110 + 0.3 * age + 0.5 * bmi + 0.15 * pregnancy_week
        base_dia = 68 + 0.2 * age + 0.3 * bmi + 0.1 * pregnancy_week

        prev_sys_3 = np.clip(base_sys + np.random.normal(0, 6), 85, 180)
        prev_sys_2 = np.clip(prev_sys_3 + np.random.normal(0.5, 4), 85, 180)
        prev_sys_1 = np.clip(prev_sys_2 + np.random.normal(0.5, 4), 85, 180)
        cur_sys = np.clip(prev_sys_1 + np.random.normal(0.5, 4), 85, 185)

        prev_dia_3 = np.clip(base_dia + np.random.normal(0, 5), 50, 115)
        prev_dia_2 = np.clip(prev_dia_3 + np.random.normal(0.3, 3), 50, 115)
        prev_dia_1 = np.clip(prev_dia_2 + np.random.normal(0.3, 3), 50, 115)
        cur_dia = np.clip(prev_dia_1 + np.random.normal(0.3, 3), 50, 120)

        trend_sys = (prev_sys_1 - prev_sys_3) / 2
        trend_dia = (prev_dia_1 - prev_dia_3) / 2

        next_sys = np.clip(
            cur_sys + trend_sys * 0.4 + 3 * salt_intake_flag
            - 2 * exercise_level + 1.5 * weight_gain + np.random.normal(0, 3),
            85, 190,
        )
        next_dia = np.clip(
            cur_dia + trend_dia * 0.4 + 2 * salt_intake_flag
            - 1.5 * exercise_level + weight_gain + np.random.normal(0, 2),
            50, 125,
        )

        rows.append({
            "current_bp_systolic": round(cur_sys),
            "current_bp_diastolic": round(cur_dia),
            "pregnancy_week": pregnancy_week,
            "age": round(age),
            "bmi": round(bmi, 1),
            "prev_bp_1": round(prev_sys_1),
            "prev_bp_2": round(prev_sys_2),
            "prev_bp_3": round(prev_sys_3),
            "weight_gain": round(weight_gain, 2),
            "salt_intake_flag": salt_intake_flag,
            "exercise_level": exercise_level,
            "next_bp_systolic": round(next_sys),
            "next_bp_diastolic": round(next_dia),
        })
    return pd.DataFrame(rows)


def train_bp_forecaster():
    _section("📈", "MODEL 9: BP Trajectory Forecaster (XGBoost Multi-Output)")

    df = _generate_bp_trajectory_data(2000)
    print(f"  Samples: {len(df)}")

    feature_cols = [
        "current_bp_systolic", "current_bp_diastolic", "pregnancy_week",
        "age", "bmi", "prev_bp_1", "prev_bp_2", "prev_bp_3",
        "weight_gain", "salt_intake_flag", "exercise_level",
    ]
    target_cols = ["next_bp_systolic", "next_bp_diastolic"]

    X = df[feature_cols].values
    y = df[target_cols].values

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42,
    )
    scaler = StandardScaler()
    X_train_s = scaler.fit_transform(X_train)
    X_test_s = scaler.transform(X_test)

    base_reg = XGBRegressor(
        n_estimators=200, max_depth=5, learning_rate=0.1,
        subsample=0.8, colsample_bytree=0.8, random_state=42, verbosity=0,
    )
    model = MultiOutputRegressor(base_reg)
    model.fit(X_train_s, y_train)

    y_pred = model.predict(X_test_s)
    for i, col in enumerate(target_cols):
        mae = mean_absolute_error(y_test[:, i], y_pred[:, i])
        rmse = np.sqrt(mean_squared_error(y_test[:, i], y_pred[:, i]))
        r2 = r2_score(y_test[:, i], y_pred[:, i])
        print(f"  {col}:  MAE={mae:.2f}  RMSE={rmse:.2f}  R²={r2:.4f}")

    joblib.dump(model, MODEL_DIR / "bp_forecaster.joblib")
    joblib.dump(scaler, MODEL_DIR / "bp_forecaster_scaler.joblib")
    joblib.dump(feature_cols, MODEL_DIR / "bp_forecaster_features.joblib")
    print("  Saved: bp_forecaster.joblib, bp_forecaster_scaler.joblib, bp_forecaster_features.joblib")


# ═══════════════════════════════════════════════════════════════════
#  Model 10 — Gestational Diabetes Predictor (LightGBM)
# ═══════════════════════════════════════════════════════════════════

def _generate_gdm_data(n: int = 2500) -> pd.DataFrame:
    rows = []
    for _ in range(n):
        age = np.clip(np.random.normal(30, 5), 18, 45)
        bmi = np.clip(np.random.normal(27, 6), 17, 48)
        family_diabetes = np.random.choice([0, 1], p=[0.75, 0.25])
        previous_gdm = np.random.choice([0, 1], p=[0.90, 0.10])
        pcos_history = np.random.choice([0, 1], p=[0.88, 0.12])
        ethnicity_risk = np.random.choice([0, 1], p=[0.65, 0.35])
        pregnancy_week = np.random.randint(12, 38)
        weight_gain_rate = np.clip(np.random.normal(0.45, 0.2), 0, 1.5)

        base_fasting = 80 + 0.4 * bmi + 3 * family_diabetes + 5 * previous_gdm
        fasting_glucose = np.clip(base_fasting + np.random.normal(0, 8), 60, 140)
        postmeal_glucose = np.clip(fasting_glucose * 1.5 + np.random.normal(0, 15), 90, 250)
        hba1c = np.clip(4.5 + (fasting_glucose - 80) * 0.02 + np.random.normal(0, 0.3), 4.0, 8.0)

        risk_score = (
            0.20 * (bmi > 30)
            + 0.18 * (fasting_glucose > 95)
            + 0.15 * family_diabetes
            + 0.12 * previous_gdm
            + 0.10 * (postmeal_glucose > 140)
            + 0.08 * (hba1c > 5.7)
            + 0.07 * pcos_history
            + 0.05 * ethnicity_risk
            + 0.03 * (age > 35)
            + 0.02 * (weight_gain_rate > 0.7)
        )
        noise = np.random.normal(0, 0.07)
        gdm = int((risk_score + noise) > 0.32)

        rows.append({
            "age": round(age),
            "bmi": round(bmi, 1),
            "family_diabetes_history": family_diabetes,
            "previous_gdm": previous_gdm,
            "fasting_glucose": round(fasting_glucose, 1),
            "postmeal_glucose": round(postmeal_glucose, 1),
            "hba1c": round(hba1c, 2),
            "pregnancy_week": pregnancy_week,
            "weight_gain_rate": round(weight_gain_rate, 2),
            "pcos_history": pcos_history,
            "ethnicity_risk": ethnicity_risk,
            "gdm": gdm,
        })
    return pd.DataFrame(rows)


def train_gdm_predictor():
    _section("🩸", "MODEL 10: Gestational Diabetes Predictor (LightGBM)")

    df = _generate_gdm_data(2500)
    print(f"  Samples: {len(df)}  |  GDM rate: {df['gdm'].mean():.2%}")

    feature_cols = [
        "age", "bmi", "family_diabetes_history", "previous_gdm",
        "fasting_glucose", "postmeal_glucose", "hba1c", "pregnancy_week",
        "weight_gain_rate", "pcos_history", "ethnicity_risk",
    ]
    X = df[feature_cols].values
    y = df["gdm"].values

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, stratify=y, random_state=42,
    )
    scaler = StandardScaler()
    X_train_s = scaler.fit_transform(X_train)
    X_test_s = scaler.transform(X_test)
    X_train_s, y_train = _apply_smote(X_train_s, y_train)

    model = lgb.LGBMClassifier(
        n_estimators=250, max_depth=6, learning_rate=0.08,
        subsample=0.8, colsample_bytree=0.8, reg_alpha=0.05,
        reg_lambda=0.5, num_leaves=31, min_child_samples=20,
        random_state=42, verbose=-1,
    )

    X_train_df = pd.DataFrame(X_train_s, columns=feature_cols)
    model.fit(X_train_df, y_train)

    X_test_df = pd.DataFrame(X_test_s, columns=feature_cols)
    y_pred = model.predict(X_test_df)
    print(f"  Accuracy: {accuracy_score(y_test, y_pred):.4f}")
    print(classification_report(y_test, y_pred, target_names=["No GDM", "GDM"]))

    joblib.dump(model, MODEL_DIR / "gdm_predictor.joblib")
    joblib.dump(scaler, MODEL_DIR / "gdm_scaler.joblib")
    joblib.dump(feature_cols, MODEL_DIR / "gdm_features.joblib")
    print("  Saved: gdm_predictor.joblib, gdm_scaler.joblib, gdm_features.joblib")


# ═══════════════════════════════════════════════════════════════════
#  Model 11 — Patient Engagement Scorer (Logistic Regression)
# ═══════════════════════════════════════════════════════════════════

def _generate_engagement_data(n: int = 2000) -> pd.DataFrame:
    rows = []
    for _ in range(n):
        days_since = np.clip(np.random.exponential(5), 0, 60)
        avg_logs = np.clip(np.random.normal(4, 2.5), 0, 14)
        attendance = np.clip(np.random.beta(5, 2), 0, 1)
        goals = np.clip(np.random.beta(4, 3), 0, 1)
        journal = np.clip(np.random.poisson(3), 0, 20)
        chat_count = np.clip(np.random.poisson(5), 0, 30)
        profile = np.clip(np.random.beta(6, 2), 0, 1)
        pregnancy_week = np.random.randint(4, 42)
        risk_level = np.random.choice([1, 2, 3], p=[0.5, 0.3, 0.2])

        eng_score = (
            -0.20 * (days_since / 60)
            + 0.15 * (avg_logs / 14)
            + 0.20 * attendance
            + 0.15 * goals
            + 0.10 * (journal / 20)
            + 0.10 * (chat_count / 30)
            + 0.05 * profile
            + 0.05 * (1 - risk_level / 3)
        )
        eng_score = np.clip(eng_score + np.random.normal(0, 0.08), 0, 1)

        if eng_score > 0.38:
            label = 2   # high
        elif eng_score > 0.22:
            label = 1   # medium
        else:
            label = 0   # low

        rows.append({
            "days_since_last_log": round(days_since, 1),
            "avg_logs_per_week": round(avg_logs, 1),
            "appointment_attendance_rate": round(attendance, 2),
            "goals_completion_rate": round(goals, 2),
            "journal_entries_count": int(journal),
            "companion_chat_count": int(chat_count),
            "profile_completion": round(profile, 2),
            "pregnancy_week": pregnancy_week,
            "risk_level_numeric": risk_level,
            "engagement_label": label,
        })
    return pd.DataFrame(rows)


def train_engagement_scorer():
    _section("📊", "MODEL 11: Patient Engagement Scorer (Logistic Regression)")

    df = _generate_engagement_data(2000)
    label_names = ["Low", "Medium", "High"]
    for i, name in enumerate(label_names):
        print(f"  {name}: {(df['engagement_label'] == i).sum()}")

    feature_cols = [
        "days_since_last_log", "avg_logs_per_week", "appointment_attendance_rate",
        "goals_completion_rate", "journal_entries_count", "companion_chat_count",
        "profile_completion", "pregnancy_week", "risk_level_numeric",
    ]
    X = df[feature_cols].values
    y = df["engagement_label"].values

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, stratify=y, random_state=42,
    )
    scaler = StandardScaler()
    X_train_s = scaler.fit_transform(X_train)
    X_test_s = scaler.transform(X_test)
    X_train_s, y_train = _apply_smote(X_train_s, y_train)

    model = LogisticRegression(
        max_iter=1000, C=1.0, solver="lbfgs", random_state=42,
    )
    model.fit(X_train_s, y_train)

    y_pred = model.predict(X_test_s)
    print(f"  Accuracy: {accuracy_score(y_test, y_pred):.4f}")
    print(classification_report(y_test, y_pred, target_names=label_names))

    joblib.dump(model, MODEL_DIR / "engagement_scorer.joblib")
    joblib.dump(scaler, MODEL_DIR / "engagement_scaler.joblib")
    joblib.dump(feature_cols, MODEL_DIR / "engagement_features.joblib")
    print("  Saved: engagement_scorer.joblib, engagement_scaler.joblib, engagement_features.joblib")


# ═══════════════════════════════════════════════════════════════════
#  Model 12 — Recommendation Engine (Content-Based TF-IDF + Cosine)
# ═══════════════════════════════════════════════════════════════════

def _build_content_catalog() -> pd.DataFrame:
    items = [
        # Meditations
        {"id": "med_01", "title": "First Trimester Calm Breathing", "category": "meditation",
         "tags": "trimester_1 breathing relaxation anxiety stress beginner"},
        {"id": "med_02", "title": "Second Trimester Body Scan", "category": "meditation",
         "tags": "trimester_2 body_scan relaxation mindfulness intermediate"},
        {"id": "med_03", "title": "Third Trimester Sleep Meditation", "category": "meditation",
         "tags": "trimester_3 sleep insomnia relaxation bedtime"},
        {"id": "med_04", "title": "Prenatal Anxiety Relief", "category": "meditation",
         "tags": "anxiety stress mental_health all_trimesters breathing"},
        {"id": "med_05", "title": "Partner Connection Meditation", "category": "meditation",
         "tags": "partner bonding relationship all_trimesters emotional"},
        # Workouts
        {"id": "wk_01", "title": "Gentle Prenatal Yoga - First Trimester", "category": "workout",
         "tags": "trimester_1 yoga gentle flexibility low_impact beginner"},
        {"id": "wk_02", "title": "Prenatal Strength Training", "category": "workout",
         "tags": "trimester_2 strength moderate pelvic_floor core intermediate"},
        {"id": "wk_03", "title": "Third Trimester Stretching Routine", "category": "workout",
         "tags": "trimester_3 stretching gentle flexibility low_impact back_pain"},
        {"id": "wk_04", "title": "Prenatal Swimming Guide", "category": "workout",
         "tags": "all_trimesters swimming cardio low_impact joint_pain"},
        {"id": "wk_05", "title": "Kegel and Pelvic Floor Exercises", "category": "workout",
         "tags": "all_trimesters pelvic_floor kegel strength recovery"},
        {"id": "wk_06", "title": "Walking Program for Pregnancy", "category": "workout",
         "tags": "all_trimesters walking cardio beginner weight_management"},
        # Nutrition
        {"id": "nut_01", "title": "Iron-Rich Meals for Anemia Prevention", "category": "nutrition",
         "tags": "iron anemia diet meals all_trimesters fatigue energy"},
        {"id": "nut_02", "title": "Gestational Diabetes Meal Plan", "category": "nutrition",
         "tags": "gdm diabetes blood_sugar diet trimester_2 trimester_3 high_risk"},
        {"id": "nut_03", "title": "Folate and Folic Acid Food Guide", "category": "nutrition",
         "tags": "trimester_1 folate folic_acid neural_tube prevention vitamins"},
        {"id": "nut_04", "title": "Managing Morning Sickness with Diet", "category": "nutrition",
         "tags": "trimester_1 nausea morning_sickness ginger bland_foods hydration"},
        {"id": "nut_05", "title": "Calcium and Bone Health in Pregnancy", "category": "nutrition",
         "tags": "calcium bone dairy all_trimesters supplements vitamins"},
        {"id": "nut_06", "title": "Omega-3 and Brain Development Foods", "category": "nutrition",
         "tags": "omega3 brain fetal_development fish dha trimester_2 trimester_3"},
        {"id": "nut_07", "title": "Healthy Weight Gain Nutrition Plan", "category": "nutrition",
         "tags": "weight_management calories balanced_diet all_trimesters bmi"},
        # Articles
        {"id": "art_01", "title": "Understanding Preeclampsia Warning Signs", "category": "article",
         "tags": "preeclampsia hypertension high_risk blood_pressure trimester_3 emergency"},
        {"id": "art_02", "title": "When to Call Your Doctor", "category": "article",
         "tags": "emergency symptoms warning_signs all_trimesters high_risk"},
        {"id": "art_03", "title": "Preparing Your Birth Plan", "category": "article",
         "tags": "birth_plan trimester_3 preparation labor delivery"},
        {"id": "art_04", "title": "Mental Health During Pregnancy", "category": "article",
         "tags": "mental_health depression anxiety support all_trimesters therapy"},
        {"id": "art_05", "title": "Sleep Positions and Tips", "category": "article",
         "tags": "sleep insomnia trimester_2 trimester_3 comfort positions"},
        {"id": "art_06", "title": "Prenatal Vitamins Explained", "category": "article",
         "tags": "vitamins supplements trimester_1 folate iron calcium dha"},
        {"id": "art_07", "title": "Understanding Fetal Movement Patterns", "category": "article",
         "tags": "fetal_movement kick_count trimester_2 trimester_3 monitoring"},
        {"id": "art_08", "title": "Postpartum Recovery Preparation", "category": "article",
         "tags": "postpartum recovery trimester_3 breastfeeding mental_health"},
    ]
    return pd.DataFrame(items)


def train_recommendation_engine():
    _section("🎯", "MODEL 12: Recommendation Engine (TF-IDF + Cosine Similarity)")

    catalog = _build_content_catalog()
    print(f"  Catalog items: {len(catalog)}")
    for cat in catalog["category"].unique():
        print(f"    {cat}: {(catalog['category'] == cat).sum()}")

    catalog["combined_text"] = (
        catalog["title"] + " " + catalog["category"] + " " + catalog["tags"]
    )

    vectorizer = TfidfVectorizer(stop_words="english", max_features=500)
    tfidf_matrix = vectorizer.fit_transform(catalog["combined_text"])
    print(f"  TF-IDF matrix shape: {tfidf_matrix.shape}")

    sim_matrix = cosine_similarity(tfidf_matrix)

    test_profiles = [
        "trimester_1 anxiety nausea beginner low_risk",
        "trimester_3 high_risk hypertension sleep insomnia",
        "trimester_2 gdm diabetes diet exercise moderate_risk",
    ]
    print("\n  Sample recommendations:")
    for profile in test_profiles:
        profile_vec = vectorizer.transform([profile])
        scores = cosine_similarity(profile_vec, tfidf_matrix).flatten()
        top_idx = scores.argsort()[::-1][:3]
        top_items = catalog.iloc[top_idx]["title"].tolist()
        print(f"    Profile: '{profile[:50]}...'")
        for rank, item in enumerate(top_items, 1):
            print(f"      {rank}. {item} (score={scores[top_idx[rank-1]]:.3f})")

    engine_data = {
        "vectorizer": vectorizer,
        "tfidf_matrix": tfidf_matrix,
        "catalog": catalog,
        "similarity_matrix": sim_matrix,
    }
    joblib.dump(engine_data, MODEL_DIR / "recommendation_engine.joblib")
    print("\n  Saved: recommendation_engine.joblib")


# ═══════════════════════════════════════════════════════════════════
#  Model 13 — Escalation Priority Ranker (XGBoost Multi-Class)
# ═══════════════════════════════════════════════════════════════════

def _generate_escalation_data(n: int = 1500) -> pd.DataFrame:
    rows = []
    for _ in range(n):
        risk_level = np.random.choice([1, 2, 3], p=[0.45, 0.35, 0.20])
        crisis_flag = np.random.choice([0, 1], p=[0.92, 0.08])
        days_since = np.clip(np.random.exponential(10), 0, 90)
        patient_age = np.clip(np.random.normal(29, 5), 16, 45)
        pregnancy_week = np.random.randint(6, 42)
        prev_escalations = np.random.choice([0, 1, 2, 3, 4], p=[0.5, 0.25, 0.15, 0.07, 0.03])
        bp_sys = np.clip(np.random.normal(120, 18), 85, 190)
        mental = np.clip(np.random.normal(65, 20), 0, 100)
        physical = np.clip(np.random.normal(70, 18), 0, 100)
        fetal = np.clip(np.random.normal(75, 15), 0, 100)

        urgency = (
            0.30 * crisis_flag
            + 0.15 * (risk_level / 3)
            + 0.12 * (bp_sys > 150) * 1.0
            + 0.10 * (1 - mental / 100)
            + 0.08 * (1 - physical / 100)
            + 0.08 * (1 - fetal / 100)
            + 0.07 * (prev_escalations / 4)
            + 0.05 * (pregnancy_week > 34) * 1.0
            + 0.05 * (days_since < 3) * 1.0
        )
        noise = np.random.normal(0, 0.06)
        score = urgency + noise

        if score > 0.50:
            priority = 1  # critical
        elif score > 0.35:
            priority = 2  # high
        elif score > 0.20:
            priority = 3  # medium
        else:
            priority = 4  # low

        rows.append({
            "risk_level_numeric": risk_level,
            "crisis_flag": crisis_flag,
            "days_since_escalation": round(days_since, 1),
            "patient_age": round(patient_age),
            "pregnancy_week": pregnancy_week,
            "previous_escalations_count": prev_escalations,
            "bp_systolic": round(bp_sys),
            "mental_score": round(mental, 1),
            "physical_score": round(physical, 1),
            "fetal_score": round(fetal, 1),
            "priority": priority,
        })
    return pd.DataFrame(rows)


def train_escalation_ranker():
    _section("🚨", "MODEL 13: Escalation Priority Ranker (XGBoost Multi-Class)")

    df = _generate_escalation_data(1500)
    priority_names = {1: "Critical", 2: "High", 3: "Medium", 4: "Low"}
    for p, name in priority_names.items():
        print(f"  {name}: {(df['priority'] == p).sum()}")

    feature_cols = [
        "risk_level_numeric", "crisis_flag", "days_since_escalation",
        "patient_age", "pregnancy_week", "previous_escalations_count",
        "bp_systolic", "mental_score", "physical_score", "fetal_score",
    ]
    X = df[feature_cols].values
    y = df["priority"].values

    le = LabelEncoder()
    y_enc = le.fit_transform(y)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y_enc, test_size=0.2, stratify=y_enc, random_state=42,
    )
    scaler = StandardScaler()
    X_train_s = scaler.fit_transform(X_train)
    X_test_s = scaler.transform(X_test)
    X_train_s, y_train = _apply_smote(X_train_s, y_train)

    model = XGBClassifier(
        n_estimators=200, max_depth=6, learning_rate=0.1,
        subsample=0.8, colsample_bytree=0.8,
        eval_metric="mlogloss", random_state=42, verbosity=0,
    )
    model.fit(X_train_s, y_train)

    y_pred = model.predict(X_test_s)
    target_labels = [priority_names[c] for c in le.classes_]
    print(f"  Accuracy: {accuracy_score(y_test, y_pred):.4f}")
    print(classification_report(y_test, y_pred, target_names=target_labels))

    joblib.dump(model, MODEL_DIR / "escalation_ranker.joblib")
    joblib.dump(scaler, MODEL_DIR / "escalation_scaler.joblib")
    joblib.dump(feature_cols, MODEL_DIR / "escalation_features.joblib")
    print("  Saved: escalation_ranker.joblib, escalation_scaler.joblib, escalation_features.joblib")


# ═══════════════════════════════════════════════════════════════════
#  Model 14 — NLP Clinical Note Summarizer (Extractive TF-IDF)
# ═══════════════════════════════════════════════════════════════════

def _get_medical_corpus() -> list[str]:
    """Synthetic clinical notes for fitting the TF-IDF vectorizer."""
    return [
        "Patient presents at 32 weeks gestation with complaint of persistent headaches and elevated blood pressure readings at home. Blood pressure in clinic measured at 148/96 mmHg. Urine dipstick shows 1+ protein. Fundal height appropriate for gestational age. Fetal heart tones reassuring at 142 bpm. Edema noted in bilateral lower extremities. Plan: 24-hour urine collection for protein, CBC, CMP, LFTs, uric acid. Return in 3 days for follow-up. Patient counseled on preeclampsia warning signs.",
        "36-week prenatal visit. Patient reports decreased fetal movement over the past 24 hours. Non-stress test performed showing reactive tracing with adequate accelerations. Amniotic fluid index measured at 12 cm within normal limits. Cervix 1 cm dilated 50% effaced. Group B strep culture obtained. Patient advised on kick counting techniques and when to present to labor and delivery.",
        "Patient admitted at 28 weeks for preterm premature rupture of membranes. Sterile speculum exam confirms pooling of amniotic fluid. Nitrazine positive and ferning present. Betamethasone administered for fetal lung maturity. Latency antibiotics initiated with ampicillin and azithromycin. Continuous fetal monitoring in place showing reassuring tracing. Maternal vitals stable. No signs of chorioamnionitis at this time.",
        "Gestational diabetes management visit. Patient has been monitoring blood glucose four times daily. Fasting values ranging 85-95 mg/dL. Two-hour postprandial values occasionally above 120 mg/dL target. HbA1c currently 5.8%. Reviewed dietary log showing improvement in carbohydrate management. Growth ultrasound shows estimated fetal weight at 65th percentile. No polyhydramnios noted. Continue current meal plan with nutrition follow-up in 2 weeks.",
        "First trimester screening visit at 12 weeks. NT measurement 1.8 mm within normal limits. Nasal bone present. Crown-rump length consistent with dates. Combined screening results indicate low risk for trisomy 21 and trisomy 18. Cell-free DNA screening offered and patient elected to proceed. Prenatal vitamins with folate continued. No vaginal bleeding or cramping reported.",
        "Patient presents to triage at 38 weeks with regular contractions every 5 minutes lasting 60 seconds for the past 2 hours. Cervical exam shows 4 cm dilated 80% effaced at -1 station. Membranes intact. Fetal heart rate tracing category I. Group B strep positive — penicillin initiated. Epidural requested and placed without complication. Admitted to labor and delivery.",
        "Postpartum day 1 assessment following uncomplicated vaginal delivery. Fundus firm at umbilicus. Lochia rubra moderate amount. Perineal laceration repair intact without signs of infection. Breastfeeding initiated with good latch observed. Voiding spontaneously without difficulty. Hemoglobin 10.2 g/dL. Rh negative mother — RhoGAM administered. Emotional state assessed — patient tearful but appropriately bonding with newborn.",
        "Mental health screening at 24-week visit. PHQ-9 score of 14 indicating moderate depression. Patient reports persistent low mood poor sleep appetite changes and difficulty concentrating. History of anxiety disorder prior to pregnancy. Currently not on medications. Discussed risks and benefits of SSRI therapy during pregnancy. Referral placed to perinatal psychiatry. Safety plan reviewed — patient denies suicidal ideation.",
        "Routine anatomy scan at 20 weeks. Four-chamber heart view obtained showing normal cardiac anatomy. Bilateral kidneys visualized with normal renal pelvis measurements. Spine intact without defects. Anterior placenta with no previa. Cervical length measured at 3.8 cm. Estimated fetal weight appropriate for gestational age. Gender disclosed per patient request — female. Follow-up ultrasound scheduled at 32 weeks for growth.",
        "Third trimester visit at 34 weeks for patient with chronic hypertension on labetalol 200mg twice daily. Blood pressure today 132/84 managed on current regimen. 24-hour urine protein 180 mg below threshold for superimposed preeclampsia. Fetal growth scan shows appropriate interval growth. Biophysical profile 8/8. Discussed delivery planning at 37 weeks per ACOG guidelines for chronic hypertension. Antenatal testing to continue twice weekly.",
        "Emergency presentation at 30 weeks with vaginal bleeding. Ultrasound confirms complete placenta previa. No active contractions on tocometry. Fetal heart rate tracing reassuring. Hemoglobin 11.0 stable from baseline. Kleihauer-Betke test sent. Patient Rh negative — RhoGAM administered. Admitted for observation. Betamethasone course initiated. Pelvic rest and activity restriction counseled. Transfusion consent obtained.",
        "Nutrition counseling for patient with hyperemesis gravidarum at 10 weeks. Weight loss of 4 kg since conception. Ketonuria 2+ on dipstick. IV fluid resuscitation with dextrose and thiamine initiated. Ondansetron prescribed for severe nausea. Small frequent meals recommended focusing on bland high-protein snacks. Ginger supplementation discussed. Follow-up weight check in one week. Consider PICC line if no improvement.",
    ]


def train_note_summarizer():
    _section("📝", "MODEL 14: NLP Clinical Note Summarizer (Extractive TF-IDF)")

    corpus = _get_medical_corpus()
    print(f"  Clinical notes in training corpus: {len(corpus)}")

    try:
        import nltk
        nltk.download("punkt", quiet=True)
        nltk.download("punkt_tab", quiet=True)
        sent_tokenize = nltk.sent_tokenize
    except ImportError:
        import re
        def sent_tokenize(text):
            return [s.strip() for s in re.split(r'(?<=[.!?])\s+', text) if s.strip()]
        print("  (nltk not found — using regex sentence splitter)")

    all_sentences = []
    for note in corpus:
        all_sentences.extend(sent_tokenize(note))
    print(f"  Total sentences extracted: {len(all_sentences)}")

    vectorizer = TfidfVectorizer(
        max_features=2000, stop_words="english",
        ngram_range=(1, 2), sublinear_tf=True,
    )
    vectorizer.fit(all_sentences)

    print("\n  Demo summaries (top-3 sentences per note):")
    for i, note in enumerate(corpus[:3]):
        sentences = sent_tokenize(note)
        if len(sentences) < 2:
            continue
        sent_vectors = vectorizer.transform(sentences)
        scores = sent_vectors.sum(axis=1).A1
        top_idx = scores.argsort()[::-1][:3]
        top_idx_sorted = sorted(top_idx)
        summary = " ".join(sentences[j] for j in top_idx_sorted)
        print(f"\n  Note {i+1} ({len(sentences)} sentences):")
        print(f"    Summary: {summary[:150]}...")

    joblib.dump({"vectorizer": vectorizer, "corpus_size": len(corpus)}, MODEL_DIR / "note_summarizer.joblib")
    print("\n  Saved: note_summarizer.joblib")


# ═══════════════════════════════════════════════════════════════════
#  Model 15 — Appointment No-Show Predictor (Random Forest)
# ═══════════════════════════════════════════════════════════════════

def _generate_noshow_data(n: int = 2000) -> pd.DataFrame:
    rows = []
    for _ in range(n):
        patient_age = np.clip(np.random.normal(29, 5), 16, 45)
        pregnancy_week = np.random.randint(6, 42)
        distance = np.clip(np.random.exponential(10), 0.5, 80)
        previous_noshows = np.random.choice([0, 1, 2, 3, 4], p=[0.60, 0.20, 0.10, 0.06, 0.04])
        day_of_week = np.random.randint(0, 7)   # 0=Mon, 6=Sun
        hour = np.random.choice(range(8, 18))
        weather = np.clip(np.random.normal(7, 2), 1, 10)
        reminder = np.random.choice([0, 1], p=[0.20, 0.80])
        days_since_booking = np.clip(np.random.exponential(7), 0, 60)
        risk_level = np.random.choice([1, 2, 3], p=[0.50, 0.30, 0.20])

        noshow_prob = (
            0.20 * (previous_noshows / 4)
            + 0.15 * (distance / 80)
            + 0.12 * (days_since_booking / 60)
            + 0.10 * (1 - reminder)
            + 0.08 * (day_of_week >= 5)     # weekends
            + 0.08 * (weather < 4)
            + 0.07 * (hour < 9 or hour > 16)
            + 0.05 * (1 - risk_level / 3)
            + 0.05 * (patient_age < 22)
            + 0.03 * (pregnancy_week < 12)
        )
        noise = np.random.normal(0, 0.06)
        noshow = int((noshow_prob + noise) > 0.30)

        rows.append({
            "patient_age": round(patient_age),
            "pregnancy_week": pregnancy_week,
            "distance_to_hospital": round(distance, 1),
            "previous_no_shows": previous_noshows,
            "appointment_day_of_week": day_of_week,
            "appointment_hour": hour,
            "weather_score": round(weather, 1),
            "reminder_sent": reminder,
            "days_since_booking": round(days_since_booking, 1),
            "risk_level_numeric": risk_level,
            "noshow": noshow,
        })
    return pd.DataFrame(rows)


def train_noshow_predictor():
    _section("📅", "MODEL 15: Appointment No-Show Predictor (Random Forest)")

    df = _generate_noshow_data(2000)
    print(f"  Samples: {len(df)}  |  No-show rate: {df['noshow'].mean():.2%}")

    feature_cols = [
        "patient_age", "pregnancy_week", "distance_to_hospital",
        "previous_no_shows", "appointment_day_of_week", "appointment_hour",
        "weather_score", "reminder_sent", "days_since_booking",
        "risk_level_numeric",
    ]
    X = df[feature_cols].values
    y = df["noshow"].values

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, stratify=y, random_state=42,
    )
    scaler = StandardScaler()
    X_train_s = scaler.fit_transform(X_train)
    X_test_s = scaler.transform(X_test)
    X_train_s, y_train = _apply_smote(X_train_s, y_train)

    model = RandomForestClassifier(
        n_estimators=200, max_depth=8, min_samples_leaf=5,
        class_weight="balanced", random_state=42, n_jobs=-1,
    )
    model.fit(X_train_s, y_train)

    y_pred = model.predict(X_test_s)
    print(f"  Accuracy: {accuracy_score(y_test, y_pred):.4f}")
    print(classification_report(y_test, y_pred, target_names=["Show", "No-Show"]))

    importances = model.feature_importances_
    sorted_idx = importances.argsort()[::-1]
    print("  Top feature importances:")
    for rank, idx in enumerate(sorted_idx[:5], 1):
        print(f"    {rank}. {feature_cols[idx]}: {importances[idx]:.4f}")

    joblib.dump(model, MODEL_DIR / "noshow_predictor.joblib")
    joblib.dump(scaler, MODEL_DIR / "noshow_scaler.joblib")
    joblib.dump(feature_cols, MODEL_DIR / "noshow_features.joblib")
    print("  Saved: noshow_predictor.joblib, noshow_scaler.joblib, noshow_features.joblib")


# ═══════════════════════════════════════════════════════════════════
#  MAIN
# ═══════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    print("=" * 65)
    print("  Novelle v2.0 — ML Model Training Pipeline (8 new models)")
    print(f"  Output directory: {MODEL_DIR.resolve()}")
    print("=" * 65)

    train_preterm_predictor()       # Model 8
    train_bp_forecaster()           # Model 9
    train_gdm_predictor()           # Model 10
    train_engagement_scorer()       # Model 11
    train_recommendation_engine()   # Model 12
    train_escalation_ranker()       # Model 13
    train_note_summarizer()         # Model 14
    train_noshow_predictor()        # Model 15

    print(f"\n{SEPARATOR}")
    print("  TRAINING COMPLETE — Verifying saved artifacts")
    print(SEPARATOR)

    expected_files = [
        "preterm_predictor.joblib", "preterm_scaler.joblib", "preterm_features.joblib",
        "bp_forecaster.joblib", "bp_forecaster_scaler.joblib", "bp_forecaster_features.joblib",
        "gdm_predictor.joblib", "gdm_scaler.joblib", "gdm_features.joblib",
        "engagement_scorer.joblib", "engagement_scaler.joblib", "engagement_features.joblib",
        "recommendation_engine.joblib",
        "escalation_ranker.joblib", "escalation_scaler.joblib", "escalation_features.joblib",
        "note_summarizer.joblib",
        "noshow_predictor.joblib", "noshow_scaler.joblib", "noshow_features.joblib",
    ]

    all_ok = True
    for fname in expected_files:
        exists = (MODEL_DIR / fname).exists()
        size_kb = (MODEL_DIR / fname).stat().st_size / 1024 if exists else 0
        status = f"({size_kb:.0f} KB)" if exists else "MISSING"
        print(f"  {'[OK]' if exists else '[!!]'} {fname:45s} {status}")
        if not exists:
            all_ok = False

    print(f"\n{'=' * 65}")
    if all_ok:
        print("  All v2.0 models trained successfully!")
    else:
        print("  WARNING: Some models failed to save!")
    print(f"{'=' * 65}")
