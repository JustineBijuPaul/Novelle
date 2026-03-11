#!/usr/bin/env python3
"""
Novelle — Physical Health Risk Model Training (Ensemble + SMOTE)
================================================================
Dataset: Maternal Health Risk Data Set.csv (1014 real samples)
         Columns: Age, SystolicBP, DiastolicBP, BS, BodyTemp, HeartRate, RiskLevel
Target:  RiskLevel (high risk / low risk / mid risk) → HIGH / LOW / MEDIUM
Model:   Weighted Ensemble (XGBoost + Random Forest + Logistic Regression)

Usage:
    cd pregency-friend
    source backend/venv/bin/activate
    python ml/notebooks/02_physical_health_model.py
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
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from xgboost import XGBClassifier
from imblearn.over_sampling import SMOTE

warnings.filterwarnings("ignore")
np.random.seed(42)
random.seed(42)

# ── Paths ────────────────────────────────────────────
try:
    ROOT = Path(__file__).resolve().parent.parent.parent
except NameError:
    ROOT = Path(os.getcwd())
    if "notebooks" in str(ROOT):
        ROOT = ROOT.parent.parent

DATASET_DIR = ROOT / "ml" / "datasets"
NEW_DATASET_DIR = DATASET_DIR / "new dataset"
MODEL_DIR = ROOT / "backend" / "app" / "ml" / "models"
REPORT_DIR = ROOT / "ml" / "reports"

for d in [MODEL_DIR, REPORT_DIR]:
    d.mkdir(parents=True, exist_ok=True)

print("=" * 60)
print("  NOVELLE — PHYSICAL HEALTH MODEL TRAINING")
print("  Algorithm: Ensemble (XGBoost + RF + LR) + SMOTE")
print("  Dataset: Maternal Health Risk Data Set (Kaggle)")
print("=" * 60)


# ═══════════════════════════════════════════════════════
#  STEP 1 — LOAD DATA
# ═══════════════════════════════════════════════════════

def load_data():
    """Load the Maternal Health Risk Data Set."""
    print("\n" + "─" * 60)
    print("  STEP 1 — LOADING DATA")
    print("─" * 60)

    # Try new dataset folder first, then fallback to datasets root
    csv_path = NEW_DATASET_DIR / "Maternal Health Risk Data Set.csv"
    if not csv_path.exists():
        csv_path = DATASET_DIR / "Maternal Health Risk Data Set.csv"

    if not csv_path.exists():
        raise FileNotFoundError(f"Maternal Health Risk Data Set not found at {csv_path}")

    df = pd.read_csv(csv_path)
    print(f"  📂 Loaded: {csv_path.name}")
    print(f"  Shape: {df.shape}")
    print(f"  Columns: {list(df.columns)}")
    print(f"\n  First 5 rows:")
    print(df.head().to_string(index=False))
    print(f"\n  RiskLevel distribution:")
    print(f"  {df['RiskLevel'].value_counts().to_dict()}")
    print(f"\n  Summary statistics:")
    print(df.describe().to_string())

    return df


# ═══════════════════════════════════════════════════════
#  STEP 2 — PREPROCESSING & FEATURE ENGINEERING
# ═══════════════════════════════════════════════════════

def preprocess(df):
    """Clean, map labels, engineer features."""
    print("\n" + "─" * 60)
    print("  STEP 2 — PREPROCESSING")
    print("─" * 60)

    # Map risk labels to standardized format
    risk_map = {
        "high risk": "HIGH",
        "mid risk": "MEDIUM",
        "low risk": "LOW",
    }
    df["RiskLevel"] = df["RiskLevel"].str.strip().map(risk_map)
    df = df.dropna(subset=["RiskLevel"])

    print(f"  After cleaning: {len(df)} samples")
    print(f"  Classes: {df['RiskLevel'].value_counts().to_dict()}")

    # Feature columns (use all available)
    feature_cols = ["Age", "SystolicBP", "DiastolicBP", "BS", "BodyTemp", "HeartRate"]
    X = df[feature_cols].copy()
    y_labels = df["RiskLevel"].values

    # Handle any missing values
    X = X.fillna(X.median())

    # Engineer additional features
    X["PulsePressure"] = X["SystolicBP"] - X["DiastolicBP"]
    X["MeanArterialPressure"] = X["DiastolicBP"] + (X["PulsePressure"] / 3)
    X["BP_BS_Interaction"] = X["SystolicBP"] * X["BS"] / 100
    X["Age_BP_Risk"] = X["Age"] * X["SystolicBP"] / 100

    print(f"  Features engineered: {list(X.columns)}")
    print(f"  Final shape: {X.shape}")

    return X, y_labels


# ═══════════════════════════════════════════════════════
#  STEP 3 — MODEL TRAINING
# ═══════════════════════════════════════════════════════

def train_model(X, y_labels):
    """Train the Ensemble model."""
    print("\n" + "=" * 60)
    print("  STEP 3 — MODEL TRAINING")
    print("=" * 60)
    t0 = time.time()

    le = LabelEncoder()
    y = le.fit_transform(y_labels)
    cn = list(le.classes_)
    print(f"  Classes: {dict(zip(cn, np.bincount(y)))}")
    print(f"  Label mapping: {dict(zip(le.classes_, le.transform(le.classes_)))}")

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

    # ── Individual Models ──
    print("\n  Training XGBoost...")
    xgb = XGBClassifier(
        n_estimators=300, max_depth=6, learning_rate=0.08,
        subsample=0.8, colsample_bytree=0.8, min_child_weight=2,
        reg_alpha=0.1, reg_lambda=1.0, random_state=42,
        eval_metric="mlogloss"
    )
    xgb.fit(Xtr_r, ytr_r, verbose=False)

    print("  Training Random Forest...")
    rf = RandomForestClassifier(
        n_estimators=200, max_depth=8,
        class_weight="balanced", random_state=42
    )
    rf.fit(Xtr_r, ytr_r)

    print("  Training Logistic Regression...")
    lr = LogisticRegression(
        max_iter=1000, class_weight="balanced",
        random_state=42
    )
    lr.fit(Xtr_r, ytr_r)

    # ── Weighted Soft Voting ──
    weights = np.array([3, 2, 1], dtype=float)
    weights /= weights.sum()
    ypr = (
        weights[0] * xgb.predict_proba(Xte_s) +
        weights[1] * rf.predict_proba(Xte_s) +
        weights[2] * lr.predict_proba(Xte_s)
    )
    yp = np.argmax(ypr, axis=1)

    # ── Individual model accuracies ──
    print(f"\n  Individual model accuracies:")
    print(f"    XGBoost:            {accuracy_score(yte, xgb.predict(Xte_s)):.4f}")
    print(f"    Random Forest:      {accuracy_score(yte, rf.predict(Xte_s)):.4f}")
    print(f"    Logistic Regression:{accuracy_score(yte, lr.predict(Xte_s)):.4f}")
    print(f"    Ensemble (3:2:1):   {accuracy_score(yte, yp):.4f}")

    # Cross-validation on XGBoost (primary model)
    cv_scores = cross_val_score(
        xgb, Xtr_r, ytr_r,
        cv=StratifiedKFold(5, shuffle=True, random_state=42),
        scoring="f1_macro"
    )
    print(f"\n  Cross-Val F1-macro (5-fold): {cv_scores.mean():.4f} ± {cv_scores.std():.4f}")

    elapsed = time.time() - t0
    print(f"  Training time: {elapsed:.1f}s")

    return xgb, rf, lr, sc, le, cn, X, Xte, Xte_s, yte, yp, ypr, cv_scores


# ═══════════════════════════════════════════════════════
#  STEP 4 — EVALUATION
# ═══════════════════════════════════════════════════════

def evaluate_model(xgb, cn, X, Xte_s, yte, yp, ypr, cv_scores):
    """Full evaluation suite."""
    print("\n" + "=" * 60)
    print("  STEP 4 — EVALUATION")
    print("=" * 60)

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
    sns.heatmap(cm, annot=True, fmt="d", cmap="YlOrRd", xticklabels=cn, yticklabels=cn, ax=ax)
    ax.set_xlabel("Predicted")
    ax.set_ylabel("Actual")
    ax.set_title("Physical Health Risk — Confusion Matrix")
    plt.tight_layout()
    fig.savefig(REPORT_DIR / "physical_health_confusion_matrix.png", dpi=150)
    plt.close(fig)
    print(f"\n  📊 Confusion Matrix → ml/reports/physical_health_confusion_matrix.png")

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
    ax2.set_title("Physical Health Risk — ROC Curves (OvR)")
    ax2.legend(loc="lower right")
    plt.tight_layout()
    fig2.savefig(REPORT_DIR / "physical_health_roc.png", dpi=150)
    plt.close(fig2)
    print(f"  📊 ROC Curves → ml/reports/physical_health_roc.png")

    # ── Feature Importance (XGBoost) ──
    fi = pd.Series(xgb.feature_importances_, index=X.columns).sort_values(ascending=True)
    fig3, ax3 = plt.subplots(figsize=(7, max(3, len(fi) * 0.4)))
    fi.plot.barh(ax=ax3, color="#E65100")
    ax3.set_title("Physical Health Risk — Feature Importance (XGBoost)")
    plt.tight_layout()
    fig3.savefig(REPORT_DIR / "physical_health_feature_importance.png", dpi=150)
    plt.close(fig3)
    print(f"  📊 Feature Importance → ml/reports/physical_health_feature_importance.png")

    print("\n  Top features:")
    for fn, fv in fi.sort_values(ascending=False).head(5).items():
        print(f"    {fn:>30s}  {fv:.4f}")

    # ── EDA: Distribution by Risk Level ──
    fig4, axes = plt.subplots(2, 5, figsize=(20, 8))
    for idx, col in enumerate(X.columns):
        if idx >= 10:
            break
        ax = axes[idx // 5][idx % 5]
        ax.hist(X[col].values, bins=30, color="#E65100", alpha=0.7, edgecolor="white")
        ax.set_title(col, fontsize=10)
        ax.set_ylabel("Count")
    plt.suptitle("Physical Health — Feature Distributions", fontsize=14)
    plt.tight_layout()
    fig4.savefig(REPORT_DIR / "physical_health_eda.png", dpi=150)
    plt.close(fig4)
    print(f"  📊 EDA Plot → ml/reports/physical_health_eda.png")

    # ── Correlation ──
    fig5, ax5 = plt.subplots(figsize=(10, 8))
    corr = X.corr()
    sns.heatmap(corr, annot=True, fmt=".2f", cmap="YlOrRd", ax=ax5, square=True)
    ax5.set_title("Physical Health — Feature Correlation")
    plt.tight_layout()
    fig5.savefig(REPORT_DIR / "physical_health_correlation.png", dpi=150)
    plt.close(fig5)
    print(f"  📊 Correlation → ml/reports/physical_health_correlation.png")

    # ── SHAP ──
    try:
        import shap
        print("\n  Computing SHAP values (XGBoost)...")
        explainer = shap.TreeExplainer(xgb)
        shap_values = explainer.shap_values(Xte_s)
        plt.figure(figsize=(10, 6))
        shap.summary_plot(shap_values, Xte_s, feature_names=X.columns.tolist(), show=False)
        plt.tight_layout()
        plt.savefig(REPORT_DIR / "physical_health_shap_summary.png", dpi=150, bbox_inches="tight")
        plt.close()
        print(f"  📊 SHAP Summary → ml/reports/physical_health_shap_summary.png")
    except Exception as e:
        print(f"  ⚠️ SHAP failed: {e}")

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
#  STEP 5 — SAVE
# ═══════════════════════════════════════════════════════

def save_model(xgb, rf, lr, sc, le, X, metrics):
    """Save ensemble model, scaler, encoder, features."""
    print("\n" + "=" * 60)
    print("  STEP 5 — SAVING MODEL ARTIFACTS")
    print("=" * 60)

    # Save ensemble as a dict
    joblib.dump(
        {"xgb": xgb, "rf": rf, "lr": lr, "weights": [3, 2, 1]},
        MODEL_DIR / "physical_health_ensemble.joblib"
    )
    joblib.dump(sc, MODEL_DIR / "physical_health_scaler.joblib")
    joblib.dump(le, MODEL_DIR / "physical_health_label_encoder.joblib")

    features = list(X.columns)
    with open(MODEL_DIR / "physical_health_features.json", "w") as f:
        json.dump(features, f, indent=2)

    print(f"  ✅ physical_health_ensemble.joblib")
    print(f"  ✅ physical_health_scaler.joblib")
    print(f"  ✅ physical_health_label_encoder.joblib")
    print(f"  ✅ physical_health_features.json")
    print(f"\n  Model saved to: {MODEL_DIR}")


# ═══════════════════════════════════════════════════════
#  MAIN
# ═══════════════════════════════════════════════════════

def main():
    t0 = time.time()

    # Step 1: Load data
    df = load_data()

    # Step 2: Preprocess
    X, y_labels = preprocess(df)

    # Step 3: Train
    xgb, rf, lr, sc, le, cn, X, Xte, Xte_s, yte, yp, ypr, cv_scores = train_model(X, y_labels)

    # Step 4: Evaluate
    metrics = evaluate_model(xgb, cn, X, Xte_s, yte, yp, ypr, cv_scores)

    # Step 5: Save
    save_model(xgb, rf, lr, sc, le, X, metrics)

    # Summary
    print("\n" + "=" * 60)
    print("  PHYSICAL HEALTH MODEL — SUMMARY")
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
