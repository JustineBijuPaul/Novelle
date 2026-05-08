import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import AppLayout from './components/layout/AppLayout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import OnboardingPage from './pages/OnboardingPage';
import DashboardPage from './pages/DashboardPage';
import MyPregnancyPage from './pages/MyPregnancyPage';
import AIInsightsPage from './pages/AIInsightsPage';
import SymptomsPage from './pages/SymptomsPage';
import AppointmentsPage from './pages/AppointmentsPage';
import TeleconsultationPage from './pages/TeleconsultationPage';
import WellnessHubPage from './pages/WellnessHubPage';
import DailyGoalsPage from './pages/DailyGoalsPage';
import EmergencySupportPage from './pages/EmergencySupportPage';
import RemindersPage from './pages/RemindersPage';
import SettingsPage from './pages/SettingsPage';
import HealthLogPage from './pages/HealthLogPage';
import MentalHealthPage from './pages/MentalHealthPage';
import RiskReportPage from './pages/RiskReportPage';
import CompanionPage from './pages/CompanionPage';
import JournalPage from './pages/JournalPage';
import BabyGrowthPage from './pages/BabyGrowthPage';
import HospitalsPage from './pages/HospitalsPage';
import DoctorDashboardPage from './pages/DoctorDashboardPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import HospitalAdminDashboard from './pages/HospitalAdminDashboard';
import HospitalAdminPatients from './pages/HospitalAdminPatients';
import HospitalAdminStaff from './pages/HospitalAdminStaff';
import HospitalAdminAppointments from './pages/HospitalAdminAppointments';
import HospitalAdminEscalations from './pages/HospitalAdminEscalations';
import HospitalAdminResources from './pages/HospitalAdminResources';
import HospitalAdminCommunication from './pages/HospitalAdminCommunication';
import HospitalAdminAnalytics from './pages/HospitalAdminAnalytics';
import HospitalAdminAIInsights from './pages/HospitalAdminAIInsights';
import HospitalAdminReports from './pages/HospitalAdminReports';
import HospitalAdminMultiHospital from './pages/HospitalAdminMultiHospital';
import HospitalAdminSettings from './pages/HospitalAdminSettings';
import TelemedicinePage from './pages/TelemedicinePage';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore();
  if (isAuthenticated) {
    let target = '/patient';
    if (user?.role === 'doctor') target = '/doctor';
    else if (user?.role === 'platform_admin') target = '/admin';
    else if (user?.role === 'hospital_admin') target = '/hospital-admin';
    return <Navigate to={target} replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />

      {/* Onboarding (Authenticated but no layout) */}
      <Route path="/onboarding" element={<PrivateRoute><OnboardingPage /></PrivateRoute>} />

      {/* Protected Routes inside App Layout */}
      <Route path="/" element={<PrivateRoute><AppLayout /></PrivateRoute>}>
        <Route index element={
          useAuthStore.getState().user?.role === 'doctor' ? <Navigate to="/doctor" replace /> :
          useAuthStore.getState().user?.role === 'platform_admin' ? <Navigate to="/admin" replace /> :
          useAuthStore.getState().user?.role === 'hospital_admin' ? <Navigate to="/hospital-admin" replace /> :
          <Navigate to="/patient" replace />
        } />
        <Route path="patient" element={<DashboardPage />} />
        <Route path="/" element={
          useAuthStore.getState().user?.role === 'hospital_admin' 
            ? <Navigate to="/hospital-admin" replace />
            : useAuthStore.getState().user?.role === 'platform_admin' 
            ? <Navigate to="/admin" replace /> 
            : useAuthStore.getState().user?.role === 'doctor'
            ? <Navigate to="/doctor" replace /> 
            : <Navigate to="/patient" replace />
        } />
        <Route path="patient" element={<DashboardPage />} />
        <Route path="patient/my-pregnancy" element={<MyPregnancyPage />} />
        <Route path="patient/ai-insights" element={<AIInsightsPage />} />
        <Route path="patient/health-log" element={<HealthLogPage />} />
        <Route path="patient/mental-health" element={<MentalHealthPage />} />
        <Route path="patient/symptoms" element={<SymptomsPage />} />
        <Route path="patient/baby-growth" element={<BabyGrowthPage />} />
        <Route path="patient/appointments" element={<AppointmentsPage />} />
        <Route path="patient/teleconsultation" element={<TeleconsultationPage />} />
        <Route path="patient/messages" element={<CompanionPage />} />
        <Route path="patient/hospitals" element={<HospitalsPage />} />
        <Route path="patient/journal" element={<JournalPage />} />
        <Route path="patient/wellness-hub" element={<WellnessHubPage />} />
        <Route path="patient/daily-goals" element={<DailyGoalsPage />} />
        <Route path="patient/risk-report" element={<RiskReportPage />} />
        <Route path="patient/emergency-support" element={<EmergencySupportPage />} />
        <Route path="patient/reminders" element={<RemindersPage />} />
        <Route path="patient/settings" element={<SettingsPage />} />

        {/* Deprecated top-level patient routes (optional: redirect to /patient/...) */}
        <Route path="health-log" element={<Navigate to="/patient/health-log" replace />} />
        <Route path="mental-health" element={<Navigate to="/patient/mental-health" replace />} />
        <Route path="risk-report" element={<Navigate to="/patient/risk-report" replace />} />
        <Route path="companion" element={<Navigate to="/patient/messages" replace />} />
        <Route path="journal" element={<Navigate to="/patient/journal" replace />} />
        <Route path="baby-growth" element={<Navigate to="/patient/baby-growth" replace />} />
        <Route path="hospitals" element={<Navigate to="/patient/hospitals" replace />} />
        <Route path="reminders" element={<Navigate to="/patient/reminders" replace />} />

        <Route path="doctor" element={<DoctorDashboardPage />} />
        <Route path="doctor/patients" element={<DoctorDashboardPage />} />
        <Route path="doctor/appointments" element={<DoctorDashboardPage />} />
        <Route path="doctor/escalations" element={<DoctorDashboardPage />} />
        <Route path="doctor/monitoring" element={<DoctorDashboardPage />} />
        <Route path="doctor/clinical-notes" element={<DoctorDashboardPage />} />
        <Route path="doctor/prescriptions" element={<DoctorDashboardPage />} />
        <Route path="doctor/telehealth" element={<DoctorDashboardPage />} />
        <Route path="doctor/ai-copilot" element={<DoctorDashboardPage />} />
        <Route path="doctor/reports" element={<DoctorDashboardPage />} />
        <Route path="doctor/communication" element={<DoctorDashboardPage />} />
        <Route path="doctor/tasks" element={<DoctorDashboardPage />} />
        <Route path="doctor/settings" element={<DoctorDashboardPage />} />
        <Route path="admin" element={<AdminDashboardPage />} />
        <Route path="admin/organizations" element={<AdminDashboardPage />} />
        <Route path="admin/hospitals" element={<AdminDashboardPage />} />
        <Route path="admin/users" element={<AdminDashboardPage />} />
        <Route path="admin/ai-control" element={<AdminDashboardPage />} />
        <Route path="admin/analytics" element={<AdminDashboardPage />} />
        <Route path="admin/escalations" element={<AdminDashboardPage />} />
        <Route path="admin/billing" element={<AdminDashboardPage />} />
        <Route path="admin/infrastructure" element={<AdminDashboardPage />} />
        <Route path="admin/security" element={<AdminDashboardPage />} />
        <Route path="admin/communication" element={<AdminDashboardPage />} />
        <Route path="admin/audit-logs" element={<AdminDashboardPage />} />
        <Route path="admin/integrations" element={<AdminDashboardPage />} />
        <Route path="admin/support" element={<AdminDashboardPage />} />
        <Route path="admin/reports" element={<AdminDashboardPage />} />
        <Route path="admin/settings" element={<AdminDashboardPage />} />
        
        {/* Hospital Admin Routes */}
        <Route path="hospital-admin" element={<HospitalAdminDashboard />} />
        <Route path="hospital-admin/patients" element={<HospitalAdminPatients />} />
        <Route path="hospital-admin/staff" element={<HospitalAdminStaff />} />
        <Route path="hospital-admin/appointments" element={<HospitalAdminAppointments />} />
        <Route path="hospital-admin/escalations" element={<HospitalAdminEscalations />} />
        <Route path="hospital-admin/resources" element={<HospitalAdminResources />} />
        <Route path="hospital-admin/communication" element={<HospitalAdminCommunication />} />
        <Route path="hospital-admin/analytics" element={<HospitalAdminAnalytics />} />
        <Route path="hospital-admin/ai-insights" element={<HospitalAdminAIInsights />} />
        <Route path="hospital-admin/reports" element={<HospitalAdminReports />} />
        <Route path="hospital-admin/hospitals" element={<HospitalAdminMultiHospital />} />
        <Route path="hospital-admin/settings" element={<HospitalAdminSettings />} />
        <Route path="hospital-admin/:subpage" element={<HospitalAdminDashboard />} />
        <Route path="telemedicine/:sessionId" element={<TelemedicinePage />} />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/patient" replace />} />
    </Routes>
  );
}
