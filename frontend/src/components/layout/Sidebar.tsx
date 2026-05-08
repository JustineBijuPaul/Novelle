import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home, Heart, Brain, Activity, MessageCircle, BookOpen,
  MapPin, Bell, User, LogOut, Menu, X, Baby, AlertTriangle,
  Stethoscope, ChevronRight, Shield, Users, Building2, ShieldAlert, CreditCard,
  Calendar, Video, Zap, LayoutDashboard, UserSquare2, BarChart3,
  FileBarChart, MessagesSquare, Sparkles, Settings as SettingsIcon,
  BedDouble, GraduationCap, HeartPulse, NotebookPen, Pill, ListTodo, MessageSquare
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useAppStore } from '../../stores/appStore';
import { cn } from '../../utils/helpers';

const userNavItems = [
  // OVERVIEW
  { path: '/patient', label: 'Dashboard', icon: Home, category: 'OVERVIEW' },
  { path: '/patient/my-pregnancy', label: 'My Pregnancy', icon: Baby, category: 'OVERVIEW' },
  { path: '/patient/ai-insights', label: 'AI Insights', icon: Sparkles, category: 'OVERVIEW' },
  
  // HEALTH TRACKING
  { path: '/patient/health-log', label: 'Health Log', icon: Activity, category: 'HEALTH TRACKING' },
  { path: '/patient/mental-health', label: 'Mental Health', icon: Brain, category: 'HEALTH TRACKING' },
  { path: '/patient/symptoms', label: 'Symptoms', icon: Stethoscope, category: 'HEALTH TRACKING' },
  { path: '/patient/baby-growth', label: 'Baby Growth', icon: Baby, category: 'HEALTH TRACKING' },
  
  // CARE & SUPPORT
  { path: '/patient/appointments', label: 'Appointments', icon: Calendar, category: 'CARE & SUPPORT' },
  { path: '/patient/teleconsultation', label: 'Teleconsultation', icon: Video, category: 'CARE & SUPPORT' },
  { path: '/patient/messages', label: 'Messages', icon: MessageSquare, category: 'CARE & SUPPORT' },
  { path: '/patient/hospitals', label: 'Hospitals', icon: MapPin, category: 'CARE & SUPPORT' },
  
  // WELLNESS
  { path: '/patient/journal', label: 'Journal', icon: BookOpen, category: 'WELLNESS' },
  { path: '/patient/wellness-hub', label: 'Wellness Hub', icon: GraduationCap, category: 'WELLNESS' },
  { path: '/patient/daily-goals', label: 'Daily Goals', icon: ListTodo, category: 'WELLNESS' },
  
  // SAFETY
  { path: '/patient/risk-report', label: 'Risk Reports', icon: Shield, category: 'SAFETY' },
  { path: '/patient/emergency-support', label: 'Emergency Support', icon: ShieldAlert, category: 'SAFETY' },
  { path: '/patient/reminders', label: 'Reminders', icon: Bell, category: 'SAFETY' },
  
  // ACCOUNT
  { path: '/patient/settings', label: 'Settings', icon: SettingsIcon, category: 'ACCOUNT' },
];

