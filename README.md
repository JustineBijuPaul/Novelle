# Novelle — AI-Powered Maternal Health Risk Support Platform

**Empowering mothers with intelligent, compassionate pregnancy health monitoring**

> ⚠️ **Disclaimer**: Novelle is a risk-prediction support tool, NOT a diagnostic system. All outputs represent statistical risk likelihood estimates. Always consult qualified healthcare professionals for medical decisions.

---

## Overview

Novelle is a full-stack AI-powered maternal health platform that tracks physical, mental, and fetal health throughout pregnancy. It provides risk likelihood assessments across three domains, an empathetic AI companion, journal features, hospital locator, smart reminders, and a doctor portal for clinical oversight.

### Key Features


| Feature                      | Description                                                                             |
| ---------------------------- | --------------------------------------------------------------------------------------- |
| **3-Domain Risk Assessment** | Mental (PHQ-9, GAD-7, EPDS), Physical (BP, blood sugar, BMI), Fetal health risk scoring |
| **AI Companion**             | Empathetic conversational AI with crisis detection and emotional support                |
| **Daily Health Logging**     | Track BP, blood sugar, weight, sleep, fetal movements, and symptoms                     |
| **Mental Health Check-In**   | Mood scoring, anxiety/depression screening, emotion tracking                            |
| **Baby Growth Tracker**      | Week-by-week fetal development milestones (weeks 4–40)                                  |
| **Private Journal**          | Encrypted emotional journaling with sentiment analysis                                  |
| **Hospital Locator**         | Find nearby hospitals using GPS with distance calculation                               |
| **Smart Reminders**          | Medication, appointment, and wellness reminders                                         |
| **Doctor Portal**            | Patient monitoring, risk dashboards, and escalation management                          |
| **GDPR Compliant**           | Right to deletion, data export, consent management                                      |


---

## Tech Stack

### Backend

- **Framework**: FastAPI (Python 3.11+), async/await
- **Database**: PostgreSQL 16 (SQLAlchemy async ORM) + MongoDB 7 (Motor) + Redis 7
- **Auth**: JWT (python-jose) + bcrypt password hashing
- **ML**: Trained XGBoost (Mental Health), Ensemble (Physical Health), LightGBM (Fetal Health), and Logistic Regression (NLP Sentiment) models using SMOTE for class imbalance. SHAP integration for explainability.
- **NLP**: Sentiment analysis, crisis keyword detection, emotion classification

### Frontend

- **Framework**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS 3.4 with custom design system
- **State**: Zustand (persisted auth store)
- **Charts**: Recharts
- **Animations**: Framer Motion
- **Icons**: Lucide React

### DevOps

- Docker Compose (PostgreSQL, MongoDB, Redis, Backend, Frontend)
- Nginx reverse proxy for production frontend

---

## Project Structure

```
novelle/
├── backend/
│   ├── main.py                  # FastAPI app entry point
│   ├── requirements.txt         # Python dependencies
│   ├── Dockerfile
│   ├── .env.example
│   └── app/
│       ├── core/                # Config, database, security
│       ├── models/              # SQLAlchemy ORM models
│       ├── schemas/             # Pydantic v2 request/response schemas
│       ├── api/routes/          # API endpoint handlers
│       ├── services/            # Business logic (RiskEngine, NLP, CompanionAI)
│       └── ml/pipelines/        # ML model stubs
├── frontend/
│   ├── package.json
│   ├── vite.config.ts
│   ├── Dockerfile
│   ├── nginx.conf
│   └── src/
│       ├── App.tsx              # Router
│       ├── components/layout/   # Sidebar, Header, AppLayout
│       ├── pages/               # All page components
│       ├── services/            # API client & endpoints
│       ├── stores/              # Zustand state management
│       ├── types/               # TypeScript type definitions
│       └── utils/               # Helpers, fetal milestone data
├── ml/notebooks/                # Jupyter notebooks for model development
├── docker-compose.yml
└── README.md
```

---

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 20+
- PostgreSQL 16+
- MongoDB 7+
- Redis 7+
- Docker & Docker Compose (optional)

### Running Infrastructure with Docker (Local Dev)

If you prefer running just the databases via Docker while running the frontend/backend locally:

```bash
# Start MongoDB and Redis in the background
docker compose up -d mongodb redis

#Starting the existing containers
docker start novelle-redis novelle-mongodb 
```

### Quick Start with Docker

```bash
# Clone the repository
git clone <repo-url> novelle
cd novelle

# Create backend .env file
cp backend/.env.example backend/.env
# Edit backend/.env with your settings

# Start all services
docker compose up --build

# Access the app
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000
# API Docs: http://localhost:8000/docs
```

### Manual Setup

#### Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Linux/macOS
# venv\Scripts\activate   # Windows

# Install dependencies
pip install -r requirements.txt

# Set environment variables
cp .env.example .env
# Edit .env with your database URLs

