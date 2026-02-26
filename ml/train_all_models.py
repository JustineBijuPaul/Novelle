#!/usr/bin/env python3
"""
Novelle — Complete Model Training Pipeline v2 (Balanced)
========================================================
Generates balanced synthetic maternal health data, trains 3 risk models
with SMOTE + class weights, evaluates with full metrics, SHAP, and saves
serialized models + plots + evaluation report.

Usage:
    cd pregency-friend
    source backend/venv/bin/activate
    python ml/train_all_models.py
"""

import os, sys, json, warnings, time, random
from pathlib import Path
from datetime import datetime, timedelta

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
from sklearn.ensemble import VotingClassifier, RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.utils.class_weight import compute_sample_weight
from xgboost import XGBClassifier
from lightgbm import LGBMClassifier
from imblearn.over_sampling import SMOTE

warnings.filterwarnings("ignore")
np.random.seed(42)
random.seed(42)

ROOT = Path(__file__).resolve().parent.parent
DATASET_DIR = ROOT / "ml" / "datasets"
MODEL_DIR = ROOT / "backend" / "app" / "ml" / "models"
REPORT_DIR = ROOT / "ml" / "reports"

for d in [DATASET_DIR, MODEL_DIR, REPORT_DIR]:
    d.mkdir(parents=True, exist_ok=True)

REPORT = []

def log(msg):
    print(msg)
    REPORT.append(msg)


# ════════════════════════════════════════════════════
#  DATA GENERATION (BALANCED CLASSES)
# ════════════════════════════════════════════════════

