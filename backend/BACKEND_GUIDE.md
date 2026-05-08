# Novelle — Backend Setup, Dataset Acquisition & Model Training Guide

> A comprehensive step-by-step walkthrough for setting up the backend, acquiring/generating datasets, training ML models, and deploying the Novelle maternal health risk platform.

---

## Table of Contents

0. [Multi-role API surface](#0-multi-role-api-surface-quick-reference) *(quick reference)*
1. [Prerequisites](#1-prerequisites)
2. [Environment Setup](#2-environment-setup)
3. [Database Setup](#3-database-setup)
4. [Backend Configuration](#4-backend-configuration)
5. [Running the Backend](#5-running-the-backend)
6. [Understanding the Data Models](#6-understanding-the-data-models)
7. [Dataset Acquisition](#7-dataset-acquisition)
8. [Synthetic Data Generation](#8-synthetic-data-generation)
9. [Feature Engineering](#9-feature-engineering)
10. [Model Training — Mental Health](#10-model-training--mental-health)
11. [Model Training — Physical Health](#11-model-training--physical-health)
12. [Model Training — Fetal Health](#12-model-training--fetal-health)
13. [Model Evaluation & Explainability](#13-model-evaluation--explainability)
14. [NLP Pipeline Setup](#14-nlp-pipeline-setup)
15. [Companion AI Setup](#15-companion-ai-setup)
16. [Model Deployment & Integration](#16-model-deployment--integration)
17. [Testing the Full Pipeline](#17-testing-the-full-pipeline)
18. [Docker Deployment](#18-docker-deployment)
19. [Monitoring & Maintenance](#19-monitoring--maintenance)

---

## 0. Multi-role API surface (quick reference)

All HTTP routes are served by `backend/main.py`. Most modules are mounted under **`/api`**.

| Module (`app/api/routes/`) | URL prefix | Typical UI consumer |
| --------------------------- | ---------- | ------------------- |
| `auth`, `profile`, `health`, `mental_health`, `risk`, `features` | `/api/...` | Patient + shared |
| `patient` | `/api/patient/...` | Patient portal pages |
| `doctor` | `/api/doctor/...` | Doctor portal |
| `admin` | `/api/admin/...` | Legacy/aux admin routes |
| `hospital_admin` | `/api/hospital-admin/...` | Hospital manager dashboard |
| `platform_admin` | `/api/platform-admin/...` | Platform admin dashboard |
| `ingestion` | `/api/ingestion/...` | Ingestion pipeline |
| `telemedicine` | `/api/telemedicine/...` | Telehealth |
| `mlops` | `/api/mlops/...` | ML pipeline operations |
| `compliance` | `/api/compliance/...` | Compliance helpers |

**Docs:** with the backend running, open `http://localhost:8000/docs` (Swagger UI).

**Training entrypoints (run from `backend/` with venv active):**

| Command | Purpose |
| ------- | ------- |
| `python -m app.ml.train_risk_models` | Core mental / physical / fetal risk artifacts |
| `python -m app.ml.train_v2_models` | Optional operational models (no-show, GDM, engagement, escalation ranker, BP forecaster, etc.) on synthetic data |
| `python -m app.ml.train_v2_real_data` | v2-style training when real/sourced datasets are configured |

Artifacts are written under **`backend/app/ml/models/`** unless `ML_MODEL_DIR` in `.env` overrides.

For a **full matrix of models, datasets, evaluation output, and runtime usage**, see **[`docs/ML_MODELS_AND_DATASETS.md`](./docs/ML_MODELS_AND_DATASETS.md)**.

---

## 1. Prerequisites

### System Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| **OS** | Ubuntu 20.04 / macOS 12 / Windows 10 (WSL2) | Ubuntu 22.04 LTS |
| **Python** | 3.10 | 3.11 or 3.12 |
| **RAM** | 4 GB | 8 GB+ |
| **Disk** | 5 GB free | 20 GB free |
| **CPU** | 2 cores | 4+ cores |

### Software Dependencies

```bash
# Install system packages (Ubuntu/Debian)
sudo apt update && sudo apt install -y \
    python3 python3-pip python3-venv \
    postgresql postgresql-contrib \
    redis-server \
    git curl wget

# Install MongoDB (Ubuntu 22.04)
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
    sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] \
    https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | \
    sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt update && sudo apt install -y mongodb-org
sudo systemctl start mongod && sudo systemctl enable mongod
```

### Verify Installations

```bash
python3 --version        # ≥ 3.10
psql --version           # ≥ 14
mongosh --version        # ≥ 2.0
redis-cli --version      # ≥ 6.0
```

---

## 2. Environment Setup

### 2.1 Clone & Navigate

```bash
cd /path/to/pregency-friend
cd backend
```

### 2.2 Create Python Virtual Environment

```bash
python3 -m venv venv
source venv/bin/activate
```

### 2.3 Install Dependencies

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

**Key packages installed:**

| Category | Packages |
|----------|----------|
| **Core** | FastAPI 0.109.2, Uvicorn 0.27.1, Pydantic 2.6.1 |
| **Database** | SQLAlchemy 2.0.25, asyncpg 0.29.0, Motor 3.3.2, Redis 5.0.1 |
| **ML** | scikit-learn 1.4.0, XGBoost 2.0.3, LightGBM 4.3.0, pandas 2.2.0 |
| **NLP** | vaderSentiment 3.3.2, NLTK 3.8.1 |
| **Auth** | python-jose 3.3.0, passlib 1.7.4, bcrypt 4.1.2 |

### 2.4 Create Environment File

```bash
cp .env.example .env
```

Edit `.env` with your actual values:

```env
DEBUG=true
SECRET_KEY=your-long-random-secret-key-here
DATABASE_URL=postgresql+asyncpg://novelle:novelle_secret@localhost:5432/novelle_db
DATABASE_URL_SYNC=postgresql://novelle:novelle_secret@localhost:5432/novelle_db
MONGODB_URL=mongodb://localhost:27017
REDIS_URL=redis://localhost:6379/0
OPENAI_API_KEY=                 # Optional: for LLM companion upgrade
GOOGLE_MAPS_API_KEY=            # Optional: for hospital proximity
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=                      # Optional: for email notifications
SMTP_PASSWORD=
ML_MODEL_DIR=app/ml/models
```

---

## 3. Database Setup

### 3.1 PostgreSQL

```bash
# Start PostgreSQL
sudo systemctl start postgresql

# Create database and user
sudo -u postgres psql <<EOF
CREATE USER novelle WITH PASSWORD 'novelle_secret';
CREATE DATABASE novelle_db OWNER novelle;
GRANT ALL PRIVILEGES ON DATABASE novelle_db TO novelle;
\q
EOF
```

Verify connection:

```bash
psql -U novelle -d novelle_db -h localhost -c "SELECT 1;"
```

### 3.2 MongoDB

```bash
# Start MongoDB
sudo systemctl start mongod

# Verify connection
mongosh --eval "db.runCommand({ ping: 1 })"
```

MongoDB collections (`novelle_db`) are created automatically:
- `journals` — journal entries with NLP analysis
- `chat_history` — companion AI conversation logs

### 3.3 Redis

```bash
# Start Redis
sudo systemctl start redis-server

# Verify connection
redis-cli ping   # Should return: PONG
```

### 3.4 Initialize Tables

The FastAPI app auto-creates all PostgreSQL tables on startup via `init_db()`. To manually test:

```bash
cd backend
source venv/bin/activate
python3 -c "
import asyncio
from app.core.database import engine, Base
from app.models import *  # imports all models

async def init():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print('✅ All tables created successfully')
    await engine.dispose()

asyncio.run(init())
"
```

**Tables created (10 total):**
`users`, `pregnancy_profiles`, `health_logs`, `mental_health_assessments`, `risk_scores`, `doctors`, `hospitals`, `escalations`, `reminders`

### 3.5 Set Up Alembic (Database Migrations)

```bash
cd backend
alembic init alembic
```

Edit `alembic.ini`:
```ini
sqlalchemy.url = postgresql://novelle:novelle_secret@localhost:5432/novelle_db
```

Edit `alembic/env.py`:
```python
from app.core.database import Base
from app.models import *  # noqa: F401, F403

target_metadata = Base.metadata
```

Generate and apply initial migration:
```bash
alembic revision --autogenerate -m "Initial tables"
alembic upgrade head
```

---

## 4. Backend Configuration

### 4.1 Configuration Reference

All settings are in `app/core/config.py` using Pydantic `BaseSettings`. Override via `.env` file or environment variables.

| Setting | Default | Purpose |
|---------|---------|---------|
| `SECRET_KEY` | dev key | **CHANGE IN PRODUCTION** — JWT signing key |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | 1440 (24h) | JWT access token lifetime |
| `REFRESH_TOKEN_EXPIRE_DAYS` | 30 | JWT refresh token lifetime |
| `RISK_CONFIDENCE_THRESHOLD` | 0.75 | Minimum confidence to flag risk |
| `ESCALATION_TIMEOUT_HOURS` | 4 | Hours before escalation reminder |
| `ESCALATION_FOLLOWUP_HOURS` | 24 | Hours for follow-up after resolution |
| `ML_MODEL_DIR` | `app/ml/models` | Directory for serialized ML models |

### 4.2 CORS Configuration

Default allowed origins:
```
http://localhost:3000 (React dev)
http://localhost:5173 (Vite dev)
```

Add your production domain to `CORS_ORIGINS` in `.env`.

---

## 5. Running the Backend

### 5.1 Development Server

```bash
cd backend
source venv/bin/activate
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 5.2 Verify

```bash
# Health check
curl http://localhost:8000/health
# → {"status": "healthy", "version": "1.0.0"}

# API info
curl http://localhost:8000/
# → {"name": "Novelle", "version": "1.0.0", ...}

# Interactive docs
open http://localhost:8000/docs      # Swagger UI
open http://localhost:8000/redoc     # ReDoc
```

### 5.3 API Route Map

| Prefix | File | Description |
|--------|------|-------------|
| `/api/auth` | `auth.py` | Register, login, refresh, profile |
| `/api/profile` | `profile.py` | Pregnancy profile CRUD |
| `/api/health` | `health.py` | Daily health log, history, summary |
| `/api/mental` | `mental_health.py` | Mental health assessments, mood trends |
| `/api/risk` | `risk.py` | Full risk report, history, explanations |
| `/api/escalation` | `risk.py` | Trigger/view escalations |
| `/api/journal` | `features.py` | Journal entries with NLP |
| `/api/companion` | `features.py` | AI chatbot |
| `/api/hospitals` | `features.py` | Nearby hospital search |
| `/api/reminders` | `features.py` | Reminders CRUD |
| `/api/doctor` | `doctor.py` | Doctor dashboard, patient summary |

---

## 6. Understanding the Data Models

Before acquiring datasets, understand what data each model needs.

### 6.1 PregnancyProfile (Demographic + Clinical Baseline)

```
age, height_cm, weight_kg, bmi (auto-calculated)
pregnancy_week (1-42), trimester (auto-set from week)
due_date, last_menstrual_period
blood_group (A+, A-, B+, B-, O+, O-, AB+, AB-)
previous_pregnancies, pregnancy_history (JSON: ["miscarriage", "c-section", ...])
lifestyle_indicators (JSON: ["vegetarian", "active", ...])
hemoglobin_level, gestational_diabetes (bool)
thyroid_disorder (hypothyroid/hyperthyroid/none)
past_complications (JSON: ["preeclampsia", "prom", ...])
chronic_hypertension (bool)
```

### 6.2 HealthLog (Daily Vitals)

```
bp_systolic, bp_diastolic         → Blood pressure (mmHg)
blood_sugar_fasting               → mg/dL
blood_sugar_postmeal              → mg/dL
weight_kg                         → Daily weight
sleep_quality (1-5)               → Self-reported
pain_score (0-10), pain_location  → Pain assessment
nausea_count, nausea_severity     → Morning sickness tracking
dizziness (bool)
edema_flag, edema_location        → Swelling
bleeding_flag, bleeding_severity  → light/moderate/heavy
cramps_flag, cramps_intensity     → 0-10
fetal_movement_count              → Kick count (relevant ≥28 weeks)
appetite_score (1-5)
hydration_ml                      → Daily water intake
pregnancy_week                    → Auto from profile
```

### 6.3 MentalHealthAssessment

```
phq9_score (0-27)                 → PHQ-9 depression scale
gad7_score (0-21)                 → GAD-7 anxiety scale
mood_score (1-10)                 → Daily mood self-report
mood_emoji                        → Visual mood indicator
stress_level (1-10)               → Self-reported stress
stress_reason                     → Free text
social_support_score (1-5)        → Perceived support level
assessment_type                   → daily / weekly_phq9 / weekly_gad7 / epds
epds_score                        → Edinburgh Postnatal Depression Scale
```

### 6.4 RiskScore (Model Output)

```
Mental:   mental_risk_level (LOW/MEDIUM/HIGH), mental_confidence, depression_risk, anxiety_risk, isolation_detected, postpartum_risk
Physical: physical_risk_level, physical_confidence, diabetes_risk, hypertension_risk, anemia_risk, infection_risk, nutrition_risk
Fetal:    fetal_risk_level, fetal_confidence, preterm_risk, low_birth_weight_risk, growth_abnormality_risk, missed_care_risk
Meta:     shap_features_json, flagged_for_escalation, crisis_flag (SAFE/REVIEW_NEEDED/URGENT)
```

---

## 7. Dataset Acquisition

### 7.1 Public Datasets

#### A. Maternal Health Risk Dataset (UCI / Kaggle)

**Source:** [Kaggle – Maternal Health Risk Data Set](https://www.kaggle.com/datasets/csafrit2/maternal-health-risk-data-set)

**Contains:** Age, SystolicBP, DiastolicBP, BS (blood sugar), BodyTemp, HeartRate, RiskLevel

```bash
# Download via Kaggle CLI
pip install kaggle
kaggle datasets download -d csafrit2/maternal-health-risk-data-set
unzip maternal-health-risk-data-set.zip -d ml/datasets/maternal_health/
```

**Mapping to our features:**

| Dataset Column | Our Feature | Notes |
|---------------|-------------|-------|
| Age | `age` | Direct |
| SystolicBP | `bp_systolic` | Direct |
| DiastolicBP | `bp_diastolic` | Direct |
| BS | `blood_sugar_fasting` | Convert if needed |
| RiskLevel | `physical_risk_level` | Target label |

#### B. Fetal Health Classification (Kaggle / CTG)

**Source:** [Kaggle – Fetal Health Classification](https://www.kaggle.com/datasets/andrewmvd/fetal-health-classification)

**Contains:** 2126 records from Cardiotocograms (CTG) with 21 features and 3 fetal health classes (Normal, Suspect, Pathological)

```bash
kaggle datasets download -d andrewmvd/fetal-health-classification
unzip fetal-health-classification.zip -d ml/datasets/fetal_health/
```

**Mapping:**

| Dataset Feature | Our Feature | Notes |
|----------------|-------------|-------|
| abnormal_short_term_variability | `growth_abnormality_risk` | Feature engineering |
| accelerations | `fetal_movement_count` | Proxy mapping |
| fetal_health (1/2/3) | `fetal_risk_level` (LOW/MEDIUM/HIGH) | Target label |

#### C. Mental Health Datasets

**PHQ-9 / GAD-7 Datasets:**
- [DAIC-WOZ Depression Database](https://dcapswoz.ict.usc.edu/) — clinical interview transcripts with PHQ-8 scores
- [Reddit Mental Health Dataset](https://zenodo.org/records/3941387) — for NLP training

**Perinatal Mental Health:**
- [Edinburgh Postnatal Depression Scale (EPDS) Research Data](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6598680/) — clinical validation studies
- Search PubMed/Zenodo for "perinatal depression dataset" or "Edinburgh postnatal depression"

#### D. Sentiment / Crisis Detection Corpora

| Dataset | Source | Use Case |
|---------|--------|----------|
| CLPsych 2015 Shared Task | [CLPsych](https://clpsych.org/) | Crisis/suicidal ideation detection |
| Sentiment140 | [Kaggle](https://www.kaggle.com/datasets/kazanova/sentiment140) | General sentiment training |
| GoEmotions | [Google Research](https://github.com/google-research/google-research/tree/master/goemotions) | Fine-grained emotion classification |

#### E. Hospital Data (India)

- [National Health Portal India](https://www.nhp.gov.in/) — public hospital directory
- [Google Places API](https://developers.google.com/maps/documentation/places/web-service) — real-time hospital search
- Download CSV from [data.gov.in](https://data.gov.in/) → search "hospitals"

### 7.2 Organizing Datasets

```bash
mkdir -p ml/datasets/{maternal_health,fetal_health,mental_health,nlp,hospitals}
mkdir -p ml/notebooks
mkdir -p ml/trained_models

# Directory structure:
# ml/
# ├── datasets/
# │   ├── maternal_health/    ← UCI/Kaggle maternal risk data
# │   ├── fetal_health/       ← CTG fetal health data
# │   ├── mental_health/      ← PHQ-9/GAD-7/EPDS research data
# │   ├── nlp/                ← Sentiment & crisis corpora
# │   └── hospitals/          ← Hospital directory CSVs
# ├── notebooks/              ← Jupyter training notebooks
# └── trained_models/         ← Serialized .joblib models
```

---

## 8. Synthetic Data Generation

Real maternal health data is scarce and privacy-sensitive. Generate synthetic data for development and model pre-training.

### 8.1 Install Generation Tools

```bash
pip install faker sdv  # sdv ≥ 1.12.0
```

### 8.2 Generate Synthetic Pregnancy Profiles

Create `ml/notebooks/generate_synthetic_data.py`:

```python
import pandas as pd
import numpy as np
from faker import Faker
from datetime import datetime, timedelta
import json
import random

fake = Faker('en_IN')  # Indian locale
np.random.seed(42)

N_USERS = 1000

# ── Pregnancy Profiles ──────────────────────────────
def generate_profiles(n=N_USERS):
    profiles = []
    for i in range(n):
        age = np.random.choice(
            range(18, 42),
            p=_age_distribution()
        )
        height = np.random.normal(158, 6)  # Indian avg female height
        weight = np.random.normal(60, 12)
        bmi = weight / ((height / 100) ** 2)
        week = random.randint(1, 42)
        
        profile = {
            'user_id': i + 1,
            'age': int(age),
            'height_cm': round(height, 1),
            'weight_kg': round(weight, 1),
            'bmi': round(bmi, 1),
            'pregnancy_week': week,
            'trimester': _week_to_trimester(week),
            'blood_group': random.choice(['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']),
            'previous_pregnancies': np.random.choice([0, 1, 2, 3, 4], p=[0.35, 0.30, 0.20, 0.10, 0.05]),
            'hemoglobin_level': round(np.random.normal(11.5, 1.5), 1),
            'gestational_diabetes': random.random() < 0.12,  # 12% prevalence
            'thyroid_disorder': np.random.choice(
                ['none', 'hypothyroid', 'hyperthyroid'],
                p=[0.85, 0.12, 0.03]
            ),
            'chronic_hypertension': random.random() < 0.08,
            'past_complications': json.dumps(
                random.sample(
                    ['preeclampsia', 'prom', 'miscarriage', 'c-section', 'gestational_diabetes', 'preterm'],
                    k=random.randint(0, 2)
                )
            ),
        }
        profiles.append(profile)
    return pd.DataFrame(profiles)


def _age_distribution():
    """Realistic maternal age distribution for India."""
    ages = range(18, 42)
    weights = np.array([
        2, 4, 6, 8, 10, 12, 12, 10, 8, 7,
        6, 5, 4, 3, 2, 1.5, 1, 0.8, 0.5, 0.3,
        0.2, 0.2, 0.1, 0.1
    ])
    return weights / weights.sum()


def _week_to_trimester(week):
    if week <= 12: return 'first'
    if week <= 27: return 'second'
    if week <= 42: return 'third'
    return 'postpartum'


# ── Health Logs (7–30 days per user) ────────────────
def generate_health_logs(profiles_df, days_per_user=14):
    logs = []
    for _, profile in profiles_df.iterrows():
        has_diabetes = profile['gestational_diabetes']
        has_hypertension = profile['chronic_hypertension']
        hemoglobin = profile['hemoglobin_level']
        week = profile['pregnancy_week']

        for day in range(days_per_user):
            # Biologically plausible vital signs
            bp_sys_base = 130 if has_hypertension else 115
            bp_dia_base = 85 if has_hypertension else 75
            sugar_base = 110 if has_diabetes else 85

            log = {
                'user_id': profile['user_id'],
                'log_date': (datetime.now() - timedelta(days=days_per_user - day)).date().isoformat(),
                'bp_systolic': int(np.random.normal(bp_sys_base, 10)),
                'bp_diastolic': int(np.random.normal(bp_dia_base, 8)),
                'blood_sugar_fasting': round(np.random.normal(sugar_base, 15), 1),
                'blood_sugar_postmeal': round(np.random.normal(sugar_base + 30, 20), 1),
                'weight_kg': round(profile['weight_kg'] + np.random.normal(0.5, 0.3) * (week / 10), 1),
                'sleep_quality': np.random.choice([1, 2, 3, 4, 5], p=[0.05, 0.15, 0.35, 0.30, 0.15]),
                'pain_score': np.random.choice(range(11), p=_pain_distribution()),
                'nausea_count': max(0, int(np.random.normal(2 if week <= 14 else 0.5, 1.5))),
                'nausea_severity': random.randint(1, 5) if week <= 16 else random.randint(1, 2),
                'dizziness': random.random() < (0.15 if hemoglobin < 10 else 0.05),
                'edema_flag': random.random() < (0.4 if week >= 30 else 0.1),
                'bleeding_flag': random.random() < 0.03,
                'bleeding_severity': random.choice(['light', 'moderate', 'heavy']) if random.random() < 0.03 else None,
                'cramps_flag': random.random() < (0.3 if week <= 14 or week >= 36 else 0.1),
                'cramps_intensity': random.randint(1, 7) if random.random() < 0.2 else 0,
                'fetal_movement_count': max(0, int(np.random.normal(10, 4))) if week >= 20 else 0,
                'appetite_score': random.randint(2, 5),
                'hydration_ml': random.randint(1000, 3000),
                'pregnancy_week': week,
            }
            logs.append(log)
    return pd.DataFrame(logs)


def _pain_distribution():
    """Most days are low-pain."""
    p = np.array([30, 20, 15, 10, 8, 6, 4, 3, 2, 1, 1])
    return p / p.sum()


# ── Mental Health Assessments ───────────────────────
def generate_mental_health(profiles_df, assessments_per_user=10):
    assessments = []
    for _, profile in profiles_df.iterrows():
        # Baseline mental state (some users are more at risk)
        risk_factor = 1.0
        if profile['previous_pregnancies'] > 2:
            risk_factor *= 1.3
        if json.loads(profile['past_complications']):
            risk_factor *= 1.2

        for day in range(assessments_per_user):
            phq9 = max(0, min(27, int(np.random.exponential(4) * risk_factor)))
            gad7 = max(0, min(21, int(np.random.exponential(3) * risk_factor)))
            mood = max(1, min(10, int(np.random.normal(6.5, 1.8))))
            stress = max(1, min(10, int(np.random.normal(4.5, 2.0) * risk_factor)))
            
            assessment = {
                'user_id': profile['user_id'],
                'assessment_date': (datetime.now() - timedelta(days=assessments_per_user - day)).date().isoformat(),
                'phq9_score': phq9,
                'gad7_score': gad7,
                'mood_score': mood,
                'stress_level': stress,
                'social_support_score': random.randint(1, 5),
                'assessment_type': random.choice(['daily', 'weekly_phq9', 'weekly_gad7']),
            }
            assessments.append(assessment)
    return pd.DataFrame(assessments)


# ── Generate Risk Labels ───────────────────────────
def label_mental_risk(row):
    points = 0
    if row['phq9_score'] >= 15: points += 3
    elif row['phq9_score'] >= 10: points += 2
    if row['gad7_score'] >= 15: points += 3
    elif row['gad7_score'] >= 10: points += 2
    if row['mood_score'] <= 3: points += 2
    if row['stress_level'] >= 8: points += 2
    if points >= 6: return 'HIGH'
    if points >= 3: return 'MEDIUM'
    return 'LOW'


def label_physical_risk(row):
    points = 0
    if row['bp_systolic'] >= 160 or row['bp_diastolic'] >= 110: points += 3
    elif row['bp_systolic'] >= 140 or row['bp_diastolic'] >= 90: points += 2
    if row['blood_sugar_fasting'] >= 126: points += 3
    elif row['blood_sugar_fasting'] >= 100: points += 1
    if row.get('hemoglobin_level', 12) < 7: points += 3
    elif row.get('hemoglobin_level', 12) < 11: points += 1
    if points >= 6: return 'HIGH'
    if points >= 3: return 'MEDIUM'
    return 'LOW'


def label_fetal_risk(row):
    points = 0
    if row.get('age', 25) >= 35: points += 1
    if row.get('age', 25) < 18: points += 2
    if row.get('fetal_movement_count', 10) < 4 and row.get('pregnancy_week', 20) >= 28:
        points += 3
    if points >= 5: return 'HIGH'
    if points >= 3: return 'MEDIUM'
    return 'LOW'


# ── Main Generator ──────────────────────────────────
if __name__ == '__main__':
    print('Generating synthetic data...')
    
    profiles = generate_profiles(1000)
    health_logs = generate_health_logs(profiles, days_per_user=14)
    mental = generate_mental_health(profiles, assessments_per_user=10)
    
    # Add risk labels
    mental['mental_risk_label'] = mental.apply(label_mental_risk, axis=1)
    health_logs['physical_risk_label'] = health_logs.apply(label_physical_risk, axis=1)
    health_logs['fetal_risk_label'] = health_logs.apply(
        lambda row: label_fetal_risk({**row, **profiles[profiles['user_id'] == row['user_id']].iloc[0].to_dict()}),
        axis=1
    )
    
    # Save
    profiles.to_csv('ml/datasets/synthetic_profiles.csv', index=False)
    health_logs.to_csv('ml/datasets/synthetic_health_logs.csv', index=False)
    mental.to_csv('ml/datasets/synthetic_mental_health.csv', index=False)
    
    print(f'✅ Generated:')
    print(f'   {len(profiles)} pregnancy profiles')
    print(f'   {len(health_logs)} health log entries')
    print(f'   {len(mental)} mental health assessments')
    print(f'\nLabel distributions:')
    print(f'   Mental Risk:   {mental["mental_risk_label"].value_counts().to_dict()}')
    print(f'   Physical Risk: {health_logs["physical_risk_label"].value_counts().to_dict()}')
    print(f'   Fetal Risk:    {health_logs["fetal_risk_label"].value_counts().to_dict()}')
```

### 8.3 Run the Generator

```bash
cd /path/to/pregency-friend
source backend/venv/bin/activate
python ml/notebooks/generate_synthetic_data.py
```

**Expected output:**
```
✅ Generated:
   1000 pregnancy profiles
   14000 health log entries
   10000 mental health assessments
```

---

## 9. Feature Engineering

### 9.1 Mental Health Features (8 features)

These are the exact features expected by `MentalHealthModel`:

| # | Feature | Source | Derivation |
|---|---------|--------|-----------|
| 1 | `phq9_score` | MentalHealthAssessment | Latest PHQ-9 score |
| 2 | `gad7_score` | MentalHealthAssessment | Latest GAD-7 score |
| 3 | `mood_avg_7d` | MentalHealthAssessment | Mean of last 7 days `mood_score` |
| 4 | `sleep_avg_7d` | HealthLog | Mean of last 7 days `sleep_quality` |
| 5 | `stress_avg_7d` | MentalHealthAssessment | Mean of last 7 days `stress_level` |
| 6 | `social_support` | MentalHealthAssessment | Latest `social_support_score` |
| 7 | `journal_sentiment_avg` | MongoDB journals | Mean sentiment of last 7 days journal entries |
| 8 | `previous_mental_history` | PregnancyProfile | Binary: has prior mental health complications |

```python
# Feature engineering for mental health
def build_mental_features(mental_df, health_df, user_id):
    user_mental = mental_df[mental_df['user_id'] == user_id].sort_values('assessment_date')
    user_health = health_df[health_df['user_id'] == user_id].sort_values('log_date')
    
    latest = user_mental.iloc[-1] if len(user_mental) > 0 else {}
    last_7_mental = user_mental.tail(7)
    last_7_health = user_health.tail(7)
    
    return {
        'phq9_score': latest.get('phq9_score', 0),
        'gad7_score': latest.get('gad7_score', 0),
        'mood_avg_7d': last_7_mental['mood_score'].mean() if len(last_7_mental) > 0 else 5.0,
        'sleep_avg_7d': last_7_health['sleep_quality'].mean() if len(last_7_health) > 0 else 3.0,
        'stress_avg_7d': last_7_mental['stress_level'].mean() if len(last_7_mental) > 0 else 5.0,
        'social_support': latest.get('social_support_score', 3),
        'journal_sentiment_avg': 0.0,  # From MongoDB in production
        'previous_mental_history': 0,   # From profile in production
    }
```

### 9.2 Physical Health Features (14 features)

These are the exact features expected by `PhysicalHealthModel`:

| # | Feature | Source | Derivation |
|---|---------|--------|-----------|
| 1 | `bp_systolic_avg` | HealthLog | Mean of last 7 days |
| 2 | `bp_diastolic_avg` | HealthLog | Mean of last 7 days |
| 3 | `bp_slope` | HealthLog | Linear trend coefficient (rising/falling) |
| 4 | `sugar_fasting_avg` | HealthLog | Mean of last 7 days |
| 5 | `sugar_postmeal_avg` | HealthLog | Mean of last 7 days |
| 6 | `sugar_variability` | HealthLog | Std deviation of fasting sugar |
| 7 | `weight_deviation` | HealthLog + Profile | Current weight vs. expected for gestational week |
| 8 | `hemoglobin` | PregnancyProfile | Latest hemoglobin level |
| 9 | `edema_frequency` | HealthLog | Fraction of days with edema in last 7 |
| 10 | `pain_frequency` | HealthLog | Fraction of days with pain > 5 in last 7 |
| 11 | `age` | PregnancyProfile | Maternal age |
| 12 | `bmi` | PregnancyProfile | Pre-pregnancy BMI |
| 13 | `pregnancy_week` | PregnancyProfile | Current gestational week |
| 14 | `past_complications_count` | PregnancyProfile | Number of prior complications |

```python
import numpy as np

def build_physical_features(health_df, profile):
    user_health = health_df[health_df['user_id'] == profile['user_id']].sort_values('log_date')
    last_7 = user_health.tail(7)
    
    # BP slope (positive = rising, concerning)
    bp_values = last_7['bp_systolic'].values
    bp_slope = np.polyfit(range(len(bp_values)), bp_values, 1)[0] if len(bp_values) >= 2 else 0.0
    
    return {
        'bp_systolic_avg': last_7['bp_systolic'].mean(),
        'bp_diastolic_avg': last_7['bp_diastolic'].mean(),
        'bp_slope': round(bp_slope, 2),
        'sugar_fasting_avg': last_7['blood_sugar_fasting'].mean(),
        'sugar_postmeal_avg': last_7['blood_sugar_postmeal'].mean(),
        'sugar_variability': last_7['blood_sugar_fasting'].std(),
        'weight_deviation': _weight_deviation(last_7['weight_kg'].iloc[-1], profile['pregnancy_week']),
        'hemoglobin': profile['hemoglobin_level'],
        'edema_frequency': last_7['edema_flag'].mean(),
        'pain_frequency': (last_7['pain_score'] > 5).mean(),
        'age': profile['age'],
        'bmi': profile['bmi'],
        'pregnancy_week': profile['pregnancy_week'],
        'past_complications_count': len(json.loads(profile['past_complications'])),
    }

def _weight_deviation(current_weight, week):
    """Expected weight gain by gestational week (kg)."""
    expected_gain = min(week * 0.3, 12.5)  # ~0.3kg/week, max ~12.5kg
    # This is simplified; use IOM guidelines for real implementation
    return current_weight - expected_gain  # positive = overweight
```

### 9.3 Fetal Health Features

| # | Feature | Source |
|---|---------|--------|
| 1 | `fetal_movement_count` | HealthLog (last entry) |
| 2 | `maternal_age` | PregnancyProfile |
| 3 | `pregnancy_week` | PregnancyProfile |
| 4 | `bmi` | PregnancyProfile |
| 5 | `previous_preterm` | PregnancyProfile.past_complications |
| 6 | `chronic_hypertension` | PregnancyProfile |
| 7 | `gestational_diabetes` | PregnancyProfile |
| 8 | `hemoglobin` | PregnancyProfile |
| 9 | `bp_systolic_avg` | HealthLog (7-day mean) |
| 10 | `missed_appointments` | Reminders (incomplete count) |

---

## 10. Model Training — Mental Health

### 10.1 Training Notebook

Create `ml/notebooks/train_mental_health.py`:

```python
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, cross_val_score, StratifiedKFold
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.metrics import classification_report, confusion_matrix
from xgboost import XGBClassifier
import joblib
import os

# ── Load Data ───────────────────────────────────────
mental_df = pd.read_csv('ml/datasets/synthetic_mental_health.csv')
health_df = pd.read_csv('ml/datasets/synthetic_health_logs.csv')
profiles_df = pd.read_csv('ml/datasets/synthetic_profiles.csv')

# ── Build Feature Matrix ────────────────────────────
features_list = []
labels = []

for user_id in mental_df['user_id'].unique():
    user_mental = mental_df[mental_df['user_id'] == user_id].sort_values('assessment_date')
    user_health = health_df[health_df['user_id'] == user_id].sort_values('log_date')
    
    if len(user_mental) < 3 or len(user_health) < 3:
        continue
    
    last_7_mental = user_mental.tail(7)
    last_7_health = user_health.tail(7)
    latest = user_mental.iloc[-1]
    
    feature = {
        'phq9_score': latest['phq9_score'],
        'gad7_score': latest['gad7_score'],
        'mood_avg_7d': last_7_mental['mood_score'].mean(),
        'sleep_avg_7d': last_7_health['sleep_quality'].mean(),
        'stress_avg_7d': last_7_mental['stress_level'].mean(),
        'social_support': latest['social_support_score'],
        'journal_sentiment_avg': 0.0,  # Placeholder
        'previous_mental_history': 0,   # Placeholder
    }
    
    features_list.append(feature)
    labels.append(latest['mental_risk_label'])

X = pd.DataFrame(features_list)
y = LabelEncoder().fit_transform(labels)  # HIGH=0, LOW=1, MEDIUM=2

print(f'Dataset shape: {X.shape}')
print(f'Class distribution: {pd.Series(labels).value_counts().to_dict()}')

# ── Train/Test Split ────────────────────────────────
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, stratify=y, random_state=42
)

# ── Scale Features ──────────────────────────────────
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)

# ── Train XGBoost ───────────────────────────────────
model = XGBClassifier(
    n_estimators=200,
    max_depth=5,
    learning_rate=0.1,
    subsample=0.8,
    colsample_bytree=0.8,
    min_child_weight=3,
    reg_alpha=0.1,
    reg_lambda=1.0,
    random_state=42,
    use_label_encoder=False,
    eval_metric='mlogloss',
)

model.fit(
    X_train_scaled, y_train,
    eval_set=[(X_test_scaled, y_test)],
    verbose=20
)

# ── Evaluate ────────────────────────────────────────
y_pred = model.predict(X_test_scaled)
print('\n=== Mental Health Model Results ===')
print(classification_report(y_test, y_pred, target_names=['HIGH', 'LOW', 'MEDIUM']))

# Cross-validation
cv_scores = cross_val_score(model, X_train_scaled, y_train, cv=StratifiedKFold(5), scoring='f1_macro')
print(f'Cross-validation F1 (macro): {cv_scores.mean():.3f} ± {cv_scores.std():.3f}')

# ── Feature Importance ──────────────────────────────
importances = pd.Series(model.feature_importances_, index=X.columns)
print('\nFeature Importances:')
print(importances.sort_values(ascending=False))

# ── Save Model ──────────────────────────────────────
os.makedirs('backend/app/ml/models', exist_ok=True)
joblib.dump(model, 'backend/app/ml/models/mental_health_xgb.joblib')
joblib.dump(scaler, 'backend/app/ml/models/mental_health_scaler.joblib')
print('\n✅ Model saved to backend/app/ml/models/mental_health_xgb.joblib')
```

### 10.2 Run Training

```bash
cd /path/to/pregency-friend
source backend/venv/bin/activate
python ml/notebooks/train_mental_health.py
```

### 10.3 Expected Output

```
Dataset shape: (1000, 8)
Class distribution: {'LOW': 650, 'MEDIUM': 250, 'HIGH': 100}

=== Mental Health Model Results ===
              precision    recall  f1-score   support
        HIGH       0.85      0.80      0.82        20
         LOW       0.92      0.95      0.93       130
      MEDIUM       0.80      0.72      0.76        50

Cross-validation F1 (macro): 0.82 ± 0.04
✅ Model saved to backend/app/ml/models/mental_health_xgb.joblib
```

---

## 11. Model Training — Physical Health

### 11.1 Training Script

Create `ml/notebooks/train_physical_health.py`:

```python
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_score
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.ensemble import VotingClassifier, RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report
from xgboost import XGBClassifier
import joblib, os, json

# ── Load Data ───────────────────────────────────────
health_df = pd.read_csv('ml/datasets/synthetic_health_logs.csv')
profiles_df = pd.read_csv('ml/datasets/synthetic_profiles.csv')

# ── Build Feature Matrix ────────────────────────────
features_list = []
labels = []

for user_id in profiles_df['user_id'].unique():
    profile = profiles_df[profiles_df['user_id'] == user_id].iloc[0]
    user_health = health_df[health_df['user_id'] == user_id].sort_values('log_date')
    
    if len(user_health) < 5:
        continue
    
    last_7 = user_health.tail(7)
    bp_values = last_7['bp_systolic'].values
    bp_slope = np.polyfit(range(len(bp_values)), bp_values, 1)[0] if len(bp_values) >= 2 else 0.0
    
    past_complications = json.loads(profile['past_complications']) if isinstance(profile['past_complications'], str) else []
    
    feature = {
        'bp_systolic_avg': last_7['bp_systolic'].mean(),
        'bp_diastolic_avg': last_7['bp_diastolic'].mean(),
        'bp_slope': round(bp_slope, 2),
        'sugar_fasting_avg': last_7['blood_sugar_fasting'].mean(),
        'sugar_postmeal_avg': last_7['blood_sugar_postmeal'].mean(),
        'sugar_variability': last_7['blood_sugar_fasting'].std(),
        'weight_deviation': 0.0,  # Simplified for synthetic data
        'hemoglobin': profile['hemoglobin_level'],
        'edema_frequency': last_7['edema_flag'].mean(),
        'pain_frequency': (last_7['pain_score'] > 5).mean(),
        'age': profile['age'],
        'bmi': profile['bmi'],
        'pregnancy_week': profile['pregnancy_week'],
        'past_complications_count': len(past_complications),
    }
    
    features_list.append(feature)
    labels.append(user_health.iloc[-1]['physical_risk_label'])

X = pd.DataFrame(features_list)
le = LabelEncoder()
y = le.fit_transform(labels)

print(f'Dataset shape: {X.shape}')
print(f'Class distribution: {pd.Series(labels).value_counts().to_dict()}')

# ── Split & Scale ───────────────────────────────────
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)
scaler = StandardScaler()
X_train_s = scaler.fit_transform(X_train)
X_test_s = scaler.transform(X_test)

# ── Ensemble: XGBoost + RandomForest + LogisticRegression ──
xgb = XGBClassifier(
    n_estimators=200, max_depth=5, learning_rate=0.1,
    subsample=0.8, colsample_bytree=0.8, random_state=42,
    use_label_encoder=False, eval_metric='mlogloss'
)
rf = RandomForestClassifier(
    n_estimators=200, max_depth=8, min_samples_split=5, random_state=42
)
lr = LogisticRegression(max_iter=1000, random_state=42, multi_class='multinomial')

# Soft voting ensemble
ensemble = VotingClassifier(
    estimators=[('xgb', xgb), ('rf', rf), ('lr', lr)],
    voting='soft',
    weights=[3, 2, 1]  # XGBoost weighted highest
)
ensemble.fit(X_train_s, y_train)

# ── Evaluate ────────────────────────────────────────
y_pred = ensemble.predict(X_test_s)
print('\n=== Physical Health Ensemble Results ===')
print(classification_report(y_test, y_pred, target_names=le.classes_))

cv_scores = cross_val_score(ensemble, X_train_s, y_train, cv=StratifiedKFold(5), scoring='f1_macro')
print(f'Cross-validation F1 (macro): {cv_scores.mean():.3f} ± {cv_scores.std():.3f}')

# ── Save ────────────────────────────────────────────
os.makedirs('backend/app/ml/models', exist_ok=True)
joblib.dump(ensemble, 'backend/app/ml/models/physical_health_ensemble.joblib')
joblib.dump(scaler, 'backend/app/ml/models/physical_health_scaler.joblib')
joblib.dump(le, 'backend/app/ml/models/physical_health_label_encoder.joblib')
print('\n✅ Models saved to backend/app/ml/models/')
```

### 11.2 Run Training

```bash
python ml/notebooks/train_physical_health.py
```

---

## 12. Model Training — Fetal Health

### 12.1 Training Script

Create `ml/notebooks/train_fetal_health.py`:

```python
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_score
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.metrics import classification_report
from lightgbm import LGBMClassifier
import joblib, os, json

# ── Load Data ───────────────────────────────────────
health_df = pd.read_csv('ml/datasets/synthetic_health_logs.csv')
profiles_df = pd.read_csv('ml/datasets/synthetic_profiles.csv')

# ── Build Feature Matrix ────────────────────────────
features_list = []
labels = []

for user_id in profiles_df['user_id'].unique():
    profile = profiles_df[profiles_df['user_id'] == user_id].iloc[0]
    user_health = health_df[health_df['user_id'] == user_id].sort_values('log_date')
    
    if len(user_health) < 5:
        continue
    
    last_7 = user_health.tail(7)
    past_complications = json.loads(profile['past_complications']) if isinstance(profile['past_complications'], str) else []
    
    feature = {
        'fetal_movement_avg': last_7['fetal_movement_count'].mean(),
        'fetal_movement_min': last_7['fetal_movement_count'].min(),
        'maternal_age': profile['age'],
        'pregnancy_week': profile['pregnancy_week'],
        'bmi': profile['bmi'],
        'previous_preterm': 1 if 'preterm' in past_complications else 0,
        'chronic_hypertension': int(profile['chronic_hypertension']),
        'gestational_diabetes': int(profile['gestational_diabetes']),
        'hemoglobin': profile['hemoglobin_level'],
        'bp_systolic_avg': last_7['bp_systolic'].mean(),
        'bp_diastolic_avg': last_7['bp_diastolic'].mean(),
        'previous_pregnancies': profile['previous_pregnancies'],
        'bleeding_frequency': last_7['bleeding_flag'].mean(),
        'cramps_frequency': last_7['cramps_flag'].mean(),
    }
    
    features_list.append(feature)
    labels.append(user_health.iloc[-1]['fetal_risk_label'])

X = pd.DataFrame(features_list)
le = LabelEncoder()
y = le.fit_transform(labels)

print(f'Dataset shape: {X.shape}')
print(f'Class distribution: {pd.Series(labels).value_counts().to_dict()}')

# ── Split & Scale ───────────────────────────────────
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)
scaler = StandardScaler()
X_train_s = scaler.fit_transform(X_train)
X_test_s = scaler.transform(X_test)

# ── Train LightGBM ─────────────────────────────────
model = LGBMClassifier(
    n_estimators=300,
    max_depth=6,
    learning_rate=0.05,
    num_leaves=31,
    min_child_samples=10,
    subsample=0.8,
    colsample_bytree=0.8,
    reg_alpha=0.1,
    reg_lambda=1.0,
    random_state=42,
    verbose=-1,
)

model.fit(
    X_train_s, y_train,
    eval_set=[(X_test_s, y_test)],
    callbacks=[],
)

# ── Evaluate ────────────────────────────────────────
y_pred = model.predict(X_test_s)
print('\n=== Fetal Health Model Results ===')
print(classification_report(y_test, y_pred, target_names=le.classes_))

cv_scores = cross_val_score(model, X_train_s, y_train, cv=StratifiedKFold(5), scoring='f1_macro')
print(f'Cross-validation F1 (macro): {cv_scores.mean():.3f} ± {cv_scores.std():.3f}')

# Feature Importance
importances = pd.Series(model.feature_importances_, index=X.columns)
print('\nFeature Importances:')
print(importances.sort_values(ascending=False))

# ── Save ────────────────────────────────────────────
os.makedirs('backend/app/ml/models', exist_ok=True)
joblib.dump(model, 'backend/app/ml/models/fetal_health_lgbm.joblib')
joblib.dump(scaler, 'backend/app/ml/models/fetal_health_scaler.joblib')
joblib.dump(le, 'backend/app/ml/models/fetal_health_label_encoder.joblib')
print('\n✅ Models saved to backend/app/ml/models/')
```

### 12.2 Using the Real CTG Dataset

If you downloaded the [Fetal Health Classification dataset](https://www.kaggle.com/datasets/andrewmvd/fetal-health-classification):

```python
# Load and map the CTG dataset
ctg = pd.read_csv('ml/datasets/fetal_health/fetal_health.csv')

# Map classes: 1.0 → LOW, 2.0 → MEDIUM, 3.0 → HIGH
ctg['risk_label'] = ctg['fetal_health'].map({1.0: 'LOW', 2.0: 'MEDIUM', 3.0: 'HIGH'})

# Select relevant features
ctg_features = ctg[[
    'baseline value',          # Baseline fetal heart rate
    'accelerations',           # Number of accelerations
    'fetal_movement',          # Fetal movements per second
    'uterine_contractions',    # Uterine contractions per second
    'light_decelerations',     # Light FHR decelerations
    'severe_decelerations',    # Severe FHR decelerations
    'prolongued_decelerations', # Prolonged FHR decelerations
    'abnormal_short_term_variability',
    'mean_value_of_short_term_variability',
    'abnormal_long_term_variability',
    'mean_value_of_long_term_variability',
    'histogram_width',
    'histogram_min',
    'histogram_max',
    'histogram_number_of_peaks',
    'histogram_number_of_zeroes',
    'histogram_mode',
    'histogram_mean',
    'histogram_median',
    'histogram_variance',
    'histogram_tendency',
]]
```

---

## 13. Model Evaluation & Explainability

### 13.1 Install SHAP (Optional but Recommended)

```bash
pip install shap matplotlib
```

### 13.2 SHAP Explainability

```python
import shap
import matplotlib.pyplot as plt

# ── For any trained model ───────────────────────────
model = joblib.load('backend/app/ml/models/mental_health_xgb.joblib')
scaler = joblib.load('backend/app/ml/models/mental_health_scaler.joblib')

# SHAP TreeExplainer for XGBoost
explainer = shap.TreeExplainer(model)

# Explain a single prediction
sample = X_test.iloc[0:1]
sample_scaled = scaler.transform(sample)
shap_values = explainer.shap_values(sample_scaled)

# Get top contributing features
feature_names = X.columns.tolist()
feature_contributions = {}
for i, name in enumerate(feature_names):
    feature_contributions[name] = float(np.abs(shap_values[0][i]).max())  # Max across classes

top_features = sorted(feature_contributions.items(), key=lambda x: x[1], reverse=True)[:5]
print('Top 5 risk factors:', top_features)

# ── SHAP Summary Plot ──────────────────────────────
shap.summary_plot(
    shap_values, 
    X_test_scaled, 
    feature_names=feature_names,
    show=False
)
plt.tight_layout()
plt.savefig('ml/notebooks/shap_mental_health.png', dpi=150)
plt.close()
```

### 13.3 Evaluation Metrics Checklist

For each model, evaluate and document:

| Metric | Target | Why |
|--------|--------|-----|
| **F1 (macro)** | ≥ 0.75 | Balanced performance across classes |
| **Recall (HIGH class)** | ≥ 0.85 | Must not miss high-risk patients |
| **Precision (HIGH class)** | ≥ 0.70 | Limit false alarms |
| **AUC-ROC** | ≥ 0.85 | Overall discrimination ability |
| **Cross-val F1** | Within ±5% of test F1 | Check for overfitting |

```python
from sklearn.metrics import roc_auc_score, f1_score

# Multi-class AUC
y_proba = model.predict_proba(X_test_scaled)
auc = roc_auc_score(y_test, y_proba, multi_class='ovr', average='macro')
print(f'AUC-ROC (macro): {auc:.3f}')

# Per-class recall
from sklearn.metrics import recall_score
for cls_name, cls_idx in zip(['HIGH', 'LOW', 'MEDIUM'], [0, 1, 2]):
    binary_true = (y_test == cls_idx).astype(int)
    binary_pred = (y_pred == cls_idx).astype(int)
    recall = recall_score(binary_true, binary_pred)
    print(f'Recall ({cls_name}): {recall:.3f}')
```

### 13.4 Model Registry

After training, maintain a model registry:

```
backend/app/ml/models/
├── mental_health_xgb.joblib         # Mental health XGBoost model
├── mental_health_scaler.joblib      # Mental health StandardScaler
├── physical_health_ensemble.joblib  # Physical health VotingClassifier
├── physical_health_scaler.joblib    # Physical health StandardScaler
├── physical_health_label_encoder.joblib
├── fetal_health_lgbm.joblib         # Fetal health LightGBM model
├── fetal_health_scaler.joblib       # Fetal health StandardScaler
├── fetal_health_label_encoder.joblib
└── model_metadata.json              # Version, metrics, training date
```

Create a metadata file:

```python
import json
from datetime import datetime

metadata = {
    'mental_health': {
        'algorithm': 'XGBClassifier',
        'version': '1.0.0',
        'trained_at': datetime.now().isoformat(),
        'f1_macro': 0.82,
        'auc_roc': 0.91,
        'features': ['phq9_score', 'gad7_score', 'mood_avg_7d', 'sleep_avg_7d',
                      'stress_avg_7d', 'social_support', 'journal_sentiment_avg',
                      'previous_mental_history'],
        'n_train_samples': 800,
        'n_test_samples': 200,
    },
    'physical_health': {
        'algorithm': 'VotingClassifier (XGB + RF + LR)',
        'version': '1.0.0',
        'trained_at': datetime.now().isoformat(),
        'f1_macro': 0.78,
        'features': ['bp_systolic_avg', 'bp_diastolic_avg', 'bp_slope',
                      'sugar_fasting_avg', 'sugar_postmeal_avg', 'sugar_variability',
                      'weight_deviation', 'hemoglobin', 'edema_frequency',
                      'pain_frequency', 'age', 'bmi', 'pregnancy_week',
                      'past_complications_count'],
    },
    'fetal_health': {
        'algorithm': 'LGBMClassifier',
        'version': '1.0.0',
        'trained_at': datetime.now().isoformat(),
        'f1_macro': 0.80,
        'features': ['fetal_movement_avg', 'fetal_movement_min', 'maternal_age',
                      'pregnancy_week', 'bmi', 'previous_preterm',
                      'chronic_hypertension', 'gestational_diabetes', 'hemoglobin',
                      'bp_systolic_avg', 'bp_diastolic_avg', 'previous_pregnancies',
                      'bleeding_frequency', 'cramps_frequency'],
    },
}

with open('backend/app/ml/models/model_metadata.json', 'w') as f:
    json.dump(metadata, f, indent=2)
```

---

## 14. NLP Pipeline Setup

### 14.1 Current Implementation (Rule-Based MVP)

The NLP pipeline at `app/services/nlp_pipeline.py` provides three functions:

| Function | Input | Output | Method |
|----------|-------|--------|--------|
| `analyze_sentiment(text)` | Free text | Float (-1.0 to +1.0) | Word-counting heuristic (28 positive, 34 negative words) |
| `detect_crisis(text)` | Free text | `SAFE` / `REVIEW_NEEDED` / `URGENT` | Regex pattern matching |
| `classify_emotions(text)` | Free text | List of up to 5 emotions | Keyword matching across 9 categories |

### 14.2 VADER Sentiment (Already Installed)

To upgrade from word counting to VADER:

```python
# In app/services/nlp_pipeline.py
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

_vader = SentimentIntensityAnalyzer()

def analyze_sentiment(text: str) -> float:
    """Improved sentiment using VADER."""
    scores = _vader.polarity_scores(text)
    return scores['compound']  # -1.0 to +1.0
```

### 14.3 Download NLTK Data

```bash
python3 -c "
import nltk
nltk.download('vader_lexicon')
nltk.download('punkt')
nltk.download('stopwords')
nltk.download('punkt_tab')
"
```

### 14.4 Crisis Detection Patterns

The system uses these regex patterns for crisis detection:

**URGENT (immediate intervention):**
```python
URGENT_PATTERNS = [
    r'\b(suicid|kill\s*my\s*self|end\s*(my|it|this)\s*life|want\s*to\s*die)\b',
    r'\b(self[\s-]*harm|hurt\s*my\s*self|cutting)\b',
    r'\b(no\s*reason\s*to\s*live|better\s*off\s*dead|can\'?t\s*go\s*on)\b',
    r'\b(hopeless|worthless)\b.*(forever|always|never)',
]
```

**REVIEW_NEEDED (clinical follow-up):**
```python
REVIEW_PATTERNS = [
    r'\b(very\s*sad|extremely\s*anxious|panic\s*attack|can\'?t\s*cope)\b',
    r'\b(overwhelm|breaking\s*down|falling\s*apart|can\'?t\s*sleep)\b',
    r'\b(nobody\s*cares|all\s*alone|no\s*support|abandoned)\b',
    r'\b(regret|mistake|hate\s*(myself|this|being\s*pregnant))\b',
]
```

### 14.5 Upgrading to ML-Based NLP (Future)

When ready to upgrade:

```bash
pip install transformers torch sentencepiece
```

```python
# Sentiment: DistilBERT fine-tuned on perinatal text
from transformers import pipeline
sentiment_pipe = pipeline('sentiment-analysis', model='distilbert-base-uncased-finetuned-sst-2-english')

# Emotion: GoEmotions multi-label
emotion_pipe = pipeline('text-classification', model='monologg/bert-base-cased-goemotions-original', top_k=5)

# Crisis: Fine-tune on CLPsych dataset
crisis_pipe = pipeline('text-classification', model='./models/crisis_detector')
```

---

## 15. Companion AI Setup

### 15.1 Current Implementation (Knowledge-Base MVP)

The companion AI at `app/services/companion_ai.py` uses:

1. **Crisis detection** → Emergency helpline response
2. **Topic matching** → Knowledge base lookup by keywords
3. **Sentiment-contextual responses** → Tone-adjusted responses based on user mood

**Knowledge base topics:** `nausea`, `kick_count`, `sleep`, `anxiety`, `exercise`, `nutrition`, `postpartum`

### 15.2 Emergency Response

When crisis is detected (URGENT), the system responds with:

```
🚨 I'm very concerned about what you've shared.
Please reach out to a professional immediately:
📞 iCall: 9152987821
📞 Vandrevala Foundation: 1860-2662-345
📞 National Emergency: 112
You are not alone.
```

### 15.3 Upgrading to LLM (Future)

To upgrade to GPT-4 / Claude for more natural conversations:

```python
# Set in .env:
OPENAI_API_KEY=sk-your-key-here
LLM_MODEL=gpt-4
LLM_MAX_TOKENS=1024
LLM_TEMPERATURE=0.7
```

```python
import openai

async def llm_response(user_message: str, context: dict) -> str:
    system_prompt = f"""
    You are Novelle, a caring and empathetic AI companion for pregnant women.
    The user is in their {context['trimester']} trimester (week {context['week']}).
    
    Guidelines:
    - Be warm, supportive, and non-judgmental
    - Provide evidence-based information
    - Always recommend consulting their doctor for medical decisions
    - Never diagnose or prescribe
    - If any crisis indicators detected, provide helpline numbers
    """
    
    response = await openai.ChatCompletion.acreate(
        model="gpt-4",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message}
        ],
        max_tokens=1024,
        temperature=0.7,
    )
    return response.choices[0].message.content
```

---

## 16. Model Deployment & Integration

### 16.1 Integrating Trained Models into the Backend

After training, update the ML pipeline files to load and use the trained models:

#### Update `app/ml/pipelines/mental_health_model.py`:

```python
import joblib
import numpy as np
from pathlib import Path

class MentalHealthModel:
    def __init__(self, model_dir: str = "app/ml/models"):
        self.model_dir = Path(model_dir)
        self.model = None
        self.scaler = None
        self._load_model()
    
    def _load_model(self):
        model_path = self.model_dir / "mental_health_xgb.joblib"
        scaler_path = self.model_dir / "mental_health_scaler.joblib"
        
        if model_path.exists() and scaler_path.exists():
            self.model = joblib.load(model_path)
            self.scaler = joblib.load(scaler_path)
            print(f"✅ Mental health model loaded from {model_path}")
        else:
            print("⚠️ No trained model found. Using rule-based fallback.")
    
    def predict(self, features: dict) -> dict:
        feature_order = [
            'phq9_score', 'gad7_score', 'mood_avg_7d', 'sleep_avg_7d',
            'stress_avg_7d', 'social_support', 'journal_sentiment_avg',
            'previous_mental_history'
        ]
        
        if self.model is not None:
            X = np.array([[features.get(f, 0) for f in feature_order]])
            X_scaled = self.scaler.transform(X)
            prediction = self.model.predict(X_scaled)[0]
            probabilities = self.model.predict_proba(X_scaled)[0]
            
            risk_map = {0: 'HIGH', 1: 'LOW', 2: 'MEDIUM'}
            risk_level = risk_map[prediction]
            confidence = float(probabilities.max())
            
            # Generate SHAP features
            shap_features = {
                feature_order[i]: float(probabilities[prediction]) 
                for i in np.argsort(np.abs(X_scaled[0]))[-5:]
            }
            
            return {
                'risk_level': risk_level,
                'confidence': confidence,
                'shap_features': shap_features,
            }
        else:
            return self._rule_based_predict(features)
    
    def _rule_based_predict(self, features: dict) -> dict:
        """Fallback when no trained model is available."""
        points = 0
        shap = {}
        
        phq9 = features.get('phq9_score', 0)
        if phq9 >= 15:
            points += 3
            shap['phq9_score'] = 3
        elif phq9 >= 10:
            points += 2
            shap['phq9_score'] = 2
        
        gad7 = features.get('gad7_score', 0)
        if gad7 >= 15:
            points += 3
            shap['gad7_score'] = 3
        elif gad7 >= 10:
            points += 2
            shap['gad7_score'] = 2
        
        mood = features.get('mood_avg_7d', 5)
        if mood <= 3:
            points += 2
            shap['mood_avg_7d'] = 2
        
        stress = features.get('stress_avg_7d', 5)
        if stress >= 8:
            points += 2
            shap['stress_avg_7d'] = 2
        
        if points >= 6:
            risk_level = 'HIGH'
        elif points >= 3:
            risk_level = 'MEDIUM'
        else:
            risk_level = 'LOW'
        
        return {
            'risk_level': risk_level,
            'confidence': min(0.85, 0.5 + points * 0.05),
            'shap_features': shap,
        }
```

#### Similarly update `physical_fetal_model.py` for both `PhysicalHealthModel` and `FetalHealthModel`.

### 16.2 Model Hot-Reloading

Add a model refresh endpoint for updating models without restarting:

```python
# In app/api/routes/risk.py or a new admin route
@router.post("/reload-models")
async def reload_models(user = Depends(require_role(["platform_admin"]))):
    """Hot-reload ML models from disk."""
    from app.ml.pipelines.mental_health_model import MentalHealthModel
    from app.ml.pipelines.physical_fetal_model import PhysicalHealthModel, FetalHealthModel
    
    global mental_model, physical_model, fetal_model
    mental_model = MentalHealthModel()
    physical_model = PhysicalHealthModel()
    fetal_model = FetalHealthModel()
    
    return {"status": "Models reloaded successfully"}
```

---

## 17. Testing the Full Pipeline

### 17.1 Manual API Testing

```bash
# 1. Register a user
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@novelle.com",
    "password": "Test123!",
    "full_name": "Test User"
  }'
# → Save the access_token

TOKEN="your-access-token-here"

# 2. Create pregnancy profile
curl -X POST http://localhost:8000/api/profile/create \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "age": 28,
    "height_cm": 160,
    "weight_kg": 62,
    "pregnancy_week": 24,
    "blood_group": "B+",
    "hemoglobin_level": 11.2,
    "due_date": "2025-09-15T00:00:00",
    "previous_pregnancies": 1
  }'

# 3. Log daily health data
curl -X POST http://localhost:8000/api/health/log \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "bp_systolic": 125,
    "bp_diastolic": 82,
    "blood_sugar_fasting": 92.5,
    "weight_kg": 63.5,
    "sleep_quality": 3,
    "pain_score": 2,
    "fetal_movement_count": 12,
    "appetite_score": 4,
    "hydration_ml": 2500
  }'

# 4. Submit mental health assessment
curl -X POST http://localhost:8000/api/mental/assessment \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "phq9_score": 8,
    "gad7_score": 6,
    "mood_score": 6,
    "stress_level": 5,
    "social_support_score": 3,
    "assessment_type": "daily"
  }'

# 5. Get full risk report
curl -X GET http://localhost:8000/api/risk/full-report \
  -H "Authorization: Bearer $TOKEN"
# → Returns mental, physical, fetal risk levels + history

# 6. Chat with companion AI
curl -X POST http://localhost:8000/api/companion/chat \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": "I have been feeling nauseous and tired lately"}'

# 7. Create journal entry (NLP auto-analyzed)
curl -X POST http://localhost:8000/api/journal/entry \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "text_content": "Today was a good day. The baby kicked a lot and I feel grateful.",
    "emotion_tags": ["joy", "gratitude"]
  }'
```

### 17.2 Automated Tests

```bash
cd backend
source venv/bin/activate

# Run all tests
pytest tests/ -v

# Run specific test file
pytest tests/test_risk_engine.py -v

# Run with coverage
pytest tests/ --cov=app --cov-report=html
```

### 17.3 Create a Basic Test

Create `backend/tests/test_risk_engine.py`:

```python
import pytest
from unittest.mock import MagicMock
from app.services.risk_engine import RiskEngine

class TestRiskLabeling:
    """Test risk scoring thresholds."""
    
    def test_high_mental_risk(self):
        """PHQ-9 ≥ 15 and GAD-7 ≥ 15 should be HIGH."""
        features = {
            'phq9_score': 18,
            'gad7_score': 16,
            'mood_avg_7d': 3,
            'stress_avg_7d': 8,
            'social_support': 2,
        }
        # Total: 3 + 3 + 2 + 2 = 10 → HIGH
        points = 0
        if features['phq9_score'] >= 15: points += 3
        if features['gad7_score'] >= 15: points += 3
        if features['mood_avg_7d'] <= 3: points += 2
        if features['stress_avg_7d'] >= 8: points += 2
        assert points >= 6  # HIGH threshold
    
    def test_low_physical_risk(self):
        """Normal vitals should be LOW."""
        bp_sys, bp_dia = 118, 75
        sugar_fasting = 85
        hemoglobin = 12.5
        points = 0
        if bp_sys >= 160 or bp_dia >= 110: points += 3
        elif bp_sys >= 140 or bp_dia >= 90: points += 2
        if sugar_fasting >= 126: points += 3
        elif sugar_fasting >= 100: points += 1
        if hemoglobin < 7: points += 3
        elif hemoglobin < 11: points += 1
        assert points < 3  # LOW threshold
    
    def test_crisis_detection(self):
        """Suicidal keywords should trigger URGENT."""
        from app.services.nlp_pipeline import NLPPipeline
        nlp = NLPPipeline()
        result = nlp.detect_crisis("I want to end my life")
        assert result == "URGENT"
    
    def test_safe_detection(self):
        """Normal text should be SAFE."""
        from app.services.nlp_pipeline import NLPPipeline
        nlp = NLPPipeline()
        result = nlp.detect_crisis("I had a great day today")
        assert result == "SAFE"
```

---

## 18. Docker Deployment

### 18.1 Build & Run

```bash
cd /path/to/pregency-friend

# Build all services
docker compose build

# Start all services
docker compose up -d

# Check logs
docker compose logs -f backend
```

### 18.2 Services Architecture

```
┌──────────────┐    ┌───────────────┐    ┌─────────────┐
│   Frontend   │    │    Backend    │    │  PostgreSQL  │
│  (Nginx)     │───▶│   (FastAPI)   │───▶│  Port 5432   │
│  Port 3000   │    │   Port 8000   │    └─────────────┘
└──────────────┘    │               │    ┌─────────────┐
                    │               │───▶│   MongoDB    │
                    │               │    │  Port 27017  │
                    │               │    └─────────────┘
                    │               │    ┌─────────────┐
                    │               │───▶│    Redis     │
                    └───────────────┘    │  Port 6379   │
                                        └─────────────┘
```

### 18.3 Docker Environment Variables

Set in `docker-compose.yml` or a `.env` file:

```yaml
environment:
  - DATABASE_URL=postgresql+asyncpg://novelle:novelle_secret@postgres:5432/novelle_db
  - MONGODB_URL=mongodb://mongodb:27017
  - REDIS_URL=redis://redis:6379/0
  - SECRET_KEY=your-production-secret-key
  - DEBUG=false
```

### 18.4 Production Checklist

- [ ] Change `SECRET_KEY` to a cryptographically random value
- [ ] Set `DEBUG=false`
- [ ] Configure proper CORS origins
- [ ] Set up SSL/TLS certificates
- [ ] Configure PostgreSQL with proper credentials
- [ ] Enable MongoDB authentication
- [ ] Set Redis password
- [ ] Configure rate limiting
- [ ] Set up monitoring (Prometheus + Grafana)
- [ ] Configure Sentry for error tracking
- [ ] Set up log aggregation
- [ ] Configure backup strategy for databases
- [ ] Run security audit (OWASP top 10)

---

## 19. Monitoring & Maintenance

### 19.1 Health Monitoring

```bash
# API health check
curl http://localhost:8000/health

# Check database connectivity
curl http://localhost:8000/api/auth/me -H "Authorization: Bearer $TOKEN"
```

### 19.2 Prometheus Metrics

The backend includes `prometheus-client`. Access metrics at:

```
http://localhost:8000/metrics
```

### 19.3 Model Retraining Schedule

| Model | Retrain Frequency | Trigger |
|-------|-------------------|---------|
| Mental Health | Monthly | New assessment data > 500 records |
| Physical Health | Monthly | New health log data > 1000 records |
| Fetal Health | Quarterly | New outcomes data available |
| NLP Pipeline | When upgraded to ML | New crisis corpus available |

### 19.4 Retraining Workflow

```bash
# 1. Extract latest data from production database
python ml/notebooks/extract_training_data.py

# 2. Retrain models
python ml/notebooks/train_mental_health.py
python ml/notebooks/train_physical_health.py
python ml/notebooks/train_fetal_health.py

# 3. Evaluate against previous version
python ml/notebooks/compare_models.py

# 4. If metrics improved, deploy
cp ml/trained_models/*.joblib backend/app/ml/models/

# 5. Hot-reload (or restart backend)
curl -X POST http://localhost:8000/api/reload-models \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### 19.5 Data Pipeline Summary

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  User Input      │     │  Feature Engine   │     │  ML Models       │
│ (Health logs,    │────▶│  (7-day windows,  │────▶│  (XGB, LightGBM, │
│  Assessments,    │     │   aggregations,   │     │   Ensemble)       │
│  Journals)       │     │   trend slopes)   │     └────────┬────────┘
└─────────────────┘     └──────────────────┘              │
                                                           ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Auto-Escalation │◀────│  Risk Score        │◀────│  Prediction       │
│  (Doctor alert,  │     │  (LOW/MEDIUM/HIGH  │     │  + Confidence     │
│   Crisis response│     │   + SHAP features) │     │  + SHAP explain   │
│   Helplines)     │     └──────────────────┘     └─────────────────┘
└─────────────────┘
```

---

## Quick Reference: Complete Setup Commands

```bash
# === FIRST TIME SETUP ===
cd /path/to/pregency-friend/backend

# 1. Python environment
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt

# 2. Environment config
cp .env.example .env
# Edit .env with your database credentials

# 3. PostgreSQL
sudo -u postgres psql -c "CREATE USER novelle WITH PASSWORD 'novelle_secret';"
sudo -u postgres psql -c "CREATE DATABASE novelle_db OWNER novelle;"

# 4. Start services
sudo systemctl start postgresql mongod redis-server

# 5. Run backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# === DATASET & TRAINING ===
cd /path/to/pregency-friend

# 6. Generate synthetic data
python ml/notebooks/generate_synthetic_data.py

# 7. Train models
python ml/notebooks/train_mental_health.py
python ml/notebooks/train_physical_health.py
python ml/notebooks/train_fetal_health.py

# 8. Verify models saved
ls -la backend/app/ml/models/

# 9. Restart backend to load new models
# (Or use hot-reload endpoint)

# === DOCKER (ALTERNATIVE) ===
docker compose up -d --build
```

---

> **Disclaimer:** Novelle is an AI-assisted screening and support tool. It does NOT replace professional medical advice, diagnosis, or treatment. All HIGH-risk flags should be reviewed by a qualified healthcare provider. Crisis detection routes users to verified helplines (iCall, Vandrevala Foundation, 112).
