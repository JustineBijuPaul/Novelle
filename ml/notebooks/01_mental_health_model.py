#!/usr/bin/env python3
"""
Novelle — Mental Health Risk Model Training (XGBoost + SMOTE)
=============================================================
Dataset: synthetic_mental_health.csv + synthetic_profiles.csv + synthetic_health_logs.csv
Target:  risk_label (LOW / MEDIUM / HIGH)
Model:   XGBoost Classifier

Usage:
    cd pregency-friend
    source backend/venv/bin/activate
    python ml/notebooks/01_mental_health_model.py
"""

import os, sys, json, warnings, time, random
from pathlib import Path
from datetime import datetime

import numpy as np
import pandas as pd
import joblib
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import seaborn as sns

from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_score
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.metrics import (
    classification_report, confusion_matrix, roc_auc_score,
    f1_score, precision_score, recall_score, accuracy_score,
    roc_curve, auc as sk_auc,
)
from sklearn.utils.class_weight import compute_sample_weight
from xgboost import XGBClassifier
from imblearn.over_sampling import SMOTE

warnings.filterwarnings("ignore")
np.random.seed(42)
random.seed(42)

# ── Paths ────────────────────────────────────────────
try:
    # Local environment
    ROOT = Path(__file__).resolve().parent.parent.parent
except NameError:
    # Notebook/Colab environment
    ROOT = Path(os.getcwd())
    if "notebooks" in str(ROOT):
        ROOT = ROOT.parent.parent

# Set paths
DATASET_DIR = ROOT / "ml" / "datasets"
NEW_DATASET_DIR = DATASET_DIR / "new dataset"
MODEL_DIR = ROOT / "backend" / "app" / "ml" / "models"
REPORT_DIR = ROOT / "ml" / "reports"

for d in [MODEL_DIR, REPORT_DIR]:
    d.mkdir(parents=True, exist_ok=True)

print("=" * 60)
print("  NOVELLE — MENTAL HEALTH MODEL TRAINING")
print("  Algorithm: XGBoost + SMOTE")
print("=" * 60)


# ═══════════════════════════════════════════════════════
#  STEP 1 — GENERATE BALANCED SYNTHETIC DATA
# ═══════════════════════════════════════════════════════

