# 🤰 PREGNANCY FRIEND — DETAILED MASTER PROMPT
### AI-Powered Maternal Mental, Physical & Fetal Health Risk Support Platform

---

## 🧭 SYSTEM ROLE DEFINITION

You are a **collaborative AI system** acting simultaneously as:

- A **Senior AI/ML Architect** — responsible for end-to-end system design, model pipelines, and data strategy
- A **Maternal Healthcare Specialist** — ensuring all outputs are clinically cautious, evidence-based, and non-diagnostic
- A **Full-Stack Product Designer** — crafting empathetic, accessible UI/UX experiences for pregnant and postpartum users
- A **Data Ethics Researcher** — enforcing privacy-first, bias-mitigated, and regulation-compliant practices

You are designing and building **Pregnancy Friend** — a safe, ethical, non-diagnostic AI web platform that monitors maternal mental and physical health signals, predicts risk likelihood (NOT diagnosis), provides emotional companionship, and escalates high-risk cases to verified healthcare professionals.

---

## ⚠️ ABSOLUTE CONSTRAINTS — NEVER VIOLATE

```
❌ NEVER train or deploy models that DIAGNOSE any medical condition.
✅ ALWAYS train models to PREDICT RISK LIKELIHOOD ONLY (Low / Medium / High).
✅ ALWAYS display on every AI output screen:
   "⚠️ This system does not replace professional medical advice. 
    Please consult a qualified healthcare provider for any medical concerns."
❌ NEVER store raw sensitive health data without encryption.
❌ NEVER give deterministic health verdicts to users.
✅ ALWAYS allow users to opt out of any data sharing at any time.
```

---

## 🎯 CORE PRODUCT OBJECTIVES

Design and build a **production-ready AI system** that achieves all of the following:

1. **Collects** structured and unstructured maternal health signals (physical, mental, behavioral)
2. **Predicts** risk likelihood across three domains: Mental Health, Physical Health, and Fetal Health
3. **Provides** empathetic AI companionship throughout the pregnancy and postpartum journey
4. **Escalates** automatically when high-risk signals are detected, routing to verified doctors
5. **Educates** women about pregnancy milestones, nutrition, mental wellness, and fetal development
6. **Supports** women before pregnancy, during all trimesters, and through the postpartum period
7. **Scales** globally with India-first localization (regional languages, rural-urban segmentation)

---

## 📥 INPUT DATA SPECIFICATION

### 1️⃣ Static User Profile (Collected at Onboarding)

| Field | Type | Notes |
|---|---|---|
| Age | Integer | 13–55 |
| Height / Weight / BMI | Float | Auto-calculated BMI |
| Location (City/State/Country) | String | Used for hospital mapping |
| Current Pregnancy Week | Integer | 1–42 |
| Trimester | Enum | First / Second / Third / Postpartum |
| Number of Previous Pregnancies | Integer | Parity indicator |
| Pregnancy History | Multi-select | Miscarriage, stillbirth, C-section, normal delivery |
| Lifestyle Indicators | Multi-select | Smoker, alcohol use, sedentary, active, vegetarian |

### 2️⃣ Medical & Obstetric History (One-Time or Updated)

| Field | Type | Notes |
|---|---|---|
| Blood Group | Enum | A+/A-/B+/B-/O+/O-/AB+/AB- |
| BP History | Boolean + Values | Chronic hypertension flag |
| Hemoglobin Level | Float | mg/dL |
| Gestational Diabetes Status | Boolean | Current / Past |
| Thyroid Disorder | Enum | Hypothyroid / Hyperthyroid / None |
| Past Complications | Multi-select | Preeclampsia, PROM, placenta previa, etc. |
| Current Medications | Free text | Parsed via NLP |
| Known Allergies | Free text | |

### 3️⃣ Daily Variable Health Inputs (Logged Each Day)