def generate_data():
    log("\n" + "="*60)
    log("  STEP 1 — BALANCED SYNTHETIC DATA GENERATION")
    log("="*60)

    N = 3000
    DAYS = 14
    ASSESS = 10

    profiles, hlogs, massess = [], [], []

    # Assign risk categories: ~40% LOW, ~35% MEDIUM, ~25% HIGH
    risk_list = ["low"]*1200 + ["medium"]*1050 + ["high"]*750
    random.shuffle(risk_list)

    for i, rt in enumerate(risk_list):
        uid = i + 1

        # Profile params driven by target risk
        if rt == "high":
            age = random.choice(list(range(16,19)) + list(range(36,43)))
            hemo = round(max(5, np.random.normal(8.5, 1.5)), 1)
            gd = random.random() < 0.5
            ch = random.random() < 0.4
            pp = random.randint(2, 5)
            pc = random.sample(["preeclampsia","prom","miscarriage","preterm","c-section"], k=random.randint(2,4))
        elif rt == "medium":
            age = random.choice(list(range(19,22)) + list(range(33,37)))
            hemo = round(max(7, np.random.normal(10.5, 1.0)), 1)
            gd = random.random() < 0.25
            ch = random.random() < 0.2
            pp = random.randint(1, 3)
            pc = random.sample(["preeclampsia","prom","miscarriage","preterm","c-section","gestational_diabetes"], k=random.randint(1,2))
        else:
            age = random.randint(22, 32)
            hemo = round(min(16, np.random.normal(12.5, 0.8)), 1)
            gd = random.random() < 0.05
            ch = random.random() < 0.03
            pp = random.randint(0, 1)
            pc = random.sample(["c-section","gestational_diabetes"], k=random.randint(0,1))

        h = np.random.normal(158, 6)
        w = np.random.normal(60 if rt=="low" else 72, 10)
        bmi = w / ((h/100)**2)
        week = random.randint(1, 42)

        profiles.append({
            "user_id": uid, "age": age,
            "height_cm": round(h,1), "weight_kg": round(w,1), "bmi": round(bmi,1),
            "pregnancy_week": week,
            "trimester": "first" if week<=12 else ("second" if week<=27 else "third"),
            "blood_group": random.choice(["A+","A-","B+","B-","O+","O-","AB+","AB-"]),
            "previous_pregnancies": pp,
            "hemoglobin_level": hemo,
            "gestational_diabetes": gd,
            "thyroid_disorder": np.random.choice(["none","hypothyroid","hyperthyroid"], p=[.85,.12,.03]),
            "chronic_hypertension": ch,
            "past_complications": json.dumps(pc),
        })

        # Vitals driven by risk
        bp_sys_b = {"high": random.randint(145,165), "medium": random.randint(130,140), "low": random.randint(105,125)}[rt]
        bp_dia_b = {"high": random.randint(92,110), "medium": random.randint(85,90), "low": random.randint(65,80)}[rt]
        sug_b = {"high": random.randint(105,140) if gd else random.randint(95,115),
                 "medium": random.randint(95,105), "low": random.randint(75,90)}[rt]

        for d in range(DAYS):
            hlogs.append({
                "user_id": uid,
                "log_date": (datetime.now() - timedelta(days=DAYS-d)).date().isoformat(),
                "bp_systolic": int(np.random.normal(bp_sys_b, 8)),
                "bp_diastolic": int(np.random.normal(bp_dia_b, 6)),
                "blood_sugar_fasting": round(np.random.normal(sug_b, 12), 1),
                "blood_sugar_postmeal": round(np.random.normal(sug_b+30, 15), 1),
                "weight_kg": round(w + np.random.normal(.3,.2)*(week/10), 1),
                "sleep_quality": int(np.clip(np.random.normal({"high":2.2,"medium":3.0,"low":3.8}[rt], 0.8), 1, 5)),
                "pain_score": int(np.clip(np.random.normal({"high":5,"medium":3,"low":1.5}[rt], 2), 0, 10)),
                "nausea_count": max(0, int(np.random.normal(2 if week<=14 else .5, 1.5))),
                "dizziness": random.random() < (0.3 if hemo < 9 else 0.05),
                "edema_flag": random.random() < ({"high":.6,"medium":.3,"low":.08}[rt] if week>=25 else 0.05),
                "bleeding_flag": random.random() < {"high":.1,"medium":.04,"low":.01}[rt],
                "cramps_flag": random.random() < {"high":.4,"medium":.2,"low":.08}[rt],
                "cramps_intensity": int(np.clip(np.random.normal({"high":5,"medium":3,"low":1}[rt], 2), 0, 10)),
                "fetal_movement_count": max(0, int(np.random.normal({"high":4,"medium":8,"low":12}[rt], 3))) if week>=20 else 0,
                "appetite_score": int(np.clip(np.random.normal({"high":2.5,"medium":3.2,"low":4}[rt], 0.8), 1, 5)),
                "hydration_ml": random.randint(800, 2500),
                "pregnancy_week": week,
            })

        # Mental assessments driven by risk
        for d in range(ASSESS):
            phq9 = max(0, min(27, int(np.random.normal({"high":16,"medium":10,"low":4}[rt], 4))))
            gad7 = max(0, min(21, int(np.random.normal({"high":14,"medium":8,"low":3}[rt], 3))))
            mood = max(1, min(10, int(np.random.normal({"high":3,"medium":5,"low":7}[rt], 1.5))))
            stress = max(1, min(10, int(np.random.normal({"high":8,"medium":5.5,"low":3}[rt], 1.5))))
            massess.append({
                "user_id": uid,
                "assessment_date": (datetime.now() - timedelta(days=ASSESS-d)).date().isoformat(),
                "phq9_score": phq9, "gad7_score": gad7,
                "mood_score": mood, "stress_level": stress,
                "social_support_score": int(np.clip(np.random.normal({"high":1.8,"medium":2.8,"low":4}[rt], 0.8), 1, 5)),
                "assessment_type": random.choice(["daily","weekly_phq9","weekly_gad7"]),
            })

    prof_df = pd.DataFrame(profiles)
    health_df = pd.DataFrame(hlogs)
    mental_df = pd.DataFrame(massess)

    # Apply rule-based labels
    def mental_lbl(r):
        pts = 0
        if r["phq9_score"] >= 15: pts += 3
        elif r["phq9_score"] >= 10: pts += 2
        if r["gad7_score"] >= 15: pts += 3
        elif r["gad7_score"] >= 10: pts += 2
        if r["mood_score"] <= 3: pts += 2
        if r["stress_level"] >= 8: pts += 2
        return "HIGH" if pts >= 6 else ("MEDIUM" if pts >= 3 else "LOW")

    def phys_lbl(r, hemo_val):
        pts = 0
        if r["bp_systolic"] >= 160 or r["bp_diastolic"] >= 110: pts += 3
        elif r["bp_systolic"] >= 140 or r["bp_diastolic"] >= 90: pts += 2
        if r["blood_sugar_fasting"] >= 126: pts += 3
        elif r["blood_sugar_fasting"] >= 100: pts += 1
        if hemo_val < 7: pts += 3
        elif hemo_val < 11: pts += 1
        if r["edema_flag"]: pts += 0.5
        if r["bleeding_flag"]: pts += 1
        return "HIGH" if pts >= 5 else ("MEDIUM" if pts >= 2 else "LOW")

    def fetal_lbl(r, p):
        pts = 0
        if p["age"] >= 35: pts += 1
        if p["age"] < 18: pts += 2
        if r["fetal_movement_count"] < 4 and r["pregnancy_week"] >= 28: pts += 3
        past = json.loads(p["past_complications"]) if isinstance(p["past_complications"], str) else []
        if "preterm" in past: pts += 2
        if p["chronic_hypertension"]: pts += 1
        if p["hemoglobin_level"] < 9: pts += 1
        if r["bleeding_flag"]: pts += 1
        return "HIGH" if pts >= 4 else ("MEDIUM" if pts >= 2 else "LOW")

    mental_df["risk_label"] = mental_df.apply(mental_lbl, axis=1)

    pl, fl = [], []
    for _, r in health_df.iterrows():
        p = prof_df[prof_df["user_id"] == r["user_id"]].iloc[0]
        pl.append(phys_lbl(r, p["hemoglobin_level"]))
        fl.append(fetal_lbl(r, p))
    health_df["physical_risk_label"] = pl
    health_df["fetal_risk_label"] = fl

    prof_df.to_csv(DATASET_DIR / "synthetic_profiles.csv", index=False)
    health_df.to_csv(DATASET_DIR / "synthetic_health_logs.csv", index=False)
    mental_df.to_csv(DATASET_DIR / "synthetic_mental_health.csv", index=False)

    log(f"  ✅ {len(prof_df):,} profiles, {len(health_df):,} health logs, {len(mental_df):,} assessments")
    log(f"  Mental risk:   {mental_df['risk_label'].value_counts().to_dict()}")
    log(f"  Physical risk: {health_df['physical_risk_label'].value_counts().to_dict()}")
    log(f"  Fetal risk:    {health_df['fetal_risk_label'].value_counts().to_dict()}")
    return prof_df, health_df, mental_df


