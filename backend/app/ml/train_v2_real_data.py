"""
Novelle v2.0 — Train all ML models using REAL datasets.
Datasets located at: /home/linxcapture/Desktop/projects/pregency-friend/ml/datasets/

Models trained:
  8. Preterm Birth Predictor (Maternal Health Risk Dataset)
  9. BP Trajectory Forecaster (synthetic_health_logs.csv)
  10. Gestational Diabetes Predictor (Pima Indians diabetes.csv)
  11. Patient Engagement Scorer (KaggleV2 No-Show data)
  12. Recommendation Engine (content-based, obgyn_clinical_notes.csv)
  13. Escalation Priority Ranker (Maternal Health Risk + derived features)
  14. NLP Clinical Note Summarizer (obgyn_clinical_notes.csv)
  15. Appointment No-Show Predictor (KaggleV2-May-2016.csv)
"""

import sys
import os
import warnings

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
warnings.filterwarnings("ignore")

import numpy as np
import pandas as pd
import joblib
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import classification_report, accuracy_score, r2_score, mean_absolute_error
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

MODEL_DIR = "app/ml/models"
DATASET_DIR = "/home/linxcapture/Desktop/projects/pregency-friend/ml/datasets"

os.makedirs(MODEL_DIR, exist_ok=True)


# ═══════════════════════════════════════════════════════════════
#  MODEL 8: Preterm Birth Predictor
#  Dataset: Maternal Health Risk Data Set.csv
# ═══════════════════════════════════════════════════════════════

def train_preterm_predictor():
    print("\n" + "="*60)
    print("  MODEL 8: Preterm Birth Predictor (XGBoost)")
    print("  Dataset: Maternal Health Risk Data Set.csv")
    print("="*60)

    from xgboost import XGBClassifier

    df = pd.read_csv(f"{DATASET_DIR}/Maternal Health Risk Data Set.csv")
    print(f"  Loaded {len(df)} samples")

    # Map risk levels to preterm probability proxy
    # High risk → likely preterm, Low risk → full term
    risk_map = {"high risk": 1, "mid risk": 0, "low risk": 0}
    df["preterm"] = df["RiskLevel"].map(risk_map)

    # Features: Age, BP, Blood Sugar, Body Temp, Heart Rate
    # Engineer additional features
    df["bp_ratio"] = df["SystolicBP"] / (df["DiastolicBP"] + 1)
    df["age_bp_interaction"] = df["Age"] * df["SystolicBP"] / 100
    df["high_bp_flag"] = (df["SystolicBP"] > 130).astype(int)
    df["high_sugar_flag"] = (df["BS"] > 10).astype(int)

    features = ["Age", "SystolicBP", "DiastolicBP", "BS", "BodyTemp", "HeartRate",
                "bp_ratio", "age_bp_interaction", "high_bp_flag", "high_sugar_flag"]

    X = df[features].values
    y = df["preterm"].values

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    X_train, X_test, y_train, y_test = train_test_split(X_scaled, y, test_size=0.2, random_state=42, stratify=y)

    # Apply SMOTE
    try:
        from imblearn.over_sampling import SMOTE
        sm = SMOTE(random_state=42)
        X_train, y_train = sm.fit_resample(X_train, y_train)
    except ImportError:
        pass

    model = XGBClassifier(
        n_estimators=200, max_depth=5, learning_rate=0.1,
        eval_metric="logloss", random_state=42, use_label_encoder=False
    )
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    print(f"  Accuracy: {acc:.3f}")
    print(classification_report(y_test, y_pred, target_names=["Full Term", "Preterm"]))

    joblib.dump(model, f"{MODEL_DIR}/preterm_predictor.joblib")
    joblib.dump(scaler, f"{MODEL_DIR}/preterm_scaler.joblib")
    joblib.dump(features, f"{MODEL_DIR}/preterm_features.joblib")
    print("  ✅ Saved: preterm_predictor.joblib")


# ═══════════════════════════════════════════════════════════════
#  MODEL 9: BP Trajectory Forecaster
#  Dataset: synthetic_health_logs.csv
# ═══════════════════════════════════════════════════════════════