def generate_mental_data():
    """Generate balanced synthetic mental health dataset if not exists, or use existing."""
    csv_path = DATASET_DIR / "synthetic_mental_health.csv"
    profiles_path = DATASET_DIR / "synthetic_profiles.csv"
    health_path = DATASET_DIR / "synthetic_health_logs.csv"

    # Check if we have the existing synthetic data with enough features
    required_cols = ["user_id", "phq9_score", "gad7_score", "mood_score", "stress_level", "risk_label", "assessment_date"]
    if csv_path.exists():
        mental_df = pd.read_csv(csv_path)
        if all(col in mental_df.columns for col in required_cols):
            print(f"\n  📂 Loaded existing synthetic_mental_health.csv ({len(mental_df)} rows)")
            print(f"     Columns: {list(mental_df.columns)}")
            print(f"     Class dist: {mental_df['risk_label'].value_counts().to_dict()}")

            # Check if we have profiles and health logs
            prof_df = pd.read_csv(profiles_path) if profiles_path.exists() else None
            health_df = pd.read_csv(health_path) if health_path.exists() else None

            if prof_df is not None and health_df is not None:
                return mental_df, prof_df, health_df

    # If no usable data, generate fresh balanced synthetic data
    print("\n  🔄 Generating balanced synthetic mental health data...")
    N = 3000
    DAYS = 14
    ASSESS = 10

    profiles, hlogs, massess = [], [], []
    risk_list = ["low"] * 1200 + ["medium"] * 1050 + ["high"] * 750
    random.shuffle(risk_list)

    for i, rt in enumerate(risk_list):
        uid = i + 1

        if rt == "high":
            age = random.choice(list(range(16, 19)) + list(range(36, 43)))
            hemo = round(max(5, np.random.normal(8.5, 1.5)), 1)
            gd = random.random() < 0.5
            ch = random.random() < 0.4
            pp = random.randint(2, 5)
            pc = random.sample(["preeclampsia", "prom", "miscarriage", "preterm", "c-section"], k=random.randint(2, 4))
        elif rt == "medium":
            age = random.choice(list(range(19, 22)) + list(range(33, 37)))
            hemo = round(max(7, np.random.normal(10.5, 1.0)), 1)
            gd = random.random() < 0.25
            ch = random.random() < 0.2
            pp = random.randint(1, 3)
            pc = random.sample(["preeclampsia", "prom", "miscarriage", "preterm", "c-section", "gestational_diabetes"], k=random.randint(1, 2))
        else:
            age = random.randint(22, 32)
            hemo = round(min(16, np.random.normal(12.5, 0.8)), 1)
            gd = random.random() < 0.05
            ch = random.random() < 0.03
            pp = random.randint(0, 1)
            pc = random.sample(["c-section", "gestational_diabetes"], k=random.randint(0, 1))

        h = np.random.normal(158, 6)
        w = np.random.normal(60 if rt == "low" else 72, 10)
        bmi = w / ((h / 100) ** 2)
        week = random.randint(1, 42)

        profiles.append({
            "user_id": uid, "age": age,
            "height_cm": round(h, 1), "weight_kg": round(w, 1), "bmi": round(bmi, 1),
            "pregnancy_week": week,
            "trimester": "first" if week <= 12 else ("second" if week <= 27 else "third"),
            "blood_group": random.choice(["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"]),
            "previous_pregnancies": pp,
            "hemoglobin_level": hemo,
            "gestational_diabetes": gd,
            "chronic_hypertension": ch,
            "past_complications": json.dumps(pc),
        })

        bp_sys_b = {"high": random.randint(145, 165), "medium": random.randint(130, 140), "low": random.randint(105, 125)}[rt]
        bp_dia_b = {"high": random.randint(92, 110), "medium": random.randint(85, 90), "low": random.randint(65, 80)}[rt]
        sug_b = {"high": random.randint(105, 140) if gd else random.randint(95, 115),
                 "medium": random.randint(95, 105), "low": random.randint(75, 90)}[rt]

        from datetime import timedelta
        for d in range(DAYS):
            hlogs.append({
                "user_id": uid,
                "log_date": (datetime.now() - timedelta(days=DAYS - d)).date().isoformat(),
                "bp_systolic": int(np.random.normal(bp_sys_b, 8)),
                "bp_diastolic": int(np.random.normal(bp_dia_b, 6)),
                "blood_sugar_fasting": round(np.random.normal(sug_b, 12), 1),
                "weight_kg": round(w + np.random.normal(.3, .2) * (week / 10), 1),
                "sleep_quality": int(np.clip(np.random.normal({"high": 2.2, "medium": 3.0, "low": 3.8}[rt], 0.8), 1, 5)),
                "pain_score": int(np.clip(np.random.normal({"high": 5, "medium": 3, "low": 1.5}[rt], 2), 0, 10)),
                "fetal_movement_count": max(0, int(np.random.normal({"high": 4, "medium": 8, "low": 12}[rt], 3))) if week >= 20 else 0,
                "edema_flag": random.random() < ({"high": .6, "medium": .3, "low": .08}[rt] if week >= 25 else 0.05),
                "bleeding_flag": random.random() < {"high": .1, "medium": .04, "low": .01}[rt],
                "cramps_flag": random.random() < {"high": .4, "medium": .2, "low": .08}[rt],
                "cramps_intensity": int(np.clip(np.random.normal({"high": 5, "medium": 3, "low": 1}[rt], 2), 0, 10)),
                "pregnancy_week": week,
            })

        for d in range(ASSESS):
            phq9 = max(0, min(27, int(np.random.normal({"high": 16, "medium": 10, "low": 4}[rt], 4))))
            gad7 = max(0, min(21, int(np.random.normal({"high": 14, "medium": 8, "low": 3}[rt], 3))))
            mood = max(1, min(10, int(np.random.normal({"high": 3, "medium": 5, "low": 7}[rt], 1.5))))
            stress = max(1, min(10, int(np.random.normal({"high": 8, "medium": 5.5, "low": 3}[rt], 1.5))))
            massess.append({
                "user_id": uid,
                "assessment_date": (datetime.now() - timedelta(days=ASSESS - d)).date().isoformat(),
                "phq9_score": phq9, "gad7_score": gad7,
                "mood_score": mood, "stress_level": stress,
                "social_support_score": int(np.clip(np.random.normal({"high": 1.8, "medium": 2.8, "low": 4}[rt], 0.8), 1, 5)),
                "assessment_type": random.choice(["daily", "weekly_phq9", "weekly_gad7"]),
            })

    prof_df = pd.DataFrame(profiles)
    health_df = pd.DataFrame(hlogs)
    mental_df = pd.DataFrame(massess)

    # Apply risk labels
    def mental_lbl(r):
        pts = 0
        if r["phq9_score"] >= 15: pts += 3
        elif r["phq9_score"] >= 10: pts += 2
        if r["gad7_score"] >= 15: pts += 3
        elif r["gad7_score"] >= 10: pts += 2
        if r["mood_score"] <= 3: pts += 2
        if r["stress_level"] >= 8: pts += 2
        return "HIGH" if pts >= 6 else ("MEDIUM" if pts >= 3 else "LOW")

    mental_df["risk_label"] = mental_df.apply(mental_lbl, axis=1)

    prof_df.to_csv(profiles_path, index=False)
    health_df.to_csv(health_path, index=False)
    mental_df.to_csv(csv_path, index=False)

    print(f"  ✅ Generated: {len(prof_df)} profiles, {len(health_df)} health logs, {len(mental_df)} assessments")
    print(f"     Class dist: {mental_df['risk_label'].value_counts().to_dict()}")
    return mental_df, prof_df, health_df