# ════════════════════════════════════════════════════
#  EVALUATION TOOLKIT
# ════════════════════════════════════════════════════

def evaluate(y_true, y_pred, y_proba, cn, name, X_df=None, model=None):
    log(f"\n{'─'*60}")
    log(f"  {name} — EVALUATION")
    log(f"{'─'*60}")

    rpt = classification_report(y_true, y_pred, target_names=cn, output_dict=True, zero_division=0)
    log(classification_report(y_true, y_pred, target_names=cn, zero_division=0))

    acc = accuracy_score(y_true, y_pred)
    f1m = f1_score(y_true, y_pred, average="macro", zero_division=0)
    f1w = f1_score(y_true, y_pred, average="weighted", zero_division=0)
    pm = precision_score(y_true, y_pred, average="macro", zero_division=0)
    rm = recall_score(y_true, y_pred, average="macro", zero_division=0)
    try:
        auc = roc_auc_score(y_true, y_proba, multi_class="ovr", average="macro")
    except:
        auc = 0.0

    log(f"  Accuracy:           {acc:.4f}")
    log(f"  F1 (macro):         {f1m:.4f}")
    log(f"  F1 (weighted):      {f1w:.4f}")
    log(f"  Precision (macro):  {pm:.4f}")
    log(f"  Recall (macro):     {rm:.4f}")
    log(f"  AUC-ROC (macro):    {auc:.4f}")

    for i, c in enumerate(cn):
        mask = y_true == i
        if mask.sum() > 0:
            log(f"  Recall ({c:>6s}):    {(y_pred[mask]==i).sum()/mask.sum():.4f}  (n={mask.sum()})")

    # Confusion matrix
    cm = confusion_matrix(y_true, y_pred)
    fig, ax = plt.subplots(figsize=(5,4))
    sns.heatmap(cm, annot=True, fmt="d", cmap="Blues", xticklabels=cn, yticklabels=cn, ax=ax)
    ax.set_xlabel("Predicted"); ax.set_ylabel("Actual")
    ax.set_title(f"{name} — Confusion Matrix")
    plt.tight_layout()
    fig.savefig(REPORT_DIR / f"{name.lower().replace(' ','_')}_confusion.png", dpi=120)
    plt.close(fig)

    # ROC curves
    if y_proba is not None and len(cn) >= 2:
        fig2, ax2 = plt.subplots(figsize=(6,5))
        for i, c in enumerate(cn):
            bt = (y_true == i).astype(int)
            if y_proba.shape[1] > i:
                fpr, tpr, _ = roc_curve(bt, y_proba[:, i])
                ax2.plot(fpr, tpr, label=f"{c} (AUC={sk_auc(fpr, tpr):.3f})")
        ax2.plot([0,1],[0,1], "k--", alpha=.3)
        ax2.set_xlabel("FPR"); ax2.set_ylabel("TPR")
        ax2.set_title(f"{name} — ROC Curves (OvR)")
        ax2.legend(loc="lower right")
        plt.tight_layout()
        fig2.savefig(REPORT_DIR / f"{name.lower().replace(' ','_')}_roc.png", dpi=120)
        plt.close(fig2)

    # Feature importance
    if model and X_df is not None:
        imp = None
        if hasattr(model, "feature_importances_"):
            imp = model.feature_importances_
        elif hasattr(model, "named_estimators_"):
            for _, est in model.named_estimators_.items():
                if hasattr(est, "feature_importances_"):
                    imp = est.feature_importances_; break
        if imp is not None:
            fi = pd.Series(imp, index=X_df.columns).sort_values(ascending=True)
            fig3, ax3 = plt.subplots(figsize=(6, max(3, len(fi)*0.35)))
            fi.plot.barh(ax=ax3, color="steelblue")
            ax3.set_title(f"{name} — Feature Importance")
            plt.tight_layout()
            fig3.savefig(REPORT_DIR / f"{name.lower().replace(' ','_')}_importance.png", dpi=120)
            plt.close(fig3)
            log(f"\n  Top Features:")
            for fn, fv in fi.sort_values(ascending=False).head(5).items():
                log(f"    {fn:>30s}  {fv:.4f}")

    m = {
        "accuracy": round(acc,4), "f1_macro": round(f1m,4), "f1_weighted": round(f1w,4),
        "precision_macro": round(pm,4), "recall_macro": round(rm,4), "auc_roc_macro": round(auc,4),
        "per_class": {c: {"precision": round(rpt[c]["precision"],4), "recall": round(rpt[c]["recall"],4),
                          "f1": round(rpt[c]["f1-score"],4), "support": int(rpt[c]["support"])}
                      for c in cn if c in rpt},
    }
    return m