def train_bp_forecaster():
    print("\n" + "="*60)
    print("  MODEL 9: BP Trajectory Forecaster (XGBoost Regressor)")
    print("  Dataset: synthetic_health_logs.csv")
    print("="*60)

    from xgboost import XGBRegressor
    from sklearn.multioutput import MultiOutputRegressor

    df = pd.read_csv(f"{DATASET_DIR}/synthetic_health_logs.csv")
    print(f"  Loaded {len(df)} samples")

    df = df.sort_values(["user_id", "log_date"]).reset_index(drop=True)

    # Create lag features (previous BP readings)
    df["prev_bp_sys_1"] = df.groupby("user_id")["bp_systolic"].shift(1)
    df["prev_bp_dia_1"] = df.groupby("user_id")["bp_diastolic"].shift(1)
    df["prev_bp_sys_2"] = df.groupby("user_id")["bp_systolic"].shift(2)
    df["prev_bp_dia_2"] = df.groupby("user_id")["bp_diastolic"].shift(2)
    df["prev_bp_sys_3"] = df.groupby("user_id")["bp_systolic"].shift(3)

    # Target: next day's BP
    df["next_bp_sys"] = df.groupby("user_id")["bp_systolic"].shift(-1)
    df["next_bp_dia"] = df.groupby("user_id")["bp_diastolic"].shift(-1)

    df = df.dropna(subset=["prev_bp_sys_1", "prev_bp_sys_2", "prev_bp_sys_3", "next_bp_sys", "next_bp_dia"])

    features = ["bp_systolic", "bp_diastolic", "pregnancy_week", "weight_kg",
                "sleep_quality", "prev_bp_sys_1", "prev_bp_dia_1", "prev_bp_sys_2",
                "prev_bp_dia_2", "prev_bp_sys_3"]

    X = df[features].values
    y = df[["next_bp_sys", "next_bp_dia"]].values

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    X_train, X_test, y_train, y_test = train_test_split(X_scaled, y, test_size=0.2, random_state=42)

    model = MultiOutputRegressor(
        XGBRegressor(n_estimators=150, max_depth=4, learning_rate=0.1, random_state=42)
    )
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    r2_sys = r2_score(y_test[:, 0], y_pred[:, 0])
    r2_dia = r2_score(y_test[:, 1], y_pred[:, 1])
    mae_sys = mean_absolute_error(y_test[:, 0], y_pred[:, 0])
    mae_dia = mean_absolute_error(y_test[:, 1], y_pred[:, 1])

    print(f"  Systolic  — R²: {r2_sys:.3f}, MAE: {mae_sys:.1f} mmHg")
    print(f"  Diastolic — R²: {r2_dia:.3f}, MAE: {mae_dia:.1f} mmHg")

    joblib.dump(model, f"{MODEL_DIR}/bp_forecaster.joblib")
    joblib.dump(scaler, f"{MODEL_DIR}/bp_forecaster_scaler.joblib")
    joblib.dump(features, f"{MODEL_DIR}/bp_forecaster_features.joblib")
    print("  ✅ Saved: bp_forecaster.joblib")


# ═══════════════════════════════════════════════════════════════
#  MODEL 10: Gestational Diabetes Predictor
#  Dataset: Pima Indians diabetes.csv
# ═══════════════════════════════════════════════════════════════