# ═══════════════════════════════════════════════════════
#  STEP 2 — FEATURE ENGINEERING
# ═══════════════════════════════════════════════════════

def engineer_features(mental_df, prof_df, health_df):
    """Engineer features per user from raw data."""
    print("\n" + "─" * 60)
    print("  FEATURE ENGINEERING")
    print("─" * 60)

    feats, labels = [], []

    for uid in mental_df["user_id"].unique():
        user_subset = mental_df[mental_df["user_id"] == uid]
        if "assessment_date" in user_subset.columns:
            um = user_subset.sort_values("assessment_date")
        else:
            um = user_subset # Fallback for simple datasets
        
        if len(um) < 3:
            continue

        l7m = um.tail(7)
        lt = um.iloc[-1]

        # Try to get profile and health log data
        up = prof_df[prof_df["user_id"] == uid] if prof_df is not None else pd.DataFrame()
        uh = health_df[health_df["user_id"] == uid] if health_df is not None else pd.DataFrame()

        age = up.iloc[0]["age"] if len(up) > 0 and "age" in up.columns else 28
        preg_week = up.iloc[0]["pregnancy_week"] if len(up) > 0 and "pregnancy_week" in up.columns else 20
        prev_preg = up.iloc[0]["previous_pregnancies"] if len(up) > 0 and "previous_pregnancies" in up.columns else 0

        # Get sleep quality from health logs if available
        if len(uh) > 0 and "sleep_quality" in uh.columns:
            l7h = uh.sort_values("log_date").tail(7)
            sleep_avg = l7h["sleep_quality"].mean()
        else:
            sleep_avg = 3.0

        past_comp = []
        if len(up) > 0 and "past_complications" in up.columns:
            pc_val = up.iloc[0]["past_complications"]
            if isinstance(pc_val, str):
                try:
                    past_comp = json.loads(pc_val)
                except:
                    pass

        sentiment_map = {"HIGH": -0.4, "MEDIUM": -0.1, "LOW": 0.3}
        feats.append({
            "phq9_score": lt["phq9_score"],
            "gad7_score": lt["gad7_score"],
            "mood_avg_7d": l7m["mood_score"].mean(),
            "sleep_avg_7d": sleep_avg,
            "stress_avg_7d": l7m["stress_level"].mean(),
            "social_support": lt["social_support_score"],
            "journal_sentiment_avg": round(np.random.normal(sentiment_map.get(lt.get("risk_label", "LOW"), 0), 0.15), 2),
            "previous_mental_history": 1 if len(past_comp) > 2 else 0,
        })
        labels.append(lt["risk_label"])

    X = pd.DataFrame(feats)
    print(f"  Engineered {len(X)} samples with {X.shape[1]} features")
    print(f"  Features: {list(X.columns)}")
    return X, labels