def cv(model, X, y):
    s = cross_val_score(model, X, y, cv=StratifiedKFold(5, shuffle=True, random_state=42), scoring="f1_macro")
    log(f"  Cross-Val F1-macro (5-fold): {s.mean():.4f} ± {s.std():.4f}")
    return {"mean": round(s.mean(),4), "std": round(s.std(),4), "folds": [round(x,4) for x in s]}


# ════════════════════════════════════════════════════
#  TRAIN MENTAL HEALTH
# ════════════════════════════════════════════════════

def train_mental(prof_df, health_df, mental_df):
    log("\n" + "="*60)
    log("  STEP 2 — MENTAL HEALTH (XGBoost + SMOTE)")
    log("="*60)
    t0 = time.time()

    feats, labels = [], []
    for uid in mental_df["user_id"].unique():
        um = mental_df[mental_df["user_id"]==uid].sort_values("assessment_date")
        uh = health_df[health_df["user_id"]==uid].sort_values("log_date")
        if len(um)<3 or len(uh)<3: continue
        l7m, l7h = um.tail(7), uh.tail(7)
        lt = um.iloc[-1]
        p = prof_df[prof_df["user_id"]==uid].iloc[0]
        pc = json.loads(p["past_complications"]) if isinstance(p["past_complications"], str) else []

        sentiment_map = {"HIGH": -0.4, "MEDIUM": -0.1, "LOW": 0.3}
        feats.append({
            "phq9_score": lt["phq9_score"], "gad7_score": lt["gad7_score"],
            "mood_avg_7d": l7m["mood_score"].mean(),
            "sleep_avg_7d": l7h["sleep_quality"].mean(),
            "stress_avg_7d": l7m["stress_level"].mean(),
            "social_support": lt["social_support_score"],
            "journal_sentiment_avg": round(np.random.normal(sentiment_map.get(lt["risk_label"],0), 0.15), 2),
            "previous_mental_history": 1 if len(pc)>2 else 0,
        })
        labels.append(lt["risk_label"])

    X = pd.DataFrame(feats)
    le = LabelEncoder(); y = le.fit_transform(labels); cn = list(le.classes_)
    log(f"  Samples={len(X)}  Classes={dict(zip(cn, np.bincount(y)))}")

    Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)
    sc = StandardScaler(); Xtr_s = sc.fit_transform(Xtr); Xte_s = sc.transform(Xte)

    sm = SMOTE(random_state=42, k_neighbors=3)
    Xtr_r, ytr_r = sm.fit_resample(Xtr_s, ytr)
    log(f"  After SMOTE: {dict(zip(cn, np.bincount(ytr_r)))}")

    sw = compute_sample_weight("balanced", ytr_r)
    mdl = XGBClassifier(n_estimators=300, max_depth=6, learning_rate=0.08,
        subsample=0.8, colsample_bytree=0.8, min_child_weight=2,
        reg_alpha=0.1, reg_lambda=1.0, random_state=42,
        eval_metric="mlogloss")
    mdl.fit(Xtr_r, ytr_r, sample_weight=sw, verbose=False)

    yp = mdl.predict(Xte_s); ypr = mdl.predict_proba(Xte_s)
    m = evaluate(yte, yp, ypr, cn, "Mental Health", pd.DataFrame(Xte_s, columns=X.columns), mdl)
    m["cross_validation"] = cv(mdl, Xtr_r, ytr_r)

    joblib.dump(mdl, MODEL_DIR / "mental_health_xgb.joblib")
    joblib.dump(sc, MODEL_DIR / "mental_health_scaler.joblib")
    joblib.dump(le, MODEL_DIR / "mental_health_label_encoder.joblib")
    log(f"  ✅ Saved. Time: {time.time()-t0:.1f}s")
    return m


