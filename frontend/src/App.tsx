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

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  return !isAuthenticated ? <>{children}</> : <Navigate to="/dashboard" replace />;
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
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="health-log" element={<HealthLogPage />} />
        <Route path="mental-health" element={<MentalHealthPage />} />
        <Route path="risk-report" element={<RiskReportPage />} />
        <Route path="companion" element={<CompanionPage />} />
        <Route path="journal" element={<JournalPage />} />
        <Route path="baby-growth" element={<BabyGrowthPage />} />
        <Route path="hospitals" element={<HospitalsPage />} />
        <Route path="reminders" element={<RemindersPage />} />
        <Route path="doctor" element={<DoctorDashboardPage />} />
        <Route path="admin" element={<AdminDashboardPage />} />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
