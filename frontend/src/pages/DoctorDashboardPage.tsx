import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  Bell,
  Bot,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileBarChart,
  FileText,
  Filter,
  HeartPulse,
  LayoutDashboard,
  ListTodo,
  MessageSquare,
  NotebookPen,
  PhoneCall,
  Pill,
  Search,
  Send,
  Settings,
  ShieldAlert,
  Sparkles,
  Stethoscope,
  Target,
  TrendingUp,
  Users,
  Video,
  RefreshCw,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { doctorService, escalationService } from '../services/endpoints';
import { formatDate, getRiskBadge, cn } from '../utils/helpers';
import type { Escalation, PatientDashboardData } from '../types';
import PatientDetailDashboard from '../components/doctor/PatientDetailDashboard';
import { useAppStore } from '../stores/appStore';

type DoctorSectionId =
  | 'dashboard'
  | 'patients'
  | 'appointments'
  | 'escalations'
  | 'monitoring'
  | 'clinical-notes'
  | 'prescriptions'
  | 'telehealth'
  | 'ai-copilot'
  | 'reports'
  | 'communication'
  | 'tasks'
  | 'settings';

interface PatientRisk {
  mental_risk_level: string | null;
  physical_risk_level: string | null;
  fetal_risk_level: string | null;
  crisis_flag?: string;
}

interface PatientSummary {
  user_id: number;
  name: string;
  email: string;
  phone?: string;
  city?: string;
  pregnancy_week?: number;
  trimester?: string;
  age?: number;
  latest_risk?: PatientRisk;
}

const doctorSections: Array<{
  id: DoctorSectionId;
  label: string;
  icon: typeof LayoutDashboard;
  summary: string;
  submenu: string[];
}> = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, summary: 'Command center overview with KPIs, alerts, and next actions.', submenu: ['KPI Cards', 'Risk Overview', 'Recent Activity', 'Upcoming Consultations', 'Emergency Alerts'] },
  { id: 'patients', label: 'Patients', icon: Users, summary: 'Assigned patients, risk queues, and pregnancy tracking.', submenu: ['All Patients', 'High Risk', 'New Patients', 'Pregnancy Tracking', 'Postpartum Care', 'Discharged Patients'] },
  { id: 'appointments', label: 'Appointments', icon: Calendar, summary: 'Schedule, follow-up, calendar, missed visits, and teleconsultations.', submenu: ["Today's Appointments", 'Upcoming', 'Calendar', 'Missed Appointments', 'Teleconsultations'] },
  { id: 'escalations', label: 'Escalations', icon: ShieldAlert, summary: 'AI-generated and manual escalations with triage controls.', submenu: ['Pending', 'Urgent Cases', 'Resolved', 'Escalation History'] },
  { id: 'monitoring', label: 'Monitoring', icon: HeartPulse, summary: 'Vitals, fetal trends, mental health, and device sync.', submenu: ['Vitals Monitoring', 'Fetal Monitoring', 'Mental Health', 'Device Sync', 'Trend Analysis'] },
  { id: 'clinical-notes', label: 'Clinical Notes', icon: NotebookPen, summary: 'SOAP notes, consultation notes, follow-ups, and templates.', submenu: ['SOAP Notes', 'Consultation Notes', 'Follow-up Notes', 'Templates', 'Drafts'] },
  { id: 'prescriptions', label: 'Prescriptions', icon: Pill, summary: 'Medication management, interaction alerts, and refills.', submenu: ['Create Prescription', 'Medication History', 'Refills', 'Drug Interactions'] },
  { id: 'telehealth', label: 'Telehealth', icon: Video, summary: 'Video sessions, chat consults, waiting room, and session history.', submenu: ['Video Sessions', 'Chat Consultations', 'Session History', 'Waiting Room'] },
  { id: 'ai-copilot', label: 'AI Copilot', icon: Bot, summary: 'Patient summaries, risk analysis, recommendations, and explainability.', submenu: ['Patient Summaries', 'Risk Analysis', 'AI Recommendations', 'Predictive Insights', 'Explainable AI'] },
  { id: 'reports', label: 'Reports', icon: FileBarChart, summary: 'Patient, pregnancy, escalation, and treatment reports.', submenu: ['Patient Reports', 'Pregnancy Reports', 'Escalation Reports', 'Treatment Reports', 'Exports'] },
  { id: 'communication', label: 'Communication', icon: MessageSquare, summary: 'Secure patient messaging, internal coordination, and announcements.', submenu: ['Patient Messages', 'Internal Chat', 'Announcements', 'Notifications'] },
  { id: 'tasks', label: 'Tasks', icon: ListTodo, summary: 'Follow-ups, review requests, and workflow prioritization.', submenu: ['Pending Tasks', 'Follow-ups', 'Review Requests', 'Completed Tasks'] },
  { id: 'settings', label: 'Settings', icon: Settings, summary: 'Profile, availability, notifications, and security.', submenu: ['Profile', 'Availability', 'Notification Settings', 'Security', 'Preferences'] },
];

const topMetrics = [
  { key: 'total_patients', label: 'Assigned Patients', icon: Users, color: 'from-cyan-500 to-blue-500' },
  { key: 'high_risk', label: 'High-Risk Patients', icon: AlertTriangle, color: 'from-rose-500 to-red-500' },
  { key: 'pending', label: 'Pending Escalations', icon: ShieldAlert, color: 'from-amber-500 to-orange-500' },
  { key: 'today_appointments', label: "Today's Appointments", icon: Calendar, color: 'from-violet-500 to-fuchsia-500' },
  { key: 'followups_due', label: 'Follow-ups Due', icon: Target, color: 'from-emerald-500 to-teal-500' },
  { key: 'ai_insights', label: 'AI Insights', icon: Sparkles, color: 'from-slate-700 to-slate-900' },
];

const patientFilters = ['All Patients', 'High Risk', 'New Patients', 'Pregnancy Tracking', 'Postpartum Care', 'Discharged Patients'];
const appointmentFilters = ["Today's Appointments", 'Upcoming', 'Calendar', 'Missed Appointments', 'Teleconsultations'];
const escalationFilters = ['Pending', 'Urgent Cases', 'Resolved', 'Escalation History'];
const monitoringFilters = ['Vitals Monitoring', 'Fetal Monitoring', 'Mental Health', 'Device Sync', 'Trend Analysis'];

