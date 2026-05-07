// Novelle — TypeScript type definitions

// ── Auth & User ─────────────────────────────────────
export type UserRole = 'pregnant_user' | 'postpartum_user' | 'doctor' | 'hospital_admin' | 'platform_admin';

export interface User {
  id: number;
  email: string;
  full_name: string;
  phone?: string;
  role: UserRole;
  is_active: boolean;
  is_verified: boolean;
  avatar_url?: string;
  city?: string;
  state?: string;
  country?: string;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}

// ── Pregnancy Profile ───────────────────────────────
export type Trimester = 'first' | 'second' | 'third' | 'postpartum';
export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'O+' | 'O-' | 'AB+' | 'AB-';

export interface PregnancyProfile {
  id: number;
  user_id: number;
  age: number;
  height_cm?: number;
  weight_kg?: number;
  bmi?: number;
  pregnancy_week: number;
  trimester: Trimester;
  due_date?: string;
  blood_group?: BloodGroup;
  previous_pregnancies: number;
  pregnancy_history: string[];
  lifestyle_indicators: string[];
  hemoglobin_level?: number;
  gestational_diabetes: boolean;
  thyroid_disorder?: string;
  past_complications: string[];
  chronic_hypertension: boolean;
  profile_completion_score: number;
  created_at: string;
}

// ── Health Log ──────────────────────────────────────
export interface HealthLog {
  id: number;
  user_id: number;
  log_date: string;
  bp_systolic?: number;
  bp_diastolic?: number;
  blood_sugar_fasting?: number;
  blood_sugar_postmeal?: number;
  weight_kg?: number;
  sleep_quality?: number;
  pain_score?: number;
  pain_location?: string;
  nausea_count: number;
  edema_flag: boolean;
  bleeding_flag: boolean;
  cramps_flag: boolean;
  fetal_movement_count?: number;
  appetite_score?: number;
  hydration_ml?: number;
  pregnancy_week?: number;
  notes?: string;
  created_at: string;
}

export interface HealthLogSummary {
  total_logs: number;
  avg_bp_systolic?: number;
  avg_bp_diastolic?: number;
  avg_sleep_quality?: number;
  weight_trend: { date: string; weight: number }[];
  bp_trend: { date: string; systolic: number; diastolic: number }[];
  sugar_trend: { date: string; fasting: number; postmeal: number }[];
  symptom_flags: Record<string, number>;
}

// ── Mental Health ───────────────────────────────────
export interface MentalAssessment {
  id: number;
  user_id: number;
  assessment_date: string;
  phq9_score?: number;
  gad7_score?: number;
  mood_score?: number;
  mood_emoji?: string;
  stress_level?: number;
  stress_reason?: string;
  social_support_score?: number;
  assessment_type: string;
  epds_score?: number;
  created_at: string;
}

export interface MoodTrend {
  mood_trend: { date: string; mood_score: number; stress_level?: number; mood_emoji?: string }[];
  average_mood?: number;
  average_stress?: number;
}

// ── Risk Scores ─────────────────────────────────────
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type CrisisFlag = 'SAFE' | 'REVIEW_NEEDED' | 'URGENT';

export interface RiskScore {
  id: number;
  user_id: number;
  scored_at: string;
  mental_risk_level?: RiskLevel;
  mental_confidence?: number;
  depression_risk?: RiskLevel;
  anxiety_risk?: RiskLevel;
  isolation_detected: boolean;
  postpartum_risk?: RiskLevel;
  physical_risk_level?: RiskLevel;
  physical_confidence?: number;
  diabetes_risk?: RiskLevel;
  hypertension_risk?: RiskLevel;
  anemia_risk?: RiskLevel;
  infection_risk?: RiskLevel;
  nutrition_risk?: RiskLevel;
  fetal_risk_level?: RiskLevel;
  fetal_confidence?: number;
  preterm_risk?: RiskLevel;
  low_birth_weight_risk?: RiskLevel;
  growth_abnormality_risk?: RiskLevel;
  missed_care_risk?: RiskLevel;
  shap_features_json?: Record<string, unknown>;
  shap_features?: Record<string, Record<string, number>>;
  flagged_for_escalation: boolean;
  crisis_flag?: CrisisFlag;
  created_at: string;
}

