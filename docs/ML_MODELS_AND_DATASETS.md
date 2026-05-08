# Novelle — Machine Learning Models, Training Evaluation & Datasets

This document inventories **every trained artifact** referenced in the codebase, **where training data comes from**, **how models are evaluated during training**, and **where each model is used** in the running application.

> **Important:** Numeric metrics (accuracy, F1, etc.) depend on random seeds, SMOTE, and whether data is synthetic or external CSVs. The training scripts print full reports to the console at the end of each run. **This file describes methodology and sources**; for exact numbers in your environment, run the training command and capture the output.

---

## 1. Quick inventory

| ID | Model purpose | Primary algorithm | Main artifacts (`backend/app/ml/models/`) | Loaded at runtime? |
|----|----------------|-------------------|-------------------------------------------|---------------------|
| 1 | Mental health risk | XGBoost | `mental_health_xgb.joblib`, `mental_health_scaler.joblib`, `mental_health_label_encoder.joblib`, `mental_health_features.json` | Yes — `app/ml/utils` → risk pipeline |
| 2 | Physical / maternal risk | Voting ensemble (XGBoost + RandomForest + LogisticRegression, soft voting) | `physical_health_ensemble.joblib`, `physical_health_scaler.joblib`, `physical_health_label_encoder.joblib`, `physical_health_features.json` | Yes |
| 3 | Fetal health (CTG-style) | LightGBM | `fetal_health_lgbm.joblib`, `fetal_health_scaler.joblib`, `fetal_health_label_encoder.joblib`, `fetal_health_features.json` | Yes |
| 4 | Journal / text sentiment | LogisticRegression + TF-IDF (optional) | `nlp_sentiment_model.joblib`, `nlp_tfidf_vectorizer.joblib` | Yes — if files exist (`predict_sentiment`) |
| 5 | Fine-grained emotion | LogisticRegression + TF-IDF (optional) | `nlp_emotion_model.joblib`, `nlp_emotion_tfidf.joblib`, `nlp_emotion_labels.json` | Yes — if files exist (`predict_emotion`) |
| 6 | Preterm proxy | XGBoost classifier | `preterm_predictor.joblib`, `preterm_scaler.joblib`, `preterm_features.joblib` | Indirect — features feed risk / SQL fields when engines use them |
| 7 | BP trajectory (next-day) | XGBoost regressors (`MultiOutputRegressor`) | `bp_forecaster.joblib`, `bp_forecaster_scaler.joblib`, `bp_forecaster_features.joblib` | Optional — MLOps / analytics if wired |
| 8 | GDM / diabetes risk proxy | LightGBM | `gdm_predictor.joblib`, `gdm_scaler.joblib`, `gdm_features.joblib` | Optional |
| 9 | Patient engagement | LogisticRegression **or** RandomForest (depends on last training script) | `engagement_scorer.joblib`, `engagement_scaler.joblib`, `engagement_features.joblib`, `engagement_label_encoder.joblib` (only some train paths) | **Yes** — but `patient.py` builds the **9-feature vector** expected by **`train_v2_models`** (synthetic engagement). If you last ran **`train_v2_real_data`** (RandomForest + Kaggle features), inference may **not match** until `patient.py` is updated. |
| 10 | Wellness recommendations | TF-IDF + cosine similarity over catalog | `recommendation_engine.joblib` | Yes — `patient` wellness (`_load_recommendation_engine`) |
| 11 | Escalation priority | XGBoost multiclass | `escalation_ranker.joblib`, `escalation_scaler.joblib`, `escalation_features.joblib`, `escalation_label_encoder.joblib` (real-data path) | Optional — hospital / ops if integrated |
| 12 | Clinical note summarization | Extractive TF-IDF (sentence scoring) | `note_summarizer.joblib` | Optional |
| 13 | Appointment no-show | RandomForest | `noshow_predictor.joblib`, `noshow_scaler.joblib`, `noshow_features.joblib` | Optional |

`models_available()` in `app/ml/utils/__init__.py` explicitly checks the **three core risk** models and NLP library presence, not every v2 file.

---