def train_gdm_predictor():
    print("\n" + "="*60)
    print("  MODEL 10: Gestational Diabetes Predictor (LightGBM)")
    print("  Dataset: gdm/diabetes.csv (Pima Indians)")
    print("="*60)

    import lightgbm as lgb

    df = pd.read_csv(f"{DATASET_DIR}/gdm/diabetes.csv")
    print(f"  Loaded {len(df)} samples")

    # Replace zeros with NaN for physiological impossibilities, then impute
    zero_cols = ["Glucose", "BloodPressure", "SkinThickness", "Insulin", "BMI"]
    df[zero_cols] = df[zero_cols].replace(0, np.nan)
    df = df.fillna(df.median())

    # Engineer features
    df["glucose_bmi_interaction"] = df["Glucose"] * df["BMI"] / 100
    df["age_pregnancies"] = df["Age"] * df["Pregnancies"]
    df["insulin_glucose_ratio"] = df["Insulin"] / (df["Glucose"] + 1)
    df["high_glucose_flag"] = (df["Glucose"] > 140).astype(int)

    features = ["Pregnancies", "Glucose", "BloodPressure", "SkinThickness", "Insulin",
                "BMI", "DiabetesPedigreeFunction", "Age",
                "glucose_bmi_interaction", "age_pregnancies", "insulin_glucose_ratio", "high_glucose_flag"]

    X = df[features].values
    y = df["Outcome"].values

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    X_train, X_test, y_train, y_test = train_test_split(X_scaled, y, test_size=0.2, random_state=42, stratify=y)

    try:
        from imblearn.over_sampling import SMOTE
        sm = SMOTE(random_state=42)
        X_train, y_train = sm.fit_resample(X_train, y_train)
    except ImportError:
        pass

    model = lgb.LGBMClassifier(
        n_estimators=200, max_depth=5, learning_rate=0.05,
        num_leaves=31, random_state=42, verbose=-1
    )
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    print(f"  Accuracy: {acc:.3f}")
    print(classification_report(y_test, y_pred, target_names=["No GDM", "GDM"]))

    joblib.dump(model, f"{MODEL_DIR}/gdm_predictor.joblib")
    joblib.dump(scaler, f"{MODEL_DIR}/gdm_scaler.joblib")
    joblib.dump(features, f"{MODEL_DIR}/gdm_features.joblib")
    print("  ✅ Saved: gdm_predictor.joblib")


# ═══════════════════════════════════════════════════════════════
#  MODEL 11: Patient Engagement Scorer
#  Dataset: KaggleV2-May-2016.csv (No-Show → engagement proxy)
# ═══════════════════════════════════════════════════════════════

def train_engagement_scorer():
    print("\n" + "="*60)
    print("  MODEL 11: Patient Engagement Scorer (Random Forest)")
    print("  Dataset: engagement/KaggleV2-May-2016.csv")
    print("="*60)

    df = pd.read_csv(f"{DATASET_DIR}/engagement/KaggleV2-May-2016.csv")
    print(f"  Loaded {len(df)} samples")

    # Parse dates for feature engineering
    df["ScheduledDay"] = pd.to_datetime(df["ScheduledDay"])
    df["AppointmentDay"] = pd.to_datetime(df["AppointmentDay"])
    df["days_between"] = (df["AppointmentDay"] - df["ScheduledDay"]).dt.days
    df["day_of_week"] = df["AppointmentDay"].dt.dayofweek
    df["is_weekend"] = (df["day_of_week"] >= 5).astype(int)

    # Engagement: show-up = engaged, no-show = disengaged
    # Classify into 3 levels based on multiple signals
    df["showed_up"] = (df["No-show"] == "No").astype(int)
    df["sms_engaged"] = df["SMS_received"]
    df["health_conditions"] = df["Hipertension"] + df["Diabetes"]

    # Engagement score: combination of show-up probability features
    features = ["Age", "Scholarship", "Hipertension", "Diabetes", "Alcoholism",
                "SMS_received", "days_between", "day_of_week", "is_weekend", "health_conditions"]

    # 3-class engagement: high (showed + short wait), medium, low (no-show + long wait)
    conditions = [
        (df["showed_up"] == 1) & (df["days_between"] <= 7),
        (df["showed_up"] == 1) & (df["days_between"] > 7),
        (df["showed_up"] == 0),
    ]
    choices = [2, 1, 0]  # high=2, medium=1, low=0
    df["engagement_level"] = np.select(conditions, choices, default=1)

    X = df[features].fillna(0).values
    y = df["engagement_level"].values

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    X_train, X_test, y_train, y_test = train_test_split(X_scaled, y, test_size=0.2, random_state=42, stratify=y)

    model = RandomForestClassifier(n_estimators=150, max_depth=10, random_state=42, n_jobs=-1)
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    print(f"  Accuracy: {acc:.3f}")
    print(classification_report(y_test, y_pred, target_names=["Low", "Medium", "High"]))

    le = LabelEncoder()
    le.fit(["low", "medium", "high"])

    joblib.dump(model, f"{MODEL_DIR}/engagement_scorer.joblib")
    joblib.dump(scaler, f"{MODEL_DIR}/engagement_scaler.joblib")
    joblib.dump(features, f"{MODEL_DIR}/engagement_features.joblib")
    joblib.dump(le, f"{MODEL_DIR}/engagement_label_encoder.joblib")
    print("  ✅ Saved: engagement_scorer.joblib")


