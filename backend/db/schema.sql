-- ============================================================
-- Novelle — PostgreSQL Schema
-- All 9 tables derived from SQLAlchemy ORM models
-- Run: psql -U postgres -d novelle -f backend/db/schema.sql
-- ============================================================

-- Create DB (run as superuser if not exists)
-- CREATE DATABASE novelle;
-- \c novelle;

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- for fuzzy text search

-- ─────────────────────────────────────────────────────────
-- ENUMS
-- ─────────────────────────────────────────────────────────

DO $$ BEGIN
    CREATE TYPE user_role AS ENUM (
        'pregnant_user', 'postpartum_user', 'doctor',
        'hospital_admin', 'platform_admin'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;


-- ─────────────────────────────────────────────────────────
-- 1. HOSPITALS (no FK deps — create first)
-- ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS hospitals (
    id                   SERIAL PRIMARY KEY,
    name                 VARCHAR(255) NOT NULL,
    address              VARCHAR(500),
    city                 VARCHAR(100),
    state                VARCHAR(100),
    pincode              VARCHAR(10),
    location_lat         FLOAT,
    location_lng         FLOAT,
    phone                VARCHAR(50),
    has_obgyn            BOOLEAN DEFAULT FALSE,
    has_nicu             BOOLEAN DEFAULT FALSE,
    is_emergency_capable BOOLEAN DEFAULT FALSE,
    is_24x7              BOOLEAN DEFAULT FALSE,
    hospital_type        VARCHAR(50) DEFAULT 'general',  -- general / maternity / multi-specialty
    specialties          JSONB DEFAULT '[]',
    rating               FLOAT,
    created_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hospitals_city  ON hospitals(city);
CREATE INDEX IF NOT EXISTS idx_hospitals_state ON hospitals(state);
CREATE INDEX IF NOT EXISTS idx_hospitals_latlng ON hospitals(location_lat, location_lng);


-- ─────────────────────────────────────────────────────────
-- 2. USERS
-- ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
    id            SERIAL PRIMARY KEY,
    email         VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name     VARCHAR(255) NOT NULL,
    phone         VARCHAR(20),
    role          user_role NOT NULL DEFAULT 'pregnant_user',
    is_active     BOOLEAN DEFAULT TRUE,
    is_verified   BOOLEAN DEFAULT FALSE,
    avatar_url    VARCHAR(512),
    city          VARCHAR(100),
    state         VARCHAR(100),
    country       VARCHAR(100) DEFAULT 'India',
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email  ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role   ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at_users ON users;
CREATE TRIGGER set_updated_at_users
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();


-- ─────────────────────────────────────────────────────────
-- 3. PREGNANCY PROFILES (1:1 with users)
-- ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pregnancy_profiles (
    id                       SERIAL PRIMARY KEY,
    user_id                  INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    age                      INTEGER NOT NULL,
    height_cm                FLOAT,
    weight_kg                FLOAT,
    bmi                      FLOAT,
    pregnancy_week           INTEGER DEFAULT 1,
    trimester                VARCHAR(20) DEFAULT 'first',  -- first / second / third / postpartum
    due_date                 TIMESTAMP,
    last_menstrual_period    TIMESTAMP,
    blood_group              VARCHAR(10),
    previous_pregnancies     INTEGER DEFAULT 0,
    pregnancy_history        JSONB DEFAULT '[]',
    lifestyle_indicators     JSONB DEFAULT '[]',    -- smoking, alcohol, exercise_level
    hemoglobin_level         FLOAT,
    gestational_diabetes     BOOLEAN DEFAULT FALSE,
    thyroid_disorder         VARCHAR(30) DEFAULT 'none',  -- none / hypothyroid / hyperthyroid
    past_complications       JSONB DEFAULT '[]',    -- preeclampsia, preterm, miscarriage, etc.
    chronic_hypertension     BOOLEAN DEFAULT FALSE,
    profile_completion_score INTEGER DEFAULT 0,
    created_at               TIMESTAMPTZ DEFAULT NOW(),
    updated_at               TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_user_id        ON pregnancy_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_pregnancy_week ON pregnancy_profiles(pregnancy_week);
CREATE INDEX IF NOT EXISTS idx_profiles_trimester      ON pregnancy_profiles(trimester);

DROP TRIGGER IF EXISTS set_updated_at_profiles ON pregnancy_profiles;
CREATE TRIGGER set_updated_at_profiles
    BEFORE UPDATE ON pregnancy_profiles
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();


-- ─────────────────────────────────────────────────────────
-- 4. HEALTH LOGS (daily vitals & symptoms)
-- ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS health_logs (
    id                    SERIAL PRIMARY KEY,
    user_id               INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    log_date              DATE NOT NULL DEFAULT CURRENT_DATE,

    -- Vitals
    bp_systolic           INTEGER,         -- mmHg
    bp_diastolic          INTEGER,         -- mmHg
    blood_sugar_fasting   FLOAT,           -- mg/dL
    blood_sugar_postmeal  FLOAT,           -- mg/dL
    weight_kg             FLOAT,
    sleep_quality         INTEGER,         -- 1 (poor) to 5 (excellent)

    -- Pain
    pain_score            INTEGER DEFAULT 0,   -- 0-10 VAS
    pain_location         VARCHAR(100),

    -- Symptoms
    nausea_count          INTEGER DEFAULT 0,
    nausea_severity       INTEGER DEFAULT 0,   -- 0-10
    dizziness             BOOLEAN DEFAULT FALSE,
    edema_flag            BOOLEAN DEFAULT FALSE,
    edema_location        VARCHAR(100),
    bleeding_flag         BOOLEAN DEFAULT FALSE,
    bleeding_severity     VARCHAR(20),          -- light / moderate / heavy
    cramps_flag           BOOLEAN DEFAULT FALSE,
    cramps_intensity      INTEGER DEFAULT 0,    -- 0-10

    -- Fetal
    fetal_movement_count  INTEGER,

    -- Lifestyle
    appetite_score        INTEGER,       -- 1-5
    hydration_ml          INTEGER,
    pregnancy_week        INTEGER,
    notes                 VARCHAR(1000),

    created_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_health_logs_user_id  ON health_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_health_logs_log_date ON health_logs(log_date);
CREATE INDEX IF NOT EXISTS idx_health_logs_user_date ON health_logs(user_id, log_date DESC);


-- ─────────────────────────────────────────────────────────
-- 5. MENTAL HEALTH ASSESSMENTS
-- ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS mental_health_assessments (
    id                   SERIAL PRIMARY KEY,
    user_id              INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assessment_date      DATE NOT NULL DEFAULT CURRENT_DATE,

    -- Validated scales
    phq9_score           INTEGER,    -- 0-27 (PHQ-9 depression)
    gad7_score           INTEGER,    -- 0-21 (GAD-7 anxiety)
    epds_score           INTEGER,    -- 0-30 (Edinburgh Postnatal Depression Scale)

    -- Daily mood tracking
    mood_score           INTEGER,    -- 1-10
    mood_emoji           VARCHAR(10),
    stress_level         INTEGER,    -- 1-10
    stress_reason        VARCHAR(500),
    social_support_score INTEGER,    -- 1-5

    assessment_type      VARCHAR(30) DEFAULT 'daily',  -- daily / weekly_phq9 / weekly_gad7 / epds

    created_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mental_user_id   ON mental_health_assessments(user_id);
CREATE INDEX IF NOT EXISTS idx_mental_date      ON mental_health_assessments(assessment_date);
CREATE INDEX IF NOT EXISTS idx_mental_user_date ON mental_health_assessments(user_id, assessment_date DESC);


-- ─────────────────────────────────────────────────────────
-- 6. RISK SCORES (ML model outputs)
-- ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS risk_scores (
    id                    SERIAL PRIMARY KEY,
    user_id               INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    scored_at             TIMESTAMPTZ DEFAULT NOW(),

    -- Mental health domain
    mental_risk_level     VARCHAR(10),   -- LOW / MEDIUM / HIGH
    mental_confidence     FLOAT,         -- 0.0-1.0
    depression_risk       VARCHAR(10),
    anxiety_risk          VARCHAR(10),
    isolation_detected    BOOLEAN DEFAULT FALSE,
    postpartum_risk       VARCHAR(10),

    -- Physical health domain
    physical_risk_level   VARCHAR(10),
    physical_confidence   FLOAT,
    diabetes_risk         VARCHAR(10),
    hypertension_risk     VARCHAR(10),
    anemia_risk           VARCHAR(10),
    infection_risk        VARCHAR(10),
    nutrition_risk        VARCHAR(10),

    -- Fetal health domain
    fetal_risk_level      VARCHAR(10),
    fetal_confidence      FLOAT,
    preterm_risk          VARCHAR(10),
    low_birth_weight_risk VARCHAR(10),
    growth_abnormality_risk VARCHAR(10),
    missed_care_risk      VARCHAR(10),

    -- Meta
    shap_features_json    JSONB,         -- SHAP feature contributions for explainability
    flagged_for_escalation BOOLEAN DEFAULT FALSE,
    crisis_flag           VARCHAR(20) DEFAULT 'SAFE',  -- SAFE / REVIEW_NEEDED / URGENT

    created_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_risk_scores_user_id  ON risk_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_risk_scores_scored_at ON risk_scores(scored_at DESC);
CREATE INDEX IF NOT EXISTS idx_risk_scores_escalation ON risk_scores(flagged_for_escalation) WHERE flagged_for_escalation = TRUE;
CREATE INDEX IF NOT EXISTS idx_risk_scores_crisis ON risk_scores(crisis_flag) WHERE crisis_flag != 'SAFE';


-- ─────────────────────────────────────────────────────────
-- 7. DOCTORS
-- ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS doctors (
    id                       SERIAL PRIMARY KEY,
    user_id                  INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    name                     VARCHAR(255) NOT NULL,
    specialty                VARCHAR(100) DEFAULT 'OB-GYN',
    hospital_id              INTEGER REFERENCES hospitals(id) ON DELETE SET NULL,
    contact                  VARCHAR(50),
    email                    VARCHAR(255),
    license_number           VARCHAR(100),
    available_for_escalation BOOLEAN DEFAULT TRUE,
    created_at               TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_doctors_hospital_id ON doctors(hospital_id);
CREATE INDEX IF NOT EXISTS idx_doctors_available   ON doctors(available_for_escalation) WHERE available_for_escalation = TRUE;


-- ─────────────────────────────────────────────────────────
-- 8. ESCALATIONS
-- ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS escalations (
    id                  SERIAL PRIMARY KEY,
    user_id             INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    triggered_at        TIMESTAMPTZ DEFAULT NOW(),
    risk_type           VARCHAR(30) NOT NULL,   -- mental / physical / fetal
    risk_level          VARCHAR(10) NOT NULL,   -- LOW / MEDIUM / HIGH
    severity            VARCHAR(20),
    escalation_reason   TEXT,
    assigned_doctor_id  INTEGER REFERENCES doctors(id) ON DELETE SET NULL,
    status              VARCHAR(30) DEFAULT 'pending',  -- pending / acknowledged / resolved / expired
    doctor_notes        TEXT,
    resolved_at         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_escalations_user_id    ON escalations(user_id);
CREATE INDEX IF NOT EXISTS idx_escalations_status     ON escalations(status);
CREATE INDEX IF NOT EXISTS idx_escalations_doctor_id  ON escalations(assigned_doctor_id);
CREATE INDEX IF NOT EXISTS idx_escalations_pending    ON escalations(status, triggered_at DESC) WHERE status = 'pending';


-- ─────────────────────────────────────────────────────────
-- 9. REMINDERS
-- ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS reminders (
    id                  SERIAL PRIMARY KEY,
    user_id             INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reminder_type       VARCHAR(50) NOT NULL,   -- medication / appointment / kick_count / mental_health / hydration / breathing
    title               VARCHAR(255) NOT NULL,
    description         VARCHAR(500),
    scheduled_at        TIMESTAMPTZ NOT NULL,
    recurring           BOOLEAN DEFAULT FALSE,
    recurrence_pattern  VARCHAR(30),            -- daily / weekly / monthly
    is_active           BOOLEAN DEFAULT TRUE,
    is_completed        BOOLEAN DEFAULT FALSE,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reminders_user_id      ON reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_scheduled_at ON reminders(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_reminders_active       ON reminders(user_id, is_active) WHERE is_active = TRUE;


-- ─────────────────────────────────────────────────────────
-- VIEWS (helpful for reporting / dashboard queries)
-- ─────────────────────────────────────────────────────────

-- Latest health log per user
CREATE OR REPLACE VIEW v_latest_health_log AS
SELECT DISTINCT ON (user_id)
    *
FROM health_logs
ORDER BY user_id, log_date DESC, created_at DESC;

-- Latest risk score per user
CREATE OR REPLACE VIEW v_latest_risk_score AS
SELECT DISTINCT ON (user_id)
    *
FROM risk_scores
ORDER BY user_id, scored_at DESC;

-- Active high-risk users for doctor dashboard
CREATE OR REPLACE VIEW v_high_risk_users AS
SELECT
    u.id AS user_id,
    u.full_name,
    u.email,
    u.phone,
    r.mental_risk_level,
    r.physical_risk_level,
    r.fetal_risk_level,
    r.crisis_flag,
    r.flagged_for_escalation,
    r.scored_at
FROM users u
JOIN v_latest_risk_score r ON r.user_id = u.id
WHERE
    r.mental_risk_level = 'HIGH'
    OR r.physical_risk_level = 'HIGH'
    OR r.fetal_risk_level = 'HIGH'
    OR r.crisis_flag != 'SAFE';

-- ─────────────────────────────────────────────────────────
-- DONE
-- ─────────────────────────────────────────────────────────
-- Tables:  hospitals, users, pregnancy_profiles, health_logs,
--          mental_health_assessments, risk_scores, doctors,
--          escalations, reminders
-- Views:   v_latest_health_log, v_latest_risk_score, v_high_risk_users
-- ─────────────────────────────────────────────────────────
