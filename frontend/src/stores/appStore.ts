import { create } from 'zustand';
import type { PregnancyProfile, RiskDashboard, HealthLogSummary, PatientDashboardData } from '../types';

interface AppState {
  profile: PregnancyProfile | null;
  riskDashboard: RiskDashboard | null;
  healthSummary: HealthLogSummary | null;
  activePatientData: PatientDashboardData | null;
  sidebarOpen: boolean;
  loading: boolean;
  setProfile: (profile: PregnancyProfile) => void;
  setRiskDashboard: (data: RiskDashboard) => void;
  setHealthSummary: (data: HealthLogSummary) => void;
  setActivePatientData: (data: PatientDashboardData | null) => void;
  toggleSidebar: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAppStore = create<AppState>()((set) => ({
  profile: null,
  riskDashboard: null,
  healthSummary: null,
  activePatientData: null,
  sidebarOpen: false,
  loading: false,

  setProfile: (profile) => set({ profile }),
  setRiskDashboard: (data) => set({ riskDashboard: data }),
  setHealthSummary: (data) => set({ healthSummary: data }),
  setActivePatientData: (data) => set({ activePatientData: data }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setLoading: (loading) => set({ loading }),
}));
