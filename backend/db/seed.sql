-- ============================================================
-- Novelle — Seed Data
-- Sample hospitals, doctors, and a test user account
-- Run AFTER schema.sql:
--   psql -U postgres -d novelle -f backend/db/seed.sql
-- ============================================================

-- ─────────────────────────────────────────────────────────
-- HOSPITALS (India — major maternity centres)
-- ─────────────────────────────────────────────────────────

INSERT INTO hospitals (name, address, city, state, pincode, location_lat, location_lng, phone, has_obgyn, has_nicu, is_emergency_capable, is_24x7, hospital_type, specialties, rating)
VALUES
('Apollo Hospital - Greams Road',
 '21 Greams Lane, Off Greams Road', 'Chennai', 'Tamil Nadu', '600006',
 13.0614, 80.2503, '+91-44-28290200',
 TRUE, TRUE, TRUE, TRUE, 'multi-specialty',
 '["OB-GYN", "Neonatology", "Fetal Medicine", "High-risk Pregnancy"]', 4.6),

('Fortis La Femme',
 '14, Cunningham Rd', 'Bengaluru', 'Karnataka', '560052',
 12.9800, 77.5996, '+91-80-42527777',
 TRUE, TRUE, TRUE, TRUE, 'maternity',
 '["OB-GYN", "Neonatology", "Lactation", "Fetal Medicine"]', 4.5),

('Max Super Speciality Hospital',
 '1, Press Enclave Marg, Saket', 'New Delhi', 'Delhi', '110017',
 28.5247, 77.2153, '+91-11-26515050',
 TRUE, TRUE, TRUE, TRUE, 'multi-specialty',
 '["OB-GYN", "High-risk Pregnancy", "Neonatology", "Maternal-Fetal Medicine"]', 4.4),

('Nanavati Max Super Speciality Hospital',
 'S.V. Road, Vile Parle West', 'Mumbai', 'Maharashtra', '400056',
 19.1001, 72.8362, '+91-22-26267500',
 TRUE, TRUE, TRUE, TRUE, 'multi-specialty',
 '["OB-GYN", "Neonatology", "Fetal Medicine"]', 4.3),

('KIMS Hospital',
 '1-8-31/1, Minister Road, Secunderabad', 'Hyderabad', 'Telangana', '500003',
 17.4375, 78.4987, '+91-40-44885000',
 TRUE, TRUE, TRUE, TRUE, 'multi-specialty',
 '["OB-GYN", "Neonatology", "High-risk Pregnancy"]', 4.4),

('AIIMS Bhopal — Maternity Ward',
 'Saket Nagar', 'Bhopal', 'Madhya Pradesh', '462020',
 23.2056, 77.4258, '+91-755-2672315',
 TRUE, TRUE, TRUE, TRUE, 'general',
 '["OB-GYN", "Neonatology", "Maternal Health"]', 4.2),

('Cloudnine Hospital — HSR Layout',
 '1533, 19th Main, 27th Cross, HSR Layout', 'Bengaluru', 'Karnataka', '560102',
 12.9122, 77.6411, '+91-80-67334000',
 TRUE, TRUE, TRUE, TRUE, 'maternity',
 '["OB-GYN", "Neonatology", "Lactation Counselling", "Childbirth Classes"]', 4.7),

('Government Medical College & Hospital',
 'Medical College Road', 'Thiruvananthapuram', 'Kerala', '695011',
 8.5241, 76.9366, '+91-471-2528386',
 TRUE, FALSE, TRUE, TRUE, 'general',
 '["OB-GYN", "Neonatology"]', 3.9)
ON CONFLICT DO NOTHING;


-- ─────────────────────────────────────────────────────────
-- TEST USER (Pregnant user — password: TestUser@123)
-- bcrypt hash of "TestUser@123"
-- ─────────────────────────────────────────────────────────

INSERT INTO users (email, password_hash, full_name, phone, role, is_active, is_verified, city, state, country)
VALUES (
    'testuser@novelle.app',
    '$2b$12$RPND8FgOZbx.57x5JEIhsOT3RJjWNKtSO99JfWyC95/FyVQNT8qGa',  -- "TestUser@123"
    'Priya Sharma',
    '+91-9876543210',
    'pregnant_user',
    TRUE,
    TRUE,
    'Bengaluru',
    'Karnataka',
    'India'
)
ON CONFLICT (email) DO NOTHING;

-- Pregnancy profile for test user
INSERT INTO pregnancy_profiles (
    user_id, age, height_cm, weight_kg, bmi, pregnancy_week, trimester,
    due_date, blood_group, previous_pregnancies,
    hemoglobin_level, gestational_diabetes, thyroid_disorder,
    chronic_hypertension, profile_completion_score
)
SELECT
    id, 28, 162.0, 58.5, 22.3, 24, 'second',
    NOW() + INTERVAL '112 days', 'O+', 0,
    12.1, FALSE, 'none', FALSE, 85