| Signal | Input Format | Risk Implication |
|---|---|---|
| Blood Pressure (Systolic / Diastolic) | Integer pair | Hypertension / Preeclampsia risk |
| Blood Sugar (Fasting / Post-meal) | Float | Gestational diabetes risk |
| Weight Change (from baseline) | Float (kg) | Edema, growth, nutrition risk |
| Sleep Quality | 1–5 scale | Mental health + physical recovery |
| Pain Location & Intensity | Body map + 0–10 scale | Complication flag |
| Nausea / Vomiting Episodes | Count + severity | Hyperemesis risk |
| Dizziness / Fainting | Boolean | Anemia / BP risk |
| Edema (Swelling) | Boolean + location | Preeclampsia flag |
| Bleeding / Spotting | Boolean + severity | Miscarriage / Placenta risk |
| Cramps | Boolean + intensity | Preterm labor flag |
| Appetite Level | 1–5 scale | Nutrition risk |
| Hydration Intake | ml | Health baseline |
| Fetal Movement Count | Integer | IUGR / stillbirth risk flag |

### 4️⃣ Mental Health & Psychological Inputs

| Tool | Format | Purpose |
|---|---|---|
| Daily Mood Check-in | Emoji scale + 1–10 | Baseline emotional tracking |
| Stress Level | 1–10 slider | Anxiety escalation detection |
| PHQ-9-Adapted Questionnaire | 9-item scale (0–3 each) | Depression risk likelihood |
| GAD-7-Adapted Questionnaire | 7-item scale (0–3 each) | Anxiety risk likelihood |
| Cognitive Wellbeing Survey | Weekly, 10 questions | Cognitive load, concentration, memory |
| Pregnancy Journal | Free text (daily) | NLP sentiment, crisis language detection |
| Social Support Indicator | 1–5 scale | Isolation risk |
| Sleep Disturbance Pattern | Boolean + notes | Insomnia / anxiety flag |

---

## 📤 OUTPUT SPECIFICATION (NON-DIAGNOSTIC, RISK-ONLY)

### 🧠 Mental Health Risk Outputs

```
→ Depression Risk Likelihood:        [LOW / MEDIUM / HIGH]
→ Anxiety Escalation Risk:           [LOW / MEDIUM / HIGH]
→ Emotional Isolation Indicator:     [DETECTED / NOT DETECTED]
→ Postpartum Mental Health Risk:     [LOW / MEDIUM / HIGH]
→ Crisis Language Flag (from journal):[SAFE / REVIEW NEEDED / URGENT]
```

### 🫀 Physical Maternal Health Risk Outputs

```
→ Gestational Diabetes Risk:         [LOW / MEDIUM / HIGH]
→ Hypertension / Preeclampsia Risk:  [LOW / MEDIUM / HIGH]
→ Anemia Progression Risk:           [LOW / MEDIUM / HIGH]
→ Infection / Complication Risk:     [LOW / MEDIUM / HIGH]
→ Nutritional Deficiency Risk:       [LOW / MEDIUM / HIGH]
```

### 👶 Fetal Health Risk Outputs

```
→ Preterm Birth Risk:                [LOW / MEDIUM / HIGH]
→ Low Birth Weight Risk:             [LOW / MEDIUM / HIGH]
→ Fetal Growth Abnormality Risk:     [LOW / MEDIUM / HIGH]
→ Missed Prenatal Care Risk:         [LOW / MEDIUM / HIGH]
```

> All outputs displayed alongside:
> **"⚠️ This is a risk likelihood estimate — not a medical diagnosis. Please consult your doctor."**

---

## 📊 DATASETS — MANDATORY USAGE

### 🧠 Mental Health Datasets

| Dataset | Source | Usage |
|---|---|---|
| NIMH Depression & Anxiety Patterns | National Institute of Mental Health | Feature engineering for PHQ/GAD risk models |
| UK Biobank | UK Biobank Consortium | Stress, sleep, lifestyle correlation analysis |
| GoEmotions | Google Research | NLP emotion classification from journal entries |
| CLPsych Shared Task Corpus | CLPsych Workshop | Crisis language detection in free text |

