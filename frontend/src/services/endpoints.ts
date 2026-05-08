import api from './api';
import type {
  TokenResponse, User, PregnancyProfile, HealthLog, HealthLogSummary,
  MentalAssessment, MoodTrend, RiskDashboard, RiskScore,
  JournalEntry, CompanionResponse, Hospital, Reminder, Escalation,
  ClinicalNote, Appointment, Medication, PatientDashboardData
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
  findNearby: (lat?: number, lng?: number, radiusKm = 20) =>
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

  addNote: (patientId: number, content: string, noteType = 'consultation') =>
    api.post<ClinicalNote>(`/doctor/patient/${patientId}/notes`, { content, note_type: noteType }),

  scheduleAppointment: (patientId: number, data: { appointment_date: string; reason?: string; appointment_type?: string; telemedicine_link?: string }) =>
    api.post<Appointment>(`/doctor/patient/${patientId}/appointments`, data),

  prescribeMedication: (patientId: number, data: { name: string; dosage?: string; frequency?: string; instructions?: string; end_date?: string }) =>
    api.post<Medication>(`/doctor/patient/${patientId}/medications`, data),
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

export const hospitalAdminService = {
  getStats: () => api.get('/hospital-admin/stats'),
  getRiskTrends: () => api.get('/hospital-admin/analytics/risk-trends'),
  getDeptLoad: () => api.get('/hospital-admin/analytics/department-load'),
  listPatients: (params?: { risk?: string; trimester?: string; search?: string }) => 
    api.get('/hospital-admin/patients', { params }),
  addPatient: (data: any) => 
    api.post('/hospital-admin/patients', data),
  assignDoctor: (patientId: number, doctorId: number) => 
    api.post(`/hospital-admin/patients/${patientId}/assign-doctor`, { doctor_id: doctorId }),
  listStaff: (params?: { role?: string }) => 
    api.get('/hospital-admin/staff', { params }),
  addStaff: (data: any) => 
    api.post('/hospital-admin/staff', data),
  removeStaff: (staffId: number) => 
    api.delete(`/hospital-admin/staff/${staffId}`),
  listAppointments: (params?: { status?: string; type?: string }) => 
    api.get('/hospital-admin/appointments', { params }),
  scheduleAppointment: (data: any) => 
    api.post('/hospital-admin/appointments', data),
  listEscalations: (params?: { status?: string }) => 
    api.get('/hospital-admin/escalations', { params }),
  updateEscalation: (id: number, data: any) => 
    api.patch(`/hospital-admin/escalations/${id}`, data),
  listResources: (params?: { category?: string }) => 
    api.get('/hospital-admin/resources', { params }),
  updateResource: (id: number, data: any) => 
    api.patch(`/hospital-admin/resources/${id}`, data),
  listAnnouncements: (params?: { category?: string }) => 
    api.get('/hospital-admin/announcements', { params }),
  createAnnouncement: (data: any) => 
    api.post('/hospital-admin/announcements', data),
  listInternalMessages: () => 
    api.get('/hospital-admin/messages'),
  getMaternalHealthStats: () => 
    api.get('/hospital-admin/analytics/maternal-health'),
  getPerformanceMetrics: () => 
    api.get('/hospital-admin/analytics/performance'),
  getRiskForecasts: () => 
    api.get('/hospital-admin/ai/risk-forecasts'),
  getAIRecommendations: () => 
    api.get('/hospital-admin/ai/recommendations'),
  getAIAuditLogs: () => 
    api.get('/hospital-admin/ai/audit-logs'),
  listReports: (params?: { category?: string }) => 
    api.get('/hospital-admin/reports/list', { params }),
  generateReport: (data: { category: string; format: string }) => 
    api.post('/hospital-admin/reports/generate', data),
  getOperationalSummary: () => 
    api.get('/hospital-admin/reports/summaries'),
  listBranches: () => 
    api.get('/hospital-admin/org/branches'),
  getSubscription: () => 
    api.get('/hospital-admin/org/subscription'),
  getRegionalAnalytics: () => 
    api.get('/hospital-admin/org/regional-analytics'),
  getSettings: () => 
    api.get('/hospital-admin/settings'),
  updateSettings: (data: any) => 
    api.put('/hospital-admin/settings', data),
  getSystemAuditLogs: () => 
    api.get('/hospital-admin/settings/audit-logs'),
  getWorkloadMatrix: () => 
    api.get('/hospital-admin/operations/workload'),
  getDeptLoadMatrix: () => 
    api.get('/hospital-admin/operations/departments'),
  getComplianceReport: () => 
    api.get('/hospital-admin/operations/compliance'),
  autoRouteEscalation: (id: number) => 
    api.post(`/hospital-admin/escalations/${id}/auto-route`),
  listDepartments: () => 
    api.get('/hospital-admin/departments'),
};

export const mlopsService = {
  listModels: () => 
    api.get('/mlops/models'),
  registerModel: (data: { name: string; artifact_path: string; metrics: any }) => 
    api.post('/mlops/models/register', data),
  promoteModel: (modelId: string, targetStatus: 'STAGING' | 'PRODUCTION') => 
    api.post(`/mlops/models/${modelId}/promote`, { target_status: targetStatus }),
  rollbackModel: (modelName: string) => 
    api.post(`/mlops/models/${modelName}/rollback`),
  getDriftReport: (modelName: string) => 
    api.get(`/mlops/monitoring/drift/${modelName}`),
};

export const complianceService = {
  getAuditLogs: (params?: { limit?: number; user_id?: number }) => 
    api.get('/compliance/audit/logs', { params }),
  updateConsent: (data: { sharing: bool; research: bool; emergency: bool }) => 
    api.post('/compliance/consent/update', data),
  getConsentStatus: () => 
    api.get('/compliance/consent/status'),
  getSecurityAnomalies: () => 
    api.get('/compliance/security/anomalies'),
};

export const telemedicineService = {
  createSession: (data: { appointment_id: number; doctor_id: number; patient_id: number }) => 
    api.post('/telemedicine/sessions', data),
  joinSession: (sessionId: string) => 
    api.get(`/telemedicine/sessions/${sessionId}/join`),
  sendMessage: (data: { receiver_id: number; content: string; content_type?: string; file_url?: string }) => 
    api.post('/telemedicine/messages', data),
  getChatHistory: (otherUserId: number) => 
    api.get(`/telemedicine/messages/history/${otherUserId}`),
  saveSummary: (sessionId: string, summary: any) => 
    api.post(`/telemedicine/sessions/${sessionId}/summary`, summary),
};

export const platformAdminService = {
  getOverview: () => 
    api.get('/platform-admin/overview'),
  listOrganizations: () => 
    api.get('/platform-admin/organizations'),
  getAIControl: () => 
    api.get('/platform-admin/ai/control'),
  getInfrastructure: () => 
    api.get('/platform-admin/infrastructure'),
  listHospitals: () => 
    api.get('/platform-admin/hospitals'),
  getAiMetrics: () => 
    api.get('/platform-admin/ai-metrics'),
  getGlobalAnalytics: () => 
    api.get('/platform-admin/global-analytics'),
  getGlobalEscalations: () => 
    api.get('/platform-admin/global-escalations'),
  getBillingData: () => 
    api.get('/platform-admin/billing'),
  createHospital: (data: any) => 
    api.post('/platform-admin/hospitals', data),
  updateHospital: (hospitalId: number, data: any) => 
    api.patch(`/platform-admin/hospitals/${hospitalId}`, data),
  deleteHospital: (hospitalId: number) => 
    api.delete(`/platform-admin/hospitals/${hospitalId}`),
  getRegionalStats: () => 
    api.get('/platform-admin/hospitals/regional'),
  listGlobalUsers: () => 
    api.get('/platform-admin/users'),
  provisionUser: (data: any) => 
    api.post('/platform-admin/users', data),
  updateUser: (userId: number, data: any) => 
    api.patch(`/platform-admin/users/${userId}`, data),
  updateUserStatus: (userId: number, status: string) => 
    api.patch(`/platform-admin/users/${userId}/status`, { status }),
  deleteUser: (userId: number) => 
    api.delete(`/platform-admin/users/${userId}`),
  retrainModel: (modelName: string) => 
    api.post(`/platform-admin/ai/retrain/${modelName}`),
  updateModelSettings: (modelName: string, params: any) => 
    api.post(`/platform-admin/ai/settings/${modelName}`, params),
  exportAnalyticsReport: () => 
    api.get('/platform-admin/analytics/export'),
  getStrategicGoals: () => 
    api.get('/platform-admin/analytics/goals'),
  getEscalationAudit: (id: number) => 
    api.get(`/platform-admin/escalations/${id}/audit`),
};
