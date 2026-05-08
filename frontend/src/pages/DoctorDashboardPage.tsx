import { useCallback, useEffect, useMemo, useState } from 'react';
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
  ChevronDown,
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
  Plus,
  RefreshCw,
  Search,
  Send,
  Settings,
  ShieldAlert,
  Sparkles,
  Stethoscope,
  TrendingUp,
  Users,
  Video,
  X,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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

// ─── Types ───────────────────────────────────────────────────────────

type ViewId =
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

// ─── Path → View mapping ─────────────────────────────────────────────

function resolveView(pathname: string): ViewId {
  const segment = pathname.replace(/\/+$/, '').split('/').pop() || '';
  const map: Record<string, ViewId> = {
    patients: 'patients',
    appointments: 'appointments',
    escalations: 'escalations',
    monitoring: 'monitoring',
    'clinical-notes': 'clinical-notes',
    prescriptions: 'prescriptions',
    telehealth: 'telehealth',
    'ai-copilot': 'ai-copilot',
    reports: 'reports',
    communication: 'communication',
    tasks: 'tasks',
    settings: 'settings',
  };
  return map[segment] ?? 'dashboard';
}

// ─── Main Component ──────────────────────────────────────────────────

export default function DoctorDashboardPage() {
  const location = useLocation();
  const activeView = useMemo(() => resolveView(location.pathname), [location.pathname]);

  return (
    <div className="space-y-6 pb-14 animate-fade-in">
      <AnimatePresence mode="wait">
        <motion.div
          key={activeView}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          {activeView === 'dashboard' && <DashboardView />}
          {activeView === 'patients' && <PatientsView />}
          {activeView === 'appointments' && <AppointmentsView />}
          {activeView === 'escalations' && <EscalationsView />}
          {activeView === 'monitoring' && <MonitoringView />}
          {activeView === 'clinical-notes' && <ClinicalNotesView />}
          {activeView === 'prescriptions' && <PrescriptionsView />}
          {activeView === 'telehealth' && <TelehealthView />}
          {activeView === 'ai-copilot' && <AICopilotView />}
          {activeView === 'reports' && <ReportsView />}
          {activeView === 'communication' && <CommunicationView />}
          {activeView === 'tasks' && <TasksView />}
          {activeView === 'settings' && <SettingsView />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  1. DASHBOARD VIEW
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function DashboardView() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [stats, setStats] = useState({
    total_patients: 0,
    high_risk: 0,
    pending: 0,
    today_appointments: 0,
  });

  useEffect(() => {
    (async () => {
      try {
        const [dashRes, escRes] = await Promise.allSettled([
          doctorService.getDashboard(),
          escalationService.list(),
        ]);
        if (dashRes.status === 'fulfilled') {
          const d = dashRes.value.data || {};
          setPatients(d.patients || []);
          setStats({
            total_patients: d.stats?.total_patients ?? d.patients?.length ?? 0,
            high_risk: d.stats?.high_risk ?? 0,
            pending: d.stats?.pending ?? 0,
            today_appointments: d.stats?.today_appointments ?? 0,
          });
        }
        if (escRes.status === 'fulfilled') setEscalations(escRes.value.data || []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <ViewSkeleton />;

  const highRisk = patients.filter((p) =>
    [p.latest_risk?.mental_risk_level, p.latest_risk?.physical_risk_level, p.latest_risk?.fetal_risk_level]
      .some((l) => String(l).toUpperCase() === 'HIGH'),
  );
  const pendingEscalations = escalations.filter((e) => e.status === 'pending');

  const metrics = [
    { label: 'Assigned Patients', value: stats.total_patients, icon: Users, gradient: 'from-cyan-500 to-blue-500' },
    { label: 'High-Risk', value: stats.high_risk || highRisk.length, icon: AlertTriangle, gradient: 'from-rose-500 to-red-500' },
    { label: 'Pending Escalations', value: stats.pending || pendingEscalations.length, icon: ShieldAlert, gradient: 'from-amber-500 to-orange-500' },
    { label: "Today's Appts", value: stats.today_appointments, icon: Calendar, gradient: 'from-violet-500 to-fuchsia-500' },
  ];

  return (
    <SectionShell icon={LayoutDashboard} title="Dashboard" subtitle="Command center overview">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((m) => (
          <StatCard key={m.label} label={m.label} value={m.value} icon={m.icon} gradient={m.gradient} />
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        {/* High-risk patients */}
        <Card>
          <CardHeader title="High-Risk Patients" badge={`${highRisk.length} flagged`} />
          {highRisk.length === 0 ? (
            <EmptyState icon={Users} message="No high-risk patients currently." />
          ) : (
            <div className="space-y-2">
              {highRisk.slice(0, 6).map((p) => (
                <button
                  key={p.user_id}
                  onClick={() => navigate('/doctor/patients')}
                  className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left transition-colors hover:border-rose-200 hover:bg-rose-50/40"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{p.name}</p>
                    <p className="text-xs text-slate-500">Week {p.pregnancy_week ?? '--'} · {p.city || p.email}</p>
                  </div>
                  <RiskPill level="HIGH" />
                </button>
              ))}
            </div>
          )}
        </Card>

        {/* Pending escalations */}
        <Card className="bg-gradient-to-br from-slate-950 to-slate-900 text-white">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Pending Escalations</h3>
            <ShieldAlert className="h-4 w-4 text-rose-300" />
          </div>
          {pendingEscalations.length === 0 ? (
            <p className="text-sm text-slate-400">All escalations resolved.</p>
          ) : (
            <div className="space-y-3">
              {pendingEscalations.slice(0, 4).map((esc) => (
                <div key={esc.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-rose-500/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-rose-300">
                      {esc.severity || esc.risk_level}
                    </span>
                    <span className="text-[10px] text-slate-400">{formatDate(esc.created_at || esc.triggered_at)}</span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-slate-200">{esc.escalation_reason || esc.reason}</p>
                </div>
              ))}
              <button
                onClick={() => navigate('/doctor/escalations')}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 py-3 text-sm font-semibold text-cyan-200 transition-colors hover:bg-white/10"
              >
                View all escalations <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </Card>
      </div>

      {/* Quick actions */}
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { label: 'Patients', icon: Users, path: '/doctor/patients' },
          { label: 'Appointments', icon: Calendar, path: '/doctor/appointments' },
          { label: 'Escalations', icon: ShieldAlert, path: '/doctor/escalations' },
          { label: 'AI Copilot', icon: Bot, path: '/doctor/ai-copilot' },
          { label: 'Telehealth', icon: Video, path: '/doctor/telehealth' },
        ].map((a) => (
          <motion.button
            key={a.label}
            whileHover={{ y: -2 }}
            onClick={() => navigate(a.path)}
            className="card flex items-center gap-3 border-slate-200 p-4 transition-all hover:border-primary-200 hover:shadow-md"
          >
            <div className="rounded-xl bg-primary-50 p-2.5 text-primary-600">
              <a.icon className="h-4 w-4" />
            </div>
            <span className="text-sm font-semibold text-slate-900">{a.label}</span>
          </motion.button>
        ))}
      </div>
    </SectionShell>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  2. PATIENTS VIEW
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function PatientsView() {
  const { setActivePatientData } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState<string>('all');
  const [selectedPatient, setSelectedPatient] = useState<number | null>(null);
  const [predictions, setPredictions] = useState<PatientDashboardData | null>(null);
  const [loadingPredictions, setLoadingPredictions] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await doctorService.getDashboard();
        setPatients(res.data?.patients || []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const openPatient = async (id: number) => {
    setSelectedPatient(id);
    setLoadingPredictions(true);
    try {
      const res = await doctorService.getPatientPredictions(id);
      setPredictions(res.data);
      setActivePatientData(res.data);
    } catch (err) {
      console.error('Failed to load predictions:', err);
    } finally {
      setLoadingPredictions(false);
    }
  };

  const closePatient = () => {
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

  const filtered = patients.filter((p) => {
    const q = search.trim().toLowerCase();
    const matchesSearch = !q || [p.name, p.email, p.city, p.trimester].filter(Boolean).some((v) => String(v).toLowerCase().includes(q));
    if (!matchesSearch) return false;
    if (riskFilter === 'all') return true;
    const levels = [p.latest_risk?.mental_risk_level, p.latest_risk?.physical_risk_level, p.latest_risk?.fetal_risk_level];
    return levels.some((l) => String(l).toUpperCase() === riskFilter);
  });

  if (loading) return <ViewSkeleton />;

  return (
    <>
      <SectionShell icon={Users} title="Patients" subtitle="Assigned patients and risk queues">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search patients..."
              className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition-colors focus:border-primary-400"
            />
          </div>
          <div className="flex gap-2">
            {['all', 'HIGH', 'MEDIUM', 'LOW'].map((f) => (
              <button
                key={f}
                onClick={() => setRiskFilter(f)}
                className={cn(
                  'rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
                  riskFilter === f ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                )}
              >
                {f === 'all' ? 'All' : f}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState icon={Users} message="No patients match the current filters." />
        ) : (
          <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60">
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Patient</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Week</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Mental</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Physical</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Fetal</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Location</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => (
                  <motion.tr
                    key={p.user_id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className="border-b border-slate-50 transition-colors hover:bg-slate-50/60"
                  >
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-900">{p.name}</p>
                      <p className="text-xs text-slate-500">{p.email}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{p.pregnancy_week ?? '--'}</td>
                    <td className="px-4 py-3"><RiskPill level={p.latest_risk?.mental_risk_level} /></td>
                    <td className="px-4 py-3"><RiskPill level={p.latest_risk?.physical_risk_level} /></td>
                    <td className="px-4 py-3"><RiskPill level={p.latest_risk?.fetal_risk_level} /></td>
                    <td className="px-4 py-3 text-slate-500">{p.city || '—'}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => openPatient(p.user_id)}
                        className="rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-primary-50 hover:text-primary-700"
                      >
                        <Eye className="mr-1 inline h-3.5 w-3.5" /> View
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionShell>

      {/* Patient detail overlay */}
      <AnimatePresence>
        {selectedPatient && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm">
            <div className="absolute inset-y-0 right-0 w-full max-w-6xl overflow-y-auto bg-slate-50 shadow-2xl">
              <div className="p-4 sm:p-6 lg:p-8">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.3em] text-slate-500">Patient Focus</p>
                    <h2 className="text-xl font-bold text-slate-900">
                      {patients.find((p) => p.user_id === selectedPatient)?.name || 'Patient'}
                    </h2>
                  </div>
                  <button onClick={closePatient} className="rounded-full bg-white p-2 shadow-sm ring-1 ring-slate-200 hover:bg-slate-100">
                    <X className="h-4 w-4 text-slate-600" />
                  </button>
                </div>
                {loadingPredictions ? (
                  <div className="flex min-h-[50vh] items-center justify-center">
                    <RefreshCw className="h-8 w-8 animate-spin text-primary-500" />
                  </div>
                ) : predictions ? (
                  <PatientDetailDashboard
                    data={predictions}
                    patientName={patients.find((p) => p.user_id === selectedPatient)?.name || 'Patient'}
                    onBack={closePatient}
                    onAddNote={handleAddNote}
                    onAddAppointment={handleAddAppointment}
                  />
                ) : (
                  <EmptyState icon={AlertTriangle} message="Failed to load patient data." />
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  3. APPOINTMENTS VIEW
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function AppointmentsView() {
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [tab, setTab] = useState<string>('all');
  const [updating, setUpdating] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchAppointments = useCallback(async () => {
    try {
      setError(null);
      const res = await doctorService.listAppointments(tab === 'all' ? undefined : tab);
      const list = Array.isArray(res.data) ? res.data : [];
      const sorted = [...list].sort((a, b) => {
        const ta = new Date(a.date || a.appointment_date || 0).getTime();
        const tb = new Date(b.date || b.appointment_date || 0).getTime();
        if (tb !== ta) return tb - ta;
        return (b.id ?? 0) - (a.id ?? 0);
      });
      setAppointments(sorted);
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Unable to load appointments. Please try again.');
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    setLoading(true);
    fetchAppointments();
  }, [fetchAppointments]);

  const updateStatus = async (id: number, status: string) => {
    setUpdating(id);
    try {
      await doctorService.updateAppointmentStatus(id, status);
      await fetchAppointments();
    } finally {
      setUpdating(null);
    }
  };

  const tabs = [
    { key: 'all', label: 'All' },
    { key: 'upcoming', label: 'Upcoming' },
    { key: 'completed', label: 'Completed' },
    { key: 'cancelled', label: 'Cancelled' },
  ];

  return (
    <SectionShell icon={Calendar} title="Appointments" subtitle="Manage and track patient appointments">
      <div className="flex gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'rounded-full px-4 py-1.5 text-xs font-semibold transition-colors',
              tab === t.key ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <SkeletonRows count={4} />
      ) : error ? (
        <EmptyState icon={Calendar} message={error} />
      ) : appointments.length === 0 ? (
        <EmptyState icon={Calendar} message={`No ${tab === 'all' ? '' : tab + ' '}appointments found.`} />
      ) : (
        <div className="mt-2 space-y-3">
          {appointments.map((apt) => (
            <Card key={apt.id}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-sm font-semibold text-slate-900">{apt.patient_name || `Patient #${apt.patient_id}`}</h4>
                    <StatusChip status={apt.status} />
                    {(apt.type || apt.appointment_type) && (
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                        {apt.type || apt.appointment_type}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    <Calendar className="mr-1 inline h-3.5 w-3.5" />
                    {formatDate(apt.date || apt.appointment_date)}
                    {apt.reason && <> · {apt.reason}</>}
                  </p>
                </div>
                <div className="flex gap-2">
                  {apt.status === 'pending' && (
                    <>
                      <ActionButton label="Accept" loading={updating === apt.id} onClick={() => updateStatus(apt.id, 'confirmed')} variant="primary" />
                      <ActionButton label="Cancel" loading={updating === apt.id} onClick={() => updateStatus(apt.id, 'cancelled')} variant="danger" />
                    </>
                  )}
                  {apt.status === 'confirmed' && (
                    <ActionButton label="Complete" loading={updating === apt.id} onClick={() => updateStatus(apt.id, 'completed')} variant="success" />
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </SectionShell>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  4. ESCALATIONS VIEW
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function EscalationsView() {
  const [loading, setLoading] = useState(true);
  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [resolveNotes, setResolveNotes] = useState<Record<string, string>>({});
  const [resolving, setResolving] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [dashRes, escRes] = await Promise.allSettled([doctorService.getDashboard(), escalationService.list()]);
      let items: Escalation[] = [];
      if (escRes.status === 'fulfilled') items = escRes.value.data || [];
      if (items.length === 0 && dashRes.status === 'fulfilled') items = dashRes.value.data?.escalations || [];
      setEscalations(items);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleResolve = async (id: string) => {
    setResolving(id);
    try {
      await escalationService.resolve(id, { status: 'resolved', notes: resolveNotes[id] || 'Reviewed and resolved by doctor' });
      setEscalations((prev) => prev.map((e) => (e.id === id ? { ...e, status: 'resolved' } : e)));
    } finally {
      setResolving(null);
    }
  };

  if (loading) return <ViewSkeleton />;

  const pending = escalations.filter((e) => e.status === 'pending');
  const resolved = escalations.filter((e) => e.status === 'resolved');

  return (
    <SectionShell icon={ShieldAlert} title="Escalations" subtitle="AI-generated and manual escalation queue">
      <div className="grid gap-3 sm:grid-cols-3">
        <MiniStatCard label="Pending" value={pending.length} tone="amber" />
        <MiniStatCard label="Resolved" value={resolved.length} tone="emerald" />
        <MiniStatCard label="Total" value={escalations.length} tone="slate" />
      </div>

      {escalations.length === 0 ? (
        <EmptyState icon={ShieldAlert} message="No escalations found." />
      ) : (
        <div className="mt-4 space-y-3">
          {escalations.map((esc) => (
            <Card key={esc.id}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusChip status={esc.status} />
                    <RiskPill level={esc.severity || esc.risk_level} />
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      {esc.risk_type}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-medium text-slate-900">{esc.escalation_reason || esc.reason}</p>
                  <p className="mt-1 text-xs text-slate-500">Triggered {formatDate(esc.created_at || esc.triggered_at)}</p>
                </div>
                {esc.status === 'pending' && (
                  <div className="flex flex-col gap-2 sm:items-end">
                    <input
                      value={resolveNotes[esc.id] || ''}
                      onChange={(e) => setResolveNotes((prev) => ({ ...prev, [esc.id]: e.target.value }))}
                      placeholder="Resolution notes..."
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none transition-colors focus:border-primary-400 sm:w-56"
                    />
                    <button
                      onClick={() => handleResolve(esc.id)}
                      disabled={resolving === esc.id}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {resolving === esc.id ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                      Resolve
                    </button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </SectionShell>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  5. MONITORING VIEW
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function MonitoringView() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await doctorService.getMonitoring();
        setData(res.data);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <ViewSkeleton />;

  const highRiskPatients = data?.high_risk_patients || [];
  const criticalAlerts = data?.critical_alerts || [];
  const summary = data?.summary || {};
  const monitoredPatients = summary.total_monitored ?? summary.monitored_patients ?? highRiskPatients.length;
  const stablePatients = summary.stable_count ?? Math.max(0, monitoredPatients - highRiskPatients.length);

  return (
    <SectionShell icon={HeartPulse} title="Real-Time Monitoring" subtitle="High-risk patients, critical alerts, and vitals">
      {/* Critical alerts banner */}
      {criticalAlerts.length > 0 && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
          <div className="mb-2 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-600" />
            <h4 className="text-sm font-bold text-rose-700">Critical Alerts</h4>
          </div>
          <div className="space-y-2">
            {criticalAlerts.map((alert: any, i: number) => (
              <p key={i} className="text-sm text-rose-700">{alert.message || alert.description || JSON.stringify(alert)}</p>
            ))}
          </div>
        </div>
      )}

      {/* Summary stats */}
      {summary && (
        <div className="grid gap-3 sm:grid-cols-3">
          <MiniStatCard label="Monitored Patients" value={monitoredPatients} tone="cyan" />
          <MiniStatCard label="Critical Alerts" value={summary.critical_count ?? criticalAlerts.length} tone="rose" />
          <MiniStatCard label="Stable" value={stablePatients} tone="emerald" />
        </div>
      )}

      {/* High-risk patient cards */}
      {highRiskPatients.length === 0 ? (
        <EmptyState icon={HeartPulse} message="No high-risk patients being monitored." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {highRiskPatients.map((p: any) => (
            <Card key={p.user_id || p.id || p.name}>
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{p.name || p.patient_name}</h4>
                  <p className="text-xs text-slate-500">Week {p.pregnancy_week ?? '--'}</p>
                </div>
                <RiskPill level={p.risk_level || 'HIGH'} />
              </div>
              {p.vitals && (
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  {p.vitals.bp && <VitalChip label="BP" value={p.vitals.bp} />}
                  {p.vitals.heart_rate && <VitalChip label="HR" value={`${p.vitals.heart_rate} bpm`} />}
                  {p.vitals.glucose && <VitalChip label="Glucose" value={p.vitals.glucose} />}
                  {p.vitals.weight && <VitalChip label="Weight" value={`${p.vitals.weight} kg`} />}
                </div>
              )}
              {p.alert && <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">{p.alert}</p>}
            </Card>
          ))}
        </div>
      )}
    </SectionShell>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  6. CLINICAL NOTES VIEW
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function ClinicalNotesView() {
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await doctorService.listClinicalNotes();
        setNotes(res.data || []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <ViewSkeleton />;

  return (
    <SectionShell icon={NotebookPen} title="Clinical Notes" subtitle="Consultation notes and documentation history">
      {notes.length === 0 ? (
        <EmptyState icon={FileText} message="No clinical notes found." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {notes.map((note) => (
            <Card key={note.id}>
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-primary-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-primary-600">
                  {note.note_type || 'Note'}
                </span>
                <span className="text-xs text-slate-400">{formatDate(note.created_at)}</span>
              </div>
              <h4 className="mt-3 text-sm font-semibold text-slate-900">{note.patient_name || `Patient #${note.patient_id}`}</h4>
              <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-slate-600">{note.content}</p>
            </Card>
          ))}
        </div>
      )}
    </SectionShell>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  7. PRESCRIPTIONS VIEW
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function PrescriptionsView() {
  const [loading, setLoading] = useState(true);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [activeOnly, setActiveOnly] = useState(true);

  const fetchPrescriptions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await doctorService.listPrescriptions(activeOnly);
      setPrescriptions(res.data || []);
    } finally {
      setLoading(false);
    }
  }, [activeOnly]);

  useEffect(() => { fetchPrescriptions(); }, [fetchPrescriptions]);

  return (
    <SectionShell icon={Pill} title="Prescriptions" subtitle="Active and historical prescription management">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setActiveOnly(!activeOnly)}
          className={cn(
            'rounded-full px-4 py-1.5 text-xs font-semibold transition-colors',
            activeOnly ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600',
          )}
        >
          {activeOnly ? 'Showing Active' : 'Showing All'}
        </button>
      </div>

      {loading ? (
        <SkeletonRows count={3} />
      ) : prescriptions.length === 0 ? (
        <EmptyState icon={Pill} message="No prescriptions found." />
      ) : (
        <div className="mt-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60">
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Patient</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Medication</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Dosage</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Frequency</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
              </tr>
            </thead>
            <tbody>
              {prescriptions.map((rx) => (
                <tr key={rx.id} className="border-b border-slate-50 transition-colors hover:bg-slate-50/60">
                  <td className="px-4 py-3 font-medium text-slate-900">{rx.patient_name || `Patient #${rx.patient_id}`}</td>
                  <td className="px-4 py-3 text-slate-700">{rx.name}</td>
                  <td className="px-4 py-3 text-slate-500">{rx.dosage || '—'}</td>
                  <td className="px-4 py-3 text-slate-500">{rx.frequency || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      'rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest',
                      rx.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500',
                    )}>
                      {rx.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionShell>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  8. TELEHEALTH VIEW
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function TelehealthView() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await doctorService.listTelehealth();
        setSessions(res.data || []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <ViewSkeleton />;

  return (
    <SectionShell icon={Video} title="Telehealth" subtitle="Virtual consultation sessions and waiting room">
      {sessions.length === 0 ? (
        <EmptyState icon={Video} message="No telehealth sessions found." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {sessions.map((s) => (
            <Card key={s.id} className="hover:border-primary-200 transition-all">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{s.patient_name || `Patient #${s.patient_id}`}</h4>
                  <p className="text-xs text-slate-500">{formatDate(s.date || s.scheduled_at || s.created_at)}</p>
                </div>
                <StatusChip status={s.status} />
              </div>
              <button
                onClick={() => {
                  if (s.link) window.open(s.link, '_blank');
                  else navigate(`/telemedicine/${s.id}`);
                }}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-600"
              >
                <PhoneCall className="h-4 w-4" /> Join Session
              </button>
            </Card>
          ))}
        </div>
      )}
    </SectionShell>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  9. AI COPILOT VIEW
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function AICopilotView() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await doctorService.getAICopilot();
        setData(res.data);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <ViewSkeleton />;

  const riskDist = data?.risk_distribution || {};
  const concerns = data?.top_concerns || [];
  const needsAttention = data?.patients_needing_attention || [];
  const recommendations = data?.ai_recommendations || [];

  const chartData = Object.entries(riskDist).map(([level, count]) => ({
    level,
    count: count as number,
    fill: level === 'HIGH' ? '#ef4444' : level === 'MEDIUM' ? '#f59e0b' : '#22c55e',
  }));

  return (
    <SectionShell icon={Bot} title="AI Copilot" subtitle="AI-powered risk analysis and clinical insights">
      <div className="grid gap-6 xl:grid-cols-2">
        {/* Risk distribution */}
        <Card className="bg-gradient-to-br from-slate-950 to-cyan-950 text-white">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Risk Distribution</h3>
            <Sparkles className="h-4 w-4 text-cyan-200" />
          </div>
          {chartData.length > 0 ? (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis dataKey="level" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                    {chartData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-slate-400">No risk distribution data available.</p>
          )}
          <div className="mt-4 grid grid-cols-3 gap-3">
            {['HIGH', 'MEDIUM', 'LOW'].map((level) => (
              <div key={level} className="rounded-2xl bg-white/10 p-3 text-center">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-300">{level}</p>
                <p className="mt-1 text-xl font-black text-white">{riskDist[level] ?? 0}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Top concerns + recommendations */}
        <div className="space-y-4">
          <Card>
            <CardHeader title="Top Health Concerns" />
            {concerns.length === 0 ? (
              <p className="text-sm text-slate-500">No concerns flagged.</p>
            ) : (
              <div className="space-y-2">
                {concerns.map((c: any, i: number) => (
                  <div key={i} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200">
                    <span className="text-sm text-slate-700">{typeof c === 'string' ? c : c.concern || c.condition || c.label}</span>
                    {c.count && <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-bold text-slate-600">{c.count}</span>}
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <CardHeader title="AI Recommendations" />
            {recommendations.length === 0 ? (
              <p className="text-sm text-slate-500">No recommendations at this time.</p>
            ) : (
              <div className="space-y-2">
                {recommendations.map((r: any, i: number) => (
                  <div key={i} className="rounded-2xl bg-cyan-50 px-4 py-3 text-sm text-cyan-800 ring-1 ring-cyan-100">
                    {typeof r === 'string' ? r : r.recommendation || r.text}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Patients needing attention */}
      {needsAttention.length > 0 && (
        <div className="mt-6">
          <Card>
            <CardHeader title="Patients Needing Attention" badge={`${needsAttention.length} flagged`} />
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {needsAttention.map((p: any, i: number) => (
                <div key={i} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-slate-900">{p.name || p.patient_name}</h4>
                    <RiskPill level={p.risk_level} />
                  </div>
                  {(p.reason || p.primary_concern) && <p className="mt-2 text-xs text-slate-500">{p.reason || p.primary_concern}</p>}
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </SectionShell>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  10. REPORTS VIEW
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function ReportsView() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await doctorService.getReports();
        setData(res.data);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <ViewSkeleton />;

  const escalationResolved = data?.escalations?.resolved ?? 0;
  const escalationTotal = data?.escalations?.total ?? 0;
  const escalationResolutionRate = escalationTotal > 0 ? `${Math.round((escalationResolved / escalationTotal) * 100)}%` : '—';
  const stats = [
    { label: 'Total Appointments', value: data?.appointments?.total ?? data?.appointments ?? 0, icon: Calendar, gradient: 'from-violet-500 to-fuchsia-500' },
    { label: 'Clinical Notes', value: data?.clinical_notes?.total ?? data?.clinical_notes ?? 0, icon: FileText, gradient: 'from-cyan-500 to-blue-500' },
    { label: 'Prescriptions', value: data?.prescriptions?.total ?? data?.prescriptions ?? 0, icon: Pill, gradient: 'from-emerald-500 to-teal-500' },
    { label: 'Escalation Resolution', value: escalationResolutionRate, icon: ShieldAlert, gradient: 'from-amber-500 to-orange-500' },
  ];

  return (
    <SectionShell icon={FileBarChart} title="Reports" subtitle="Practice performance and clinical metrics">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <StatCard key={s.label} label={s.label} value={s.value} icon={s.icon} gradient={s.gradient} />
        ))}
      </div>

      {data?.details && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {Object.entries(data.details).map(([key, val]: [string, any]) => (
            <Card key={key}>
              <h4 className="text-sm font-bold capitalize text-slate-900">{key.replace(/_/g, ' ')}</h4>
              <p className="mt-2 text-sm text-slate-600">{typeof val === 'string' ? val : JSON.stringify(val)}</p>
            </Card>
          ))}
        </div>
      )}
    </SectionShell>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  11. COMMUNICATION VIEW
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function CommunicationView() {
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<any[]>([]);
  const [receiverId, setReceiverId] = useState('');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await doctorService.getMessages();
      setMessages(res.data || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  const handleSend = async () => {
    if (!receiverId || !content.trim()) return;
    setSending(true);
    try {
      await doctorService.sendMessage({ receiver_id: parseInt(receiverId), subject, content });
      setReceiverId('');
      setSubject('');
      setContent('');
      await fetchMessages();
    } finally {
      setSending(false);
    }
  };

  return (
    <SectionShell icon={MessageSquare} title="Communication" subtitle="Secure messaging with patients and staff">
      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        {/* Messages list */}
        <div>
          {loading ? (
            <SkeletonRows count={3} />
          ) : messages.length === 0 ? (
            <EmptyState icon={MessageSquare} message="No messages yet." />
          ) : (
            <div className="space-y-3">
              {messages.map((msg, i) => (
                <Card key={msg.id || i}>
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-slate-900">{msg.sender_name || msg.from || `User #${msg.sender_id}`}</h4>
                    <span className="text-xs text-slate-400">{msg.created_at ? formatDate(msg.created_at) : (msg.timestamp ? formatDate(msg.timestamp) : msg.time)}</span>
                  </div>
                  {msg.subject && <p className="mt-1 text-xs font-semibold text-primary-600">{msg.subject}</p>}
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{msg.content || msg.text}</p>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Compose form */}
        <Card>
          <h3 className="mb-4 text-sm font-bold text-slate-900">Compose Message</h3>
          <div className="space-y-3">
            <input
              value={receiverId}
              onChange={(e) => setReceiverId(e.target.value)}
              placeholder="Recipient ID"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary-400"
            />
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary-400"
            />
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your message..."
              rows={4}
              className="w-full rounded-xl border border-slate-200 bg-white p-4 text-sm outline-none transition-colors focus:border-primary-400"
            />
            <button
              onClick={handleSend}
              disabled={sending || !receiverId || !content.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-600 disabled:opacity-50"
            >
              {sending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Send Message
            </button>
          </div>
        </Card>
      </div>
    </SectionShell>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  12. TASKS VIEW
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function TasksView() {
  const [loading, setLoading] = useState(true);
  const [manualTasks, setManualTasks] = useState<any[]>([]);
  const [autoTasks, setAutoTasks] = useState<any[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPriority, setNewPriority] = useState('medium');
  const [creating, setCreating] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await doctorService.getTasks();
      const d = res.data || {};
      setManualTasks(d.manual_tasks || []);
      setAutoTasks(d.auto_tasks || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      await doctorService.createTask({ title: newTitle, description: newDesc, priority: newPriority });
      setNewTitle('');
      setNewDesc('');
      setNewPriority('medium');
      await fetchTasks();
    } finally {
      setCreating(false);
    }
  };

  const toggleStatus = async (taskId: string, currentStatus: string) => {
    setToggling(taskId);
    try {
      const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
      await doctorService.updateTaskStatus(taskId, newStatus);
      await fetchTasks();
    } finally {
      setToggling(null);
    }
  };

  return (
    <SectionShell icon={ListTodo} title="Tasks" subtitle="Manage follow-ups, reviews, and workflow items">
      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        {/* Task lists */}
        <div className="space-y-6">
          {/* Auto tasks */}
          <div>
            <h3 className="mb-3 text-sm font-bold text-slate-900">Auto-Generated Tasks</h3>
            {loading ? (
              <SkeletonRows count={2} />
            ) : autoTasks.length === 0 ? (
              <p className="text-sm text-slate-500">No auto-generated tasks.</p>
            ) : (
              <div className="space-y-2">
                {autoTasks.map((t) => (
                  <TaskRow key={t.id} task={t} toggling={toggling} onToggle={toggleStatus} />
                ))}
              </div>
            )}
          </div>

          {/* Manual tasks */}
          <div>
            <h3 className="mb-3 text-sm font-bold text-slate-900">Manual Tasks</h3>
            {loading ? (
              <SkeletonRows count={2} />
            ) : manualTasks.length === 0 ? (
              <p className="text-sm text-slate-500">No manual tasks. Create one below.</p>
            ) : (
              <div className="space-y-2">
                {manualTasks.map((t) => (
                  <TaskRow key={t.id} task={t} toggling={toggling} onToggle={toggleStatus} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Create task form */}
        <Card>
          <h3 className="mb-4 text-sm font-bold text-slate-900">Create New Task</h3>
          <div className="space-y-3">
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Task title"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary-400"
            />
            <textarea
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Description (optional)"
              rows={3}
              className="w-full rounded-xl border border-slate-200 bg-white p-4 text-sm outline-none transition-colors focus:border-primary-400"
            />
            <div className="flex gap-2">
              {['low', 'medium', 'high'].map((p) => (
                <button
                  key={p}
                  onClick={() => setNewPriority(p)}
                  className={cn(
                    'rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition-colors',
                    newPriority === p ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
            <button
              onClick={handleCreate}
              disabled={creating || !newTitle.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-600 disabled:opacity-50"
            >
              {creating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Create Task
            </button>
          </div>
        </Card>
      </div>
    </SectionShell>
  );
}

function TaskRow({ task, toggling, onToggle }: { task: any; toggling: string | null; onToggle: (id: string, status: string) => void }) {
  const isCompleted = task.status === 'completed';
  return (
    <div className={cn('flex items-center justify-between rounded-2xl border bg-white px-4 py-3 transition-colors', isCompleted ? 'border-emerald-100' : 'border-slate-200')}>
      <div className="flex items-center gap-3">
        <button
          onClick={() => onToggle(task.id, task.status)}
          disabled={toggling === task.id}
          className={cn(
            'flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors',
            isCompleted ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 hover:border-primary-400',
          )}
        >
          {toggling === task.id ? (
            <RefreshCw className="h-3 w-3 animate-spin" />
          ) : isCompleted ? (
            <CheckCircle2 className="h-3 w-3" />
          ) : null}
        </button>
        <div>
          <p className={cn('text-sm font-medium', isCompleted ? 'text-slate-400 line-through' : 'text-slate-900')}>{task.title}</p>
          {task.description && <p className="text-xs text-slate-500">{task.description}</p>}
        </div>
      </div>
      {task.priority && (
        <span className={cn(
          'rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest',
          task.priority === 'high' ? 'bg-rose-100 text-rose-700' : task.priority === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700',
        )}>
          {task.priority}
        </span>
      )}
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  13. SETTINGS VIEW
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function SettingsView() {
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await doctorService.getSettings();
        const raw = res.data || {};
        const profile = raw.profile || {};
        const preferences = raw.preferences || {};
        setSettings({
          name: profile.name || raw.name || '',
          email: profile.email || raw.email || '',
          specialty: profile.specialty || raw.specialization || '',
          hospital_id: profile.hospital_id ?? raw.hospital_id ?? null,
          available_for_escalation: profile.available_for_escalation ?? raw.available_for_escalation ?? true,
          notifications_enabled: preferences.notifications_enabled ?? raw.notifications_enabled ?? true,
          escalation_alerts: preferences.escalation_alerts ?? raw.escalation_alerts ?? true,
          daily_summary_email: preferences.daily_summary_email ?? raw.daily_summary_email ?? false,
          auto_accept_appointments: preferences.auto_accept_appointments ?? raw.auto_accept_appointments ?? false,
        });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleToggle = (key: string) => {
    setSettings((prev: any) => ({ ...prev, [key]: !prev[key] }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await doctorService.updateSettings({
        available_for_escalation: settings?.available_for_escalation,
        notifications_enabled: settings?.notifications_enabled,
        escalation_alerts: settings?.escalation_alerts,
        daily_summary_email: settings?.daily_summary_email,
        auto_accept_appointments: settings?.auto_accept_appointments,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <ViewSkeleton />;

  return (
    <SectionShell icon={Settings} title="Settings" subtitle="Profile, availability, and notification preferences">
      <div className="grid gap-6 xl:grid-cols-2">
        {/* Profile info */}
        <Card>
          <CardHeader title="Profile Information" />
          <div className="space-y-3">
            <SettingsField label="Name" value={settings?.name || settings?.full_name || '—'} />
            <SettingsField label="Email" value={settings?.email || '—'} />
            <SettingsField label="Specialization" value={settings?.specialty || settings?.specialization || '—'} />
            <SettingsField label="Hospital" value={settings?.hospital_name || (settings?.hospital_id ? `Hospital #${settings.hospital_id}` : '—')} />
          </div>
        </Card>

        {/* Toggles */}
        <Card>
          <CardHeader title="Preferences" />
          <div className="space-y-4">
            <ToggleRow
              label="Available for appointments"
              checked={settings?.available_for_escalation ?? true}
              onChange={() => handleToggle('available_for_escalation')}
            />
            <ToggleRow
              label="Notifications enabled"
              checked={settings?.notifications_enabled ?? true}
              onChange={() => handleToggle('notifications_enabled')}
            />
            <ToggleRow
              label="Receive escalation alerts"
              checked={settings?.escalation_alerts ?? true}
              onChange={() => handleToggle('escalation_alerts')}
            />
            <ToggleRow
              label="Daily summary email"
              checked={settings?.daily_summary_email ?? false}
              onChange={() => handleToggle('daily_summary_email')}
            />
            <ToggleRow
              label="Auto-accept appointments"
              checked={settings?.auto_accept_appointments ?? false}
              onChange={() => handleToggle('auto_accept_appointments')}
            />
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-600 disabled:opacity-50"
          >
            {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : saved ? <CheckCircle2 className="h-4 w-4" /> : <Settings className="h-4 w-4" />}
            {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Settings'}
          </button>
        </Card>
      </div>
    </SectionShell>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  SHARED / HELPER COMPONENTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function SectionShell({ icon: Icon, title, subtitle, children }: {
  icon: typeof LayoutDashboard;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-5">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
          <Icon className="h-3 w-3" /> {title}
        </div>
        <h2 className="mt-3 text-2xl font-display font-black text-slate-950">{title}</h2>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">{subtitle}</p>
      </div>
      {children}
    </section>
  );
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('card border-slate-200', className)}>{children}</div>;
}

function CardHeader({ title, badge }: { title: string; badge?: string }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h3 className="text-sm font-bold text-slate-900">{title}</h3>
      {badge && (
        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">
          {badge}
        </span>
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, gradient }: {
  label: string;
  value: number | string;
  icon: typeof LayoutDashboard;
  gradient: string;
}) {
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

function MiniStatCard({ label, value, tone }: { label: string; value: number | string; tone: string }) {
  const colors: Record<string, string> = {
    rose: 'border-rose-100 bg-rose-50 text-rose-700',
    amber: 'border-amber-100 bg-amber-50 text-amber-700',
    emerald: 'border-emerald-100 bg-emerald-50 text-emerald-700',
    cyan: 'border-cyan-100 bg-cyan-50 text-cyan-700',
    slate: 'border-slate-200 bg-slate-50 text-slate-700',
  };
  return (
    <div className={cn('rounded-2xl border p-4', colors[tone] || colors.slate)}>
      <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">{label}</p>
      <p className="mt-2 text-2xl font-black">{value}</p>
    </div>
  );
}

function RiskPill({ level }: { level?: string | null }) {
  const l = String(level || '').toUpperCase();
  const colors: Record<string, string> = {
    HIGH: 'bg-rose-100 text-rose-700',
    MEDIUM: 'bg-amber-100 text-amber-700',
    LOW: 'bg-emerald-100 text-emerald-700',
  };
  if (!l || !colors[l]) return <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">—</span>;
  return <span className={cn('rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest', colors[l])}>{l}</span>;
}

function StatusChip({ status }: { status: string }) {
  const s = status?.toLowerCase();
  const colors: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700',
    confirmed: 'bg-blue-100 text-blue-700',
    completed: 'bg-emerald-100 text-emerald-700',
    cancelled: 'bg-slate-100 text-slate-500',
    resolved: 'bg-emerald-100 text-emerald-700',
    active: 'bg-green-100 text-green-700',
    scheduled: 'bg-blue-100 text-blue-700',
    live: 'bg-green-100 text-green-700',
    waiting: 'bg-amber-100 text-amber-700',
  };
  return (
    <span className={cn('rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest', colors[s] || 'bg-slate-100 text-slate-500')}>
      {status}
    </span>
  );
}

function ActionButton({ label, onClick, loading: isLoading, variant }: {
  label: string;
  onClick: () => void;
  loading?: boolean;
  variant: 'primary' | 'danger' | 'success';
}) {
  const colors = {
    primary: 'bg-primary-600 text-white hover:bg-primary-700',
    danger: 'bg-rose-600 text-white hover:bg-rose-700',
    success: 'bg-emerald-600 text-white hover:bg-emerald-700',
  };
  return (
    <button
      onClick={onClick}
      disabled={isLoading}
      className={cn('inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-50', colors[variant])}
    >
      {isLoading && <RefreshCw className="h-3 w-3 animate-spin" />}
      {label}
    </button>
  );
}

function VitalChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-slate-200">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-0.5 text-xs font-semibold text-slate-700">{value}</p>
    </div>
  );
}

function SettingsField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-900">{value}</p>
    </div>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-slate-700">{label}</span>
      <button
        onClick={onChange}
        className={cn(
          'relative h-6 w-11 rounded-full transition-colors',
          checked ? 'bg-primary-600' : 'bg-slate-300',
        )}
      >
        <span className={cn(
          'absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
          checked && 'translate-x-5',
        )} />
      </button>
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

function ViewSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="h-4 w-24 animate-pulse rounded-full bg-slate-200" />
        <div className="h-8 w-48 animate-pulse rounded-xl bg-slate-200" />
        <div className="h-4 w-72 animate-pulse rounded-full bg-slate-200" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-3xl bg-slate-100" />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <div className="h-64 animate-pulse rounded-3xl bg-slate-100" />
        <div className="h-64 animate-pulse rounded-3xl bg-slate-100" />
      </div>
    </div>
  );
}

function SkeletonRows({ count }: { count: number }) {
  return (
    <div className="space-y-3">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-100" />
      ))}
    </div>
  );
}