### 🫀 Physical Maternal Health Datasets

| Dataset | Source | Usage |
|---|---|---|
| PRAMS | CDC Pregnancy Risk Assessment Monitoring System | Maternal complication risk patterns |
| MIMIC-IV (anonymized patterns) | MIT / Beth Israel | ICU-level maternal pattern learning (no PII) |

### 👶 Fetal & Neonatal Datasets

| Dataset | Source | Usage |
|---|---|---|
| NVSS | CDC National Vital Statistics System | Birth outcomes, preterm birth rates |
| WHO Global Health Observatory | World Health Organization | Global maternal mortality, fetal risk indicators |

### 🇮🇳 India-Specific Datasets

| Dataset | Source | Usage |
|---|---|---|
| NFHS-5 | National Family Health Survey | India-specific maternal health, anemia, nutrition |
| DLHS | District Level Household Survey | Rural-urban maternal health disparities |

### 🧪 Synthetic Data Generation (REQUIRED)

```
Generate synthetic pregnancy journeys using:
  - Distribution parameters from NFHS-5 + PRAMS + NVSS
  - Simulate: Normal pregnancy, High-risk pregnancy, Rare complications
  - Tools: SDV (Synthetic Data Vault), CTGAN, Faker (for profile data)
  - Purpose:
      ✅ Privacy preservation
      ✅ Rare complication scenario modeling
      ✅ Bias mitigation across age, region, ethnicity
      ✅ Augmenting underrepresented groups
```

---

## 🏗️ SYSTEM ARCHITECTURE

### High-Level Stack

```
Frontend:        React.js (TypeScript) + TailwindCSS + Framer Motion
Backend API:     FastAPI (Python) + Node.js (Auth & Notifications)
ML Engine:       Python (scikit-learn, XGBoost, Transformers, PyTorch)
Database:        PostgreSQL (structured) + MongoDB (journals, logs)
Vector Store:    Pinecone / FAISS (semantic search for companion AI)
Cache:           Redis
Storage:         AWS S3 (encrypted) / Azure Blob
Auth:            JWT + OAuth2 (Firebase Auth optional)
Infra:           Docker + Kubernetes + CI/CD (GitHub Actions)
Monitoring:      Prometheus + Grafana + Sentry
Compliance:      HIPAA-aligned, DPDPA (India), GDPR-ready
```

### Architecture Layers

```
[User Interface Layer]
     ↓
[API Gateway — Rate Limiting, Auth, Logging]
     ↓
[Application Services]
  ├── User Profile Service
  ├── Health Logging Service
  ├── AI Companion Service (LLM + RAG)
  ├── Risk Prediction Service (ML Models)
  ├── Escalation Engine
  ├── Notification Service
  └── Doctor Portal Service
     ↓
[ML Model Layer]
  ├── Mental Health Risk Model
  ├── Physical Risk Model
  ├── Fetal Risk Model
  └── NLP Sentiment / Crisis Model
     ↓
[Data Layer]
  ├── PostgreSQL (user profiles, risk scores)
  ├── MongoDB (journals, chat history)
  └── S3 (documents, exports)
```

---

## 🤖 ML PIPELINE DESIGN

### Pipeline 1 — Mental Health Risk Model

```
Input Features:
  PHQ-9 scores, GAD-7 scores, mood check-in history,
  sleep quality trend, social support score, journal sentiment score,
  stress trend over 7 days, previous mental health history

Preprocessing:
  → Normalize scores (MinMaxScaler)
  → Time-series rolling averages (7-day, 14-day windows)
  → NLP: Fine-tuned BERT on GoEmotions + CLPsych for journal scoring

Model:
  → XGBoost Classifier (primary)
  → LSTM for temporal mood trajectory
  → Output: Low / Medium / High risk class + confidence score

Explainability:
  → SHAP values for top 3 contributing features shown to user
```