# Run the server
uvicorn main:app --reload --port 8000
```

#### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
# Opens at http://localhost:3000
```

### Test Credentials

### Test Credentials

| Role | Email | Password |
| :--- | :--- | :--- |
| **Patient (Pregnant)** | `patient@novelle.com` | `Password123` |
| **Patient (Postpartum)** | `postpartum@novelle.com` | `Password123` |
| **Doctor** | `doctor@novelle.com` | `Password123` |
| **Hospital Admin** | `hadmin@novelle.com` | `Password123` |
| **Platform Admin** | `admin@novelle.com` | `Password123` |


## API Endpoints


| Method | Endpoint                         | Description                     |
| ------ | -------------------------------- | ------------------------------- |
| POST   | `/api/auth/register`             | User registration               |
| POST   | `/api/auth/login`                | Login (returns JWT)             |
| GET    | `/api/auth/me`                   | Get current user                |
| POST   | `/api/profile/`                  | Create pregnancy profile        |
| GET    | `/api/profile/`                  | Get pregnancy profile           |
| POST   | `/api/health/`                   | Log daily health data           |
| GET    | `/api/health/summary`            | Get health summary with trends  |
| POST   | `/api/mental-health/`            | Submit mental health assessment |
| GET    | `/api/mental-health/mood-trend`  | Get mood trend data             |
| GET    | `/api/risk/full-report`          | Trigger full risk assessment    |
| GET    | `/api/risk/history`              | Risk score history              |
| POST   | `/api/features/companion/chat`   | AI companion conversation       |
| POST   | `/api/features/journal/`         | Create journal entry            |
| GET    | `/api/features/hospitals/nearby` | Find nearby hospitals           |
| GET    | `/api/features/reminders/`       | List reminders                  |
| GET    | `/api/doctor/dashboard`          | Doctor portal dashboard         |


Full interactive docs at `http://localhost:8000/docs` (Swagger UI).

---

## Risk Scoring

Novelle assesses risk across three domains:

### Mental Health Risk

- **Inputs**: PHQ-9, GAD-7, EPDS scores, mood, stress level, sleep quality, social support, journal sentiment
- **Scoring**: Weighted rule-based model → LOW / MEDIUM / HIGH
- **Crisis Detection**: Keyword-based NLP flags URGENT, REVIEW_NEEDED, or SAFE

### Physical Health Risk

- **Inputs**: BP (systolic/diastolic), blood sugar, BMI, weight trends, symptoms
- **Scoring**: Clinical threshold rules (e.g., BP ≥ 140/90 → HIGH)

### Fetal Health Risk

- **Inputs**: Cardiotocogram (CTG) features (baseline value, accelerations, decelerations, variability, and histogram patterns)
- **Scoring**: LightGBM model trained using SMOTE (due to 9.4x class imbalance). Achieves highly accurate detection: 96.9% Accuracy, 0.93 Macro F1, and 0.99 AUC-ROC for detecting Pathological and Suspect outcomes vs Normal.

### Auto-Escalation

HIGH-risk scores automatically trigger clinical escalation to the assigned doctor with severity level and reason.

---

## Environment Variables


| Variable                      | Description                  | Default                    |
| ----------------------------- | ---------------------------- | -------------------------- |
| `DATABASE_URL`                | PostgreSQL connection string | required                   |
| `MONGODB_URL`                 | MongoDB connection string    | required                   |
| `REDIS_URL`                   | Redis connection string      | `redis://localhost:6379/0` |
| `JWT_SECRET_KEY`              | Secret for JWT signing       | required                   |
| `JWT_ALGORITHM`               | JWT algorithm                | `HS256`                    |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Token expiry                 | `30`                       |
| `CORS_ORIGINS`                | Allowed CORS origins         | `http://localhost:3000`    |


---

## Safety & Ethics

- **Never diagnoses** — only predicts risk likelihood (LOW / MEDIUM / HIGH)
- **Disclaimer** displayed on every page with AI-generated content
- **Crisis detection** with emergency helpline numbers
- **GDPR compliance** — right to deletion, data export
- **Doctor oversight** — clinical escalation pathway
- **Explainable AI** — SHAP feature importance for transparency

---

## Roadmap

- **v1.5**: Replace rule-based models with trained XGBoost/LightGBM on synthetic data (SDV)
- **v1.5**: DistilBERT + VADER + GoEmotions for NLP pipeline
- **v2.0**: LLM integration (GPT-4 / Gemini-Pro) for companion
- **v2.0**: Real-time notifications (WebSocket)
- **v2.0**: Mobile app (React Native)
- **v2.5**: Wearable device integration (smartwatch vitals)
- **v2.5**: Multi-language support
- **v3.0**: LSTM time-series risk forecasting

---

## License

This project is for educational and research purposes. Not approved for clinical use.

---

Built for mothers everywhere