## 2. Training scripts (three pipelines)

| Script | Command (from `backend/`) | Data philosophy |
|--------|-------------------------|-----------------|
| Core risk v1.5 | `python -m app.ml.train_risk_models` | **Synthetic** rows generated in Python (`N_SAMPLES` default 5000 per domain), optional **SDV GaussianCopula** extra rows if `sdv` is installed; else bootstrap resample |
| Operational v2 (synthetic) | `python -m app.ml.train_v2_models` | **Purely synthetic** generators inside the module (preterm, BP series, engagement, escalation, no-show, synthetic clinical paragraphs, curated catalog for TF-IDF) |
| Operational v2 (CSV-backed) | `python -m app.ml.train_v2_real_data` | **External / project CSVs** under `ml/datasets/` (paths are absolute in code — see §5); **must exist** before training |

**Hygiene:** Whichever script runs **last** overwrites shared filenames (e.g. `engagement_scorer.joblib`). The **feature vector layout** must match what inference code expects (`patient.py` assumes the engagement feature list from the trained artifact).

---

## 3. Per-model detail: core risk (`train_risk_models.py`)

### 3.1 Mental health (XGBoost)

**Target:** `risk_level` ∈ {LOW, MEDIUM, HIGH}.

**Data source:**
- **No external CSV.** Rows are simulated from Normal distributions with class-conditional means (PHQ-9, GAD-7, mood, stress, social support, age, `pregnancy_week`, `previous_pregnancies`).
- Optional expansion: **SDV** `GaussianCopulaSynthesizer` fit on the small seed frame, or bootstrap to `N_SAMPLES`.

**Features (after engineering):** PHQ-9/GAD-7, mood, stress, social support, combined scores, severity bins, trimester, age, parity (see `engineer_mental_features`).

**Training / evaluation:**
- Split: 80% train / 20% stratified test, `random_state=42`.
- **SMOTE** on training fold when `imbalanced-learn` works.
- **5-fold StratifiedKFold CV** on training data: reports **mean ± std accuracy** across folds.
- Final model refit on full training set; **test accuracy** + **`sklearn.metrics.classification_report`** (per-class precision/recall/F1).

**Artifacts:** listed in inventory row 1.

**Runtime:** `predict_mental_risk()` in `app/ml/utils/__init__.py` → used by risk services / pipelines.

---

### 3.2 Physical / maternal health (soft-voting ensemble)

**Target:** `risk_level` ∈ {LOW, MEDIUM, HIGH}.

**Data source:**
- **No external CSV.** Synthetic vitals: Age, SystolicBP, DiastolicBP, BS (glucose), BodyTemp, HeartRate, with distributions conditioned on risk class.
- Optional SDV / bootstrap as above.

**Features:** Raw vitals plus `bp_mean`, pulse pressure, hypertension / hyperglycemia / fever / heart-rate flags, age risk flag, blood sugar severity bin (`engineer_physical_features`).

**Training / evaluation:**
- Same split + SMOTE as mental.
- **No CV loop in script** — ensemble fitted once on training data.
- **Test accuracy** + full **classification_report**.

**Artifacts:** `physical_health_ensemble.joblib` (not a single XGBoost file — voting ensemble).

**Runtime:** `predict_physical_risk()`.

---

### 3.3 Fetal health (LightGBM, CTG-inspired)

**Target:** `risk_level` ∈ {LOW, MEDIUM, HIGH} mapped from synthetic CTG + histogram fields.

**Data source:**
- **No external CSV.** Simulated CTG features (baseline FHR, accelerations, decelerations, variability, histogram moments, etc.) conditioned on class.
- Conceptually aligned with public **Cardiotocography (CTG)** datasets used in notebooks (e.g. Kaggle fetal health classification — see `ml/notebooks/README.md`); the **default training script does not load that CSV** unless you adapt the script.

**Training / evaluation:**
- Split + SMOTE analogous to mental.
- **5-fold CV** on training (uses DataFrame with column names for LightGBM).
- **Test accuracy** + **classification_report**.

**Artifacts:** inventory row 3.