# ════════════════════════════════════════════════════
#  TRAIN PHYSICAL HEALTH
# ════════════════════════════════════════════════════

def train_physical(prof_df, health_df):
    log("\n" + "="*60)
    log("  STEP 3 — PHYSICAL HEALTH (Ensemble + SMOTE)")
    log("="*60)
    t0 = time.time()

    feats, labels = [], []
    for uid in prof_df["user_id"].unique():
        p = prof_df[prof_df["user_id"]==uid].iloc[0]
        uh = health_df[health_df["user_id"]==uid].sort_values("log_date")
        if len(uh)<5: continue
        l7 = uh.tail(7)
        bpv = l7["bp_systolic"].values
        bps = np.polyfit(range(len(bpv)), bpv, 1)[0] if len(bpv)>=2 else 0.0
        pc = json.loads(p["past_complications"]) if isinstance(p["past_complications"], str) else []

        feats.append({
            "bp_systolic_avg": l7["bp_systolic"].mean(),
            "bp_diastolic_avg": l7["bp_diastolic"].mean(),
            "bp_slope": round(bps, 2),
            "sugar_fasting_avg": l7["blood_sugar_fasting"].mean(),
            "sugar_postmeal_avg": l7["blood_sugar_postmeal"].mean(),
            "sugar_variability": l7["blood_sugar_fasting"].std(),
            "weight_deviation": round(l7["weight_kg"].iloc[-1] - p["weight_kg"], 1),
            "hemoglobin": p["hemoglobin_level"],
            "edema_frequency": l7["edema_flag"].mean(),
            "pain_frequency": (l7["pain_score"]>5).mean(),
            "age": p["age"], "bmi": p["bmi"],
            "pregnancy_week": p["pregnancy_week"],
            "past_complications_count": len(pc),
        })
        labels.append(uh.iloc[-1]["physical_risk_label"])

    X = pd.DataFrame(feats)
    le = LabelEncoder(); y = le.fit_transform(labels); cn = list(le.classes_)
    log(f"  Samples={len(X)}  Classes={dict(zip(cn, np.bincount(y)))}")

    Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)
    sc = StandardScaler(); Xtr_s = sc.fit_transform(Xtr); Xte_s = sc.transform(Xte)

    sm = SMOTE(random_state=42, k_neighbors=3)
    Xtr_r, ytr_r = sm.fit_resample(Xtr_s, ytr)
    log(f"  After SMOTE: {dict(zip(cn, np.bincount(ytr_r)))}")

    xgb = XGBClassifier(n_estimators=300, max_depth=6, learning_rate=0.08,
        subsample=0.8, colsample_bytree=0.8, random_state=42,
        eval_metric="mlogloss")
    rf = RandomForestClassifier(n_estimators=200, max_depth=8, class_weight="balanced", random_state=42)
    lr = LogisticRegression(max_iter=1000, class_weight="balanced", random_state=42)

    # Train individually and do weighted soft-vote (avoids sklearn VotingClassifier compat issues)
    xgb.fit(Xtr_r, ytr_r); rf.fit(Xtr_r, ytr_r); lr.fit(Xtr_r, ytr_r)
    w = np.array([3, 2, 1], dtype=float); w /= w.sum()
    ypr = w[0]*xgb.predict_proba(Xte_s) + w[1]*rf.predict_proba(Xte_s) + w[2]*lr.predict_proba(Xte_s)
    yp = np.argmax(ypr, axis=1)

    # Use XGBoost (highest weight) as the primary model for saving & CV
    m = evaluate(yte, yp, ypr, cn, "Physical Health", pd.DataFrame(Xte_s, columns=X.columns), xgb)
    m["cross_validation"] = cv(xgb, Xtr_r, ytr_r)

    joblib.dump({"xgb": xgb, "rf": rf, "lr": lr, "weights": [3,2,1]}, MODEL_DIR / "physical_health_ensemble.joblib")
    joblib.dump(sc, MODEL_DIR / "physical_health_scaler.joblib")
    joblib.dump(le, MODEL_DIR / "physical_health_label_encoder.joblib")
    log(f"  ✅ Saved. Time: {time.time()-t0:.1f}s")
    return m


