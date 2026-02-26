import { create } from 'zustand';
import type { PregnancyProfile, RiskDashboard, HealthLogSummary } from '../types';

interface AppState {
  profile: PregnancyProfile | null;
  riskDashboard: RiskDashboard | null;
  healthSummary: HealthLogSummary | null;
  sidebarOpen: boolean;
  loading: boolean;
  setProfile: (profile: PregnancyProfile) => void;
  setRiskDashboard: (data: RiskDashboard) => void;
  setHealthSummary: (data: HealthLogSummary) => void;
  toggleSidebar: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAppStore = create<AppState>()((set) => ({
  profile: null,
  riskDashboard: null,
  healthSummary: null,
  sidebarOpen: false,
  loading: false,

  setProfile: (profile) => set({ profile }),
  setRiskDashboard: (data) => set({ riskDashboard: data }),
  setHealthSummary: (data) => set({ healthSummary: data }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setLoading: (loading) => set({ loading }),
}));
