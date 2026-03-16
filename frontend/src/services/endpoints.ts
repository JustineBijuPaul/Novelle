import api from './api';
import type {
  TokenResponse, User, PregnancyProfile, HealthLog, HealthLogSummary,
  MentalAssessment, MoodTrend, RiskDashboard, RiskScore,
  JournalEntry, CompanionResponse, Hospital, Reminder, Escalation,
} from '../types';

// ── Auth ────────────────────────────────────────────
export const authService = {
  register: (data: { email: string; password: string; full_name: string; role?: string; phone?: string; city?: string; state?: string }) =>
    api.post<TokenResponse>('/auth/register', data),

  login: (email: string, password: string) =>
    api.post<TokenResponse>('/auth/login', { email, password }),

  getMe: () => api.get<User>('/auth/me'),

  updateMe: (data: Partial<User>) => api.put<User>('/auth/me', data),

  deleteAccount: () => api.delete('/auth/me'),
};

// ── Profile ─────────────────────────────────────────
export const profileService = {
  create: (data: Record<string, unknown>) =>
    api.post<PregnancyProfile>('/profile/create', data),

  get: () => api.get<PregnancyProfile>('/profile/'),

  update: (data: Record<string, unknown>) =>
    api.put<PregnancyProfile>('/profile/update', data),
};

// ── Health ──────────────────────────────────────────
export const healthService = {
  log: (data: Record<string, unknown>) =>
    api.post<HealthLog>('/health/log', data),

  create: (data: Record<string, unknown>) =>
    api.post<HealthLog>('/health/log', data),

  getHistory: (days = 7) =>
    api.get<HealthLog[]>(`/health/history?days=${days}`),

  getToday: () => api.get<HealthLog>('/health/today'),

  getSummary: (days = 7) =>
    api.get<HealthLogSummary>(`/health/summary?days=${days}`),
};

// ── Mental Health ───────────────────────────────────
export const mentalService = {
  submitAssessment: (data: Record<string, unknown>) =>
    api.post<MentalAssessment>('/mental/assessment', data),

  submit: (data: Record<string, unknown>) =>
    api.post<MentalAssessment>('/mental/assessment', data),

  getHistory: (days = 30) =>
    api.get<MentalAssessment[]>(`/mental/history?days=${days}`),

  getLatest: () => api.get<MentalAssessment>('/mental/latest'),

  getMoodTrend: (days = 14) =>
    api.get<MoodTrend>(`/mental/mood-trend?days=${days}`),
};

// ── Risk ────────────────────────────────────────────
export const riskService = {
  getFullReport: () =>
    api.get<RiskDashboard>('/risk/full-report'),

  getHistory: (days = 30) =>
    api.get<RiskScore[]>(`/risk/history?days=${days}`),

  explainRisk: (scoreId: number) =>
    api.get(`/risk/explain/${scoreId}`),
};

// ── Journal ─────────────────────────────────────────
export const journalService = {
  createEntry: (data: { entry_date?: string; text_content?: string; emotion_tags?: string[]; title?: string; content?: string; mood?: string; emotions?: string[]; tags?: string[] }) =>
    api.post<JournalEntry>('/journal/entry', data),

  create: (data: Record<string, unknown>) =>
    api.post<JournalEntry>('/journal/entry', data),

  list: (skip = 0, limit = 20) =>
    api.get<JournalEntry[]>(`/journal/list?skip=${skip}&limit=${limit}`),

  share: (entryId: string, share: boolean) =>
    api.post('/journal/share', { entry_id: entryId, share }),

  getSentimentTrend: (days = 14) =>
    api.get(`/journal/sentiment-trend?days=${days}`),
};