export interface RiskDashboard {
  latest_risk?: RiskScore;
  risk_history: RiskScore[];
  recommendations: string[];
  escalation_triggered: boolean;
  disclaimer: string;
}

// ── Journal ─────────────────────────────────────────
export interface JournalEntry {
  id: string;
  user_id: number;
  entry_date: string;
  title?: string;
  content: string;
  text_content?: string;
  mood?: string;
  emotions?: string[];
  emotion_tags?: string[];
  tags?: string[];
  sentiment_score?: number;
  sentiment_label?: string;
  crisis_flag?: CrisisFlag;
  shared_with_doctor?: boolean;
  created_at: string;
}

// ── Companion ───────────────────────────────────────
export interface CompanionResponse {
  response: string;
  disclaimer?: string;
  sentiment?: string;
  crisis_flag?: CrisisFlag;
  crisis_detected?: boolean;
  suggested_action?: string;
}

export interface ChatMessage {
  user_message: string;
  ai_response: string;
  timestamp: string;
}

// ── Hospital ────────────────────────────────────────
export interface Hospital {
  id: number;
  name: string;
  address: string;
  city?: string;
  state?: string;
  pincode?: string;
  location_lat?: number;
  location_lng?: number;
  phone?: string;
  has_obgyn?: boolean;
  has_nicu?: boolean;
  is_emergency_capable?: boolean;
  emergency_available?: boolean;
  is_24x7?: boolean;
  hospital_type?: string;
  specialties?: string[];
  rating?: number;
  distance_km?: number;
}

// ── Reminder ────────────────────────────────────────
export interface Reminder {
  id: string;
  user_id: number;
  reminder_type: string;
  title: string;
  description?: string;
  scheduled_at: string;
  recurring: boolean;
  recurrence_pattern?: string;
  is_recurring?: boolean;
  is_active?: boolean;
  is_completed?: boolean;
  created_at: string;
}

// ── Escalation ──────────────────────────────────────
export interface Escalation {
  id: string;
  user_id: number;
  triggered_at: string;
  risk_type: string;
  risk_level: string;
  severity?: string;
  reason?: string;
  escalation_reason?: string;
  assigned_doctor_id?: number;
  status: string;
  doctor_notes?: string;
  resolved_at?: string;
  created_at: string;
}

// ── Fetal Development ───────────────────────────────
export interface FetalMilestone {
  week: number;
  size_comparison: string;
  length_cm: number;
  weight_g: number;
  developments: string[];
  tips: string[];
}

// ── Clinical Workflow ──────────────────────────────
export interface ClinicalNote {
  id: number;
  patient_id: number;
  doctor_id: number;
  note_type: string;
  content: string;
  ai_summary?: string;
  created_at: string;
  updated_at?: string;
}

export interface Appointment {
  id: number;
  patient_id: number;
  doctor_id: number;
  appointment_date: string;
  reason?: string;
  status: string;
  appointment_type: string;
  telemedicine_link?: string;
  created_at: string;
}

export interface Medication {
  id: number;
  patient_id: number;
  doctor_id: number;
  name: string;
  dosage?: string;
  frequency?: string;
  instructions?: string;
  start_date: string;
  end_date?: string;
  is_active: boolean;
  adherence_data?: any;
  created_at: string;
}

export interface PatientDashboardData {
  patient_id: number;
  profile: any;
  fetal_predictions: any;
  physical_predictions: any;
  mental_predictions: any;
  recent_vitals: any[];
  mental_health_history: any[];
  risk_trend: any[];
  shap_analysis?: any;
  clinical_notes: ClinicalNote[];
  appointments: Appointment[];
  medications: Medication[];
}