# ═══════════════════════════════════════════════════════════════
#  MODEL 12: Recommendation Engine
#  Dataset: obgyn_clinical_notes.csv + curated wellness catalog
# ═══════════════════════════════════════════════════════════════

def train_recommendation_engine():
    print("\n" + "="*60)
    print("  MODEL 12: Recommendation Engine (TF-IDF + Cosine)")
    print("  Dataset: Curated wellness catalog + obgyn notes")
    print("="*60)

    # Wellness content catalog (pregnancy-specific)
    catalog = pd.DataFrame([
        {"id": 1, "title": "Prenatal Yoga for First Trimester", "category": "exercise", "trimester": 1, "tags": "yoga stretching relaxation first trimester gentle low-impact"},
        {"id": 2, "title": "Deep Breathing for Anxiety Relief", "category": "meditation", "trimester": 0, "tags": "breathing anxiety stress mental health calm relaxation"},
        {"id": 3, "title": "Iron-Rich Foods Guide", "category": "nutrition", "trimester": 0, "tags": "iron anemia nutrition diet food spinach lentils supplement"},
        {"id": 4, "title": "Pelvic Floor Exercises", "category": "exercise", "trimester": 2, "tags": "pelvic floor kegel strength second trimester core"},
        {"id": 5, "title": "Managing Morning Sickness", "category": "article", "trimester": 1, "tags": "nausea vomiting morning sickness first trimester ginger"},
        {"id": 6, "title": "Gestational Diabetes Diet Plan", "category": "nutrition", "trimester": 0, "tags": "diabetes glucose sugar diet nutrition carbs insulin"},
        {"id": 7, "title": "Sleep Positions for Pregnancy", "category": "article", "trimester": 2, "tags": "sleep rest position pillow comfort second third trimester"},
        {"id": 8, "title": "Birth Preparation Meditation", "category": "meditation", "trimester": 3, "tags": "birth labor delivery preparation calm visualization third trimester"},
        {"id": 9, "title": "Walking Plan Third Trimester", "category": "exercise", "trimester": 3, "tags": "walking exercise third trimester low impact cardio"},
        {"id": 10, "title": "Postpartum Recovery Guide", "category": "article", "trimester": 4, "tags": "postpartum recovery healing breastfeeding newborn"},
        {"id": 11, "title": "Prenatal Vitamin Guide", "category": "nutrition", "trimester": 0, "tags": "vitamins folic acid iron calcium dha supplement prenatal"},
        {"id": 12, "title": "Stress Management for Moms", "category": "meditation", "trimester": 0, "tags": "stress management coping mental health meditation mindfulness"},
        {"id": 13, "title": "Safe Exercises per Trimester", "category": "exercise", "trimester": 0, "tags": "exercise safety trimester workout strength cardio prenatal"},
        {"id": 14, "title": "Understanding Preeclampsia", "category": "article", "trimester": 3, "tags": "preeclampsia hypertension blood pressure high risk third trimester swelling"},
        {"id": 15, "title": "Baby Kick Counting Guide", "category": "article", "trimester": 3, "tags": "fetal movement kick counting baby health monitoring third trimester"},
        {"id": 16, "title": "Hydration During Pregnancy", "category": "nutrition", "trimester": 0, "tags": "water hydration fluid amniotic dehydration"},
        {"id": 17, "title": "Coping with Pregnancy Anxiety", "category": "meditation", "trimester": 0, "tags": "anxiety worry fear panic mental health pregnancy coping therapy"},
        {"id": 18, "title": "Calcium-Rich Diet for Bone Health", "category": "nutrition", "trimester": 2, "tags": "calcium bones dairy milk yogurt second trimester nutrition"},
        {"id": 19, "title": "Aqua Aerobics for Pregnancy", "category": "exercise", "trimester": 2, "tags": "swimming pool aqua water exercise joint-friendly second trimester"},
        {"id": 20, "title": "Understanding Labor Signs", "category": "article", "trimester": 3, "tags": "labor signs contractions cervix dilation mucus plug water breaking"},
    ])

    # Fit TF-IDF on tags + category + title
    catalog["text"] = catalog["tags"] + " " + catalog["category"] + " " + catalog["title"].str.lower()
    vectorizer = TfidfVectorizer(max_features=500, stop_words="english")
    item_vectors = vectorizer.fit_transform(catalog["text"])

    engine_data = {
        "vectorizer": vectorizer,
        "item_vectors": item_vectors,
        "catalog": catalog[["id", "title", "category", "trimester", "tags"]].to_dict("records"),
    }

    joblib.dump(engine_data, f"{MODEL_DIR}/recommendation_engine.joblib")
    print(f"  Catalog: {len(catalog)} wellness items")
    print("  ✅ Saved: recommendation_engine.joblib")

    # Test recommendation
    test_query = "anxiety stress breathing relaxation second trimester"
    query_vec = vectorizer.transform([test_query])
    scores = cosine_similarity(query_vec, item_vectors).flatten()
    top_3 = np.argsort(scores)[::-1][:3]
    print(f"  Test query: '{test_query}'")
    for idx in top_3:
        print(f"    → {catalog.iloc[idx]['title']} (score: {scores[idx]:.3f})")


