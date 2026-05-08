# 🤰 PREGNANCY FRIEND
## Product Requirements Document (PRD)

*AI-Powered Maternal Mental, Physical & Fetal Health Risk Support Platform*

---

| Field | Details |
|---|---|
| **Document Version** | v1.1 |
| **Status** | Draft |
| **Date** | February 2026 (implementation snapshot May 2026) |
| **Classification** | Confidential |
| **Product Owner** | Pregnancy Friend Team |

---

> ⚠️ **Critical Disclaimer**
> This system does not replace professional medical advice. All AI-generated outputs are risk likelihood estimates only — not diagnoses. Users must consult qualified healthcare providers for any medical concerns.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Product Overview](#2-product-overview)
3. [Goals & Success Metrics](#3-goals--success-metrics)
4. [User Stories & Acceptance Criteria](#4-user-stories--acceptance-criteria)
5. [Functional Requirements](#5-functional-requirements)
6. [Machine Learning Requirements](#6-machine-learning-requirements)
7. [Non-Functional Requirements](#7-non-functional-requirements)
8. [System Architecture & Tech Stack](#8-system-architecture--tech-stack)
9. [Clinical Escalation Flow](#9-clinical-escalation-flow)
10. [UI / UX Design Principles](#10-ui--ux-design-principles)
11. [Ethics & Compliance Framework](#11-ethics--compliance-framework)
12. [Product Roadmap](#12-product-roadmap)
13. [Risks & Mitigation](#13-risks--mitigation)
14. [Glossary](#14-glossary)

---

> **Implementation snapshot (May 2026)**  
> The repository implements a multi-role web application: **patient** (`/patient/*`), **doctor** (`/doctor/*`), **hospital administrator** (`/hospital-admin/*`), and **platform administrator** (`/admin/*`) experiences, backed by FastAPI with PostgreSQL, MongoDB, and Redis. Hospital-scoped and platform-scoped JSON APIs live under `/api/hospital-admin` and `/api/platform-admin`; patient and doctor flows use `/api/patient`, `/api/doctor`, and shared `/api/*` modules. For setup, API prefixes, and training scripts see the root **README.md** and **BACKEND_GUIDE.md** §0.

---

## 1. Executive Summary

Pregnancy Friend is a safe, ethical, AI-powered web platform designed to support women throughout their pregnancy journey and postpartum recovery. The platform bridges a critical gap in maternal healthcare — providing continuous, compassionate health monitoring, mental wellness support, and intelligent risk awareness — without replacing clinical judgment.

### 1.1 Vision Statement

To be the most trusted AI companion for every pregnant woman in the world — empowering her with knowledge, emotional support, and early risk awareness, so that no maternal health concern goes unnoticed.

### 1.2 Mission

- Democratize access to maternal health information and risk awareness
- Provide 24/7 empathetic AI companionship during pregnancy and postpartum
- Predict health risk likelihood (NOT diagnose) across mental, physical, and fetal domains
- Automatically escalate high-risk signals to verified healthcare professionals
- Scale globally with an India-first localization strategy

### 1.3 Problem Statement

Globally, 295,000 women die annually from preventable pregnancy-related complications (WHO). In India alone, the maternal mortality ratio stands at 97 per 100,000 live births (NFHS-5). Critical gaps exist in:

- Early detection of physical complications such as preeclampsia and gestational diabetes
- Mental health support — postpartum depression affects 1 in 5 new mothers
- Fetal health monitoring between clinical visits
- Access to timely, empathetic health guidance — especially in rural and peri-urban areas

### 1.4 Solution Overview

> **Pregnancy Friend Solves This By:**
> Continuous AI-driven risk monitoring • Empathetic companion chatbot • Smart escalation to doctors • Week-by-week fetal education • Postpartum mental health support • India-ready multilingual access

---

## 2. Product Overview

### 2.1 Product Name & Tagline

| Field | Details |
|---|---|
| **Product Name** | Pregnancy Friend |
| **Tagline** | Your caring companion through every step of motherhood. |
| **Platform** | Web Application (PWA) — Mobile-responsive, offline-capable |
| **Target Markets** | India (Primary), Southeast Asia, Global (Secondary) |
| **Primary Language** | English (with Hindi, Tamil, Telugu — Phase 2) |

### 2.2 Target Users

| User Role | Description | Key Needs |
|---|---|---|
| **Pregnant User** | Women in any trimester or planning pregnancy | Risk awareness, companionship, education |
| **Postpartum User** | New mothers within 12 months post-delivery | Mental health support, recovery guidance |
| **Doctor / OB-GYN** | Healthcare professionals managing patients | Escalation alerts, patient summaries, monitoring |
| **Hospital Admin** | Healthcare institution administrators | Patient flow management, reporting |
| **Platform Admin** | Pregnancy Friend operations team | System management, compliance, analytics |

### 2.3 Non-Goals (Out of Scope)

- The system will **NOT** provide medical diagnoses of any kind
- The system will **NOT** replace clinical consultation or professional treatment
- The system will **NOT** store biometric or genomic data
- The system will **NOT** provide prescription recommendations
- The system will **NOT** operate as a telemedicine platform

---

## 3. Goals & Success Metrics

### 3.1 Business Goals

| # | Goal | Target (12 months) |
|---|---|---|
| G1 | Achieve 100,000 registered users across India | 100K MAU by end of Year 1 |
| G2 | Establish partnerships with 50+ hospitals / clinics | 50 signed MoUs |
| G3 | Achieve 4.5+ star rating on app stores | NPS score > 60 |
| G4 | Reduce missed prenatal visit rate among users | 30% reduction vs baseline |
| G5 | Contribute to measurable early detection of maternal risk | Published outcomes study by Month 18 |

### 3.2 Key Performance Indicators (KPIs)

#### User Engagement

| Metric | Baseline | Target (6 months) |
|---|---|---|
| Daily Active Users (DAU) | — | 40% of MAU |
| Daily Health Log Completion Rate | — | > 65% |
| Journal Entry Rate (weekly) | — | > 3 entries/week per user |
| Session Duration (avg) | — | > 8 minutes |
| Escalation Response Rate (Doctors) | — | > 90% within 4 hours |

#### ML Model Performance

| Model | Metric | Target |
|---|---|---|
| Mental Health Risk Model | F1 Score | > 0.82 |
| Physical Health Risk Model | AUC-ROC | > 0.88 |
| Fetal Risk Model | Precision (High-risk) | > 0.85 |
| NLP Crisis Detection | Recall (Crisis) | > 0.95 |

---

## 4. User Stories & Acceptance Criteria

### 4.1 Pregnant User Stories

| ID | User Story | Acceptance Criteria |
|---|---|---|
| US-01 | As a pregnant user, I want to log my daily vitals so the system can monitor my health trends over time. | User can log BP, blood sugar, weight, symptoms within 2 minutes. Data persists and displays as trend chart. |
| US-02 | As a pregnant user, I want to receive a risk likelihood score so I know when to seek medical attention. | Risk displayed as Low/Medium/High with plain-language explanation and always shows disclaimer. |
| US-03 | As a pregnant user, I want to chat with an AI companion about my concerns without feeling judged. | Companion responds empathetically within 3 seconds. Never provides a diagnosis. Escalates if crisis detected. |
| US-04 | As a pregnant user, I want to journal my emotions and track my mood over time. | Journal saved with NLP sentiment score. Weekly mood visualization generated. Option to share with doctor. |
| US-05 | As a pregnant user, I want to see my baby's weekly development milestones. | Animated fetal visualization shows size, organ development, and milestones for current pregnancy week. |
| US-06 | As a pregnant user, I want smart reminders for my medications and doctor visits. | Reminders delivered as push notifications. Can be customized and snoozed. Contextual reminders for pregnancy week. |
| US-07 | As a postpartum user, I want access to mental health support without stigma. | Postpartum module accessible after delivery. EPDS-adapted check-in available. Grief pathway for pregnancy loss. |

### 4.2 Doctor User Stories

| ID | User Story | Acceptance Criteria |
|---|---|---|
| DS-01 | As a doctor, I want to receive real-time alerts when my patient is flagged as high-risk. | Push notification + email within 5 minutes of high-risk flag. Summary includes last 7 days of vitals and risk reason. |
| DS-02 | As a doctor, I want to view a patient's health dashboard and risk score history. | Doctor portal displays full risk timeline, key vitals, mental health scores, and journal excerpts (if shared). |
| DS-03 | As a doctor, I want to download a structured patient health summary for clinical records. | PDF export available with 7-day or 30-day summary. Includes SHAP explanations for risk flags. |

---

## 5. Functional Requirements

### 5.1 Authentication & User Management

- Role-based registration: Pregnant User | Doctor | Hospital Admin | Platform Admin
- Email + password authentication with JWT tokens
- OAuth2 social login (Google) — optional
- Animated multi-step onboarding (4–6 steps) with progress indicator
- Profile completion score shown to encourage full data entry
- Account deletion with full data erasure (Right to be Forgotten)

### 5.2 Health Data Collection

#### Daily Health Log

| Field | Input Type | Risk Signal |
|---|---|---|
| Blood Pressure (Sys/Dia) | Integer pair | Hypertension / Preeclampsia |
| Blood Sugar (Fasting/Post-meal) | Float (mmol/L) | Gestational Diabetes |
| Weight (kg) | Float | Edema, Nutritional Risk |
| Sleep Quality | 1–5 scale | Mental Health + Recovery |
| Pain (Location + Intensity) | Body map + 0–10 | Complication Detection |
| Nausea / Vomiting | Count + severity | Hyperemesis Risk |
| Edema / Swelling | Boolean + location | Preeclampsia Flag |
| Fetal Movement Count | Integer (daily kicks) | IUGR / Fetal Distress |
| Bleeding / Spotting | Boolean + severity | Miscarriage / Placenta Risk |

### 5.3 Mental Health Assessment

- PHQ-9 adapted questionnaire — weekly, 9 items (0–3 each), max score 27
- GAD-7 adapted questionnaire — weekly, 7 items (0–3 each), max score 21
- Daily mood check-in via emoji wheel + 1–10 slider
- Stress level slider (1–10) with optional free-text reason
- Social support indicator survey — monthly
- All assessments stored with timestamp for trend analysis

### 5.4 AI Companion Chatbot

- LLM-powered conversational companion (RAG over curated pregnancy knowledge base)
- Handles: General pregnancy queries, emotional support, medium-risk check-ins
- Context-aware: Remembers user profile, current week, recent logs
- Crisis escalation: Auto-triggers if HIGH mental health risk or crisis language detected
- Doctor summary generation: On-demand structured PDF of conversation + risk data
- **NEVER** provides a medical diagnosis — always recommends professional consultation
- Graceful handoff language: *'Based on what you've shared, I'd encourage you to speak with your doctor soon.'*

### 5.5 Hospital Locator

- Location-based search using GPS or manual city/zip entry
- Filters: OB-GYN specialist, NICU available, 24/7 Emergency, Public/Private
- Displays: Distance, estimated travel time, contact info, specialties
- One-tap emergency call and Google Maps direction launch
- Offline caching of last 3 nearby hospitals for rural connectivity

### 5.6 Pregnancy Journal

- Rich text daily entries with character limit of 5,000
- Emotion tagging (multi-select): Joy, Anxious, Hopeful, Tired, Grateful, Scared, Calm
- NLP sentiment score shown privately as a trend chart (not shown per entry)
- Weekly emotional journey visualization (heatmap + radar chart)
- Opt-in sharing: User selects specific entries to share with linked doctor
- Crisis language flag: Backend-only alert if crisis pattern detected — does not alarm user

### 5.7 Smart Reminder Engine

| Reminder Type | Trigger Logic |
|---|---|
| Doctor Visit | User-set date — 3 days, 1 day, and morning-of alerts |
| Medication | User-configured time — daily push notification |
| Kick Count (≥28 weeks) | Auto-enabled at week 28 — daily reminder at 9 PM |
| Mental Health Check-In | Weekly — triggered if no assessment in 7 days |
| Hydration | Twice daily if hydration log below threshold |
| Breathing Exercise | Context: shown if stress score > 7 in last 3 days |

### 5.8 Post-Pregnancy & Loss Support

- Postpartum mental health module: EPDS-adapted check-ins at weeks 2, 6, 12, 24 post-delivery
- Pregnancy loss pathway: Separate, sensitively designed UX for miscarriage, stillbirth, infant loss
- Grief-aware AI: Validated, non-dismissive responses; no cheerful platitudes
- Physical recovery content: C-section recovery, breastfeeding support, pelvic floor guidance
- Partner support resources: Content for partners and family members

---

## 6. Machine Learning Requirements

> ⚠️ **Core ML Constraint**
> All models predict RISK LIKELIHOOD only (Low / Medium / High). No model shall be trained or deployed to provide a medical diagnosis. All outputs must be accompanied by the medical disclaimer.

**Implementation inventory (May 2026):** The shipped codebase trains and loads models documented in **`docs/ML_MODELS_AND_DATASETS.md`** — including core XGBoost/LightGBM risk classifiers on **synthetic + SDV-augmented** data, optional **v2** models (preterm proxy, BP forecaster, GDM proxy, engagement, escalation ranker, no-show, TF-IDF recommender, extractive summarizer), optional **TF-IDF sentiment/emotion** joblibs, and CSV-backed paths for Kaggle/UCI datasets. Sections below remain the **product target**; the doc above is the **engineering truth** for filenames and training scripts.

### 6.1 Mental Health Risk Model

| Attribute | Specification |
|---|---|
| **Input Features** | PHQ-9 scores, GAD-7 scores, mood check-in history, sleep quality trend (7-day rolling), stress level, social support score, journal NLP sentiment, previous mental health history |
| **Primary Model** | XGBoost Classifier with temporal features from LSTM mood trajectory |
| **Output Classes** | Low Risk \| Medium Risk \| High Risk (+ confidence probability) |
| **Datasets** | NIMH datasets, UK Biobank, GoEmotions (NLP), CLPsych (crisis detection) |
| **Explainability** | SHAP values showing top 3 contributing features in plain language |
| **Escalation Trigger** | HIGH risk class OR crisis language flag from NLP pipeline |

### 6.2 Physical Maternal Health Risk Model

| Attribute | Specification |
|---|---|
| **Input Features** | BP trend (7 days), blood sugar variability, weight gain curve, hemoglobin, edema flag, pain frequency, age, BMI, pregnancy week, past complications |
| **Sub-Models** | 1) Gestational Diabetes  2) Hypertension/Preeclampsia  3) Anemia Progression |
| **Model Architecture** | Ensemble: XGBoost + Random Forest + Logistic Regression (soft voting) |
| **Anomaly Detection** | Isolation Forest for sudden spike detection in vitals |
| **Datasets** | CDC PRAMS, MIMIC-IV (pattern learning, no PII), NFHS-5, Synthetic data |

### 6.3 Fetal Health Risk Model

| Attribute | Specification |
|---|---|
| **Input Features** | Pregnancy week, fetal movement count, maternal age, BP history, diabetes status, previous preterm history, hemoglobin, prenatal visit count |
| **Risk Outputs** | Preterm Birth Risk \| Low Birth Weight Risk \| Growth Abnormality Risk \| Missed-Care Risk |
| **Model** | LightGBM with class weight balancing for rare outcomes |
| **Datasets** | NVSS Birth Statistics, WHO Global Health Observatory, NFHS-5, DLHS, Synthetic |

### 6.4 NLP Sentiment & Crisis Detection Pipeline

- **Input:** Raw free-text journal entries
- **Sentiment Scoring:** Fine-tuned DistilBERT + VADER ensemble → score range -1.0 to +1.0
- **Emotion Classification:** GoEmotions fine-tuned model → 28 emotion categories
- **Crisis Language Detection:** Fine-tuned model on CLPsych Shared Task corpus
- **Crisis Output:** `SAFE` | `REVIEW_NEEDED` | `URGENT` — URGENT immediately triggers escalation
- All NLP processing done server-side; raw journal text never stored in logs tables

### 6.5 Synthetic Data Strategy

- **Tool:** Synthetic Data Vault (SDV) with CTGAN for tabular health data
- **Source distributions:** NFHS-5, PRAMS, NVSS birth outcomes
- **Scenarios simulated:** Normal pregnancy, High-risk (preeclampsia, GDM, preterm), Rural low-access, Adolescent pregnancy
- **Volume:** 500,000 synthetic pregnancy journeys across 9 months
- **Usage:** Model training augmentation, bias mitigation, rare event simulation
- **Validation:** KS-test and Jensen-Shannon divergence against real dataset distributions

---

## 7. Non-Functional Requirements

### 7.1 Performance

| Requirement | Target |
|---|---|
| API Response Time (p95) | < 300ms for data queries; < 2s for ML risk scoring |
| Page Load Time | < 2 seconds on 4G; < 5 seconds on 3G (India rural) |
| ML Inference Latency | < 1.5 seconds for full risk score computation |
| AI Companion Response | < 3 seconds first token; streaming response displayed |
| Concurrent Users | Support 10,000 concurrent users at MVP; 100K at v2.0 |
| Uptime SLA | 99.9% uptime (< 8.7 hours downtime/year) |

### 7.2 Security & Privacy

- AES-256 encryption for all health data at rest
- TLS 1.3 for all data in transit
- Zero-knowledge architecture for journal content — encrypted before server storage
- Role-based access control (RBAC) — doctors cannot access unlinked patients
- Audit logs for all data access events (immutable)
- Regular penetration testing — quarterly
- Data residency: India user data stored on servers within India (AWS Mumbai / Azure India)

### 7.3 Compliance

| Regulation | Applicability | Key Requirement |
|---|---|---|
| **DPDPA 2023** | India — all users | Explicit consent, data minimization, right to erasure |
| **HIPAA (Safe Harbor)** | US market expansion | 18 PHI identifiers de-identified, audit controls |
| **GDPR** | EU market expansion | Lawful basis, DPO appointment, cross-border transfer rules |
| **IT Act 2000 (India)** | India — all operations | Sensitive personal data rules, grievance officer |

### 7.4 Accessibility

- WCAG 2.1 AA compliance across all web interfaces
- Minimum font size 16px; all tap targets ≥ 44×44px
- Color contrast ratio ≥ 4.5:1 for all text
- Screen reader support (ARIA labels on all interactive elements)
- Low-bandwidth mode: Disable animations, reduce image quality, cache aggressively
- Regional language toggle (Hindi, Tamil, Telugu — Phase 2)

---

## 8. System Architecture & Tech Stack

### 8.1 Technology Stack

| Layer | Technology | Justification |
|---|---|---|
| **Frontend** | React.js (TypeScript) + TailwindCSS + Framer Motion | PWA support, fast rendering, rich animations |
| **Backend API** | FastAPI (Python) + Node.js (Auth/Notifications) | ML-native Python; Node for real-time push events |
| **ML Engine** | scikit-learn, XGBoost, LightGBM, Transformers, PyTorch | Best-in-class for tabular + NLP tasks |
| **Primary Database** | PostgreSQL | ACID compliance for health data integrity |
| **Document Store** | MongoDB | Flexible schema for journals and chat history |
| **Vector Store** | Pinecone / FAISS | Semantic search for RAG companion knowledge base |
| **Cache** | Redis | Session state, ML inference caching |
| **File Storage** | AWS S3 (Mumbai) / Azure Blob India | Encrypted health reports, exports, media |
| **Authentication** | JWT + OAuth2 (Firebase Auth optional) | Stateless, scalable, industry-standard |
| **Infrastructure** | Docker + Kubernetes + GitHub Actions CI/CD | Auto-scaling, zero-downtime deployments |
| **Monitoring** | Prometheus + Grafana + Sentry | Real-time observability and error tracking |

### 8.2 Key API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | New user registration with role assignment |
| `POST` | `/api/health/log` | Submit daily health vitals and symptoms |
| `GET` | `/api/risk/full-report` | Retrieve full risk score across all 3 ML domains |
| `POST` | `/api/journal/entry` | Save journal entry — triggers async NLP pipeline |
| `POST` | `/api/companion/chat` | Send message to AI companion — streaming response |
| `GET` | `/api/hospitals/nearby` | Location-based hospital search (`?lat=&lng=`) |
| `GET` | `/api/doctor/dashboard` | Doctor escalation queue and patient overview |
| `POST` | `/api/escalation/trigger` | Manual or auto escalation with reason and severity |

---

## 9. Clinical Escalation Flow

The escalation engine is one of the most safety-critical components of Pregnancy Friend. The following process governs how high-risk signals are detected, validated, communicated, and resolved.

| Step | Stage | Detail |
|---|---|---|
| **1** | Risk Detection | ML model outputs HIGH risk class (confidence > 0.75) OR NLP pipeline flags URGENT crisis language in journal entry. |
| **2** | Signal Validation | Cross-validate: Was this a single anomaly or a 3-day trend? Single anomaly → MEDIUM escalation. Sustained trend → HIGH escalation. |
| **3** | User Notification | Warm in-app message: *'We noticed some patterns in your health data that may need attention. Would you like us to alert your doctor?'* — User may opt out of notification (logged). |
| **4** | Doctor Alert | Push notification + email to assigned doctor within 5 minutes. Includes: 7-day vitals trend, risk score, SHAP explanation, last shared journal sentiment. |
| **5** | Escalation Logged | Escalation record created: `user_id`, `timestamp`, `risk_type`, `risk_level`, `reason`, `assigned_doctor_id`, `status = OPEN`. |
| **6** | Doctor Response | Doctor reviews and marks as Acknowledged / Appointment Scheduled / Resolved within portal. Status updated in real-time. |
| **7** | Follow-Up Check | System follows up with user 24 hours after escalation. If risk persists unresolved after 48 hours → secondary alert sent. After 72 hours → emergency contact guidance displayed. |

> 🚨 **Mental Health Crisis Protocol**
> If NLP detects URGENT crisis language (suicidal ideation, self-harm indicators), the system immediately displays emergency helplines (iCall India: 9152987821, Vandrevala Foundation: 1860-2662-345), alerts the assigned doctor, and the AI companion suspends normal conversation mode to provide crisis-specific empathetic support.

---

## 10. UI / UX Design Principles

### 10.1 Design Philosophy

Pregnancy Friend should feel like a warm, knowledgeable friend — never a clinical tool. Every screen interaction must prioritize emotional safety, clarity, and trust.

### 10.2 Design System

| Element | Specification |
|---|---|
| **Primary Color** | Deep Rose `#C2185B` — trust and warmth for a healthcare context |
| **Secondary Color** | Purple `#7B1FA2` — calm, mindfulness, AI companion |
| **Accent** | Teal `#00796B` — health data, positive indicators, safety |
| **Typography** | Display: Recoleta (warm, soft serifs for headings) \| Body: DM Sans (clean, readable at small sizes) |
| **Motion** | Gentle fade + slide transitions; no jarring motion near health alerts; celebratory confetti on milestones |
| **Iconography** | Custom hand-drawn style icons for pregnancy milestones; Lucide icons for UI elements |
| **Risk Colors** | Low = Soft Green `#66BB6A` \| Medium = Amber `#FFA726` \| High = Rose `#E53935` (never "red alarm" — always warm) |

### 10.3 Key UX Rules

- Never display a risk score without the medical disclaimer visible on the same screen
- Empty states must be encouraging: *'No logs yet — let's start today 💛'*
- Error messages must be empathetic: *'Something went wrong. You're not alone — please try again.'*
- All health input forms show a progress indicator — no overwhelming single-page forms
- Doctor-sharing of journals is always opt-in; default is private
- One primary CTA per screen — never overwhelm with choices during emotional moments
- Dark mode available — many users check symptoms at night

---

## 11. Ethics & Compliance Framework

### 11.1 Core Ethical Principles

| Principle | Implementation |
|---|---|
| **Non-Maleficence** | Models predict risk only. No diagnosis. Disclaimer on every output. Crisis detection triggers human escalation. |
| **Autonomy** | Users control all data sharing. Granular consent for: logging, doctor sharing, research. Withdrawal at any time. |
| **Fairness & Equity** | Bias audits across age, region, socioeconomic status, caste, urban/rural. Stratified sampling in training data. |
| **Transparency** | SHAP/LIME explanations for every risk score. Users can ask *'Why is my risk High?'* and receive plain-language explanation. |
| **Privacy by Design** | Data minimization principle. Journal text zero-knowledge encrypted. No data sold or shared with advertisers. |
| **Accountability** | All model decisions logged. Quarterly ethics review board. External audit before major model updates. |

### 11.2 Model Fairness Requirements

- **Bias evaluation:** All models evaluated across subgroups — age (under 20, 20–35, 35+), income level, geography (urban/rural), religion-neutral features only
- **Fairness metrics:** Equal opportunity, demographic parity, calibration across subgroups
- **Minimum sample representation:** No subgroup with fewer than 500 real samples in training set
- **Annual retraining** with updated datasets including new population representation
- **Third-party fairness audit** before v2.0 and v3.0 releases

---

## 12. Product Roadmap

| Phase | Timeline | Features | Success Criteria |
|---|---|---|---|
| **MVP v1.0** | Month 1–3 | Auth, daily health logging, physical risk model, basic AI companion, hospital locator | 1,000 beta users; risk model F1 > 0.80 |
| **v1.5** | Month 4–5 | Mental health module, journal NLP, fetal visualization, escalation engine, doctor portal | 50 doctor partners; escalation response rate > 85% |
| **v2.0** | Month 6–8 | Postpartum + loss support module, smart reminders, multilingual (Hindi, Tamil, Telugu) | 10,000 users; NPS > 55; postpartum module 4.5+ rating |
| **v2.5** | Month 9–10 | Wearable integration (BP monitor, glucometer), SMS access for rural users, offline PWA mode | Rural user cohort > 20% of user base |
| **v3.0** | Month 11–12 | Federated learning for privacy-safe model improvement, hospital API integration, API for third-party EHRs | 50 hospital API integrations; model improvement without raw data access |
| **v3.5+** | Year 2 | ASHA worker portal, JSSK/PMSMA government program integration, AI-powered nutrition planner, community support groups | Government MoU signed; 100K active users |

---

## 13. Risks & Mitigation

| # | Risk | Severity | Mitigation |
|---|---|---|---|
| R1 | Model predicts false-negative — HIGH risk missed | 🔴 Critical | Prioritize recall over precision for HIGH risk class. Conservative thresholds. Weekly model calibration checks. |
| R2 | User over-relies on AI and skips doctor visits | 🟠 High | Disclaimer on every output. Reminders to attend scheduled visits. Companion never discourages clinical care. |
| R3 | Data privacy breach exposing health records | 🔴 Critical | AES-256 at rest, TLS in transit, zero-knowledge journal encryption, regular pen testing. |
| R4 | Model bias against rural / low-literacy users | 🟠 High | NFHS-5 and DLHS data inclusion. Stratified training. Fairness audit before each major release. |
| R5 | Doctors fail to respond to escalation alerts | 🟡 Medium | SLA agreement with doctor partners. Escalation re-routes to secondary doctor after 4-hour non-response. Emergency helpline shown to user. |
| R6 | Regulatory non-compliance (DPDPA) | 🟠 High | Legal counsel engaged pre-launch. DPO appointed. Privacy-by-design architecture from Day 1. |

---

## 14. Glossary

| Term | Definition |
|---|---|
| **Risk Likelihood** | A probabilistic prediction (Low / Medium / High) of a potential health concern — not a diagnosis. |
| **PHQ-9** | Patient Health Questionnaire-9: standardized 9-item depression screening tool. |
| **GAD-7** | Generalized Anxiety Disorder-7: standardized 7-item anxiety screening tool. |
| **PRAMS** | Pregnancy Risk Assessment Monitoring System — CDC population-based surveillance. |
| **NFHS-5** | National Family Health Survey 5th round — India's most comprehensive maternal health dataset. |
| **SHAP** | SHapley Additive exPlanations — ML explainability framework showing feature contributions. |
| **RAG** | Retrieval-Augmented Generation — AI technique that grounds LLM responses in a curated knowledge base. |
| **EPDS** | Edinburgh Postnatal Depression Scale — validated screening tool for postpartum depression. |
| **PWA** | Progressive Web App — web application that works offline and can be installed on mobile devices. |
| **IUGR** | Intrauterine Growth Restriction — a condition where the fetus does not grow to expected size. |
| **DPDPA** | Digital Personal Data Protection Act 2023 — India's primary data privacy legislation. |

---

> 📋 **Document Sign-Off Pending**
> This PRD requires review and sign-off from: Product Owner, Clinical Advisor, Engineering Lead, Legal / Compliance, and Data Privacy Officer before development begins.

---

**⚠️ This system does not replace professional medical advice.**

*Pregnancy Friend — Built with empathy. Designed for safety. Powered by responsible AI.*