const doctorNavItems = [
  { path: '/doctor', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/doctor/patients', label: 'Patients', icon: Users },
  { path: '/doctor/appointments', label: 'Appointments', icon: Calendar },
  { path: '/doctor/escalations', label: 'Escalations', icon: ShieldAlert },
  { path: '/doctor/monitoring', label: 'Monitoring', icon: HeartPulse },
  { path: '/doctor/clinical-notes', label: 'Clinical Notes', icon: NotebookPen },
  { path: '/doctor/prescriptions', label: 'Prescriptions', icon: Pill },
  { path: '/doctor/telehealth', label: 'Telehealth', icon: Video },
  { path: '/doctor/ai-copilot', label: 'AI Copilot', icon: Sparkles },
  { path: '/doctor/reports', label: 'Reports', icon: FileBarChart },
  { path: '/doctor/communication', label: 'Communication', icon: MessageSquare },
  { path: '/doctor/tasks', label: 'Tasks', icon: ListTodo },
  { path: '/doctor/settings', label: 'Settings', icon: SettingsIcon },
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
  // Platform Overview
  { path: '/admin', label: 'Overview', icon: LayoutDashboard, category: 'Platform' },
  { path: '/admin/organizations', label: 'Organizations', icon: Building2, category: 'Platform' },
  { path: '/admin/hospitals', label: 'Hospitals', icon: MapPin, category: 'Platform' },
  { path: '/admin/users', label: 'Users & Roles', icon: Users, category: 'Platform' },
  
  // Intelligence & Health
  { path: '/admin/ai-control', label: 'AI Control Center', icon: Sparkles, category: 'Intelligence' },
  { path: '/admin/analytics', label: 'Platform Analytics', icon: BarChart3, category: 'Intelligence' },
  { path: '/admin/escalations', label: 'Escalation Monitor', icon: ShieldAlert, category: 'Intelligence' },
  
  // Operations
  { path: '/admin/billing', label: 'Billing & Subscriptions', icon: CreditCard, category: 'Operations' },
  { path: '/admin/infrastructure', label: 'Infrastructure', icon: Zap, category: 'Operations' },
  { path: '/admin/security', label: 'Security & Compliance', icon: Shield, category: 'Operations' },
  
  // Communication & Logs
  { path: '/admin/communication', label: 'Communication Center', icon: MessagesSquare, category: 'System' },
  { path: '/admin/audit-logs', label: 'Audit Logs', icon: FileBarChart, category: 'System' },
  { path: '/admin/integrations', label: 'Integrations', icon: SettingsIcon, category: 'System' },
  { path: '/admin/support', label: 'Support & Tickets', icon: MessageCircle, category: 'System' },
  { path: '/admin/reports', label: 'Reports', icon: FileBarChart, category: 'System' },
  { path: '/admin/settings', label: 'Settings', icon: SettingsIcon, category: 'System' },
];

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { sidebarOpen, toggleSidebar, activePatientData, profile } = useAppStore();

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
            to={
              user?.role === 'platform_admin' ? '/admin' :
              user?.role === 'doctor' ? '/doctor' : 
              user?.role === 'hospital_admin' ? '/hospital-admin' :
              '/patient'
            } 
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
            {Object.entries(
              navItems.reduce((acc: any, item: any) => {
                const cat = item.category || 'Navigation';
                if (!acc[cat]) acc[cat] = [];
                acc[cat].push(item);
                return acc;
              }, {})
            ).map(([category, items]: [string, any]) => (
              <div key={category} className="mb-6 last:mb-0">
                <p className="px-3 text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 opacity-70">
                  {category}
                </p>
                <div className="space-y-1">
                  {items.map((item: any) => {
                    const isActive = location.pathname === item.path;
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => sidebarOpen && toggleSidebar()}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                          isActive
                            ? 'bg-primary-50 text-primary-700 shadow-sm'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        )}
                      >
                        <item.icon className={cn('w-5 h-5', isActive ? 'text-primary-500' : 'text-gray-400')} />
                        <span className="flex-1">{item.label}</span>
                        {isActive && <div className="w-1.5 h-1.5 rounded-full bg-primary-500" />}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
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

          {/* Patient-specific Enhancements */}
          {(user?.role === 'pregnant_user' || user?.role === 'postpartum_user') && (
            <div className="mt-4 space-y-4 pb-20">
              <PregnancyProgressCard week={profile?.pregnancy_week || 24} />
              <EmergencyStickyButton />
              <AIAssistantWidget />
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

function PregnancyProgressCard({ week }: { week: number }) {
  const progress = (week / 40) * 100;
  const trimester = week <= 12 ? 'First' : week <= 27 ? 'Second' : 'Third';
  return (
    <div className="mx-3 mt-4 p-4 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-lg shadow-primary-200">
      <div className="flex justify-between items-start mb-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">Pregnancy Progress</p>
          <h3 className="text-xl font-display font-bold">Week {week} of 40</h3>
        </div>
        <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
          <Baby className="w-5 h-5 text-white" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
          <div className="h-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)] transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
        <div className="flex justify-between text-[10px] font-medium">
          <span>{trimester} Trimester</span>
          <span>{40 - week} weeks to go</span>
        </div>
      </div>
    </div>
  );
}

function EmergencyStickyButton() {
  return (
    <button className="flex items-center justify-center gap-2 w-[calc(100%-24px)] mx-3 mt-4 px-4 py-3 bg-red-50 text-red-600 rounded-xl border border-red-100 font-bold text-sm hover:bg-red-100 transition-colors shadow-sm">
      <ShieldAlert className="w-5 h-5" />
      🚨 Emergency Support
    </button>
  );
}

function AIAssistantWidget() {
  return (
    <div className="mx-3 mt-4 p-4 rounded-2xl bg-gray-900 text-white">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Novelle AI</p>
          <p className="text-xs font-medium">Need help today?</p>
        </div>
      </div>
      <button className="w-full py-2 bg-white/10 hover:bg-white/20 rounded-lg text-[11px] font-bold transition-colors">
        Ask AI Assistant
      </button>
    </div>
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
