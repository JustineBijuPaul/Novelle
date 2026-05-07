import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import AppLayout from './components/layout/AppLayout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import OnboardingPage from './pages/OnboardingPage';
import DashboardPage from './pages/DashboardPage';
import HealthLogPage from './pages/HealthLogPage';
import MentalHealthPage from './pages/MentalHealthPage';
import RiskReportPage from './pages/RiskReportPage';
import CompanionPage from './pages/CompanionPage';
import JournalPage from './pages/JournalPage';
import BabyGrowthPage from './pages/BabyGrowthPage';
import HospitalsPage from './pages/HospitalsPage';
import RemindersPage from './pages/RemindersPage';
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

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore();
  if (isAuthenticated) {
    let target = '/dashboard';
    if (user?.role === 'doctor') target = '/doctor/patients';
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
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={
          useAuthStore.getState().user?.role === 'hospital_admin' 
            ? <Navigate to="/hospital-admin" replace />
            : useAuthStore.getState().user?.role === 'platform_admin' 
            ? <Navigate to="/admin" replace /> 
            : useAuthStore.getState().user?.role === 'doctor'
            ? <Navigate to="/doctor/patients" replace /> 
            : <DashboardPage />
        } />
        <Route path="health-log" element={<HealthLogPage />} />
        <Route path="mental-health" element={<MentalHealthPage />} />
        <Route path="risk-report" element={<RiskReportPage />} />
        <Route path="companion" element={<CompanionPage />} />
        <Route path="journal" element={<JournalPage />} />
        <Route path="baby-growth" element={<BabyGrowthPage />} />
        <Route path="hospitals" element={<HospitalsPage />} />
        <Route path="reminders" element={<RemindersPage />} />
        <Route path="doctor/patients" element={<DoctorDashboardPage />} />
        <Route path="doctor/escalations" element={<DoctorDashboardPage />} />
        <Route path="doctor" element={<Navigate to="/doctor/patients" replace />} />
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
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