const dashboardTrend = [
  { label: 'Mon', risk: 48, alerts: 4 },
  { label: 'Tue', risk: 54, alerts: 6 },
  { label: 'Wed', risk: 61, alerts: 8 },
  { label: 'Thu', risk: 58, alerts: 7 },
  { label: 'Fri', risk: 66, alerts: 9 },
  { label: 'Sat', risk: 63, alerts: 6 },
  { label: 'Sun', risk: 70, alerts: 10 },
];

const vitalsTrend = [
  { label: 'W1', systolic: 118, diastolic: 76, glucose: 92, mood: 7 },
  { label: 'W2', systolic: 122, diastolic: 79, glucose: 95, mood: 7 },
  { label: 'W3', systolic: 128, diastolic: 82, glucose: 101, mood: 6 },
  { label: 'W4', systolic: 131, diastolic: 84, glucose: 109, mood: 6 },
  { label: 'W5', systolic: 136, diastolic: 86, glucose: 116, mood: 5 },
  { label: 'W6', systolic: 142, diastolic: 90, glucose: 124, mood: 4 },
];

const activityFeed = [
  { title: 'BP reading uploaded for Aisha Khan', time: '4 min ago', kind: 'Vitals update' },
  { title: 'Escalation resolved for Meera Nair', time: '18 min ago', kind: 'Escalation' },
  { title: 'Medication adherence reminder sent', time: '41 min ago', kind: 'Communication' },
  { title: 'Telehealth session started with Priya S.', time: '1 hour ago', kind: 'Telehealth' },
];

const quickActions = [
  { label: 'Add Note', icon: NotebookPen },
  { label: 'Prescribe Medicine', icon: Pill },
  { label: 'Start Video Call', icon: Video },
  { label: 'Escalate Case', icon: ShieldAlert },
  { label: 'Generate Report', icon: FileBarChart },
];

const sampleAppointments = [
  { time: '08:30', patient: 'Ananya Patel', reason: 'BP review', status: 'Teleconsultation' },
  { time: '09:45', patient: 'Fatima Ali', reason: 'Growth scan follow-up', status: 'In-person' },
  { time: '11:10', patient: 'Sana Roy', reason: 'Mental health check-in', status: 'Follow-up' },
  { time: '14:00', patient: 'Riya Menon', reason: 'Medication review', status: 'Teleconsultation' },
];

const sampleTasks = [
  { title: 'Review 3 urgent escalations', priority: 'high', due: 'Now' },
  { title: 'Approve follow-up schedule', priority: 'medium', due: 'Today' },
  { title: 'Send postnatal discharge summary', priority: 'low', due: 'Tomorrow' },
  { title: 'Check medication interaction alert', priority: 'high', due: 'Today' },
];

const sampleMessages = [
  { from: 'Aisha Khan', text: 'I uploaded my BP readings for this morning.', time: '2 min ago', channel: 'Patient Message' },
  { from: 'Nurse Team', text: 'Waiting room has 2 patients ready for triage.', time: '12 min ago', channel: 'Internal Chat' },
  { from: 'Hospital Admin', text: 'Emergency broadcast acknowledged by OB team.', time: '1 hour ago', channel: 'Announcement' },
];

const sampleReports = [
  { title: 'Patient Reports', desc: 'Export assigned patient summaries and risk snapshots.' },
  { title: 'Pregnancy Reports', desc: 'Generate trimester timelines and fetal monitoring summaries.' },
  { title: 'Escalation Reports', desc: 'Review pending, urgent, and resolved escalations.' },
  { title: 'Treatment Reports', desc: 'Share notes, prescriptions, and compliance history.' },
];

const sampleSettings = [
  { title: 'Availability', desc: 'Morning clinic, afternoon telehealth, emergency on-call.' },
  { title: 'Notifications', desc: 'Critical alerts, new messages, escalation follow-ups.' },
  { title: 'Security', desc: 'MFA enabled, session timeout, secure clinical access.' },
  { title: 'Preferences', desc: 'Explainability level: high, compact patient summaries.' },
];