**Runtime:** `predict_fetal_risk()`.

---

## 4. Per-model detail: v2 synthetic (`train_v2_models.py`)

All of the following print **sample counts**, **class rates**, then **metrics** to stdout.

| Model | Algorithm | Metrics reported | Default training rows |
|-------|-----------|------------------|------------------------|
| Preterm | XGBClassifier | Accuracy + classification_report (Full-term vs Preterm) | 3000 synthetic |
| BP forecaster | MultiOutputRegressor(XGBRegressor) | Per-output **MAE**, **RMSE**, **R²** for next systolic/diastolic | Synthetic time series |
| GDM | LGBMClassifier | Accuracy + classification_report | Synthetic |
| Engagement | LogisticRegression + SMOTE | Accuracy + classification_report (Low/Medium/High) | 2000 synthetic |
| Recommendations | TF-IDF + cosine | Demo top-k scores; saves vectorizer + matrix + catalog | Curated in-code catalog |
| Escalation ranker | XGBClassifier (multiclass) + LabelEncoder on y | Accuracy + report (Critical/High/Medium/Low) | 1500 synthetic |
| Note summarizer | TfidfVectorizer fit on synthetic paragraphs | Demo summaries; saves `vectorizer` (+ corpus size metadata) | Fixed synthetic corpus |
| No-show | RandomForest | Accuracy + report + **feature importances** top ranks | 2000 synthetic |

**Escalation artifacts note:** This path saves `escalation_features.joblib` but **does not** save `escalation_label_encoder.joblib` (encoding is internal to training). The **real-data** trainer saves the label encoder.

---

## 5. Per-model detail: v2 real-data (`train_v2_real_data.py`)

**Configured dataset root:** `DATASET_DIR = "/home/linxcapture/Desktop/projects/pregency-friend/ml/datasets"` (adjust for your machine).

| Model | CSV file(s) / source | How it is used | Evaluation printed |
|-------|----------------------|----------------|--------------------|
| Preterm proxy | `Maternal Health Risk Data Set.csv` | Maps Kaggle-style **RiskLevel** to binary `preterm`; adds BP/sugar engineered flags | Accuracy + classification_report |
| BP forecaster | `synthetic_health_logs.csv` | Sorts by `user_id` + `log_date`, lag features, predicts **next** BP | R² and MAE systolic/diastolic |
| GDM | `gdm/diabetes.csv` | **Pima Indians Diabetes** (UCI / common Kaggle mirror); zeros imputed, engineered interactions | Accuracy + report |
| Engagement | `engagement/KaggleV2-May-2016.csv` | Brazilian medical appointment **no-show** dataset; derives 3-class engagement from show-up + wait time | Accuracy + report; saves `engagement_label_encoder.joblib` |
| Recommendations | In-code catalog + optional notes | TF-IDF on catalog text only in `train_recommendation_engine` (notes file not required for save in that function’s catalog-only path — see code) | Cosine demo print |
| Escalation | Same maternal CSV | Derives 4 priority levels from risk + vitals rules, then **XGBClassifier** | Accuracy + report; saves **label encoder** |
| Note summarizer | `obgyn_clinical_notes.csv` | **`transcription`** column, sentence TF-IDF, medical keyword boost list | Vocab size + demo summary |
| No-show | `noshow/KaggleV2-May-2016.csv` | Full **110k+** rows path documented in script; engineered wait/time features | Accuracy + report + importances |

**Provenance (obtain data legally / with license):**