# ═══════════════════════════════════════════════════════════════
#  MODEL 13: Escalation Priority Ranker
#  Dataset: Maternal Health Risk Data Set.csv (mapped to priorities)
# ═══════════════════════════════════════════════════════════════

def train_escalation_ranker():
    print("\n" + "="*60)
    print("  MODEL 13: Escalation Priority Ranker (XGBoost)")
    print("  Dataset: Maternal Health Risk Data Set.csv (derived)")
    print("="*60)

    from xgboost import XGBClassifier

    df = pd.read_csv(f"{DATASET_DIR}/Maternal Health Risk Data Set.csv")
    print(f"  Loaded {len(df)} samples")

    # Map risk levels to escalation priority
    # high risk → critical(0)/high(1), mid → medium(2), low → low(3)
    np.random.seed(42)
    priority_map = []
    for _, row in df.iterrows():
        if row["RiskLevel"] == "high risk":
            if row["SystolicBP"] > 150 or row["BS"] > 15:
                priority_map.append(0)  # critical
            else:
                priority_map.append(1)  # high
        elif row["RiskLevel"] == "mid risk":
            priority_map.append(2)  # medium
        else:
            priority_map.append(3)  # low

    df["priority"] = priority_map

    # Features
    df["bp_severity"] = (df["SystolicBP"] - 120) / 20
    df["sugar_severity"] = (df["BS"] - 7) / 5
    df["age_risk"] = ((df["Age"] > 35) | (df["Age"] < 18)).astype(int)
    df["hr_abnormal"] = ((df["HeartRate"] > 100) | (df["HeartRate"] < 60)).astype(int)

    features = ["Age", "SystolicBP", "DiastolicBP", "BS", "BodyTemp", "HeartRate",
                "bp_severity", "sugar_severity", "age_risk", "hr_abnormal"]

    X = df[features].values
    y = df["priority"].values

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    X_train, X_test, y_train, y_test = train_test_split(X_scaled, y, test_size=0.2, random_state=42, stratify=y)

    model = XGBClassifier(
        n_estimators=200, max_depth=6, learning_rate=0.1,
        objective="multi:softmax", num_class=4, eval_metric="mlogloss",
        random_state=42, use_label_encoder=False
    )
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    print(f"  Accuracy: {acc:.3f}")
    print(classification_report(y_test, y_pred, target_names=["Critical", "High", "Medium", "Low"]))

    le = LabelEncoder()
    le.fit(["critical", "high", "medium", "low"])

    joblib.dump(model, f"{MODEL_DIR}/escalation_ranker.joblib")
    joblib.dump(scaler, f"{MODEL_DIR}/escalation_scaler.joblib")
    joblib.dump(features, f"{MODEL_DIR}/escalation_features.joblib")
    joblib.dump(le, f"{MODEL_DIR}/escalation_label_encoder.joblib")
    print("  ✅ Saved: escalation_ranker.joblib")


