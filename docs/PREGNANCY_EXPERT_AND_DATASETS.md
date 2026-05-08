# Pregnancy Expert LLM mode & where to find datasets

## What was added in code

**This is not a newly trained neural network.** Novelle already uses **hosted** large language models (Google Gemini and/or Groq) for chat. The **Pregnancy Expert** path is a **separate module** with:

- Its own **system prompt** tuned for structured **patient education** (general precautions, lifestyle, when to seek care).
- Lower **temperature** (0.45) and higher **max tokens** than casual companion chat, for steadier, more detailed answers.
- **No** rule-based “small talk” fallback—if no API key is set, the user sees a clear configuration message.

| Piece | Location |
| ----- | -------- |
| Expert service | `backend/app/services/pregnancy_expert_ai.py` |
| HTTP API | `POST /api/companion/expert-chat` (same body as `/api/companion/chat`) |
| Chat storage (MongoDB) | Collection `expert_chat_history` (separate from `chat_history`) |

### Calling the API

```http
POST /api/companion/expert-chat
Authorization: Bearer <jwt>
Content-Type: application/json

{
  "message": "What are common warning signs I should discuss with my doctor in the third trimester?",
  "context": { "pregnancy_week": 32, "trimester": "third" }
}
```

Optional: add a toggle in **`/patient/messages`** that calls `companionService.expertChat` instead of `companionService.chat` (see `frontend/src/services/endpoints.ts`).

### Environment

Same as the rest of the app: set **`GEMINI_API_KEY`** and/or **`GROQ_API_KEY`** in `backend/.env`. Expert mode tries **Gemini first**, then **Groq**.

---

## If you later want a *custom* model (fine-tuning / RAG)

1. **RAG (retrieval-augmented generation)** — keep a **hosted** LLM; add a vector DB (e.g. Chroma, pgvector) filled with **licensed** guideline PDFs you are allowed to index. Answers cite retrieved snippets. Lowest risk for “making things up.”
2. **Supervised fine-tune (LoRA/QLoRA)** — smaller open models (Llama, Mistral) on **question–answer pairs** you build from public FAQs and clinician-reviewed text. Still requires medical/legal review; not a substitute for regulatory clearance for clinical use.
3. **Full pretraining** — not practical for a product team; use foundation models + RAG/fine-tune.

---

## Where to find datasets (maternal / pregnancy / related)

Use only data you may **legally** use (license, consent, BAA if PHI). Below are **starting points** grouped by use case.

### A. Already referenced in this repository

| Use | Location / pointer |
| --- | ------------------ |
| Synthetic tabular health logs | `ml/datasets/` (e.g. `synthetic_health_logs.csv`, `synthetic_mental_health.csv`) — see `ml/notebooks/README.md` |
| Training scripts | `backend/app/ml/train_risk_models.py`, `train_v2_models.py`, `train_v2_real_data.py` |
| ML inventory | `docs/ML_MODELS_AND_DATASETS.md` |

### B. Public competition / ML-style tabular sets (good for risk *prototypes*, not diagnoses)

| Dataset | Typical source | Notes |
| ------- | -------------- | ----- |
| Maternal Health Risk (tabular vitals + risk label) | [Kaggle — Maternal Health Risk](https://www.kaggle.com/datasets/csafrit2/maternal-health-risk-data-set) | Small; used in repo’s real-data trainer |
| Fetal CTG classification | [Kaggle — Fetal Health Classification](https://www.kaggle.com/datasets/andrewmvd/fetal-health-classification) | CTG features → class labels |
| Pima Indians Diabetes | [UCI ML Repository](https://archive.ics.uci.edu/ml/datasets/pima+indians+diabetes) / Kaggle mirrors | **Not** pregnancy-specific; sometimes used as **GDM proxy** only in demos |
| Medical appointment no-show (Brazil) | [Kaggle — Healthcare Appointment No Shows](https://www.kaggle.com/datasets/joniarroba/noshowappointments) | Operational ML (engagement / no-show), not clinical diagnosis |

### C. Official statistics & surveys (epidemiology / features for synthetic data)

| Resource | URL / search | Notes |
| -------- | ------------ | ----- |
| CDC PRAMS | `https://www.cdc.gov/prams/` | Population-based maternal & infant health behaviors |
| NVSS / birth statistics (US) | Via CDC / NCHS | Aggregated; strict use rules |
| WHO Global Health Observatory | `https://www.who.int/data/gho` | Country-level indicators |
| NFHS (India) | `https://dhsprogram.com/` / DHS | Registration often required for microdata |
| UK Biobank | `https://www.ukbiobank.ac.uk/` | **Controlled access**; application required |

### D. Clinical text & NLP (research; heavy restrictions)

| Resource | Notes |
| -------- | ----- |
| MIMIC-III / MIMIC-IV | PhysioNet credentialed access; **de-identified** clinical notes for research |
| i2b2 / n2c2 challenges | Often requires DUA / registration |
| PubMed / PMC | **Literature** for RAG or citation; not a labeled “pregnancy QA” dump by default |

### E. PhysioNet (signal / clinical data, credentialing)

| Portal | `https://physionet.org/` |
| ------ | ------------------------ |
| Content | ECG, waveform, some maternal/infant linked corpora — **read each dataset’s license** |

### F. Building your own expert corpus (for RAG, not raw “training a base LLM”)

- National guidelines (e.g. **WHO**, **NICE**, **SMFM**, **ACOG** public patient pages — check **copyright**; many allow **linking**, not full **re-hosting**).
- Hospital-approved **patient leaflets** you have permission to index.
- Curated internal FAQs **reviewed by clinicians**.

---

## Disclaimer

Novelle’s Expert mode outputs **general education** only. It does **not** replace individualized medical advice, diagnosis, or treatment.

*Last updated with repository layout — adjust URLs if portals move.*