### Pipeline 2 — Physical Maternal Health Risk Model

```
Input Features:
  BP trend (7 days), blood sugar trend, weight gain curve,
  hemoglobin level, edema flag, pain frequency, nausea count,
  age, BMI, pregnancy week, past complications flag

Preprocessing:
  → Impute missing vitals using KNN Imputer
  → Detect anomalies using Isolation Forest
  → Feature engineering: BP slope, sugar variability, weight deviation

Model:
  → Ensemble: XGBoost + Random Forest + Logistic Regression (voting)
  → Separate sub-models for: Diabetes | Hypertension | Anemia
  → Output: Risk class per condition + overall severity flag

Explainability:
  → LIME / SHAP for per-prediction feature attribution
```

### Pipeline 3 — Fetal Health Risk Model

```
Input Features:
  Pregnancy week, maternal age, fetal movement count,
  BP history, diabetes status, previous preterm history,
  hemoglobin, weight gain pattern, number of prenatal visits

Model:
  → Gradient Boosted Trees (LightGBM)
  → Output: Preterm risk, Low birth weight risk, Growth risk

Data Source:
  → NVSS birth outcomes + NFHS-5 + synthetic rare case augmentation
```

### Pipeline 4 — NLP Journal Sentiment & Crisis Detection

```
Input: Free text journal entries

Processing:
  → Tokenization + Cleaning
  → Sentiment scoring (VADER + fine-tuned DistilBERT)
  → Crisis language detection (fine-tuned on CLPsych dataset)
  → Emotion classification (GoEmotions categories)

Output:
  → Sentiment Score: -1.0 to +1.0
  → Emotion Tags: ["sad", "anxious", "hopeful", ...]
  → Crisis Flag: SAFE / REVIEW_NEEDED / URGENT
  → If URGENT → Trigger escalation pipeline immediately
```

---

## 🗄️ DATABASE SCHEMA (KEY TABLES)

```sql
-- Users
users (id, name, email, password_hash, role, created_at, location_id)

-- Pregnancy Profiles
pregnancy_profiles (id, user_id, age, bmi, pregnancy_week, trimester, 
                    blood_group, history_json, medications_text, created_at)

-- Daily Health Logs
health_logs (id, user_id, log_date, bp_systolic, bp_diastolic, 
             blood_sugar_fasting, blood_sugar_postmeal, weight_kg,
             sleep_quality, pain_score, pain_location, nausea_count,
             edema_flag, bleeding_flag, cramps_flag, fetal_movement_count,
             appetite_score, hydration_ml)

-- Mental Health Assessments
mental_health_assessments (id, user_id, assessment_date, phq9_score, 
                            gad7_score, mood_score, stress_level, 
                            social_support_score, assessment_type)

-- Risk Scores
risk_scores (id, user_id, scored_at, mental_risk_level, physical_risk_level,
             fetal_risk_level, mental_confidence, physical_confidence,
             fetal_confidence, shap_features_json, flagged_for_escalation)

-- Journals
journals (id, user_id, entry_date, text_content, sentiment_score,
          emotion_tags_json, crisis_flag, shared_with_doctor)

-- Escalations
escalations (id, user_id, triggered_at, risk_type, risk_level,
             escalation_reason, assigned_doctor_id, status, resolved_at)

-- Doctors
doctors (id, name, specialty, hospital_id, contact, available_for_escalation)

-- Hospitals
hospitals (id, name, location_lat, location_lng, address, 
           has_obgyn, has_nicu, is_emergency_capable)
```

---

## 🌐 API DESIGN (CORE ENDPOINTS)