// ── AI Companion ────────────────────────────────────
export const companionService = {
  chat: (data: string | { message: string; context?: Record<string, unknown> }) =>
    api.post<CompanionResponse>('/companion/chat', typeof data === 'string' ? { message: data } : data),

  getHistory: (limit = 50) =>
    api.get<{ messages: { user_message: string; ai_response: string; timestamp: string }[] }>(
      `/companion/history?limit=${limit}`
    ),
};

// ── Hospital ────────────────────────────────────────
export const hospitalService = {
  findNearby: (lat: number, lng: number, radiusKm = 20) =>
    api.get<Hospital[]>('/hospitals/nearby', { params: { lat, lng, radius_km: radiusKm } }),
};

// ── Reminders ───────────────────────────────────────
export const reminderService = {
  create: (data: Record<string, unknown>) =>
    api.post<Reminder>('/reminders/', data),

  list: (activeOnly = true) =>
    api.get<Reminder[]>(`/reminders/list?active_only=${activeOnly}`),

  complete: (id: string | number) =>
    api.put(`/reminders/${id}/complete`),

  delete: (id: string | number) =>
    api.delete(`/reminders/${id}`),

  remove: (id: string | number) =>
    api.delete(`/reminders/${id}`),
};

// ── Escalation ──────────────────────────────────────
export const escalationService = {
  trigger: (data: { risk_type: string; risk_level: string; escalation_reason: string }) =>
    api.post<Escalation>('/escalation/trigger', data),

  getMyEscalations: () =>
    api.get<Escalation[]>('/escalation/my-escalations'),

  list: () =>
    api.get<Escalation[]>('/escalation/list'),

  resolve: (id: string, data: { status: string; notes?: string }) =>
    api.put(`/escalation/${id}/resolve`, data),
};

// ── Doctor ──────────────────────────────────────────
export const doctorService = {
  getDashboard: () => api.get('/doctor/dashboard'),

  getPatientSummary: (userId: number) =>
    api.get(`/doctor/patient/${userId}/summary`),

  getPatientPredictions: (userId: number) =>
    api.get(`/doctor/patient/${userId}/predictions`),

  updateEscalation: (escalationId: number, data: { status: string; doctor_notes?: string }) =>
    api.put(`/doctor/escalation/${escalationId}`, data),
};

// ── Letters to Baby ────────────────────────────────
export const letterService = {
  create: (data: Record<string, unknown>) =>
    api.post('/letters/', data),

  list: (skip = 0, limit = 20) =>
    api.get(`/letters/list?skip=${skip}&limit=${limit}`),

  delete: (id: string) =>
    api.delete(`/letters/${id}`),
};

// ── Admin ──────────────────────────────────────────
export const adminService = {
  getStats: () => api.get('/admin/stats'),

  listUsers: (params?: { skip?: number; limit?: number; role?: string; search?: string }) =>
    api.get('/admin/users', { params }),

  updateUser: (userId: number, data: Record<string, unknown>) =>
    api.put(`/admin/users/${userId}`, data),

  deactivateUser: (userId: number) =>
    api.delete(`/admin/users/${userId}`),

  listHospitals: (params?: { skip?: number; limit?: number; search?: string }) =>
    api.get('/admin/hospitals', { params }),

  createHospital: (data: Record<string, unknown>) =>
    api.post('/admin/hospitals', data),

  updateHospital: (hospitalId: number, data: Record<string, unknown>) =>
    api.put(`/admin/hospitals/${hospitalId}`, data),

  deleteHospital: (hospitalId: number) =>
    api.delete(`/admin/hospitals/${hospitalId}`),

  listDoctors: (params?: { skip?: number; limit?: number; search?: string }) =>
    api.get('/admin/doctors', { params }),

  createDoctor: (data: Record<string, unknown>) =>
    api.post('/admin/doctors', data),

  updateDoctor: (doctorId: number, data: Record<string, unknown>) =>
    api.put(`/admin/doctors/${doctorId}`, data),

  deleteDoctor: (doctorId: number) =>
    api.delete(`/admin/doctors/${doctorId}`),
};
