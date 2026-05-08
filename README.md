# Novelle — AI-Powered Maternal Health Risk Support Platform

**Empowering mothers with intelligent, compassionate pregnancy health monitoring**

> **Disclaimer:** Novelle is a risk-prediction support tool, not a diagnostic system. All outputs are statistical risk likelihood estimates. Always consult qualified healthcare professionals for medical decisions.

---

## Overview

Novelle is a full-stack platform for maternal health. It combines **patient** self-monitoring (health logs, mental health, AI insights, appointments), **doctor** clinical workflows (patients, appointments, escalations, notes, telehealth), **hospital administrator** operations (staff, patients, appointments, resources, communication), and **platform administrator** oversight (organizations, billing, security, analytics, global escalations). Core domains remain **mental**, **physical**, and **fetal** risk awareness, with escalation paths into clinical workflows.

### Key features

| Feature | Description |
| -------- | ----------- |
| **3-domain risk assessment** | Mental (screeners, mood), physical (vitals, symptoms), fetal risk signals |
| **Patient portal** | Dashboard, pregnancy timeline, AI insights, symptoms, appointments, teleconsultation, daily goals, wellness, risk reports, emergency info |
| **Doctor portal** | Dashboard, patients, appointments (newest first), escalations, monitoring, clinical notes, prescriptions, telehealth, AI copilot, reports, communication, tasks, settings |
| **Hospital admin** | Command center, patients & doctor assignment, appointments, escalations (routing), staff & workload, resources, communication, analytics, AI insights, reports, hospital records, settings |
| **Platform admin** | Overview, organizations, hospitals, users & provisioning, AI control center, analytics, global escalations, billing, infrastructure, security, communication, audit logs, integrations, support, reports, settings |
| **AI companion & journal** | Conversational support, journaling (Features routes) |
| **Telemedicine** | Session-oriented API + in-app telehealth views |
| **ML & MLOps** | Risk models plus optional v2 operational models (forecasts, engagement, no-show, etc.); training scripts in `backend/app/ml/` |
| **Event & notifications** | Background ingestion worker; clinical event bus wiring at startup |

---

## Documentation map

| Document | Purpose |
| -------- | ------- |
| **README.md** (this file) | Quick orientation, setup, routes, environment |
| [BACKEND_GUIDE.md](./BACKEND_GUIDE.md) | Databases, datasets, training pipelines, deployment detail |
| [docs/PREGNANCY_EXPERT_AND_DATASETS.md](./docs/PREGNANCY_EXPERT_AND_DATASETS.md) | **Pregnancy Expert** LLM mode (`/api/companion/expert-chat`) + dataset links for research & training |
| [prd.md](./prd.md) | Product requirements and vision |
| [ml/notebooks/README.md](./ml/notebooks/README.md) | Jupyter training workflow for core risk models |

---

## Tech stack

### Backend

- **Framework:** FastAPI (async), Python 3.11+
- **Data:** PostgreSQL (SQLAlchemy 2 async), MongoDB (Motor), Redis
- **Auth:** JWT (`python-jose`), bcrypt/password hashing (`SECRET_KEY`, `ALGORITHM` in settings)
- **ML:** scikit-learn, XGBoost, LightGBM, imbalanced-learn, SHAP; optional DistilBERT / sentiment stack in `requirements.txt`
- **Companion / LLM:** Configurable providers (see `backend/app/core/config.py` — use env vars, never commit real keys)

### Frontend

- **React 18** + **TypeScript** + **Vite**
- **Tailwind CSS**, **Zustand** (auth), **Axios**, **Recharts**, **Framer Motion**, **Lucide**, **react-hot-toast**

### DevOps

- Docker Compose for local full stack (see `docker-compose.yml`)
- Optional Nginx for production frontend (`frontend/nginx.conf`)

---

## Repository layout