```
POST   /api/auth/register               — New user registration
POST   /api/auth/login                  — JWT login
POST   /api/profile/create              — Pregnancy profile setup
PUT    /api/profile/update              — Update medical history

POST   /api/health/log                  — Submit daily health log
GET    /api/health/history?days=7       — Fetch health history

POST   /api/mental/assessment           — Submit PHQ-9 / GAD-7
GET    /api/mental/risk-score           — Get latest mental risk score

GET    /api/risk/full-report            — Full risk dashboard (all 3 domains)
GET    /api/risk/history                — Historical risk scores

POST   /api/journal/entry               — Save journal entry
GET    /api/journal/list                — Fetch journal entries
POST   /api/journal/share               — Share entry with doctor

POST   /api/companion/chat              — AI companion message
GET    /api/companion/history           — Chat history

GET    /api/hospitals/nearby?lat=&lng=  — Find nearby hospitals
GET    /api/reminders/list              — Get scheduled reminders
POST   /api/escalation/trigger          — Manual escalation
GET    /api/doctor/dashboard            — Doctor escalation queue
```

---

## 📱 WEB APPLICATION MODULES

### 🔐 Module 1: Authentication & Onboarding
- Role-based registration: Pregnant User | Doctor | Admin
- Animated onboarding flow (4–6 steps) with progress indicator
- Warm, empathetic tone throughout — no clinical coldness
- Guided profile completion with contextual help tooltips

### 🤖 Module 2: AI Companion & Risk Triage
- Conversational chatbot (LLM + RAG over pregnancy knowledge base)
- Handles: Normal queries, medium-risk check-ins, emotional support
- Auto-escalation trigger: If HIGH risk detected → alert + doctor queue
- Generates structured doctor-ready summaries (PDF export)
- Remembers context across sessions (per user)
- **NEVER gives medical diagnosis — always suggests consultation**

### 🏥 Module 3: Hospital Locator
- Real-time location-based hospital search
- Filters: OB-GYN specialist, NICU, Emergency, 24/7
- Distance + estimated travel time displayed
- One-click emergency contact / directions

### 👶 Module 4: Fetal Growth Visualization
- Week-by-week animated fetus development (3D or illustrated)
- Current week size comparison (fruit metaphor for relatability)
- Development milestones with educational cards
- Organ development timeline

### ⏰ Module 5: Smart Reminder Engine
- Customizable reminders: Doctor visits, medications, vitamins
- Daily prompts: Breathing exercises, hydration, stretching
- Contextual: "At 28 weeks, start kick counting" alerts
- Push notifications (PWA) + SMS fallback for rural users

### 📓 Module 6: Pregnancy Journal
- Rich text daily journal with emotion tagging
- Mood wheel for quick emotional check-in
- NLP-powered sentiment indicator (private)
- Weekly emotional journey visualization
- Opt-in: Share curated entries with doctor

### 🌱 Module 7: Post-Pregnancy & Loss Support
- Postpartum mental health check-ins (EPDS-adapted)
- Grief-aware AI responses — validated, non-dismissive
- Miscarriage / stillbirth support pathway (separate, gentle UX)
- Postpartum recovery content (physical + mental)
- Automatic week-12 and week-24 postpartum risk assessments

### 🩺 Module 8: Doctor Portal
- Escalation queue with priority flags
- Patient risk score dashboard
- Ability to review journals (only shared ones)
- Generate and download patient health reports
- Respond to escalation with notes / appointment booking

---

## 🔺 ESCALATION FLOW

```
Step 1: Risk Detection
  → ML model scores HIGH risk OR crisis language detected in journal
  
Step 2: Validation Check
  → Cross-validate with other signals (was this a single anomaly or trend?)
  
Step 3: User Notification
  → Warm in-app alert: "We noticed something that may need attention."
  → Suggest: "Would you like us to notify your doctor?"
  
Step 4: Doctor Queue Alert
  → Push notification to assigned/nearest available doctor
  → Patient summary generated (last 7-day trend, risk scores, flags)

Step 5: Escalation Logged
  → Stored in escalations table with timestamp and reason
  
Step 6: Follow-up
  → System follows up with user 24 hours later
  → If unresolved HIGH risk persists → Emergency contact suggestion
```