# ═══════════════════════════════════════════════════════
#  STEP 3 — MODEL TRAINING
# ═══════════════════════════════════════════════════════

def train_model(X, labels):
    """Train XGBoost with SMOTE resampling."""
    print("\n" + "=" * 60)
    print("  MODEL TRAINING — XGBoost + SMOTE")
    print("=" * 60)
    t0 = time.time()

    le = LabelEncoder()
    y = le.fit_transform(labels)
    cn = list(le.classes_)
    print(f"  Classes: {dict(zip(cn, np.bincount(y)))}")

    # Train/test split
    Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)
    print(f"  Train: {len(Xtr)}, Test: {len(Xte)}")

    # Scale
    sc = StandardScaler()
    Xtr_s = sc.fit_transform(Xtr)
    Xte_s = sc.transform(Xte)

    # SMOTE
    sm = SMOTE(random_state=42, k_neighbors=3)
    Xtr_r, ytr_r = sm.fit_resample(Xtr_s, ytr)
    print(f"  After SMOTE: {dict(zip(cn, np.bincount(ytr_r)))}")

    # Class weights
    sw = compute_sample_weight("balanced", ytr_r)

    # XGBoost
    mdl = XGBClassifier(
        n_estimators=300, max_depth=6, learning_rate=0.08,
        subsample=0.8, colsample_bytree=0.8, min_child_weight=2,
        reg_alpha=0.1, reg_lambda=1.0, random_state=42,
        eval_metric="mlogloss"
    )
    mdl.fit(Xtr_r, ytr_r, sample_weight=sw, verbose=False)

    # Predictions
    yp = mdl.predict(Xte_s)
    ypr = mdl.predict_proba(Xte_s)

    # Cross-validation
    cv_scores = cross_val_score(
        mdl, Xtr_r, ytr_r,
        cv=StratifiedKFold(5, shuffle=True, random_state=42),
        scoring="f1_macro"
    )
    print(f"\n  Cross-Val F1-macro (5-fold): {cv_scores.mean():.4f} ± {cv_scores.std():.4f}")

    elapsed = time.time() - t0
    print(f"  Training time: {elapsed:.1f}s")

    return mdl, sc, le, cn, Xtr, Xte, Xte_s, ytr, yte, yp, ypr, cv_scores


# ═══════════════════════════════════════════════════════
#  STEP 4 — EVALUATION & REPORTING
# ═══════════════════════════════════════════════════════