| Dataset | Typical origin | Notes |
|---------|----------------|-------|
| **Maternal Health Risk** | [Kaggle — Maternal Health Risk Data Set](https://www.kaggle.com/datasets/csafrit2/maternal-health-risk-data-set) | Age, BP, BS, HR, RiskLevel |
| **Fetal health (CTG)** | [Kaggle — Fetal Health Classification](https://www.kaggle.com/datasets/andrewmvd/fetal-health-classification) | Used in **notebooks** / research path; default `train_risk_models` is synthetic |
| **Pima Indians Diabetes** | UCI ML Repository / Kaggle mirrors | Used as **proxy** for gestational diabetes risk in code comments — not identical to GDM population |
| **Medical appointment no-show (Brazil)** | [Kaggle — Appointment No-Show](https://www.kaggle.com/datasets/joniarroba/noshowappointments) (same schema as `KaggleV2-May-2016`) | Used for engagement + no-show |
| **`synthetic_health_logs.csv`** | Generated in-repo (see `ml/notebooks/README`, SDV / project generators) | Longitudinal BP logs |
| **`obgyn_clinical_notes.csv`** | Project-specific export or public clinical-NLP corpora | Must include a text/`transcription` column as expected by script |

---

## 6. NLP models (`predict_sentiment`, `predict_emotion`)

**Artifacts:** `nlp_sentiment_model.joblib`, `nlp_tfidf_vectorizer.joblib`, `nlp_emotion_model.joblib`, `nlp_emotion_tfidf.joblib`, `nlp_emotion_labels.json`.

**Training:** Not invoked from `train_risk_models.py` or `train_v2_models.py` in the snippets above. These are expected to be produced by separate notebook or script flows (e.g. sentiment on SST-2–style data, multi-label emotions per `nlp_emotion_labels.json`). If files are **missing**, prediction helpers return `None` and callers should fall back.

**Runtime:** `models_available()` sets `nlp_distilbert` / `nlp_goemotions` flags from **importability** of `transformers`, not from joblib files; **VADER** is always marked True (rule/lexicon path elsewhere in app features).

---

## 7. Where models plug into the product

| Area | Mechanism |
|------|-----------|
| **Risk scoring** | `app/services/risk_engine.py` and related routes use `predict_mental_risk`, `predict_physical_risk`, `predict_fetal_risk` from `app/ml/utils` |
| **Patient wellness / hub** | `app/api/routes/patient.py` loads `engagement_scorer` and `recommendation_engine` for personalized suggestions and scoring |
| **Doctor views** | Risk fields (e.g. `preterm_risk`) exposed via patient/risk APIs |
| **Hospital admin** | Operational analytics may reference risk flags (e.g. preterm cohort messaging) |
| **Startup** | `main.py` lifespan calls `models_available()` and logs which core `.joblib` files exist |

---

## 8. Reproducing evaluation outputs

From repository root, after databases are optional:

```bash
cd backend
source venv/bin/activate   # if using venv
python -m app.ml.train_risk_models          # core risk + CV/test reports
python -m app.ml.train_v2_models            # v2 synthetic — all sections
# After placing CSVs under ml/datasets/ per §5:
python -m app.ml.train_v2_real_data         # external-data v2
```

Save stdout to a file for your model card, e.g. `tee ml_training_report.txt`.

---

## 9. MLOps configuration snapshot

`backend/app/ml/models/settings.json` holds **high-level hyperparameters / sample counts** for dashboard display (not a full model registry):

- Maternal / Fetal / Mental blocks with `n_estimators`, `max_depth`, `learning_rate`, `samples` (defaults 5000).

---

## 10. Limitations (clinical & technical)

- All labels are **risk or operational proxies**, not diagnoses.
- **Synthetic** and **cross-domain** datasets (e.g. Pima for “GDM”) introduce **domain shift**; metrics are for engineering QA, not regulatory validation.
- **Engagement:** Production inference in **`patient.py`** assumes **9 numeric features** in the same order as **`train_v2_models._generate_engagement_data` / `train_engagement_scorer`** (`days_since_last_log`, `avg_logs_per_week`, … `risk_level_numeric`). Training with **`train_v2_real_data.train_engagement_scorer`** produces different inputs (Kaggle columns) — **do not** deploy those artifacts without updating the API glue code.

---

## 11. Related documents

- [README.md](../README.md) — stack and quick ML commands  
- [BACKEND_GUIDE.md](../BACKEND_GUIDE.md) — environment and deep backend setup  
- [ml/notebooks/README.md](../ml/notebooks/README.md) — Jupyter workflows and Kaggle download hints  

---

*Document generated to match repository layout as of project revision; re-run training after any script change and update exported metrics accordingly.*