```
pregency-friend/          # repo root (name may vary locally)
├── backend/
│   ├── main.py                    # FastAPI entry; route registration, lifespan
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── .env.example
│   └── app/
│       ├── core/                  # config, database, security
│       ├── models/                # SQLAlchemy ORM
│       ├── schemas/               # Pydantic schemas
│       ├── api/routes/            # auth, patient, doctor, hospital_admin, platform_admin, …
│       ├── services/              # risk engine, NLP, notifications, hospital ops, …
│       └── ml/                    # train_*.py, pipelines/, models/
├── frontend/
│   ├── package.json
│   ├── vite.config.ts
│   └── src/
│       ├── App.tsx                # Role-aware routes
│       ├── components/layout/     # AppLayout, Sidebar, Header
│       ├── pages/                 # Patient, doctor, admin, hospital-admin pages
│       ├── services/endpoints.ts  # API client helpers
│       ├── stores/
│       └── utils/
├── ml/notebooks/                  # Jupyter model development
├── docker-compose.yml
├── README.md
├── BACKEND_GUIDE.md
└── prd.md
```

---

## Getting started

### Prerequisites

- Python 3.11+
- Node.js 20+
- PostgreSQL 14+ (16 recommended)
- MongoDB 6/7+
- Redis 6/7+
- Docker & Docker Compose (optional)

### Environment files

```bash
cp backend/.env.example backend/.env
# Edit DATABASE_URL, MONGODB_URL, REDIS_URL, SECRET_KEY, optional LLM keys
```

### Databases only (Docker)