# ════════════════════════════════════════════════════
#  TRAIN FETAL HEALTH
# ════════════════════════════════════════════════════

def train_fetal(prof_df, health_df):
    log("\n" + "="*60)
    log("  STEP 4 — FETAL HEALTH (LightGBM + SMOTE)")
    log("="*60)
    t0 = time.time()

    feats, labels = [], []
    for uid in prof_df["user_id"].unique():
        p = prof_df[prof_df["user_id"]==uid].iloc[0]
        uh = health_df[health_df["user_id"]==uid].sort_values("log_date")
        if len(uh)<5: continue
        l7 = uh.tail(7)
        pc = json.loads(p["past_complications"]) if isinstance(p["past_complications"], str) else []

        feats.append({
            "fetal_movement_avg": l7["fetal_movement_count"].mean(),
            "fetal_movement_min": l7["fetal_movement_count"].min(),
            "maternal_age": p["age"], "pregnancy_week": p["pregnancy_week"],
            "bmi": p["bmi"],
            "previous_preterm": 1 if "preterm" in pc else 0,
            "chronic_hypertension": int(p["chronic_hypertension"]),
            "gestational_diabetes": int(p["gestational_diabetes"]),
            "hemoglobin": p["hemoglobin_level"],
            "bp_systolic_avg": l7["bp_systolic"].mean(),
            "bp_diastolic_avg": l7["bp_diastolic"].mean(),
            "previous_pregnancies": p["previous_pregnancies"],
            "bleeding_frequency": l7["bleeding_flag"].mean(),
            "cramps_frequency": l7["cramps_flag"].mean(),
        })
        labels.append(uh.iloc[-1]["fetal_risk_label"])

    X = pd.DataFrame(feats)
    le = LabelEncoder(); y = le.fit_transform(labels); cn = list(le.classes_)
    log(f"  Samples={len(X)}  Classes={dict(zip(cn, np.bincount(y)))}")

    Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)
    sc = StandardScaler(); Xtr_s = sc.fit_transform(Xtr); Xte_s = sc.transform(Xte)

    sm = SMOTE(random_state=42, k_neighbors=3)
    Xtr_r, ytr_r = sm.fit_resample(Xtr_s, ytr)
    log(f"  After SMOTE: {dict(zip(cn, np.bincount(ytr_r)))}")

    mdl = LGBMClassifier(n_estimators=400, max_depth=7, learning_rate=0.05,
        num_leaves=31, min_child_samples=5, subsample=0.8, colsample_bytree=0.8,
        reg_alpha=0.1, reg_lambda=1.0, is_unbalance=True, random_state=42, verbose=-1)
    mdl.fit(Xtr_r, ytr_r)

    yp = mdl.predict(Xte_s); ypr = mdl.predict_proba(Xte_s)
    m = evaluate(yte, yp, ypr, cn, "Fetal Health", pd.DataFrame(Xte_s, columns=X.columns), mdl)
    m["cross_validation"] = cv(mdl, Xtr_r, ytr_r)

    joblib.dump(mdl, MODEL_DIR / "fetal_health_lgbm.joblib")
    joblib.dump(sc, MODEL_DIR / "fetal_health_scaler.joblib")
    joblib.dump(le, MODEL_DIR / "fetal_health_label_encoder.joblib")
    log(f"  ✅ Saved. Time: {time.time()-t0:.1f}s")
    return m