def evaluate_model(mdl, cn, X, Xte_s, yte, yp, ypr, cv_scores):
    """Full evaluation with confusion matrix, ROC, SHAP."""
    print("\n" + "=" * 60)
    print("  EVALUATION")
    print("=" * 60)

    # Classification report
    print(classification_report(yte, yp, target_names=cn, zero_division=0))

    acc = accuracy_score(yte, yp)
    f1m = f1_score(yte, yp, average="macro", zero_division=0)
    f1w = f1_score(yte, yp, average="weighted", zero_division=0)
    pm = precision_score(yte, yp, average="macro", zero_division=0)
    rm = recall_score(yte, yp, average="macro", zero_division=0)
    try:
        auc = roc_auc_score(yte, ypr, multi_class="ovr", average="macro")
    except:
        auc = 0.0

    print(f"  Accuracy:           {acc:.4f}")
    print(f"  F1 (macro):         {f1m:.4f}")
    print(f"  F1 (weighted):      {f1w:.4f}")
    print(f"  Precision (macro):  {pm:.4f}")
    print(f"  Recall (macro):     {rm:.4f}")
    print(f"  AUC-ROC (macro):    {auc:.4f}")

    # ── Confusion Matrix ──
    cm = confusion_matrix(yte, yp)
    fig, ax = plt.subplots(figsize=(6, 5))
    sns.heatmap(cm, annot=True, fmt="d", cmap="RdPu", xticklabels=cn, yticklabels=cn, ax=ax)
    ax.set_xlabel("Predicted")
    ax.set_ylabel("Actual")
    ax.set_title("Mental Health Risk — Confusion Matrix")
    plt.tight_layout()
    fig.savefig(REPORT_DIR / "mental_health_confusion_matrix.png", dpi=150)
    plt.close(fig)
    print(f"\n  📊 Confusion Matrix → ml/reports/mental_health_confusion_matrix.png")

    # ── ROC Curves ──
    fig2, ax2 = plt.subplots(figsize=(7, 5))
    for i, c in enumerate(cn):
        bt = (yte == i).astype(int)
        if ypr.shape[1] > i:
            fpr, tpr, _ = roc_curve(bt, ypr[:, i])
            ax2.plot(fpr, tpr, label=f"{c} (AUC={sk_auc(fpr, tpr):.3f})", linewidth=2)
    ax2.plot([0, 1], [0, 1], "k--", alpha=.3)
    ax2.set_xlabel("False Positive Rate")
    ax2.set_ylabel("True Positive Rate")
    ax2.set_title("Mental Health Risk — ROC Curves (OvR)")
    ax2.legend(loc="lower right")
    plt.tight_layout()
    fig2.savefig(REPORT_DIR / "mental_health_roc.png", dpi=150)
    plt.close(fig2)
    print(f"  📊 ROC Curves → ml/reports/mental_health_roc.png")

    # ── Feature Importance ──
    fi = pd.Series(mdl.feature_importances_, index=X.columns).sort_values(ascending=True)
    fig3, ax3 = plt.subplots(figsize=(7, max(3, len(fi) * 0.4)))
    fi.plot.barh(ax=ax3, color="#C2185B")
    ax3.set_title("Mental Health Risk — Feature Importance")
    plt.tight_layout()
    fig3.savefig(REPORT_DIR / "mental_health_feature_importance.png", dpi=150)
    plt.close(fig3)
    print(f"  📊 Feature Importance → ml/reports/mental_health_feature_importance.png")

    print("\n  Top features:")
    for fn, fv in fi.sort_values(ascending=False).head(5).items():
        print(f"    {fn:>30s}  {fv:.4f}")

    # ── EDA: Distribution Plot ──
    fig4, axes = plt.subplots(2, 4, figsize=(16, 8))
    feature_cols = X.columns[:8]
    for idx, col in enumerate(feature_cols):
        ax = axes[idx // 4][idx % 4]
        ax.hist(X[col].values, bins=30, color="#C2185B", alpha=0.7, edgecolor="white")
        ax.set_title(col, fontsize=10)
        ax.set_ylabel("Count")
    plt.suptitle("Mental Health — Feature Distributions", fontsize=14)
    plt.tight_layout()
    fig4.savefig(REPORT_DIR / "mental_health_eda.png", dpi=150)
    plt.close(fig4)
    print(f"  📊 EDA Plot → ml/reports/mental_health_eda.png")

    # ── SHAP ──
    try:
        import shap
        print("\n  Computing SHAP values...")
        explainer = shap.TreeExplainer(mdl)
        shap_values = explainer.shap_values(Xte_s)
        plt.figure(figsize=(10, 6))
        shap.summary_plot(shap_values, Xte_s, feature_names=X.columns.tolist(), show=False)
        plt.tight_layout()
        plt.savefig(REPORT_DIR / "mental_health_shap_summary.png", dpi=150, bbox_inches="tight")
        plt.close()
        print(f"  📊 SHAP Summary → ml/reports/mental_health_shap_summary.png")
    except Exception as e:
        print(f"  ⚠️ SHAP failed: {e}")

    # ── Correlation Heatmap ──
    fig5, ax5 = plt.subplots(figsize=(8, 6))
    corr = X.corr()
    sns.heatmap(corr, annot=True, fmt=".2f", cmap="RdPu", ax=ax5, square=True)
    ax5.set_title("Mental Health — Feature Correlation")
    plt.tight_layout()
    fig5.savefig(REPORT_DIR / "mental_health_correlation.png", dpi=150)
    plt.close(fig5)
    print(f"  📊 Correlation → ml/reports/mental_health_correlation.png")

    metrics = {
        "accuracy": round(acc, 4),
        "f1_macro": round(f1m, 4),
        "f1_weighted": round(f1w, 4),
        "precision_macro": round(pm, 4),
        "recall_macro": round(rm, 4),
        "auc_roc_macro": round(auc, 4),
        "cross_validation": {
            "mean": round(cv_scores.mean(), 4),
            "std": round(cv_scores.std(), 4),
        },
    }
    return metrics


# ═══════════════════════════════════════════════════════
#  STEP 5 — SAVE MODEL ARTIFACTS
# ═══════════════════════════════════════════════════════

def save_model(mdl, sc, le, X, metrics):
    """Save model, scaler, encoder, features, and metrics."""
    print("\n" + "=" * 60)
    print("  SAVING MODEL ARTIFACTS")
    print("=" * 60)

    joblib.dump(mdl, MODEL_DIR / "mental_health_xgb.joblib")
    joblib.dump(sc, MODEL_DIR / "mental_health_scaler.joblib")
    joblib.dump(le, MODEL_DIR / "mental_health_label_encoder.joblib")

    features = list(X.columns)
    with open(MODEL_DIR / "mental_health_features.json", "w") as f:
        json.dump(features, f, indent=2)

    print(f"  ✅ mental_health_xgb.joblib")
    print(f"  ✅ mental_health_scaler.joblib")
    print(f"  ✅ mental_health_label_encoder.joblib")
    print(f"  ✅ mental_health_features.json")
    print(f"\n  Model saved to: {MODEL_DIR}")
    return features


# ═══════════════════════════════════════════════════════
#  MAIN
# ═══════════════════════════════════════════════════════

def main():
    t0 = time.time()

    # Step 1: Load/generate data
    mental_df, prof_df, health_df = generate_mental_data()

    # Step 2: Feature engineering
    X, labels = engineer_features(mental_df, prof_df, health_df)

    # Step 3: Train
    mdl, sc, le, cn, Xtr, Xte, Xte_s, ytr, yte, yp, ypr, cv_scores = train_model(X, labels)

    # Step 4: Evaluate
    metrics = evaluate_model(mdl, cn, X, Xte_s, yte, yp, ypr, cv_scores)

    # Step 5: Save
    features = save_model(mdl, sc, le, X, metrics)

    # Summary
    print("\n" + "=" * 60)
    print("  MENTAL HEALTH MODEL — SUMMARY")
    print("=" * 60)
    for k, v in metrics.items():
        if isinstance(v, dict):
            print(f"  {k}: {v}")
        else:
            print(f"  {k:>20s}: {v}")
    print(f"\n  Total time: {time.time() - t0:.1f}s")
    print(f"  ⚠️ This model predicts RISK LIKELIHOOD only — NOT medical diagnoses.")


if __name__ == "__main__":
    main()