```bash
docker compose up -d mongodb redis postgres   # use whatever services exist in compose
```

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
python main.py             # serves http://0.0.0.0:8000 (see main for PORT)
# Or: uvicorn main:app --reload --port 8000
```

- **Swagger UI:** http://localhost:8000/docs  
- **OpenAPI JSON:** http://localhost:8000/openapi.json  

### Frontend

```bash
cd frontend
npm install
npm run dev      # http://localhost:3000 (or Vite default port)
```

### Full stack (Docker)

```bash
docker compose up --build
# Frontend: http://localhost:3000
# API: http://localhost:8000
```

---

## Roles, login, and main URLs

After login, users are redirected by role. Primary shells:

| Role | Default area | Example paths |
| ---- | ------------ | ------------- |
| Patient | `/patient` | `/patient/appointments`, `/patient/health-log`, … |
| Doctor | `/doctor` | `/doctor/appointments`, `/doctor/patients`, … |
| Hospital admin | `/hospital-admin` | `/hospital-admin/patients`, `/hospital-admin/escalations`, … |
| Platform admin | `/admin` | `/admin/users`, `/admin/escalations`, … |

### Test credentials (seed / dev; change in production)

| Role | Email | Password |
| ---- | ----- | -------- |
| Patient (pregnant) | `patient@novelle.com` | `Password123` |
| Patient (postpartum) | `postpartum@novelle.com` | `Password123` |
| Doctor | `doctor@novelle.com` | `Password123` |
| Hospital admin | `hadmin@novelle.com` | `Password123` |
| Platform admin | `admin@novelle.com` | `Password123` |

---

## HTTP API overview

Global prefix: **`/api`** (see `backend/main.py`).

| Prefix | Router | Typical use |
| ------ | ------ | ----------- |
| `/api/auth`, `/api/profile`, `/api/health`, `/api/mental-health`, `/api/risk`, `/api/features` | Core + features | Patient and shared flows |
| `/api/patient` | Patient portal | Dashboard-style aggregates, appointments, doctors, daily goals, wellness, … |
| `/api/doctor` | Doctor portal | Patients, appointments, escalations, notes, prescriptions, tasks, … |
| `/api/admin` | Admin (legacy/aux) | Older `/admin` tag routes if used |
| `/api/hospital-admin` | Hospital admin | Staff, patients, appointments, escalations, resources, settings, … |
| `/api/platform-admin` | Platform admin | Organizations, hospitals, users, billing, analytics, security, … |
| `/api/ingestion` | Ingestion | Data ingestion pipeline |
| `/api/telemedicine` | Telemedicine | Sessions |
| `/api/mlops` | MLOps | Model / pipeline operations |
| `/api/compliance` | Compliance tooling | Compliance-related endpoints |

Core auth examples:

| Method | Path | Description |
| ------ | ---- | ----------- |
| POST | `/api/auth/register` | Registration |
| POST | `/api/auth/login` | JWT login |
| GET | `/api/auth/me` | Current user |

Full detail: **Swagger** at `/docs`.

---

## Machine learning

- **Authoritative reference:** **[`docs/ML_MODELS_AND_DATASETS.md`](./docs/ML_MODELS_AND_DATASETS.md)** — every model file, training script, **dataset source**, **evaluation metrics printed during training** (CV, test accuracy, classification reports, MAE/R²), and runtime usage.
- **Default artifact directory:** `backend/app/ml/models/` (configurable via `ML_MODEL_DIR`).
- **Core risk training:** `python -m app.ml.train_risk_models` (from `backend/` with venv active).
- **Operational / v2 models (synthetic):** `python -m app.ml.train_v2_models`.
- **v2 on real/sourced data:** `python -m app.ml.train_v2_real_data` when CSVs exist under `ml/datasets/` (see doc §5 for paths).
- **Notebooks:** `ml/notebooks/` — mental, physical, fetal pipelines; artifacts copied to `backend/app/ml/models/`.

**Metrics:** The repo does not commit a frozen `metrics.json` for every run. After training, capture console output (e.g. `tee ml_training_report.txt`) for model cards. Synthetic runs produce **illustrative** accuracy/F1; external CSV runs reflect those files’ domains.

The app starts even if some `.joblib` files are missing; features that depend on them may degrade gracefully. Check startup logs for `ML Model [name]` lines.

---

## Risk scoring (summary)

- **Mental:** Screeners, mood, sleep, optional journal sentiment; tiered LOW / MEDIUM / HIGH with crisis keyword handling.
- **Physical:** Thresholds on BP, glucose, BMI, symptoms, trends.
- **Fetal:** CTG / growth-related signals via trained models where available.
- **Escalation:** High-risk signals feed hospital and doctor escalation workflows (see PRD clinical flow).

---

## Environment variables (reference)

Align with `backend/app/core/settings` and `.env.example`:

| Variable | Description |
| -------- | ----------- |
| `DATABASE_URL` | Async PostgreSQL URL (`postgresql+asyncpg://…`) |
| `DATABASE_URL_SYNC` | Sync URL for scripts if needed |
| `MONGODB_URL` | MongoDB connection |
| `MONGODB_DB_NAME` | Database name |
| `REDIS_URL` | Redis |
| `SECRET_KEY` | JWT signing secret |
| `ALGORITHM` | JWT algorithm (default `HS256`) |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Access token TTL |
| `CORS_ORIGINS` | Allowed browser origins (list in config) |
| `ML_MODEL_DIR` | Relative model directory |
| `RISK_CONFIDENCE_THRESHOLD` | Risk decision threshold |
| `ESCALATION_*` | Escalation timers |

Optional: `OPENAI_API_KEY`, `GEMINI_API_KEY`, `GROQ_API_KEY`, `GOOGLE_MAPS_API_KEY`, SMTP fields.

---

## Safety and ethics

- Does not diagnose; surfaces **risk likelihood** and educational context.
- Disclaimers on AI surfaces; crisis / emergency pathways in product copy.
- Doctor and hospital workflows are part of oversight, not a replacement for local protocol.
- Use **BACKEND_GUIDE** and **prd** for compliance and data-handling expectations.

---

## Roadmap (high level)

Shipped in tree: multi-role web app, hospital and platform admin APIs, doctor/patient appointment flows, ML training scripts (risk + v2 operational), telemedicine and MLOps routes, event/ingestion hooks.

Ongoing / future: deeper wearable integration, mobile clients, real-time channels, broader localization, federated or privacy-preserving training — see `prd.md` roadmap table.

---

## License

Educational and research use. **Not** approved for clinical deployment without appropriate regulatory review.

---

*Built for mothers everywhere.*