# ════════════════════════════════════════════════════
#  SHAP
# ════════════════════════════════════════════════════

def run_shap():
    log("\n" + "="*60)
    log("  STEP 5 — SHAP EXPLAINABILITY")
    log("="*60)
    try:
        import shap
        health_df = pd.read_csv(DATASET_DIR / "synthetic_health_logs.csv")
        mental_df = pd.read_csv(DATASET_DIR / "synthetic_mental_health.csv")
        prof_df = pd.read_csv(DATASET_DIR / "synthetic_profiles.csv")

        # Mental SHAP
        mdl = joblib.load(MODEL_DIR / "mental_health_xgb.joblib")
        sc = joblib.load(MODEL_DIR / "mental_health_scaler.joblib")
        fs = []
        for uid in mental_df["user_id"].unique()[:100]:
            um = mental_df[mental_df["user_id"]==uid].sort_values("assessment_date")
            uh = health_df[health_df["user_id"]==uid].sort_values("log_date")
            if len(um)<3 or len(uh)<3: continue
            l7m, l7h = um.tail(7), uh.tail(7); lt = um.iloc[-1]
            fs.append({"phq9_score": lt["phq9_score"], "gad7_score": lt["gad7_score"],
                "mood_avg_7d": l7m["mood_score"].mean(), "sleep_avg_7d": l7h["sleep_quality"].mean(),
                "stress_avg_7d": l7m["stress_level"].mean(), "social_support": lt["social_support_score"],
                "journal_sentiment_avg": 0.0, "previous_mental_history": 0})
        Xs = pd.DataFrame(fs); Xsc = sc.transform(Xs)
        exp = shap.TreeExplainer(mdl); sv = exp.shap_values(Xsc)
        plt.figure(figsize=(8,5))
        shap.summary_plot(sv, Xsc, feature_names=Xs.columns.tolist(), show=False)
        plt.tight_layout()
        plt.savefig(REPORT_DIR / "shap_mental_health.png", dpi=120, bbox_inches="tight"); plt.close()
        log("  ✅ Mental SHAP plot saved")

        # Fetal SHAP
        mdl2 = joblib.load(MODEL_DIR / "fetal_health_lgbm.joblib")
        sc2 = joblib.load(MODEL_DIR / "fetal_health_scaler.joblib")
        fs2 = []
        for uid in prof_df["user_id"].unique()[:100]:
            p = prof_df[prof_df["user_id"]==uid].iloc[0]
            uh = health_df[health_df["user_id"]==uid].sort_values("log_date")
            if len(uh)<5: continue
            l7 = uh.tail(7); pc = json.loads(p["past_complications"]) if isinstance(p["past_complications"],str) else []
            fs2.append({"fetal_movement_avg": l7["fetal_movement_count"].mean(),
                "fetal_movement_min": l7["fetal_movement_count"].min(),
                "maternal_age": p["age"], "pregnancy_week": p["pregnancy_week"], "bmi": p["bmi"],
                "previous_preterm": 1 if "preterm" in pc else 0,
                "chronic_hypertension": int(p["chronic_hypertension"]),
                "gestational_diabetes": int(p["gestational_diabetes"]),
                "hemoglobin": p["hemoglobin_level"],
                "bp_systolic_avg": l7["bp_systolic"].mean(), "bp_diastolic_avg": l7["bp_diastolic"].mean(),
                "previous_pregnancies": p["previous_pregnancies"],
                "bleeding_frequency": l7["bleeding_flag"].mean(), "cramps_frequency": l7["cramps_flag"].mean()})
        Xs2 = pd.DataFrame(fs2); Xsc2 = sc2.transform(Xs2)
        exp2 = shap.TreeExplainer(mdl2); sv2 = exp2.shap_values(Xsc2)
        plt.figure(figsize=(8,5))
        shap.summary_plot(sv2, Xsc2, feature_names=Xs2.columns.tolist(), show=False)
        plt.tight_layout()
        plt.savefig(REPORT_DIR / "shap_fetal_health.png", dpi=120, bbox_inches="tight"); plt.close()
        log("  ✅ Fetal SHAP plot saved")
    except Exception as e:
        log(f"  ⚠️ SHAP: {e}")


