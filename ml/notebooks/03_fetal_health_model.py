#!/usr/bin/env python3
"""
Novelle — Fetal Health Risk Model Training (LightGBM + SMOTE)
=============================================================
Dataset: fetal_health.csv (2126 CTG records, 21 features)
Target:  fetal_health (1=Normal, 2=Suspect, 3=Pathological) → LOW / MEDIUM / HIGH
Model:   LightGBM Classifier

Usage:
    cd pregency-friend
    source backend/venv/bin/activate
    python ml/notebooks/03_fetal_health_model.py
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
from lightgbm import LGBMClassifier
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
print("  NOVELLE — FETAL HEALTH MODEL TRAINING")
print("  Algorithm: LightGBM + SMOTE")
print("  Dataset: Fetal Health Classification (CTG)")
print("=" * 60)


# ═══════════════════════════════════════════════════════
#  STEP 1 — LOAD DATA
# ═══════════════════════════════════════════════════════

def load_data():
    """Load the Fetal Health Classification dataset (CTG data)."""
    print("\n" + "─" * 60)
    print("  STEP 1 — LOADING DATA")
    print("─" * 60)

    csv_path = DATASET_DIR / "fetal_health.csv"
    if not csv_path.exists():
        raise FileNotFoundError(f"fetal_health.csv not found at {csv_path}")

    df = pd.read_csv(csv_path)
    print(f"  📂 Loaded: {csv_path.name}")
    print(f"  Shape: {df.shape}")
    print(f"  Columns ({len(df.columns)}):")
    for col in df.columns:
        print(f"    - {col}: {df[col].dtype} | range [{df[col].min():.2f}, {df[col].max():.2f}]")
    
    print(f"\n  fetal_health distribution:")
    print(f"  {df['fetal_health'].value_counts().sort_index().to_dict()}")
    print(f"    1.0 = Normal, 2.0 = Suspect, 3.0 = Pathological")

    return df


# ═══════════════════════════════════════════════════════
#  STEP 2 — PREPROCESSING
# ═══════════════════════════════════════════════════════

def preprocess(df):
    """Clean data and map targets."""
    print("\n" + "─" * 60)
    print("  STEP 2 — PREPROCESSING")
    print("─" * 60)

    # Target mapping: 1→LOW, 2→MEDIUM, 3→HIGH
    target_map = {1.0: "LOW", 2.0: "MEDIUM", 3.0: "HIGH"}
    df["risk_label"] = df["fetal_health"].map(target_map)

    # Features = everything except the target columns
    feature_cols = [c for c in df.columns if c not in ["fetal_health", "risk_label"]]
    X = df[feature_cols].copy()
    y_labels = df["risk_label"].values

    # Handle any missing values
    X = X.fillna(X.median())

    print(f"  Features ({len(feature_cols)}):")
    for col in feature_cols:
        print(f"    {col}")
    print(f"\n  Class distribution:")
    for label, count in pd.Series(y_labels).value_counts().items():
        print(f"    {label}: {count} ({count/len(y_labels)*100:.1f}%)")

    # Check for class imbalance
    counts = pd.Series(y_labels).value_counts()
    imbalance_ratio = counts.max() / counts.min()
    print(f"\n  Imbalance ratio: {imbalance_ratio:.1f}x")
    if imbalance_ratio > 5:
        print(f"  ⚠️ Significant class imbalance detected — SMOTE will help")

    return X, y_labels, feature_cols


# ═══════════════════════════════════════════════════════
#  STEP 3 — MODEL TRAINING
# ═══════════════════════════════════════════════════════

def train_model(X, y_labels, feature_cols):
    """Train LightGBM with SMOTE."""
    print("\n" + "=" * 60)
    print("  STEP 3 — MODEL TRAINING (LightGBM + SMOTE)")
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

    # LightGBM
    mdl = LGBMClassifier(
        n_estimators=400, max_depth=7, learning_rate=0.05,
        num_leaves=31, min_child_samples=5,
        subsample=0.8, colsample_bytree=0.8,
        reg_alpha=0.1, reg_lambda=1.0,
        is_unbalance=True, random_state=42, verbose=-1,
    )
    mdl.fit(Xtr_r, ytr_r)

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

    return mdl, sc, le, cn, X, Xte, Xte_s, yte, yp, ypr, cv_scores


# ═══════════════════════════════════════════════════════
#  STEP 4 — EVALUATION
# ═══════════════════════════════════════════════════════

def evaluate_model(mdl, cn, X, Xte_s, yte, yp, ypr, cv_scores):
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

    # Per-class recall
    for i, c in enumerate(cn):
        mask = yte == i
        if mask.sum() > 0:
            recall_c = (yp[mask] == i).sum() / mask.sum()
            print(f"  Recall ({c:>6s}):    {recall_c:.4f}  (n={mask.sum()})")

    # ── Confusion Matrix ──
    cm = confusion_matrix(yte, yp)
    fig, ax = plt.subplots(figsize=(6, 5))
    sns.heatmap(cm, annot=True, fmt="d", cmap="BuPu", xticklabels=cn, yticklabels=cn, ax=ax)
    ax.set_xlabel("Predicted")
    ax.set_ylabel("Actual")
    ax.set_title("Fetal Health Risk — Confusion Matrix")
    plt.tight_layout()
    fig.savefig(REPORT_DIR / "fetal_health_confusion_matrix.png", dpi=150)
    plt.close(fig)
    print(f"\n  📊 Confusion Matrix → ml/reports/fetal_health_confusion_matrix.png")

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
    ax2.set_title("Fetal Health Risk — ROC Curves (OvR)")
    ax2.legend(loc="lower right")
    plt.tight_layout()
    fig2.savefig(REPORT_DIR / "fetal_health_roc.png", dpi=150)
    plt.close(fig2)
    print(f"  📊 ROC Curves → ml/reports/fetal_health_roc.png")

    # ── Feature Importance ──
    fi = pd.Series(mdl.feature_importances_, index=X.columns).sort_values(ascending=True)
    fig3, ax3 = plt.subplots(figsize=(8, max(4, len(fi) * 0.35)))
    fi.plot.barh(ax=ax3, color="#7B1FA2")
    ax3.set_title("Fetal Health Risk — Feature Importance (LightGBM)")
    plt.tight_layout()
    fig3.savefig(REPORT_DIR / "fetal_health_feature_importance.png", dpi=150)
    plt.close(fig3)
    print(f"  📊 Feature Importance → ml/reports/fetal_health_feature_importance.png")

    print("\n  Top features:")
    for fn, fv in fi.sort_values(ascending=False).head(8).items():
        print(f"    {fn:>55s}  {fv:.0f}")

    # ── EDA: CTG Feature Distributions ──
    n_feats = min(len(X.columns), 21)
    n_rows = (n_feats + 4) // 5
    fig4, axes = plt.subplots(n_rows, 5, figsize=(20, n_rows * 3))
    axes_flat = axes.flatten()
    for idx, col in enumerate(X.columns[:n_feats]):
        ax = axes_flat[idx]
        ax.hist(X[col].values, bins=30, color="#7B1FA2", alpha=0.7, edgecolor="white")
        ax.set_title(col[:25], fontsize=8)
    # Hide empty subplots
    for idx in range(n_feats, len(axes_flat)):
        axes_flat[idx].set_visible(False)
    plt.suptitle("Fetal Health — CTG Feature Distributions", fontsize=14)
    plt.tight_layout()
    fig4.savefig(REPORT_DIR / "fetal_health_eda.png", dpi=150)
    plt.close(fig4)
    print(f"  📊 EDA Plot → ml/reports/fetal_health_eda.png")

    # ── CTG Feature Pairplot (Top 5 features) ──
    top5 = fi.sort_values(ascending=False).head(5).index.tolist()
    fig5, ax5 = plt.subplots(figsize=(8, 6))
    corr_subset = X[top5].corr()
    sns.heatmap(corr_subset, annot=True, fmt=".2f", cmap="BuPu", ax=ax5, square=True)
    ax5.set_title("Fetal Health — Top 5 Feature Correlation")
    plt.tight_layout()
    fig5.savefig(REPORT_DIR / "fetal_ctg_features.png", dpi=150)
    plt.close(fig5)
    print(f"  📊 CTG Features → ml/reports/fetal_ctg_features.png")

    # ── SHAP ──
    try:
        import shap
        print("\n  Computing SHAP values...")
        explainer = shap.TreeExplainer(mdl)
        shap_values = explainer.shap_values(Xte_s)
        plt.figure(figsize=(12, 8))
        shap.summary_plot(shap_values, Xte_s, feature_names=X.columns.tolist(), show=False)
        plt.tight_layout()
        plt.savefig(REPORT_DIR / "fetal_health_shap_summary.png", dpi=150, bbox_inches="tight")
        plt.close()
        print(f"  📊 SHAP Summary → ml/reports/fetal_health_shap_summary.png")
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

def save_model(mdl, sc, le, X, metrics):
    """Save model artifacts."""
    print("\n" + "=" * 60)
    print("  STEP 5 — SAVING MODEL ARTIFACTS")
    print("=" * 60)

    joblib.dump(mdl, MODEL_DIR / "fetal_health_lgbm.joblib")
    joblib.dump(sc, MODEL_DIR / "fetal_health_scaler.joblib")
    joblib.dump(le, MODEL_DIR / "fetal_health_label_encoder.joblib")

    features = list(X.columns)
    with open(MODEL_DIR / "fetal_health_features.json", "w") as f:
        json.dump(features, f, indent=2)

    print(f"  ✅ fetal_health_lgbm.joblib")
    print(f"  ✅ fetal_health_scaler.joblib")
    print(f"  ✅ fetal_health_label_encoder.joblib")
    print(f"  ✅ fetal_health_features.json")
    print(f"\n  Model saved to: {MODEL_DIR}")


# ═══════════════════════════════════════════════════════
#  MAIN
# ═══════════════════════════════════════════════════════

def main():
    t0 = time.time()

    # Step 1: Load data
    df = load_data()

    # Step 2: Preprocess
    X, y_labels, feature_cols = preprocess(df)

    # Step 3: Train
    mdl, sc, le, cn, X, Xte, Xte_s, yte, yp, ypr, cv_scores = train_model(X, y_labels, feature_cols)

    # Step 4: Evaluate
    metrics = evaluate_model(mdl, cn, X, Xte_s, yte, yp, ypr, cv_scores)

    # Step 5: Save
    save_model(mdl, sc, le, X, metrics)

    # Summary
    print("\n" + "=" * 60)
    print("  FETAL HEALTH MODEL — SUMMARY")
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