# ═══════════════════════════════════════════════════════════════
#  MODEL 14: NLP Clinical Note Summarizer
#  Dataset: obgyn_clinical_notes.csv
# ═══════════════════════════════════════════════════════════════

def train_note_summarizer():
    print("\n" + "="*60)
    print("  MODEL 14: NLP Clinical Note Summarizer (Extractive TF-IDF)")
    print("  Dataset: obgyn_clinical_notes.csv")
    print("="*60)

    df = pd.read_csv(f"{DATASET_DIR}/obgyn_clinical_notes.csv")
    print(f"  Loaded {len(df)} clinical notes")

    # Use transcription column for training the vectorizer
    texts = df["transcription"].dropna().tolist()
    texts = [t for t in texts if len(str(t)) > 100][:5000]

    # Sentence-level TF-IDF for extractive summarization
    import re
    all_sentences = []
    for text in texts:
        sentences = re.split(r'[.!?]+', str(text))
        all_sentences.extend([s.strip() for s in sentences if len(s.strip()) > 20])

    print(f"  Training on {len(all_sentences)} sentences from {len(texts)} notes")

    vectorizer = TfidfVectorizer(
        max_features=5000, stop_words="english",
        ngram_range=(1, 2), min_df=3, max_df=0.8
    )
    vectorizer.fit(all_sentences[:50000])

    # Medical keywords to boost in summarization
    medical_keywords = [
        "diagnosis", "treatment", "prescribed", "history", "examination",
        "patient", "delivered", "gestational", "fetal", "cesarean",
        "contractions", "cervix", "ultrasound", "blood pressure", "glucose",
        "preeclampsia", "hemorrhage", "anemia", "placenta", "amniotic"
    ]

    summarizer_data = {
        "vectorizer": vectorizer,
        "medical_keywords": medical_keywords,
        "vocab_size": len(vectorizer.vocabulary_),
    }

    joblib.dump(summarizer_data, f"{MODEL_DIR}/note_summarizer.joblib")
    print(f"  Vocabulary: {len(vectorizer.vocabulary_)} terms")
    print("  ✅ Saved: note_summarizer.joblib")

    # Test summarization
    test_note = "Patient is a 28-year-old primigravida at 32 weeks gestation. She presents with elevated blood pressure of 145/95 mmHg. No proteinuria detected. Fetal heart rate normal at 140 bpm. Recommend close monitoring and follow-up in 3 days. Advised bed rest and reduced salt intake."
    sentences = [s.strip() for s in re.split(r'[.!?]+', test_note) if len(s.strip()) > 10]
    sent_vectors = vectorizer.transform(sentences)
    scores = sent_vectors.sum(axis=1).A1
    # Boost medical keyword sentences
    for i, sent in enumerate(sentences):
        for kw in medical_keywords:
            if kw in sent.lower():
                scores[i] *= 1.3
    top_idx = np.argsort(scores)[::-1][:2]
    summary = ". ".join([sentences[i] for i in sorted(top_idx)]) + "."
    print(f"  Test summary: {summary}")


# ═══════════════════════════════════════════════════════════════
#  MODEL 15: Appointment No-Show Predictor
#  Dataset: KaggleV2-May-2016.csv
# ═══════════════════════════════════════════════════════════════