FROM users WHERE email = 'testuser@novelle.app'
ON CONFLICT (user_id) DO NOTHING;


-- ─────────────────────────────────────────────────────────
-- ADMIN USER
-- ─────────────────────────────────────────────────────────

INSERT INTO users (email, password_hash, full_name, phone, role, is_active, is_verified, country)
VALUES (
    'admin@novelle.app',
    '$2b$12$RPND8FgOZbx.57x5JEIhsOT3RJjWNKtSO99JfWyC95/FyVQNT8qGa',  -- "TestUser@123"
    'Novelle Admin',
    '+91-9000000000',
    'platform_admin',
    TRUE,
    TRUE,
    'India'
)
ON CONFLICT (email) DO NOTHING;


-- ─────────────────────────────────────────────────────────
-- DOCTOR USER (linked to Cloudnine)
-- ─────────────────────────────────────────────────────────

INSERT INTO users (email, password_hash, full_name, phone, role, is_active, is_verified, city, state, country)
VALUES (
    'dr.anita@novelle.app',
    '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW',
    'Dr. Anita Krishnamurthy',
    '+91-8765432100',
    'doctor',
    TRUE,
    TRUE,
    'Bengaluru',
    'Karnataka',
    'India'
)
ON CONFLICT (email) DO NOTHING;

INSERT INTO doctors (user_id, name, specialty, hospital_id, contact, email, license_number, available_for_escalation)
SELECT
    u.id,
    'Dr. Anita Krishnamurthy',
    'OB-GYN',
    h.id,
    '+91-8765432100',
    'dr.anita@novelle.app',
    'KMC-OBG-2015-0042',
    TRUE
FROM users u, hospitals h
WHERE u.email = 'dr.anita@novelle.app'
  AND h.name LIKE 'Cloudnine%'
LIMIT 1
ON CONFLICT (user_id) DO NOTHING;


-- ─────────────────────────────────────────────────────────
-- SAMPLE HEALTH LOG (for test user)
-- ─────────────────────────────────────────────────────────

INSERT INTO health_logs (
    user_id, log_date, bp_systolic, bp_diastolic,
    blood_sugar_fasting, blood_sugar_postmeal, weight_kg,
    sleep_quality, pain_score, nausea_count, dizziness,
    edema_flag, bleeding_flag, cramps_flag, fetal_movement_count,
    appetite_score, hydration_ml, pregnancy_week
)
SELECT
    id, CURRENT_DATE,
    118, 76,
    88.5, 120.0, 59.2,
    4, 1, 0, FALSE,
    FALSE, FALSE, FALSE, 12,
    4, 2100, 24
FROM users WHERE email = 'testuser@novelle.app'
ON CONFLICT DO NOTHING;


-- ─────────────────────────────────────────────────────────
-- SAMPLE MENTAL HEALTH ASSESSMENT (for test user)
-- ─────────────────────────────────────────────────────────

INSERT INTO mental_health_assessments (
    user_id, assessment_date, phq9_score, gad7_score,
    mood_score, mood_emoji, stress_level, social_support_score,
    assessment_type
)
SELECT
    id, CURRENT_DATE, 3, 2, 8, '😊', 3, 4, 'daily'
FROM users WHERE email = 'testuser@novelle.app'
ON CONFLICT DO NOTHING;


-- ─────────────────────────────────────────────────────────
-- SAMPLE REMINDERS (for test user)
-- ─────────────────────────────────────────────────────────

INSERT INTO reminders (user_id, reminder_type, title, description, scheduled_at, recurring, recurrence_pattern, is_active)
SELECT
    id,
    'medication',
    'Take Folic Acid',
    'Take 400mcg folic acid tablet after breakfast',
    NOW()::date + TIME '08:30',
    TRUE, 'daily', TRUE
FROM users WHERE email = 'testuser@novelle.app'
ON CONFLICT DO NOTHING;

INSERT INTO reminders (user_id, reminder_type, title, description, scheduled_at, recurring, recurrence_pattern, is_active)
SELECT
    id,
    'kick_count',
    'Fetal Kick Count',
    'Count fetal movements for 1 hour — aim for 10+ kicks',
    NOW()::date + TIME '20:00',
    TRUE, 'daily', TRUE
FROM users WHERE email = 'testuser@novelle.app'
ON CONFLICT DO NOTHING;


-- ─────────────────────────────────────────────────────────
-- Verify
-- ─────────────────────────────────────────────────────────
-- SELECT 'users'       AS tbl, COUNT(*) FROM users
-- UNION ALL SELECT 'hospitals',   COUNT(*) FROM hospitals
-- UNION ALL SELECT 'doctors',     COUNT(*) FROM doctors
-- UNION ALL SELECT 'health_logs', COUNT(*) FROM health_logs
-- UNION ALL SELECT 'assessments', COUNT(*) FROM mental_health_assessments
-- UNION ALL SELECT 'reminders',   COUNT(*) FROM reminders;
