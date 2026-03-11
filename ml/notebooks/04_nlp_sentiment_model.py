#!/usr/bin/env python3
"""
Novelle — NLP Sentiment & Emotion Classification Training
==========================================================
Datasets:
  - goemotions_1.csv (70K rows, 28 emotion columns) → Emotion classifier
  - train.tsv.txt / dev.tsv.txt / test.tsv.txt (SST-2 format) → Sentiment classifier
  - VADER sentiment as baseline feature

Models:
  - Binary Sentiment: TF-IDF + Logistic Regression
  - Multi-label Emotion: TF-IDF + Logistic Regression (OneVsRest)
  - VADER integration for hybrid scoring

Usage:
    cd pregency-friend
    source backend/venv/bin/activate
    python ml/notebooks/04_nlp_sentiment_model.py
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

from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.multiclass import OneVsRestClassifier
from sklearn.preprocessing import MultiLabelBinarizer
from sklearn.metrics import (
    classification_report, accuracy_score, f1_score,
    precision_score, recall_score, roc_auc_score,
    confusion_matrix,
)

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

# Pregnancy-relevant emotion subset
PREGNANCY_EMOTIONS = [
    "admiration", "amusement", "anger", "annoyance", "caring",
    "confusion", "curiosity", "desire", "disappointment", "disapproval",
    "disgust", "embarrassment", "excitement", "fear", "gratitude",
    "grief", "joy", "love", "nervousness", "optimism",
    "pride", "realization", "relief", "remorse", "sadness", "surprise",
    "neutral",
]

# Crisis-related emotions for Novelle's crisis detection
CRISIS_EMOTIONS = ["sadness", "fear", "grief", "remorse", "nervousness", "anger", "disgust"]
POSITIVE_EMOTIONS = ["joy", "love", "optimism", "gratitude", "excitement", "pride", "relief", "caring", "admiration", "amusement"]

print("=" * 60)
print("  NOVELLE — NLP SENTIMENT & EMOTION TRAINING")
print("  Models: TF-IDF + Logistic Regression")
print("=" * 60)


# ═══════════════════════════════════════════════════════
#  PART A — SENTIMENT MODEL (SST-2 Data)
# ═══════════════════════════════════════════════════════

def train_sentiment_model():
    """Train binary sentiment classifier using SST-2 data."""
    print("\n" + "=" * 60)
    print("  PART A — SENTIMENT CLASSIFIER (SST-2)")
    print("=" * 60)
    t0 = time.time()

    # Load SST-2 data
    train_path = NEW_DATASET_DIR / "train.tsv.txt"
    dev_path = NEW_DATASET_DIR / "dev.tsv.txt"
    test_path = NEW_DATASET_DIR / "test.tsv.txt"

    if not train_path.exists():
        print(f"  ⚠️ SST-2 data not found at {train_path}")
        print("  Skipping sentiment model training.")
        return None

    # Load train data (tab-separated: text \t label)
    train_data = []
    with open(train_path, "r", encoding="utf-8") as f:
        for line in f:
            parts = line.strip().split("\t")
            if len(parts) >= 2:
                text = parts[0].strip()
                try:
                    label = int(parts[1].strip())
                    if text and label in (0, 1):
                        train_data.append({"text": text, "label": label})
                except (ValueError, IndexError):
                    continue

    # Load dev data
    dev_data = []
    if dev_path.exists():
        with open(dev_path, "r", encoding="utf-8") as f:
            for line in f:
                parts = line.strip().split("\t")
                if len(parts) >= 2:
                    text = parts[0].strip()
                    try:
                        label = int(parts[1].strip())
                        if text and label in (0, 1):
                            dev_data.append({"text": text, "label": label})
                    except (ValueError, IndexError):
                        continue

    train_df = pd.DataFrame(train_data)
    dev_df = pd.DataFrame(dev_data) if dev_data else pd.DataFrame(columns=["text", "label"])

    print(f"  📂 Train: {len(train_df)} samples")
    print(f"  📂 Dev:   {len(dev_df)} samples")
    print(f"  Label distribution (train): {train_df['label'].value_counts().to_dict()}")
    print(f"    0 = Negative, 1 = Positive")

    # TF-IDF vectorization
    print("\n  Vectorizing with TF-IDF (max 15000 features)...")
    tfidf = TfidfVectorizer(
        max_features=15000, ngram_range=(1, 2),
        min_df=2, max_df=0.95,
        strip_accents="unicode", sublinear_tf=True,
    )

    X_train = tfidf.fit_transform(train_df["text"])
    y_train = train_df["label"].values

    if len(dev_df) > 0:
        X_dev = tfidf.transform(dev_df["text"])
        y_dev = dev_df["label"].values
    else:
        X_train, X_dev, y_train, y_dev = train_test_split(
            X_train, y_train, test_size=0.15, stratify=y_train, random_state=42
        )

    print(f"  TF-IDF features: {X_train.shape[1]}")

    # Train Logistic Regression
    print("  Training Logistic Regression...")
    lr = LogisticRegression(
        max_iter=1000, C=1.0, class_weight="balanced",
        random_state=42, solver="lbfgs",
    )
    lr.fit(X_train, y_train)

    # Evaluate
    y_pred = lr.predict(X_dev)
    y_proba = lr.predict_proba(X_dev)

    acc = accuracy_score(y_dev, y_pred)
    f1 = f1_score(y_dev, y_pred, average="binary")
    try:
        auc = roc_auc_score(y_dev, y_proba[:, 1])
    except:
        auc = 0.0

    print(f"\n  Results on dev set:")
    print(f"  Accuracy:  {acc:.4f}")
    print(f"  F1:        {f1:.4f}")
    print(f"  AUC-ROC:   {auc:.4f}")

    cn = ["Negative", "Positive"]
    print(classification_report(y_dev, y_pred, target_names=cn, zero_division=0))

    # Confusion Matrix
    cm = confusion_matrix(y_dev, y_pred)
    fig, ax = plt.subplots(figsize=(5, 4))
    sns.heatmap(cm, annot=True, fmt="d", cmap="Greens", xticklabels=cn, yticklabels=cn, ax=ax)
    ax.set_xlabel("Predicted"); ax.set_ylabel("Actual")
    ax.set_title("Sentiment — Confusion Matrix")
    plt.tight_layout()
    fig.savefig(REPORT_DIR / "nlp_sentiment_confusion.png", dpi=150)
    plt.close(fig)
    print(f"  📊 Confusion Matrix → ml/reports/nlp_sentiment_confusion.png")

    # Top features
    feature_names = tfidf.get_feature_names_out()
    coefs = lr.coef_[0]
    top_pos = pd.Series(coefs, index=feature_names).nlargest(15)
    top_neg = pd.Series(coefs, index=feature_names).nsmallest(15)

    fig2, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5))
    top_neg.sort_values().plot.barh(ax=ax1, color="#E53935")
    ax1.set_title("Most Negative Words")
    top_pos.sort_values().plot.barh(ax=ax2, color="#43A047")
    ax2.set_title("Most Positive Words")
    plt.suptitle("Sentiment Model — Top Features", fontsize=14)
    plt.tight_layout()
    fig2.savefig(REPORT_DIR / "nlp_sentiment_features.png", dpi=150)
    plt.close(fig2)
    print(f"  📊 Features → ml/reports/nlp_sentiment_features.png")

    # Save
    joblib.dump(lr, MODEL_DIR / "nlp_sentiment_model.joblib")
    joblib.dump(tfidf, MODEL_DIR / "nlp_tfidf_vectorizer.joblib")
    print(f"\n  ✅ nlp_sentiment_model.joblib")
    print(f"  ✅ nlp_tfidf_vectorizer.joblib")
    print(f"  Time: {time.time() - t0:.1f}s")

    return {"accuracy": round(acc, 4), "f1": round(f1, 4), "auc_roc": round(auc, 4)}


# ═══════════════════════════════════════════════════════
#  PART B — EMOTION MODEL (GoEmotions)
# ═══════════════════════════════════════════════════════

def train_emotion_model():
    """Train multi-label emotion classifier using GoEmotions."""
    print("\n" + "=" * 60)
    print("  PART B — EMOTION CLASSIFIER (GoEmotions)")
    print("=" * 60)
    t0 = time.time()

    csv_path = NEW_DATASET_DIR / "goemotions_1.csv"
    if not csv_path.exists():
        print(f"  ⚠️ goemotions_1.csv not found at {csv_path}")
        print("  Skipping emotion model training.")
        return None

    df = pd.read_csv(csv_path)
    print(f"  📂 Loaded: {csv_path.name}")
    print(f"  Shape: {df.shape}")

    # All emotion columns (binary 0/1)
    all_emotion_cols = [c for c in PREGNANCY_EMOTIONS if c in df.columns]
    print(f"  Emotion columns found: {len(all_emotion_cols)}")

    if "text" not in df.columns:
        print(f"  ⚠️ No 'text' column found. Columns: {list(df.columns)[:5]}...")
        print("  Skipping emotion model training.")
        return None

    # Filter rows with at least one emotion labeled
    emotion_sums = df[all_emotion_cols].sum(axis=1)
    df_labeled = df[emotion_sums > 0].copy()
    print(f"  Labeled rows (at least 1 emotion): {len(df_labeled)}")

    # Show emotion distribution
    print("\n  Emotion distribution:")
    for col in sorted(all_emotion_cols, key=lambda c: df_labeled[c].sum(), reverse=True):
        count = df_labeled[col].sum()
        print(f"    {col:>20s}: {count:>5d} ({count/len(df_labeled)*100:.1f}%)")

    # Subsample for faster training (use up to 30K samples)
    if len(df_labeled) > 30000:
        df_labeled = df_labeled.sample(30000, random_state=42)
        print(f"\n  Subsampled to {len(df_labeled)} rows for training speed")

    # Train/test split
    texts = df_labeled["text"].fillna("").values
    y_matrix = df_labeled[all_emotion_cols].values

    X_train_text, X_test_text, y_train, y_test = train_test_split(
        texts, y_matrix, test_size=0.15, random_state=42
    )
    print(f"\n  Train: {len(X_train_text)}, Test: {len(X_test_text)}")

    # TF-IDF
    print("  Vectorizing with TF-IDF (max 20000 features)...")
    tfidf_emo = TfidfVectorizer(
        max_features=20000, ngram_range=(1, 2),
        min_df=3, max_df=0.9,
        strip_accents="unicode", sublinear_tf=True,
    )
    X_train = tfidf_emo.fit_transform(X_train_text)
    X_test = tfidf_emo.transform(X_test_text)
    print(f"  TF-IDF features: {X_train.shape[1]}")

    # Multi-label classifier (OneVsRest)
    print("  Training OneVsRest Logistic Regression...")
    clf = OneVsRestClassifier(
        LogisticRegression(max_iter=500, C=1.0, class_weight="balanced", random_state=42),
        n_jobs=-1,
    )
    clf.fit(X_train, y_train)

    # Evaluate
    y_pred = clf.predict(X_test)

    f1_micro = f1_score(y_test, y_pred, average="micro", zero_division=0)
    f1_macro = f1_score(y_test, y_pred, average="macro", zero_division=0)
    pm = precision_score(y_test, y_pred, average="micro", zero_division=0)
    rm = recall_score(y_test, y_pred, average="micro", zero_division=0)

    print(f"\n  Results:")
    print(f"  F1 (micro):      {f1_micro:.4f}")
    print(f"  F1 (macro):      {f1_macro:.4f}")
    print(f"  Precision (µ):   {pm:.4f}")
    print(f"  Recall (µ):      {rm:.4f}")

    # Per-emotion F1
    print(f"\n  Per-emotion F1 scores:")
    per_emotion_f1 = {}
    for idx, emo in enumerate(all_emotion_cols):
        f1_emo = f1_score(y_test[:, idx], y_pred[:, idx], zero_division=0)
        per_emotion_f1[emo] = round(f1_emo, 4)
        marker = "🟢" if f1_emo >= 0.3 else ("🟡" if f1_emo >= 0.15 else "🔴")
        print(f"    {marker} {emo:>20s}: F1={f1_emo:.4f}  (support={y_test[:, idx].sum():.0f})")

    # ── Emotion Distribution Plot ──
    fig, ax = plt.subplots(figsize=(14, 6))
    emo_counts = pd.Series(
        {emo: df_labeled[emo].sum() for emo in all_emotion_cols}
    ).sort_values(ascending=True)
    colors = ["#E53935" if e in CRISIS_EMOTIONS else "#43A047" if e in POSITIVE_EMOTIONS else "#7B1FA2"
              for e in emo_counts.index]
    emo_counts.plot.barh(ax=ax, color=colors)
    ax.set_title("GoEmotions — Emotion Distribution")
    ax.set_xlabel("Count")
    plt.tight_layout()
    fig.savefig(REPORT_DIR / "nlp_emotion_distribution.png", dpi=150)
    plt.close(fig)
    print(f"\n  📊 Emotion Distribution → ml/reports/nlp_emotion_distribution.png")

    # ── Per-emotion F1 Plot ──
    fig2, ax2 = plt.subplots(figsize=(14, 6))
    f1_series = pd.Series(per_emotion_f1).sort_values(ascending=True)
    colors2 = ["#E53935" if e in CRISIS_EMOTIONS else "#43A047" if e in POSITIVE_EMOTIONS else "#7B1FA2"
               for e in f1_series.index]
    f1_series.plot.barh(ax=ax2, color=colors2)
    ax2.set_title("GoEmotions — Per-Emotion F1 Score")
    ax2.set_xlabel("F1 Score")
    ax2.axvline(x=0.3, color="gray", linestyle="--", alpha=0.5, label="F1=0.3 threshold")
    ax2.legend()
    plt.tight_layout()
    fig2.savefig(REPORT_DIR / "nlp_emotion_f1_scores.png", dpi=150)
    plt.close(fig2)
    print(f"  📊 F1 Scores → ml/reports/nlp_emotion_f1_scores.png")

    # Save
    joblib.dump(clf, MODEL_DIR / "nlp_emotion_model.joblib")
    joblib.dump(tfidf_emo, MODEL_DIR / "nlp_emotion_tfidf.joblib")
    with open(MODEL_DIR / "nlp_emotion_labels.json", "w") as f:
        json.dump(all_emotion_cols, f, indent=2)

    print(f"\n  ✅ nlp_emotion_model.joblib")
    print(f"  ✅ nlp_emotion_tfidf.joblib")
    print(f"  ✅ nlp_emotion_labels.json")
    print(f"  Time: {time.time() - t0:.1f}s")

    return {
        "f1_micro": round(f1_micro, 4),
        "f1_macro": round(f1_macro, 4),
        "precision_micro": round(pm, 4),
        "recall_micro": round(rm, 4),
        "per_emotion_f1": per_emotion_f1,
    }


# ═══════════════════════════════════════════════════════
#  PART C — VADER BASELINE
# ═══════════════════════════════════════════════════════

def verify_vader():
    """Verify VADER sentiment analyzer is available."""
    print("\n" + "=" * 60)
    print("  PART C — VADER BASELINE VERIFICATION")
    print("=" * 60)

    try:
        from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
        sid = SentimentIntensityAnalyzer()

        test_texts = [
            "I'm feeling so happy and grateful today!",
            "I'm scared about my pregnancy complications.",
            "The doctor said everything is normal.",
            "I can't stop crying, I feel so alone.",
            "My baby kicked for the first time!",
        ]

        print("\n  VADER test results:")
        for text in test_texts:
            scores = sid.polarity_scores(text)
            label = "Positive" if scores["compound"] >= 0.05 else ("Negative" if scores["compound"] <= -0.05 else "Neutral")
            print(f"    [{label:>8s}] (compound={scores['compound']:+.3f}) {text[:60]}")

        print("\n  ✅ VADER is available and working")
        return True
    except ImportError:
        print("  ⚠️ vaderSentiment not installed. Run: pip install vaderSentiment")
        return False


# ═══════════════════════════════════════════════════════
#  MAIN
# ═══════════════════════════════════════════════════════

def main():
    t0 = time.time()

    all_metrics = {}

    # Part A: Sentiment
    sentiment_metrics = train_sentiment_model()
    if sentiment_metrics:
        all_metrics["sentiment"] = sentiment_metrics

    # Part B: Emotion
    emotion_metrics = train_emotion_model()
    if emotion_metrics:
        all_metrics["emotion"] = emotion_metrics

    # Part C: VADER verification
    verify_vader()

    # Save combined metrics
    with open(REPORT_DIR / "nlp_evaluation_metrics.json", "w") as f:
        json.dump(all_metrics, f, indent=2)

    # Summary
    print("\n" + "=" * 60)
    print("  NLP MODELS — SUMMARY")
    print("=" * 60)
    if "sentiment" in all_metrics:
        sm = all_metrics["sentiment"]
        print(f"\n  Sentiment (SST-2):")
        print(f"    Accuracy: {sm['accuracy']}")
        print(f"    F1:       {sm['f1']}")
        print(f"    AUC-ROC:  {sm['auc_roc']}")
    if "emotion" in all_metrics:
        em = all_metrics["emotion"]
        print(f"\n  Emotion (GoEmotions):")
        print(f"    F1 (micro): {em['f1_micro']}")
        print(f"    F1 (macro): {em['f1_macro']}")

    print(f"\n  Total time: {time.time() - t0:.1f}s")
    print(f"  ⚠️ These models are for journal sentiment analysis — NOT medical diagnoses.")


if __name__ == "__main__":
    main()