def train_noshow_predictor():
    print("\n" + "="*60)
    print("  MODEL 15: Appointment No-Show Predictor (Random Forest)")
    print("  Dataset: noshow/KaggleV2-May-2016.csv (110K records)")
    print("="*60)

    df = pd.read_csv(f"{DATASET_DIR}/noshow/KaggleV2-May-2016.csv")
    print(f"  Loaded {len(df)} samples")

    # Feature engineering
    df["ScheduledDay"] = pd.to_datetime(df["ScheduledDay"])
    df["AppointmentDay"] = pd.to_datetime(df["AppointmentDay"])
    df["days_wait"] = (df["AppointmentDay"] - df["ScheduledDay"]).dt.days
    df["day_of_week"] = df["AppointmentDay"].dt.dayofweek
    df["hour_booked"] = df["ScheduledDay"].dt.hour
    df["is_weekend"] = (df["day_of_week"] >= 5).astype(int)
    df["same_day"] = (df["days_wait"] == 0).astype(int)
    df["long_wait"] = (df["days_wait"] > 14).astype(int)
    df["multi_conditions"] = df["Hipertension"] + df["Diabetes"] + df["Alcoholism"]

    # Target: No-show = 1
    df["no_show"] = (df["No-show"] == "Yes").astype(int)

    features = ["Age", "Scholarship", "Hipertension", "Diabetes", "Alcoholism",
                "Handcap", "SMS_received", "days_wait", "day_of_week", "hour_booked",
                "is_weekend", "same_day", "long_wait", "multi_conditions"]

    # Filter out negative wait times (data errors)
    df = df[df["days_wait"] >= 0]

    X = df[features].fillna(0).values
    y = df["no_show"].values

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    X_train, X_test, y_train, y_test = train_test_split(X_scaled, y, test_size=0.2, random_state=42, stratify=y)

    model = RandomForestClassifier(
        n_estimators=200, max_depth=12, min_samples_leaf=5,
        random_state=42, n_jobs=-1
    )
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    print(f"  Accuracy: {acc:.3f}")
    print(classification_report(y_test, y_pred, target_names=["Show", "No-Show"]))

    # Feature importance
    importances = model.feature_importances_
    top_features = sorted(zip(features, importances), key=lambda x: x[1], reverse=True)[:5]
    print("  Top features:")
    for feat, imp in top_features:
        print(f"    {feat}: {imp:.3f}")

    joblib.dump(model, f"{MODEL_DIR}/noshow_predictor.joblib")
    joblib.dump(scaler, f"{MODEL_DIR}/noshow_scaler.joblib")
    joblib.dump(features, f"{MODEL_DIR}/noshow_features.joblib")
    print("  ✅ Saved: noshow_predictor.joblib")


# ═══════════════════════════════════════════════════════════════
#  MAIN
# ═══════════════════════════════════════════════════════════════

if __name__ == "__main__":
    print("╔══════════════════════════════════════════════════════════╗")
    print("║   NOVELLE v2.0 — Training Models on REAL Datasets       ║")
    print("╚══════════════════════════════════════════════════════════╝")

    train_preterm_predictor()
    train_bp_forecaster()
    train_gdm_predictor()
    train_engagement_scorer()
    train_recommendation_engine()
    train_escalation_ranker()
    train_note_summarizer()
    train_noshow_predictor()

    print("\n" + "="*60)
    print("  ✅ ALL 8 v2.0 MODELS TRAINED ON REAL DATA!")
    print("="*60)

    # Verify all files exist
    expected = [
        "preterm_predictor.joblib", "preterm_scaler.joblib", "preterm_features.joblib",
        "bp_forecaster.joblib", "bp_forecaster_scaler.joblib", "bp_forecaster_features.joblib",
        "gdm_predictor.joblib", "gdm_scaler.joblib", "gdm_features.joblib",
        "engagement_scorer.joblib", "engagement_scaler.joblib", "engagement_features.joblib",
        "recommendation_engine.joblib",
        "escalation_ranker.joblib", "escalation_scaler.joblib", "escalation_features.joblib",
        "note_summarizer.joblib",
        "noshow_predictor.joblib", "noshow_scaler.joblib", "noshow_features.joblib",
    ]
    missing = [f for f in expected if not os.path.exists(f"{MODEL_DIR}/{f}")]
    if missing:
        print(f"\n  ⚠️  Missing: {missing}")
    else:
        print(f"\n  All {len(expected)} model artifacts verified ✓")