export default function DoctorDashboardPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { setActivePatientData } = useAppStore();
  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState<number | null>(null);
  const [predictions, setPredictions] = useState<PatientDashboardData | null>(null);
  const [loadingPredictions, setLoadingPredictions] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSection, setActiveSection] = useState<DoctorSectionId>('dashboard');
  const [stats, setStats] = useState({
    total_patients: 0,
    high_risk: 0,
    pending: 0,
    resolved: 0,
    today_appointments: 0,
    followups_due: 0,
    ai_insights: 0,
  });


  const selectedSection = useMemo(() => {
    if (location.hash) {
      const section = location.hash.replace('#', '') as DoctorSectionId;
      if (doctorSections.some((item) => item.id === section)) return section;
    }
    if (location.pathname.endsWith('/escalations')) return 'escalations';
    if (location.pathname.endsWith('/appointments')) return 'appointments';
    if (location.pathname.endsWith('/monitoring')) return 'monitoring';
    if (location.pathname.endsWith('/clinical-notes')) return 'clinical-notes';
    if (location.pathname.endsWith('/prescriptions')) return 'prescriptions';
    if (location.pathname.endsWith('/telehealth')) return 'telehealth';
    if (location.pathname.endsWith('/ai-copilot')) return 'ai-copilot';
    if (location.pathname.endsWith('/reports')) return 'reports';
    if (location.pathname.endsWith('/communication')) return 'communication';
    if (location.pathname.endsWith('/tasks')) return 'tasks';
    if (location.pathname.endsWith('/settings')) return 'settings';
    if (location.pathname.endsWith('/patients')) return 'patients';
    return activeSection;
  }, [activeSection, location.hash, location.pathname]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const sectionFromHash = location.hash.replace('#', '') as DoctorSectionId;
    const validSection = doctorSections.some((item) => item.id === sectionFromHash) ? sectionFromHash : null;

    if (validSection) {
      setActiveSection(validSection);
      window.requestAnimationFrame(() => {
        document.getElementById(validSection)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      return;
    }

    if (location.pathname.endsWith('/escalations')) {
      setActiveSection('escalations');
    } else if (location.pathname.endsWith('/appointments')) {
      setActiveSection('appointments');
    } else if (location.pathname.endsWith('/monitoring')) {
      setActiveSection('monitoring');
    } else if (location.pathname.endsWith('/clinical-notes')) {
      setActiveSection('clinical-notes');
    } else if (location.pathname.endsWith('/prescriptions')) {
      setActiveSection('prescriptions');
    } else if (location.pathname.endsWith('/telehealth')) {
      setActiveSection('telehealth');
    } else if (location.pathname.endsWith('/ai-copilot')) {
      setActiveSection('ai-copilot');
    } else if (location.pathname.endsWith('/reports')) {
      setActiveSection('reports');
    } else if (location.pathname.endsWith('/communication')) {
      setActiveSection('communication');
    } else if (location.pathname.endsWith('/tasks')) {
      setActiveSection('tasks');
    } else if (location.pathname.endsWith('/settings')) {
      setActiveSection('settings');
    } else if (location.pathname.endsWith('/patients')) {
      setActiveSection('patients');
    } else {
      setActiveSection('dashboard');
    }
  }, [location.hash, location.pathname]);

  const loadData = async () => {
    try {
      const [dashboardRes, escalationRes] = await Promise.allSettled([doctorService.getDashboard(), escalationService.list()]);

      if (dashboardRes.status === 'fulfilled') {
        const payload = dashboardRes.value.data || {};
        setPatients(payload.patients || []);
        setStats((prev) => ({
          ...prev,
          ...payload.stats,
          total_patients: payload.stats?.total_patients ?? payload.patients?.length ?? prev.total_patients,
          high_risk: payload.stats?.high_risk ?? prev.high_risk,
          pending: payload.stats?.pending ?? prev.pending,
          resolved: payload.stats?.resolved ?? prev.resolved,
          today_appointments: payload.stats?.today_appointments ?? prev.today_appointments,
          followups_due: payload.stats?.followups_due ?? prev.followups_due,
          ai_insights: payload.stats?.ai_insights ?? prev.ai_insights,
        }));
      }

      if (escalationRes.status === 'fulfilled') {
        setEscalations(escalationRes.value.data || []);
      }
    } catch {
      // keep dashboard usable with local fallback data
    } finally {
      setLoading(false);
    }
  };

  const openPatient = async (patientId: number) => {
    setSelectedPatient(patientId);
    setLoadingPredictions(true);
    try {
      const res = await doctorService.getPatientPredictions(patientId);
      setPredictions(res.data);
      setActivePatientData(res.data);
    } catch (error) {
      console.error('Failed to load patient predictions:', error);
    } finally {
      setLoadingPredictions(false);
    }
  };

  const closePatientFocus = () => {
    setSelectedPatient(null);
    setPredictions(null);
    setActivePatientData(null);
  };

  const handleAddNote = async (content: string) => {
    if (!selectedPatient) return;
    await doctorService.addNote(selectedPatient, content);
    await openPatient(selectedPatient);
  };

  const handleAddAppointment = async (date: string, reason: string) => {
    if (!selectedPatient) return;
    await doctorService.scheduleAppointment(selectedPatient, { appointment_date: date, reason });
    await openPatient(selectedPatient);
  };

  const resolveEscalation = async (id: string) => {
    await escalationService.resolve(id, { status: 'resolved', notes: 'Reviewed and resolved by doctor' });
    setEscalations((prev) => prev.map((item) => (item.id === id ? { ...item, status: 'resolved' } : item)));
  };

  const visiblePatients = patients.filter((patient) => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;
    return [patient.name, patient.email, patient.city, patient.trimester, patient.latest_risk?.crisis_flag]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query));
  });

  const pendingEscalations = escalations.filter((item) => item.status === 'pending');
  const urgentEscalations = escalations.filter((item) => ['urgent', 'HIGH', 'URGENT'].includes(String(item.severity || item.risk_level).toUpperCase()));
  const highRiskPatients = visiblePatients.filter((item) =>
    [item.latest_risk?.mental_risk_level, item.latest_risk?.physical_risk_level, item.latest_risk?.fetal_risk_level].some((level) => String(level).toUpperCase() === 'HIGH')
  );

  const summaryStats = {
    totalPatients: stats.total_patients || patients.length,
    highRiskPatients: stats.high_risk || highRiskPatients.length,
    pendingEscalations: stats.pending || pendingEscalations.length,
    todayAppointments: stats.today_appointments || 8,
    followupsDue: stats.followups_due || 6,
    aiInsights: stats.ai_insights || 12,
  };

  const activeSectionMeta = doctorSections.find((item) => item.id === selectedSection) || doctorSections[0];

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}>
          <Stethoscope className="h-12 w-12 text-primary-500" />
        </motion.div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-8 pb-14 animate-fade-in">
        {selectedSection === 'dashboard' && (
        <SectionShell id="dashboard" icon={LayoutDashboard} title="Dashboard" description={activeSectionMeta.summary} submenu={doctorSections[0].submenu}>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
            {topMetrics.map((metric) => (
              <StatCard
                key={metric.key}
                label={metric.label}
                value={summaryStats[metric.key as keyof typeof summaryStats]}
                icon={metric.icon}
                gradient={metric.color}
              />
            ))}
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
            <div className="card overflow-hidden border-slate-200 bg-gradient-to-br from-white to-cyan-50/50">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Risk Overview</h3>
                  <p className="mt-1 text-xs text-slate-500">Activity, alerts, and follow-up load over the past 7 days.</p>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white">
                  <TrendingUp className="h-3 w-3" /> Weekly trend
                </span>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dashboardTrend}>
                    <defs>
                      <linearGradient id="riskGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                    <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                    <Tooltip />
                    <Area type="monotone" dataKey="risk" stroke="#0891b2" fill="url(#riskGradient)" strokeWidth={3} />
                    <Area type="monotone" dataKey="alerts" stroke="#f97316" fillOpacity={0} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card overflow-hidden border-slate-200 bg-slate-950 text-white">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">AI Clinical Summary</h3>
                <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-cyan-100">Explainable</span>
              </div>
              <div className="space-y-4">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs text-slate-300">Current insight</p>
                  <p className="mt-2 text-sm leading-6 text-white">
                    Patient showing increasing BP trend with reduced sleep quality. Recommend review of antihypertensive adherence, repeat vitals, and follow-up within 24 hours.
                  </p>
                </div>
                <div className="space-y-3">
                  <InsightRow label="Most common trigger" value="Rising BP + missed logs" />
                  <InsightRow label="Predictive signal" value="Escalation probability 0.78" />
                  <InsightRow label="Next recommendation" value="Schedule urgent review" />
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2">
                  {quickActions.slice(0, 4).map((action) => (
                    <button
                      key={action.label}
                      className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-left transition-all hover:bg-white/10"
                      onClick={() => {
                        if (action.label === 'Generate Report') {
                              navigate('/doctor/reports');
                        }
                      }}
                    >
                      <action.icon className="h-4 w-4 text-cyan-200" />
                      <p className="mt-2 text-xs font-semibold text-white">{action.label}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_1fr]">
            <div className="card border-slate-200">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Recent Activity Feed</h3>
                  <p className="mt-1 text-xs text-slate-500">Vitals, escalations, medication adherence, and appointment updates.</p>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400" />
              </div>
              <div className="space-y-3">
                {activityFeed.map((item) => (
                  <FeedItem key={item.title} {...item} />
                ))}
              </div>
            </div>

            <div className="card border-slate-200 bg-gradient-to-br from-emerald-50 to-white">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Upcoming Consultations</h3>
                <Calendar className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="space-y-3">
                {sampleAppointments.slice(0, 3).map((item) => (
                  <AppointmentRow key={`${item.time}-${item.patient}`} {...item} />
                ))}
              </div>
              <div className="mt-5 rounded-2xl bg-slate-950 p-4 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.3em] text-cyan-200">Emergency Alerts</p>
                    <p className="mt-1 text-sm font-semibold">{urgentEscalations.length || 2} cases need immediate review</p>
                  </div>
                  <ShieldAlert className="h-5 w-5 text-rose-300" />
                </div>
              </div>
            </div>
          </div>
        </SectionShell>
        )}

        {selectedSection === 'patients' && (
        <SectionShell id="patients" icon={Users} title="Patients" description={doctorSections[1].summary} submenu={patientFilters}>
          <div className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {visiblePatients.map((patient, index) => (
                  <PatientCard key={patient.user_id} patient={patient} index={index} onClick={() => openPatient(patient.user_id)} />
                ))}
              </div>
              {visiblePatients.length === 0 && <EmptyState icon={Users} message="No patients match the current search." />}
            </div>

            <div className="space-y-4">
              <div className="card border-rose-100 bg-rose-50/60">
                <h3 className="mb-3 text-sm font-bold text-rose-700">High-Risk Patient Queue</h3>
                <div className="space-y-2">
                  {(highRiskPatients.slice(0, 4).length ? highRiskPatients.slice(0, 4) : patients.slice(0, 4)).map((patient) => (
                    <QueuePatient key={patient.user_id} patient={patient} onClick={() => openPatient(patient.user_id)} />
                  ))}
                </div>
              </div>

              <div className="card border-slate-200 bg-gradient-to-br from-white to-cyan-50/40">
                <h3 className="mb-3 text-sm font-bold text-slate-900">Pregnancy Monitoring Widget</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <MiniStat label="Trimester" value="Second" />
                  <MiniStat label="Progress" value="64%" />
                  <MiniStat label="Next Scan" value="3 days" />
                  <MiniStat label="Milestones" value="4 upcoming" />
                </div>
                <div className="mt-4 rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Fetal development</span>
                    <span>Week 26</span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full w-[64%] rounded-full bg-gradient-to-r from-cyan-500 to-blue-500" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </SectionShell>
        )}

        {selectedSection === 'appointments' && (
        <SectionShell id="appointments" icon={Calendar} title="Appointments" description={doctorSections[2].summary} submenu={appointmentFilters}>
          <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
            <div className="card border-slate-200">
              <h3 className="mb-4 text-sm font-bold text-slate-900">Today's Schedule</h3>
              <div className="space-y-3">
                {sampleAppointments.map((item) => (
                  <ScheduleRow key={`${item.time}-${item.patient}`} {...item} />
                ))}
              </div>
            </div>
            <div className="card border-slate-200 bg-slate-950 text-white">
              <h3 className="mb-4 text-sm font-bold text-white">Calendar Snapshot</h3>
              <div className="grid grid-cols-7 gap-2 text-center text-[10px]">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => (
                  <div key={day} className={cn('rounded-xl p-3', index === 2 ? 'bg-white/10' : 'bg-white/5')}>
                    <div className="font-bold">{day}</div>
                    <div className="mt-2 text-cyan-200">{index + 9}</div>
                  </div>
                ))}
              </div>
              <div className="mt-4 space-y-2 text-xs text-slate-300">
                <div className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2"><span>Missed appointments</span><span className="font-semibold text-amber-200">2</span></div>
                <div className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2"><span>Teleconsultations</span><span className="font-semibold text-cyan-200">4</span></div>
              </div>
            </div>
          </div>
        </SectionShell>
        )}

        {selectedSection === 'escalations' && (
        <SectionShell id="escalations" icon={ShieldAlert} title="Escalations" description={doctorSections[3].summary} submenu={escalationFilters}>
          <div className="grid gap-4 xl:grid-cols-[1.3fr_0.8fr]">
            <div className="space-y-3">
              {(escalations.length ? escalations : mockEscalations).map((item, index) => (
                <EscalationCard key={item.id || index} item={item} onResolve={resolveEscalation} />
              ))}
            </div>
            <div className="card border-slate-200 bg-rose-50/60">
              <h3 className="mb-3 text-sm font-bold text-slate-900">Escalation History</h3>
              <div className="space-y-3">
                <HistoryMetric label="Pending" value={pendingEscalations.length || 3} color="rose" />
                <HistoryMetric label="Resolved today" value={summaryStats.pendingEscalations ? summaryStats.pendingEscalations + 2 : 5} color="emerald" />
                <HistoryMetric label="Specialist referrals" value={4} color="amber" />
              </div>
            </div>
          </div>
        </SectionShell>
        )}

        {selectedSection === 'monitoring' && (
        <SectionShell id="monitoring" icon={HeartPulse} title="Monitoring" description={doctorSections[4].summary} submenu={monitoringFilters}>
          <div className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
            <div className="card border-slate-200">
              <div className="grid gap-6 lg:grid-cols-2">
                <TrendCard title="Vitals Trend" subtitle="Blood pressure and glucose" />
                <TrendCard title="Mood Trend" subtitle="Mood and stress" variant="mood" />
              </div>
              <div className="mt-6 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={vitalsTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="systolic" stroke="#ef4444" strokeWidth={3} />
                    <Line type="monotone" dataKey="diastolic" stroke="#3b82f6" strokeWidth={3} />
                    <Line type="monotone" dataKey="glucose" stroke="#8b5cf6" strokeWidth={3} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="space-y-4">
              <div className="card border-slate-200 bg-cyan-50/50">
                <h3 className="mb-3 text-sm font-bold text-slate-900">Device Sync</h3>
                <div className="space-y-3">
                  <SyncRow label="BP cuff" value="Synced 6 min ago" />
                  <SyncRow label="Glucose meter" value="Synced 22 min ago" />
                  <SyncRow label="Fetal tracker" value="Synced 48 min ago" />
                  <SyncRow label="Mood tracker" value="Synced 1 hour ago" />
                </div>
              </div>
              <div className="card border-slate-200">
                <h3 className="mb-3 text-sm font-bold text-slate-900">Anomaly Detection</h3>
                <div className="space-y-2 text-sm text-slate-600">
                  <AlertLine label="Blood pressure spike detected" tone="rose" />
                  <AlertLine label="Reduced sleep quality trend" tone="amber" />
                  <AlertLine label="Fetal movement logs consistent" tone="emerald" />
                </div>
              </div>
            </div>
          </div>
        </SectionShell>
        )}

        {selectedSection === 'clinical-notes' && (
        <SectionShell id="clinical-notes" icon={NotebookPen} title="Clinical Notes" description={doctorSections[5].summary} submenu={doctorSections[5].submenu}>
          <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
            <div className="card border-slate-200">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">SOAP Notes</h3>
                <button className="text-xs font-semibold text-primary-600 hover:underline">Use template</button>
              </div>
              <textarea
                className="min-h-40 w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm outline-none focus:border-primary-400"
                placeholder="Subjective, Objective, Assessment, Plan..."
                defaultValue="Patient reports reduced sleep and increased anxiety. BP trend requires close observation."
              />
              <div className="mt-4 flex flex-wrap gap-2">
                {['Consultation', 'Follow-up', 'Discharge', 'Urgent Review'].map((template) => (
                  <button key={template} className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200">
                    {template}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              {mockClinicalNotes.map((note) => (
                <NoteCard key={note.title} note={note} />
              ))}
            </div>
          </div>
        </SectionShell>
        )}

        {selectedSection === 'prescriptions' && (
        <SectionShell id="prescriptions" icon={Pill} title="Prescriptions" description={doctorSections[6].summary} submenu={doctorSections[6].submenu}>
          <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="grid gap-3 md:grid-cols-2">
              {mockMedications.map((medication) => (
                <MedicationCard key={medication.name} medication={medication} />
              ))}
            </div>
            <div className="space-y-4">
              <div className="card border-amber-100 bg-amber-50/60">
                <h3 className="mb-3 text-sm font-bold text-slate-900">Drug Interaction Alerts</h3>
                <div className="space-y-2 text-sm text-slate-700">
                  <AlertLine label="Iron supplement may affect thyroid medication timing" tone="amber" />
                  <AlertLine label="NSAID caution in third trimester" tone="rose" />
                </div>
              </div>
              <div className="card border-slate-200">
                <h3 className="mb-3 text-sm font-bold text-slate-900">Medication Management</h3>
                <div className="space-y-3 text-sm text-slate-600">
                  <ProgressRow label="Adherence" value={87} />
                  <ProgressRow label="Active refills" value={64} />
                </div>
                <button className="btn-primary mt-4 flex w-full items-center justify-center gap-2">
                  <Download className="h-4 w-4" /> Export / Download PDF
                </button>
              </div>
            </div>
          </div>
        </SectionShell>
        )}

        {selectedSection === 'telehealth' && (
        <SectionShell id="telehealth" icon={Video} title="Telehealth" description={doctorSections[7].summary} submenu={doctorSections[7].submenu}>
          <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
            <div className="space-y-3">
              {telehealthRooms.map((room) => (
                <SessionCard key={room.title} room={room} />
              ))}
            </div>
            <div className="card border-slate-200 bg-slate-950 text-white">
              <h3 className="mb-3 text-sm font-bold text-white">Waiting Room</h3>
              <div className="space-y-3">
                {waitingRoom.map((entry) => (
                  <WaitingRoomRow key={entry.name} {...entry} />
                ))}
              </div>
              <div className="mt-4 rounded-2xl bg-white/5 p-4 text-xs text-slate-300">
                Share reports, join remote consultation sessions, and attach consultation notes from the session history.
              </div>
            </div>
          </div>
        </SectionShell>
        )}

        {selectedSection === 'ai-copilot' && (
        <SectionShell id="ai-copilot" icon={Bot} title="AI Copilot" description={doctorSections[8].summary} submenu={doctorSections[8].submenu}>
          <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
            <div className="card border-slate-200 bg-gradient-to-br from-slate-950 to-cyan-950 text-white">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">Patient Summaries</h3>
                <Sparkles className="h-4 w-4 text-cyan-200" />
              </div>
              <p className="text-sm leading-6 text-slate-200">
                AI-generated summary: recurrent BP rise, reduced sleep quality, and fluctuating mood scores suggest a need for closer review and an early follow-up.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <SummaryTile label="Confidence" value="91%" />
                <SummaryTile label="Severity" value="High" />
                <SummaryTile label="Explainability" value="SHAP active" />
                <SummaryTile label="Forecast" value="72h risk window" />
              </div>
            </div>
            <div className="card border-slate-200">
              <h3 className="mb-3 text-sm font-bold text-slate-900">Risk Analysis</h3>
              <div className="space-y-3">
                <RiskFactorRow label="Rising BP trend" impact="0.31" />
                <RiskFactorRow label="Lower sleep quality" impact="0.22" />
                <RiskFactorRow label="Stress amplification" impact="0.18" />
                <RiskFactorRow label="Good adherence history" impact="-0.11" />
              </div>
              <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                AI recommendations: review vitals, confirm medication adherence, consider escalation if symptoms worsen, and generate a patient-friendly summary.
              </div>
            </div>
          </div>
        </SectionShell>
        )}

        {selectedSection === 'reports' && (
        <SectionShell id="reports" icon={FileBarChart} title="Reports" description={doctorSections[9].summary} submenu={doctorSections[9].submenu}>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {sampleReports.map((report) => (
              <ReportCard key={report.title} report={report} />
            ))}
          </div>
        </SectionShell>
        )}

        {selectedSection === 'communication' && (
        <SectionShell id="communication" icon={MessageSquare} title="Communication" description={doctorSections[10].summary} submenu={doctorSections[10].submenu}>
          <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
            <div className="space-y-3">
              {sampleMessages.map((message) => (
                <MessageCard key={`${message.from}-${message.time}`} message={message} />
              ))}
            </div>
            <div className="card border-slate-200">
              <h3 className="mb-3 text-sm font-bold text-slate-900">Compose Secure Message</h3>
              <textarea className="min-h-36 w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm outline-none" placeholder="Write instructions, reminders, or follow-up guidance..." />
              <button className="btn-primary mt-4 flex w-full items-center justify-center gap-2">
                <Send className="h-4 w-4" /> Send Secure Message
              </button>
            </div>
          </div>
        </SectionShell>
        )}

        {selectedSection === 'tasks' && (
        <SectionShell id="tasks" icon={ListTodo} title="Tasks" description={doctorSections[11].summary} submenu={doctorSections[11].submenu}>
          <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
            <div className="space-y-3">
              {sampleTasks.map((task) => (
                <TaskCard key={task.title} task={task} />
              ))}
            </div>
            <div className="card border-slate-200 bg-gradient-to-br from-cyan-50 to-white">
              <h3 className="mb-3 text-sm font-bold text-slate-900">Task Priorities</h3>
              <div className="space-y-3">
                <ProgressRow label="Pending follow-ups" value={73} />
                <ProgressRow label="Review requests" value={61} />
                <ProgressRow label="Completed today" value={84} />
              </div>
            </div>
          </div>
        </SectionShell>
        )}

        {selectedSection === 'settings' && (
        <SectionShell id="settings" icon={Settings} title="Settings" description={doctorSections[12].summary} submenu={doctorSections[12].submenu}>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {sampleSettings.map((setting) => (
              <SettingsCard key={setting.title} setting={setting} />
            ))}
          </div>
        </SectionShell>
        )}
      </div>

      <AnimatePresence>
        {selectedPatient && predictions && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm">
            <div className="absolute inset-y-0 right-0 w-full max-w-6xl overflow-y-auto bg-slate-50 shadow-2xl">
              <div className="p-4 sm:p-6 lg:p-8">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.3em] text-slate-500">Patient Focus View</p>
                    <h2 className="text-xl font-bold text-slate-900">Patient Detail Dashboard</h2>
                  </div>
                  <button onClick={closePatientFocus} className="rounded-full bg-white p-2 shadow-sm ring-1 ring-slate-200 hover:bg-slate-100">
                    <ChevronButtonIcon />
                  </button>
                </div>

                {loadingPredictions ? (
                  <div className="flex min-h-[50vh] items-center justify-center">
                    <RefreshCw className="h-8 w-8 animate-spin text-primary-500" />
                  </div>
                ) : (
                  <PatientDetailDashboard
                    data={predictions}
                    patientName={patients.find((item) => item.user_id === selectedPatient)?.name || 'Patient'}
                    onBack={closePatientFocus}
                    onAddNote={handleAddNote}
                    onAddAppointment={handleAddAppointment}
                  />
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function SectionShell({
  id,
  icon: Icon,
  title,
  description,
  submenu,
  children,
}: {
  id: DoctorSectionId;
  icon: typeof LayoutDashboard;
  title: string;
  description: string;
  submenu: string[];
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
            <Icon className="h-3 w-3" /> {title}
          </div>
          <h2 className="mt-3 text-2xl font-display font-black text-slate-950">{title}</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">{description}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {submenu.map((item) => (
          <span key={item} className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
            {item}
          </span>
        ))}
      </div>

      {children}
    </section>
  );
}

function HeroChip({ icon: Icon, label }: { icon: typeof LayoutDashboard; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
      <Icon className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}

function HeaderActionButton({ icon: Icon, label, count }: { icon: typeof LayoutDashboard; label: string; count?: number }) {
  return (
    <button className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-semibold text-white backdrop-blur transition-all hover:bg-white/15">
      <Icon className="h-4 w-4 text-cyan-100" />
      {label}
      {typeof count === 'number' && count > 0 && <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-black">{count}</span>}
    </button>
  );
}

function GlassMetric({ label, value, tone }: { label: string; value: string; tone: 'rose' | 'cyan' }) {
  const toneClasses = tone === 'rose' ? 'from-rose-500/30 to-rose-400/10 text-rose-50' : 'from-cyan-500/30 to-cyan-400/10 text-cyan-50';
  return (
    <div className={cn('rounded-3xl border border-white/10 bg-gradient-to-br p-4 shadow-xl backdrop-blur', toneClasses)}>
      <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-90">{label}</p>
      <p className="mt-2 text-3xl font-black">{value}</p>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, gradient }: { label: string; value: number | string; icon: typeof LayoutDashboard; gradient: string }) {
  return (
    <motion.div whileHover={{ y: -2 }} className="card overflow-hidden border-slate-200 p-5">
      <div className={cn('mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-lg', gradient)}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">{label}</p>
      <p className="mt-2 text-3xl font-black text-slate-950">{value}</p>
    </motion.div>
  );
}

const mockEscalations: Escalation[] = [
  { id: 'ESC-101', user_id: 11, triggered_at: new Date().toISOString(), risk_type: 'physical', risk_level: 'HIGH', severity: 'HIGH', reason: 'BP crossed 145/95 and sleep quality has dropped.', escalation_reason: 'BP crossed 145/95 and sleep quality has dropped.', status: 'pending', created_at: new Date().toISOString() },
  { id: 'ESC-102', user_id: 21, triggered_at: new Date().toISOString(), risk_type: 'mental', risk_level: 'MEDIUM', severity: 'MEDIUM', reason: 'PHQ-9 increased with reported anxiety spikes.', escalation_reason: 'PHQ-9 increased with reported anxiety spikes.', status: 'pending', created_at: new Date().toISOString() },
];

const mockClinicalNotes: Array<{ title: string; body: string; tag: string; time: string }> = [
  { title: 'Consultation Summary', body: 'Patient reported mild headaches, improved adherence, and advised hydration with BP recheck in 24 hours.', tag: 'Consultation Notes', time: '12 min ago' },
  { title: 'Follow-up Plan', body: 'Schedule maternal review, reinforce warning signs, and monitor fetal movement twice daily.', tag: 'Follow-up Notes', time: 'Today' },
  { title: 'SOAP Draft', body: 'S: fatigue and stress. O: elevated BP. A: risk rising. P: close monitoring and telehealth follow-up.', tag: 'SOAP', time: 'Draft' },
];

const mockMedications: Array<{ name: string; dosage: string; frequency: string; instructions: string }> = [
  { name: 'Labetalol', dosage: '100 mg', frequency: 'Twice daily', instructions: 'Monitor BP before and after dosing. Escalate if symptomatic hypotension occurs.' },
  { name: 'Iron Supplement', dosage: '60 mg', frequency: 'Daily', instructions: 'Take with food and separate from calcium-rich meals when possible.' },
  { name: 'Prenatal Vitamin', dosage: '1 tablet', frequency: 'Daily', instructions: 'Continue through pregnancy and postpartum as directed.' },
  { name: 'Folic Acid', dosage: '5 mg', frequency: 'Daily', instructions: 'Support neural development and maintain medication adherence.' },
];

const telehealthRooms = [
  { title: 'Video Session: Ananya Patel', subtitle: 'Pre-eclampsia follow-up', status: 'Live', action: 'Join Session' },
  { title: 'Chat Consult: Priya Menon', subtitle: 'Medication clarification', status: 'Waiting', action: 'Open Chat' },
  { title: 'Family Review: Meera Nair', subtitle: 'Shared care planning', status: 'Scheduled', action: 'Start Call' },
];

const waitingRoom = [
  { name: 'Ananya Patel', reason: 'BP review and red-flag screening', wait: '2 min' },
  { name: 'Fatima Ali', reason: 'Growth scan teleconsultation', wait: '8 min' },
  { name: 'Riya Menon', reason: 'Medication reconciliation', wait: '14 min' },
];

function FeedItem({ title, time, kind }: { title: string; time: string; kind: string }) {
  return (
    <div className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mt-0.5 rounded-2xl bg-cyan-50 p-2 text-cyan-600">
        <Activity className="h-4 w-4" />
      </div>
      <div className="flex-1">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-semibold text-slate-900">{title}</p>
          <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">{kind}</span>
        </div>
        <p className="mt-1 text-xs text-slate-500">{time}</p>
      </div>
    </div>
  );
}

function AppointmentRow({ time, patient, reason, status }: { time: string; patient: string; reason: string; status: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <div>
        <p className="text-sm font-semibold text-slate-900">{patient}</p>
        <p className="text-xs text-slate-500">{reason}</p>
      </div>
      <div className="text-right">
        <p className="text-sm font-bold text-slate-900">{time}</p>
        <p className="text-xs text-emerald-600">{status}</p>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-2 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function PatientCard({ patient, index, onClick }: { patient: PatientSummary; index: number; onClick: () => void }) {
  const risk = patient.latest_risk?.mental_risk_level || patient.latest_risk?.physical_risk_level || patient.latest_risk?.fetal_risk_level || 'LOW';
  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.02 }}
      onClick={onClick}
      className="card border-slate-200 text-left transition-all hover:border-primary-200 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="font-semibold text-slate-950">{patient.name}</h4>
          <p className="text-xs text-slate-500">{patient.email}</p>
        </div>
        <span className={cn('rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest', getRiskBadge(String(risk)))}>{risk}</span>
      </div>
      <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
        <span>Week {patient.pregnancy_week || 'N/A'}</span>
        <span>{patient.trimester || 'Trimester N/A'}</span>
      </div>
      <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
        <span>{patient.city || 'Location not set'}</span>
        <Eye className="h-4 w-4 text-slate-400" />
      </div>
    </motion.button>
  );
}

function QueuePatient({ patient, onClick }: { patient: PatientSummary; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center justify-between rounded-2xl border border-rose-100 bg-white px-3 py-3 text-left transition-colors hover:bg-rose-50/60">
      <div>
        <p className="text-sm font-semibold text-slate-900">{patient.name}</p>
        <p className="text-xs text-slate-500">{patient.city || patient.email}</p>
      </div>
      <div className="text-right">
        <p className="text-[10px] font-bold uppercase tracking-widest text-rose-600">{patient.latest_risk?.crisis_flag || 'Review'}</p>
        <p className="text-xs text-slate-500">Week {patient.pregnancy_week || '--'}</p>
      </div>
    </button>
  );
}

function EscalationCard({ item, onResolve }: { item: Escalation; onResolve: (id: string) => void }) {
  const statusTone = item.status === 'resolved' ? 'emerald' : item.status === 'pending' ? 'amber' : 'rose';
  return (
    <div className="card border-slate-200 bg-white">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap gap-2">
            <span className={cn('rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest', statusChipClass(statusTone))}>{item.status}</span>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">
              {item.severity || item.risk_level}
            </span>
          </div>
          <p className="mt-3 text-sm font-semibold text-slate-900">{item.escalation_reason || item.reason}</p>
          <p className="mt-1 text-xs text-slate-500">Triggered {formatDate(item.created_at || item.triggered_at)}</p>
        </div>
        {item.status === 'pending' && (
          <button onClick={() => onResolve(item.id)} className="btn-secondary flex items-center gap-2 text-xs">
            <CheckCircle2 className="h-3.5 w-3.5" /> Resolve
          </button>
        )}
      </div>
    </div>
  );
}

function HistoryMetric({ label, value, color }: { label: string; value: number; color: 'rose' | 'emerald' | 'amber' }) {
  const colorClass = color === 'rose' ? 'text-rose-600 bg-rose-100' : color === 'emerald' ? 'text-emerald-600 bg-emerald-100' : 'text-amber-600 bg-amber-100';
  return (
    <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-200">
      <span className="text-sm text-slate-600">{label}</span>
      <span className={cn('rounded-full px-2.5 py-1 text-xs font-black', colorClass)}>{value}</span>
    </div>
  );
}

function TrendCard({ title, subtitle, variant }: { title: string; subtitle: string; variant?: 'mood' }) {
  const chartData = variant === 'mood'
    ? vitalsTrend.map((item) => ({ label: item.label, value: item.mood }))
    : vitalsTrend.map((item) => ({ label: item.label, value: item.systolic }));

  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
      <div className="mb-3">
        <h4 className="text-sm font-bold text-slate-900">{title}</h4>
        <p className="text-xs text-slate-500">{subtitle}</p>
      </div>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id={`trend-${title}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <XAxis dataKey="label" hide />
            <YAxis hide />
            <Tooltip />
            <Area type="monotone" dataKey="value" stroke="#0ea5e9" strokeWidth={2} fill={`url(#trend-${title})`} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function SyncRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-200">
      <span className="text-sm text-slate-600">{label}</span>
      <span className="text-xs font-semibold text-emerald-600">{value}</span>
    </div>
  );
}

function AlertLine({ label, tone }: { label: string; tone: 'rose' | 'amber' | 'emerald' }) {
  const toneClass = tone === 'rose' ? 'bg-rose-100 text-rose-700' : tone === 'amber' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700';
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-200">
      <span className="text-sm text-slate-700">{label}</span>
      <span className={cn('rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest', toneClass)}>{tone}</span>
    </div>
  );
}

function NoteCard({ note }: { note: { title: string; body: string; tag: string; time: string } }) {
  return (
    <div className="card border-slate-200 bg-white">
      <div className="flex items-center justify-between gap-3">
        <span className="rounded-full bg-primary-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-primary-600">{note.tag}</span>
        <span className="text-xs text-slate-400">{note.time}</span>
      </div>
      <h4 className="mt-3 text-sm font-semibold text-slate-900">{note.title}</h4>
      <p className="mt-2 text-sm leading-6 text-slate-600">{note.body}</p>
    </div>
  );
}

function MedicationCard({ medication }: { medication: { name: string; dosage: string; frequency: string; instructions: string } }) {
  return (
    <div className="card border-slate-200 bg-white">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-slate-900">{medication.name}</h4>
        <Pill className="h-4 w-4 text-primary-500" />
      </div>
      <p className="mt-2 text-sm text-slate-600">{medication.dosage} · {medication.frequency}</p>
      <p className="mt-2 text-xs leading-5 text-slate-500">{medication.instructions}</p>
    </div>
  );
}

function SessionCard({ room }: { room: { title: string; subtitle: string; status: string; action: string } }) {
  return (
    <div className="card border-slate-200 bg-white">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h4 className="text-sm font-bold text-slate-900">{room.title}</h4>
          <p className="text-xs text-slate-500">{room.subtitle}</p>
        </div>
        <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-700">{room.status}</span>
      </div>
      <button className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white">
        {room.action} <PhoneCall className="h-4 w-4" />
      </button>
    </div>
  );
}

function WaitingRoomRow({ name, reason, wait }: { name: string; reason: string; wait: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3">
      <div>
        <p className="text-sm font-semibold text-white">{name}</p>
        <p className="text-xs text-slate-300">{reason}</p>
      </div>
      <span className="text-xs font-semibold text-cyan-200">{wait}</span>
    </div>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/10 p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-cyan-100">{label}</p>
      <p className="mt-2 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function RiskFactorRow({ label, impact }: { label: string; impact: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200">
      <span className="text-sm text-slate-700">{label}</span>
      <span className="text-xs font-bold text-slate-500">{impact}</span>
    </div>
  );
}

function ReportCard({ report }: { report: { title: string; desc: string } }) {
  return (
    <div className="card border-slate-200 bg-white">
      <FileText className="h-5 w-5 text-primary-500" />
      <h4 className="mt-4 text-sm font-bold text-slate-900">{report.title}</h4>
      <p className="mt-2 text-sm leading-6 text-slate-600">{report.desc}</p>
      <button className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary-600">
        Export <ArrowUpRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function MessageCard({ message }: { message: { from: string; text: string; time: string; channel: string } }) {
  return (
    <div className="card border-slate-200 bg-white">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h4 className="text-sm font-bold text-slate-900">{message.from}</h4>
          <p className="text-xs text-slate-500">{message.channel}</p>
        </div>
        <span className="text-xs text-slate-400">{message.time}</span>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-600">{message.text}</p>
    </div>
  );
}

function TaskCard({ task }: { task: { title: string; priority: string; due: string } }) {
  const tone = task.priority === 'high' ? 'rose' : task.priority === 'medium' ? 'amber' : 'emerald';
  return (
    <div className="card border-slate-200 bg-white">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold text-slate-900">{task.title}</h4>
          <p className="text-xs text-slate-500">Due {task.due}</p>
        </div>
        <span className={cn('rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest', statusChipClass(tone as 'rose' | 'amber' | 'emerald'))}>
          {task.priority}
        </span>
      </div>
    </div>
  );
}

function SettingsCard({ setting }: { setting: { title: string; desc: string } }) {
  return (
    <div className="card border-slate-200 bg-white">
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-sm font-bold text-slate-900">{setting.title}</h4>
        <Settings className="h-4 w-4 text-slate-400" />
      </div>
      <p className="mt-2 text-sm leading-6 text-slate-600">{setting.desc}</p>
    </div>
  );
}

function ProgressRow({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
        <div className="h-full rounded-full bg-gradient-to-r from-primary-500 to-cyan-500" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, message }: { icon: typeof LayoutDashboard; message: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
      <Icon className="mx-auto h-10 w-10 text-slate-300" />
      <p className="mt-3 text-sm text-slate-500">{message}</p>
    </div>
  );
}

function ChevronButtonIcon() {
  return <ArrowRight className="h-4 w-4 text-slate-600" />;
}

function statusChipClass(tone: 'rose' | 'amber' | 'emerald') {
  if (tone === 'rose') return 'bg-rose-100 text-rose-700';
  if (tone === 'amber') return 'bg-amber-100 text-amber-700';
  return 'bg-emerald-100 text-emerald-700';
}

function ScheduleRow({ time, patient, reason, status }: { time: string; patient: string; reason: string; status: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <div>
        <p className="text-sm font-semibold text-slate-900">{patient}</p>
        <p className="text-xs text-slate-500">{reason}</p>
      </div>
      <div className="text-right">
        <p className="text-sm font-bold text-slate-900">{time}</p>
        <p className="text-xs text-emerald-600">{status}</p>
      </div>
    </div>
  );
}

function InsightRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm">
      <span className="text-slate-300">{label}</span>
      <span className="font-semibold text-white">{value}</span>
    </div>
  );
}