# ════════════════════════════════════════════════════
#  MAIN
# ════════════════════════════════════════════════════

def main():
    t0 = time.time()
    log("╔" + "═"*58 + "╗")
    log("║  NOVELLE — MODEL TRAINING v2 (BALANCED + SMOTE)         ║")
    log("╚" + "═"*58 + "╝")
    log(f"  {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    prof, health, mental = generate_data()

    metrics = {}
    metrics["mental_health"] = train_mental(prof, health, mental)
    metrics["physical_health"] = train_physical(prof, health)
    metrics["fetal_health"] = train_fetal(prof, health)

    run_shap()

    with open(MODEL_DIR / "model_metadata.json", "w") as f:
        json.dump({"trained_at": datetime.now().isoformat(), "n_users": 3000, "models": metrics}, f, indent=2)

    log("\n" + "="*60)
    log("  FINAL SUMMARY")
    log("="*60)
    for nm, m in metrics.items():
        log(f"\n  {nm.upper().replace('_',' ')}:")
        for k in ["accuracy","f1_macro","f1_weighted","precision_macro","recall_macro","auc_roc_macro"]:
            log(f"    {k:>20s}: {m[k]}")
        if "cross_validation" in m:
            log(f"    {'cross_val_f1':>20s}: {m['cross_validation']['mean']} ± {m['cross_validation']['std']}")
        for c, v in m.get("per_class", {}).items():
            log(f"    {c:>6s} → P={v['precision']:.3f}  R={v['recall']:.3f}  F1={v['f1']:.3f}  n={v['support']}")

    log(f"\n  Total: {time.time()-t0:.1f}s | Models: {MODEL_DIR} | Reports: {REPORT_DIR}")

    with open(REPORT_DIR / "training_report.txt", "w") as f:
        f.write("\n".join(REPORT))
    with open(REPORT_DIR / "evaluation_metrics.json", "w") as f:
        json.dump(metrics, f, indent=2)

    print(f"\n  📄 Report:  ml/reports/training_report.txt")
    print(f"  📊 Metrics: ml/reports/evaluation_metrics.json")
    print(f"  📈 Plots:   ml/reports/*.png")


if __name__ == "__main__":
    main()
