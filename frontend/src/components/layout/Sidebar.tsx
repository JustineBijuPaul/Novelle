import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home, Heart, Brain, Activity, MessageCircle, BookOpen,
  MapPin, Bell, User, LogOut, Menu, X, Baby, AlertTriangle,
  Stethoscope, ChevronRight, Shield, Users, Building2, ShieldAlert,
  Calendar, Video, Zap, LayoutDashboard, UserSquare2, BarChart3,
  FileBarChart, MessagesSquare, Sparkles, Settings as SettingsIcon,
  BedDouble, GraduationCap
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useAppStore } from '../../stores/appStore';
import { cn } from '../../utils/helpers';

const userNavItems = [
  { path: '/dashboard', label: 'Dashboard', icon: Home },
  { path: '/health-log', label: 'Health Log', icon: Activity },
  { path: '/mental-health', label: 'Mental Health', icon: Brain },
  { path: '/risk-report', label: 'Risk Report', icon: AlertTriangle },
  { path: '/companion', label: 'AI Companion', icon: MessageCircle },
  { path: '/journal', label: 'Journal', icon: BookOpen },
  { path: '/baby-growth', label: 'Baby Growth', icon: Baby },
  { path: '/hospitals', label: 'Hospitals', icon: MapPin },
  { path: '/reminders', label: 'Reminders', icon: Bell },
];

const doctorNavItems = [
  { path: '/doctor/patients', label: 'Patients', icon: Users },
  { path: '/doctor/escalations', label: 'Escalations', icon: ShieldAlert },
];

const hospitalAdminNavItems = [
  // Core Operations
  { path: '/hospital-admin', label: 'Dashboard', icon: LayoutDashboard, category: 'Core' },
  { path: '/hospital-admin/patients', label: 'Patients', icon: Users, category: 'Core' },
  { path: '/hospital-admin/appointments', label: 'Appointments', icon: Calendar, category: 'Core' },
  { path: '/hospital-admin/escalations', label: 'Escalations', icon: ShieldAlert, category: 'Core' },
  // Management
  { path: '/hospital-admin/staff', label: 'Doctors & Staff', icon: Stethoscope, category: 'Management' },
  { path: '/hospital-admin/resources', label: 'Resources', icon: BedDouble, category: 'Management' },
  { path: '/hospital-admin/communication', label: 'Communication', icon: MessagesSquare, category: 'Management' },
  // Intelligence
  { path: '/hospital-admin/analytics', label: 'Analytics', icon: BarChart3, category: 'Intelligence' },
  { path: '/hospital-admin/ai-insights', label: 'AI Insights', icon: Sparkles, category: 'Intelligence' },
  { path: '/hospital-admin/reports', label: 'Reports', icon: FileBarChart, category: 'Intelligence' },
  // System
  { path: '/hospital-admin/hospitals', label: 'Hospitals', icon: Building2, category: 'System' },
  { path: '/hospital-admin/settings', label: 'Settings', icon: SettingsIcon, category: 'System' },
];