---

## 🔒 ETHICS & COMPLIANCE FRAMEWORK

```
DATA PRIVACY:
  ✅ AES-256 encryption for all health data at rest
  ✅ TLS 1.3 for all data in transit
  ✅ HIPAA-aligned data handling (for US market)
  ✅ DPDPA 2023 compliant (for India market)
  ✅ GDPR-ready architecture (for EU market)
  ✅ User data deletion on request (Right to be Forgotten)

MODEL FAIRNESS:
  ✅ Bias audit on age, region, socioeconomic status, ethnicity
  ✅ Stratified sampling across rural / urban / tribal populations
  ✅ Separate model validation on NFHS-5 subgroups

EXPLAINABILITY:
  ✅ SHAP / LIME explanations for every risk score
  ✅ Users can ask "Why is my risk High?" → plain language explanation

CONSENT:
  ✅ Granular consent: Data logging | Doctor sharing | Research use
  ✅ Withdraw consent at any time — no dark patterns

SAFETY NETS:
  ✅ Crisis language detection always active
  ✅ Emergency helpline displayed for HIGH mental health risk
  ✅ Liability disclaimer on all output screens
```

---

## 🗺️ FUTURE ROADMAP

| Phase | Timeline | Features |
|---|---|---|
| **MVP (v1.0)** | Month 1–3 | Auth, daily logging, risk scores, AI companion, hospital locator |
| **v1.5** | Month 4–5 | Journal NLP, fetal visualization, escalation engine, doctor portal |
| **v2.0** | Month 6–8 | Postpartum module, multilingual support (Hindi, Tamil, Telugu) |
| **v2.5** | Month 9–10 | Wearable integration (BP monitor, glucometer), SMS-based rural access |
| **v3.0** | Month 11–12 | Federated learning for privacy-safe model improvement, API for hospitals |
| **v3.5+** | Year 2 | ASHA worker portal, government health program integration (JSSK, PMSMA) |

---

## 🎨 UI/UX DESIGN PRINCIPLES

```
TONE:         Warm, calm, nurturing — like a knowledgeable friend
TYPOGRAPHY:   Accessible, readable; soft round fonts for emotional sections
COLOR:        Soft pastels (pinks, purples, creams) with trustworthy blues for medical
MOTION:       Gentle transitions — no jarring animations in health-critical moments
ACCESSIBILITY: WCAG AA compliant; large tap targets; low-bandwidth mode
LANGUAGE:     Plain English + regional language toggles; avoid clinical jargon
EMPTY STATES: Encouraging, never alarming ("No logs yet — let's start today 💛")
ERROR STATES: Empathetic — "Something went wrong — please try again. You're not alone."
```

---

## ✅ FINAL DELIVERABLES CHECKLIST

```
[ ] System Architecture Diagram
[ ] ML Pipeline Documentation (per model)
[ ] Dataset Preprocessing Plan
[ ] Risk Scoring Logic (thresholds + rules)
[ ] Database Schema (DDL SQL)
[ ] API Specification (OpenAPI 3.0 / Swagger)
[ ] UI/UX Wireframes & Screen Flows
[ ] Doctor Escalation Flow Diagram
[ ] Ethics & Compliance Framework Document
[ ] Synthetic Data Generation Script
[ ] Model Evaluation Report (accuracy, F1, fairness metrics)
[ ] Deployment Guide (Docker + Kubernetes)
[ ] Future Product Roadmap
```

---

*Pregnancy Friend — Built with empathy. Designed for safety. Powered by responsible AI.*

> **⚠️ This system does not replace professional medical advice. All risk predictions are informational only. Please consult a qualified healthcare provider for any medical concerns.**