const adminNavItems = [
  { path: '/admin', label: 'Admin Dashboard', icon: Shield },
  { path: '/doctor/patients', label: 'Doctor View', icon: Stethoscope },
];

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { sidebarOpen, toggleSidebar, activePatientData } = useAppStore();

  const handleAction = (action: string) => {
    console.log(`Sidebar Action: ${action}`);
    // Implement global handlers or check activePatientData
  };

  const navItems = user?.role === 'platform_admin' 
    ? adminNavItems 
    : user?.role === 'hospital_admin' 
    ? hospitalAdminNavItems 
    : user?.role === 'doctor' 
    ? doctorNavItems 
    : userNavItems;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black z-40 lg:hidden"
            onClick={toggleSidebar}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-gray-100 shadow-sm',
          'transform transition-transform duration-300 ease-in-out',
          'lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <Link 
            to={user?.role === 'doctor' || user?.role === 'platform_admin' ? '/doctor/patients' : '/dashboard'} 
            className="flex items-center gap-2.5"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
              <Heart className="w-5 h-5 text-white" fill="white" />
            </div>
            <span className="font-display font-bold text-xl text-gray-900">Novelle</span>
          </Link>
          <button onClick={toggleSidebar} className="lg:hidden text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto h-[calc(100%-140px)] scrollbar-hide">
          <div className="mb-4">
            <p className="px-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Navigation</p>
            {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => sidebarOpen && toggleSidebar()}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                )}
              >
                <item.icon className={cn('w-5 h-5', isActive ? 'text-primary-500' : 'text-gray-400')} />
                {item.label}
                {isActive && <ChevronRight className="w-4 h-4 ml-auto text-primary-400" />}
              </Link>
            );
          })}
          </div>

          {/* Doctor-specific Widgets */}
          {user?.role === 'doctor' && (
            <div className="mt-8 space-y-6 pb-20">
              {/* Critical Alerts */}
              <div className="px-3">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Critical Alerts</p>
                </div>
                <div className="space-y-2">
                  {activePatientData ? (
                    <>
                      {activePatientData.physical_predictions?.overall_risk === 'HIGH' && <SidebarAlert label="Elevated Physical Risk" level="red" />}
                      {activePatientData.mental_predictions?.overall_risk === 'HIGH' && <SidebarAlert label="Mood Deterioration" level="red" />}
                      <SidebarAlert label="Review Recent Vitals" level="orange" />
                    </>
                  ) : (
                    <>
                      <SidebarAlert label="No active alerts" level="orange" />
                    </>
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="px-3">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Quick Actions</p>
                <div className="grid grid-cols-2 gap-2">
                  <SidebarAction icon={Calendar} label="Schedule" onClick={() => handleAction('Schedule')} />
                  <SidebarAction icon={Video} label="Video" onClick={() => handleAction('Video')} />
                  <SidebarAction icon={MessageCircle} label="Chat" onClick={() => handleAction('Chat')} />
                  <SidebarAction icon={Zap} label="Escalate" onClick={() => handleAction('Escalate')} />
                </div>
              </div>

              {/* Patient Pulse */}
              <div className="px-3">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Patient Pulse</p>
                <div className="bg-gray-50 rounded-xl p-3 space-y-3 border border-gray-100">
                  <div>
                    <div className="flex justify-between text-[10px] mb-1">
                      <span className="text-gray-500">Adherence</span>
                      <span className="text-green-600 font-bold">{activePatientData ? '87%' : '--'}</span>
                    </div>
                    <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-green-500" style={{ width: activePatientData ? '87%' : '0%' }} />
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-gray-500">Compliance</span>
                    <span className="text-[10px] font-bold text-primary-600 bg-primary-50 px-1.5 py-0.5 rounded">
                      {activePatientData ? 'High' : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Tasks */}
              <div className="px-3">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Pending Tasks</p>
                <div className="space-y-2">
                  <SidebarTask label="Review Glucose" priority="high" />
                  <SidebarTask label="Follow-up Scan" priority="medium" />
                </div>
              </div>
            </div>
          )}

          {/* Hospital Admin Live Status */}
          {user?.role === 'hospital_admin' && (
            <div className="px-3 mt-8 pb-20">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Live Status</p>
              <div className="bg-primary-900 rounded-xl p-3 space-y-2.5 shadow-lg border border-primary-800">
                <StatusIndicator label="AI Engine Online" status="online" />
                <StatusIndicator label="12 Doctors Active" status="active" />
                <StatusIndicator label="3 Urgent Escalations" status="urgent" />
                <StatusIndicator label="2 Emergency Cases" status="urgent" />
              </div>
            </div>
          )}
        </nav>

        {/* User section */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-gray-100 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center">
              <User className="w-4 h-4 text-primary-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user?.full_name}</p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}

function SidebarAlert({ label, level }: { label: string; level: 'red' | 'orange' }) {
  return (
    <div className={cn(
      "px-2 py-1.5 rounded-lg border text-[10px] font-bold flex items-center justify-between",
      level === 'red' ? "bg-red-50 text-red-700 border-red-100" : "bg-orange-50 text-orange-700 border-orange-100"
    )}>
      <span className="truncate">{label}</span>
      <ChevronRight className="w-2.5 h-2.5 shrink-0" />
    </div>
  );
}

function SidebarAction({ icon: Icon, label, onClick }: { icon: any; label: string; onClick?: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="flex flex-col items-center justify-center p-2 rounded-xl bg-gray-50 border border-gray-100 hover:bg-primary-50 hover:border-primary-200 transition-all group"
    >
      <Icon className="w-3.5 h-3.5 text-gray-400 group-hover:text-primary-500 mb-1" />
      <span className="text-[9px] font-medium text-gray-500 group-hover:text-primary-700">{label}</span>
    </button>
  );
}

function SidebarTask({ label, priority }: { label: string; priority: 'high' | 'medium' }) {
  return (
    <div className="flex items-center gap-2 group cursor-pointer">
      <div className={cn("w-1.5 h-1.5 rounded-full", priority === 'high' ? "bg-red-500" : "bg-amber-500")} />
      <span className="text-[10px] text-gray-600 group-hover:text-gray-900 truncate flex-1">{label}</span>
    </div>
  );
}

function StatusIndicator({ label, status }: { label: string; status: 'online' | 'active' | 'urgent' }) {
  const colors = {
    online: 'bg-green-500',
    active: 'bg-blue-400',
    urgent: 'bg-red-500 animate-pulse'
  };
  
  return (
    <div className="flex items-center gap-2">
      <div className={cn("w-1.5 h-1.5 rounded-full", colors[status])} />
      <span className="text-[10px] font-medium text-primary-100">{label}</span>
    </div>
  );
}
