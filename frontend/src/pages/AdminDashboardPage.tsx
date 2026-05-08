import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Users, Building2, Stethoscope, Search, Plus, Trash2,
  X, Save, Activity, ShieldCheck, Check, AlertTriangle, BarChart3,
  CreditCard, MessagesSquare, FileBarChart, Settings, Globe,
  Server, Database, Heart, TrendingUp, Clock,
  UserPlus, Brain, Cpu, Layers, PlayCircle,
  Target, Siren, AlertCircle, FileText, DollarSign,
  RefreshCw, Wifi, WifiOff, Lock, Eye, Download,
  Send, Megaphone, LifeBuoy, Plug, Archive, Sliders,
  MonitorCheck, HardDrive, Gauge, ShieldAlert, UserCog
} from 'lucide-react';
import { platformAdminService } from '../services/endpoints';
import toast from 'react-hot-toast';

// ── Shared helpers ──────────────────────────────────────

const fade = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -8 } };

function StatusBadge({ status, size = 'sm' }: { status: string; size?: 'sm' | 'md' }) {
  const map: Record<string, string> = {
    active: 'bg-emerald-100 text-emerald-700',
    healthy: 'bg-emerald-100 text-emerald-700',
    online: 'bg-emerald-100 text-emerald-700',
    running: 'bg-emerald-100 text-emerald-700',
    resolved: 'bg-emerald-100 text-emerald-700',
    compliant: 'bg-emerald-100 text-emerald-700',
    connected: 'bg-emerald-100 text-emerald-700',
    enabled: 'bg-emerald-100 text-emerald-700',
    open: 'bg-blue-100 text-blue-700',
    pending: 'bg-amber-100 text-amber-700',
    warning: 'bg-amber-100 text-amber-700',
    in_progress: 'bg-blue-100 text-blue-700',
    'in-progress': 'bg-blue-100 text-blue-700',
    critical: 'bg-red-100 text-red-700',
    high: 'bg-red-100 text-red-700',
    error: 'bg-red-100 text-red-700',
    inactive: 'bg-gray-100 text-gray-500',
    disabled: 'bg-gray-100 text-gray-500',
    offline: 'bg-gray-100 text-gray-500',
    low: 'bg-emerald-100 text-emerald-700',
    medium: 'bg-amber-100 text-amber-700',
  };
  const cls = map[status?.toLowerCase()] ?? 'bg-gray-100 text-gray-600';
  const pad = size === 'md' ? 'px-3 py-1 text-xs' : 'px-2 py-0.5 text-[11px]';
  return <span className={`${cls} ${pad} rounded-full font-semibold capitalize inline-block`}>{status?.replace(/_/g, ' ')}</span>;
}

function StatCard({ icon: Icon, label, value, sub, color = 'indigo' }: { icon: any; label: string; value: string | number; sub?: string; color?: string }) {
  const ring: Record<string, string> = {
    indigo: 'bg-indigo-50 text-indigo-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    rose: 'bg-rose-50 text-rose-600',
    amber: 'bg-amber-50 text-amber-600',
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
    cyan: 'bg-cyan-50 text-cyan-600',
    slate: 'bg-slate-100 text-slate-600',
  };
  return (
    <motion.div {...fade} className="bg-white rounded-xl border border-gray-200 p-5 flex items-start gap-4 shadow-sm hover:shadow-md transition-shadow">
      <div className={`p-3 rounded-xl ${ring[color] ?? ring.indigo}`}><Icon className="w-5 h-5" /></div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-gray-900 mt-0.5">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </motion.div>
  );
}

function SectionHeader({ title, actions }: { title: string; actions?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      {actions}
    </div>
  );
}

function Loader() {
  return (
    <div className="flex items-center justify-center py-24">
      <RefreshCw className="w-6 h-6 animate-spin text-indigo-500" />
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return <p className="text-center text-gray-400 py-12 text-sm">{message}</p>;
}

// ── OVERVIEW VIEW ───────────────────────────────────────

function OverviewView() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    platformAdminService.getOverview().then(r => setData(r.data)).catch(() => toast.error('Failed to load overview')).finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader />;
  if (!data) return <EmptyState message="No overview data" />;

  return (
    <motion.div {...fade} className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard icon={Users} label="Total Users" value={data.total_users ?? 0} color="indigo" />
        <StatCard icon={Heart} label="Patients" value={data.total_patients ?? 0} color="rose" />
        <StatCard icon={Stethoscope} label="Doctors" value={data.total_doctors ?? 0} color="emerald" />
        <StatCard icon={Building2} label="Hospitals" value={data.total_hospitals ?? 0} color="blue" />
        <StatCard icon={Activity} label="Active Sessions" value={data.active_sessions ?? 0} color="cyan" />
        <StatCard icon={AlertTriangle} label="Critical Escalations" value={data.critical_escalations ?? 0} color="rose" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <SectionHeader title="Platform Snapshot" />
          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            {[
              { label: 'Total Risk Assessments', value: data.total_risk_assessments ?? data.risk_assessments ?? '-' },
              { label: 'AI Predictions Today', value: data.ai_predictions_today ?? '-' },
              { label: 'Avg Response Time', value: data.avg_response_time ?? '-' },
              { label: 'System Uptime', value: data.uptime ?? '99.9%' },
              { label: 'Data Processed', value: data.data_processed ?? '-' },
              { label: 'Active Integrations', value: data.active_integrations ?? '-' },
            ].map((s, i) => (
              <div key={i} className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">{s.label}</span>
                <span className="font-semibold text-gray-800">{s.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-xl p-6 text-white shadow-sm">
          <div className="flex items-center gap-2 mb-3"><DollarSign className="w-5 h-5 opacity-80" /><span className="text-sm font-medium opacity-80">Monthly Recurring Revenue</span></div>
          <p className="text-3xl font-bold">${typeof data.revenue === 'number' ? data.revenue.toLocaleString() : (data.mrr?.toLocaleString() ?? data.revenue ?? '0')}</p>
          <p className="text-xs mt-2 opacity-70">{data.revenue_growth ?? 'Updated just now'}</p>
        </div>
      </div>

      {data.recent_activity && data.recent_activity.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <SectionHeader title="Recent Activity" />
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {data.recent_activity.map((a: any, i: number) => (
              <div key={i} className="flex items-start gap-3 text-sm py-2 border-b border-gray-50 last:border-0">
                <Activity className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-gray-700">{a.description ?? a.action ?? a.message}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{a.timestamp ?? a.time ?? ''}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ── ORGANIZATIONS VIEW ──────────────────────────────────

function OrganizationsView() {
  const [orgs, setOrgs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    platformAdminService.listOrganizations().then(r => {
      const d = r.data;
      setOrgs(Array.isArray(d) ? d : d?.organizations ?? []);
    }).catch(() => toast.error('Failed to load organizations')).finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader />;

  return (
    <motion.div {...fade} className="space-y-6">
      <SectionHeader title="Organizations" actions={<button className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition"><Plus className="w-4 h-4" /> Add Organization</button>} />
      {orgs.length === 0 ? <EmptyState message="No organizations found" /> : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Name', 'Type', 'Hospitals', 'Users', 'Status', 'Region'].map(h => (
                  <th key={h} className="text-left px-5 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orgs.map((o: any, i: number) => (
                <tr key={i} className="hover:bg-gray-50 transition">
                  <td className="px-5 py-3 font-medium text-gray-900">{o.name}</td>
                  <td className="px-5 py-3 text-gray-600">{o.type ?? '-'}</td>
                  <td className="px-5 py-3 text-gray-600">{o.hospital_count ?? o.hospitals ?? '-'}</td>
                  <td className="px-5 py-3 text-gray-600">{o.user_count ?? o.users ?? '-'}</td>
                  <td className="px-5 py-3"><StatusBadge status={o.status ?? 'active'} /></td>
                  <td className="px-5 py-3 text-gray-500">{o.region ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  );
}

// ── HOSPITALS VIEW ──────────────────────────────────────

function HospitalsView() {
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', city: '', state: '', type: 'General', tier: 'Tier-1' });

  const load = () => {
    setLoading(true);
    platformAdminService.listHospitals().then(r => {
      const d = r.data;
      setHospitals(Array.isArray(d) ? d : d?.hospitals ?? []);
    }).catch(() => toast.error('Failed to load hospitals')).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!form.name.trim()) { toast.error('Hospital name is required'); return; }
    try {
      await platformAdminService.createHospital(form);
      toast.success('Hospital created');
      setShowAdd(false);
      setForm({ name: '', city: '', state: '', type: 'General', tier: 'Tier-1' });
      load();
    } catch { toast.error('Failed to create hospital'); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this hospital?')) return;
    try {
      await platformAdminService.deleteHospital(id);
      toast.success('Hospital deleted');
      load();
    } catch { toast.error('Failed to delete hospital'); }
  };

  if (loading) return <Loader />;

  return (
    <motion.div {...fade} className="space-y-6">
      <SectionHeader title={`Hospitals (${hospitals.length})`} actions={
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition"><Plus className="w-4 h-4" /> Add Hospital</button>
      } />

      <AnimatePresence>
        {showAdd && (
          <motion.div {...fade} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-gray-900">New Hospital</h4>
              <button onClick={() => setShowAdd(false)}><X className="w-4 h-4 text-gray-400" /></button>
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              {[
                { key: 'name', label: 'Name', placeholder: 'Hospital name' },
                { key: 'city', label: 'City', placeholder: 'City' },
                { key: 'state', label: 'State', placeholder: 'State' },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-xs font-medium text-gray-600 block mb-1">{f.label}</label>
                  <input value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none" />
                </div>
              ))}
            </div>
            <div className="flex justify-end mt-4">
              <button onClick={handleCreate} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition"><Save className="w-4 h-4" /> Create</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {hospitals.length === 0 ? <EmptyState message="No hospitals found" /> : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Name', 'City', 'Type', 'Tier', 'Capabilities', 'Status', ''].map(h => (
                  <th key={h} className="text-left px-5 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {hospitals.map((h: any, i: number) => (
                <tr key={i} className="hover:bg-gray-50 transition">
                  <td className="px-5 py-3 font-medium text-gray-900">{h.name}</td>
                  <td className="px-5 py-3 text-gray-600">{h.city ?? '-'}</td>
                  <td className="px-5 py-3 text-gray-600">{h.type ?? h.hospital_type ?? '-'}</td>
                  <td className="px-5 py-3 text-gray-600">{h.tier ?? '-'}</td>
                  <td className="px-5 py-3 text-gray-500 text-xs max-w-[180px] truncate">{Array.isArray(h.capabilities) ? h.capabilities.join(', ') : (h.capabilities ?? '-')}</td>
                  <td className="px-5 py-3"><StatusBadge status={h.status ?? 'active'} /></td>
                  <td className="px-5 py-3">
                    <button onClick={() => handleDelete(h.id)} className="p-1.5 text-gray-400 hover:text-red-500 transition rounded-lg hover:bg-red-50"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  );
}

// ── USERS & ROLES VIEW ──────────────────────────────────

function UsersView() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showProvision, setShowProvision] = useState(false);
  const [form, setForm] = useState({ email: '', full_name: '', role: 'patient', password: '' });

  const load = () => {
    setLoading(true);
    platformAdminService.listGlobalUsers().then(r => {
      const d = r.data;
      setUsers(Array.isArray(d) ? d : d?.users ?? []);
    }).catch(() => toast.error('Failed to load users')).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleProvision = async () => {
    if (!form.email || !form.full_name) { toast.error('Email and name are required'); return; }
    try {
      await platformAdminService.provisionUser(form);
      toast.success('User provisioned');
      setShowProvision(false);
      setForm({ email: '', full_name: '', role: 'patient', password: '' });
      load();
    } catch { toast.error('Failed to provision user'); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this user?')) return;
    try {
      await platformAdminService.deleteUser(id);
      toast.success('User deleted');
      load();
    } catch { toast.error('Failed to delete user'); }
  };

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    return !q || (u.full_name ?? '').toLowerCase().includes(q) || (u.email ?? '').toLowerCase().includes(q) || (u.role ?? '').toLowerCase().includes(q);
  });

  const roleBadge: Record<string, string> = {
    platform_admin: 'bg-purple-100 text-purple-700',
    hospital_admin: 'bg-blue-100 text-blue-700',
    doctor: 'bg-emerald-100 text-emerald-700',
    patient: 'bg-amber-100 text-amber-700',
  };

  if (loading) return <Loader />;

  return (
    <motion.div {...fade} className="space-y-6">
      <SectionHeader title={`Users & Roles (${users.length})`} actions={
        <button onClick={() => setShowProvision(true)} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition"><UserPlus className="w-4 h-4" /> Provision User</button>
      } />

      <AnimatePresence>
        {showProvision && (
          <motion.div {...fade} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-gray-900">Provision New User</h4>
              <button onClick={() => setShowProvision(false)}><X className="w-4 h-4 text-gray-400" /></button>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Full Name</label>
                <input value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} placeholder="John Doe" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Email</label>
                <input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} type="email" placeholder="user@example.com" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Role</label>
                <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none bg-white">
                  <option value="patient">Patient</option>
                  <option value="doctor">Doctor</option>
                  <option value="hospital_admin">Hospital Admin</option>
                  <option value="platform_admin">Platform Admin</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Password</label>
                <input value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} type="password" placeholder="••••••••" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none" />
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <button onClick={handleProvision} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition"><Save className="w-4 h-4" /> Provision</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users by name, email, or role…" className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none bg-white" />
      </div>

      {filtered.length === 0 ? <EmptyState message="No users found" /> : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Name', 'Email', 'Role', 'Status', 'Joined', ''].map(h => (
                  <th key={h} className="text-left px-5 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((u: any, i: number) => (
                <tr key={i} className="hover:bg-gray-50 transition">
                  <td className="px-5 py-3 font-medium text-gray-900">{u.full_name ?? u.name}</td>
                  <td className="px-5 py-3 text-gray-600">{u.email}</td>
                  <td className="px-5 py-3">
                    <span className={`px-2.5 py-0.5 text-[11px] rounded-full font-semibold capitalize ${roleBadge[u.role] ?? 'bg-gray-100 text-gray-600'}`}>{u.role?.replace(/_/g, ' ')}</span>
                  </td>
                  <td className="px-5 py-3"><StatusBadge status={u.status ?? (u.is_active !== false ? 'active' : 'inactive')} /></td>
                  <td className="px-5 py-3 text-gray-500 text-xs">{u.created_at ? new Date(u.created_at).toLocaleDateString() : '-'}</td>
                  <td className="px-5 py-3">
                    <button onClick={() => handleDelete(u.id)} className="p-1.5 text-gray-400 hover:text-red-500 transition rounded-lg hover:bg-red-50"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  );
}

// ── AI CONTROL CENTER VIEW ──────────────────────────────

function AIControlView() {
  const [data, setData] = useState<any>(null);
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [retraining, setRetraining] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      platformAdminService.getAIControl().catch(() => ({ data: null })),
      platformAdminService.getAiMetrics().catch(() => ({ data: null })),
    ]).then(([ctrl, met]) => {
      setData(ctrl.data);
      setMetrics(met.data);
    }).finally(() => setLoading(false));
  }, []);

  const handleRetrain = async (modelName: string) => {
    setRetraining(modelName);
    try {
      await platformAdminService.retrainModel(modelName);
      toast.success(`Retraining ${modelName} started`);
    } catch { toast.error('Retrain failed'); }
    finally { setRetraining(null); }
  };

  if (loading) return <Loader />;

  const models = data?.models ?? [];
  const modelMetrics = metrics?.models ?? metrics?.model_metrics ?? [];

  return (
    <motion.div {...fade} className="space-y-6">
      <SectionHeader title="AI Control Center" />

      {data?.status && (
        <div className="flex items-center gap-3 bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <Cpu className="w-5 h-5 text-indigo-500" />
          <span className="text-sm text-gray-700">AI System Status:</span>
          <StatusBadge status={data.status} size="md" />
        </div>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {models.map((m: any, i: number) => (
          <motion.div key={i} {...fade} transition={{ delay: i * 0.05 }} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-purple-500" />
                <h4 className="font-semibold text-gray-900 text-sm">{m.name ?? m.model_name}</h4>
              </div>
              <StatusBadge status={m.status ?? 'active'} />
            </div>
            <div className="space-y-2 text-xs text-gray-500 mb-4">
              {m.version && <p>Version: <span className="text-gray-700 font-medium">{m.version}</span></p>}
              {m.accuracy != null && <p>Accuracy: <span className="text-gray-700 font-medium">{typeof m.accuracy === 'number' ? `${(m.accuracy * 100).toFixed(1)}%` : m.accuracy}</span></p>}
              {m.last_trained && <p>Last trained: <span className="text-gray-700 font-medium">{m.last_trained}</span></p>}
              {m.predictions_today != null && <p>Predictions today: <span className="text-gray-700 font-medium">{m.predictions_today}</span></p>}
            </div>
            <button
              onClick={() => handleRetrain(m.name ?? m.model_name)}
              disabled={retraining === (m.name ?? m.model_name)}
              className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition disabled:opacity-50"
            >
              {retraining === (m.name ?? m.model_name) ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <PlayCircle className="w-3.5 h-3.5" />}
              {retraining === (m.name ?? m.model_name) ? 'Retraining…' : 'Retrain Model'}
            </button>
          </motion.div>
        ))}
      </div>

      {modelMetrics.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <SectionHeader title="Model Metrics" />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Model', 'Accuracy', 'Precision', 'Recall', 'F1 Score', 'Latency'].map(h => (
                    <th key={h} className="text-left px-5 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {modelMetrics.map((m: any, i: number) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium text-gray-900">{m.name ?? m.model_name}</td>
                    <td className="px-5 py-3 text-gray-700">{m.accuracy != null ? `${(Number(m.accuracy) * 100).toFixed(1)}%` : '-'}</td>
                    <td className="px-5 py-3 text-gray-700">{m.precision != null ? `${(Number(m.precision) * 100).toFixed(1)}%` : '-'}</td>
                    <td className="px-5 py-3 text-gray-700">{m.recall != null ? `${(Number(m.recall) * 100).toFixed(1)}%` : '-'}</td>
                    <td className="px-5 py-3 text-gray-700">{m.f1_score != null ? `${(Number(m.f1_score) * 100).toFixed(1)}%` : '-'}</td>
                    <td className="px-5 py-3 text-gray-700">{m.latency_ms != null ? `${m.latency_ms}ms` : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ── ANALYTICS VIEW ──────────────────────────────────────

function AnalyticsView() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    platformAdminService.getGlobalAnalytics().then(r => setData(r.data)).catch(() => toast.error('Failed to load analytics')).finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader />;
  if (!data) return <EmptyState message="No analytics data" />;

  const kpis = data.kpis ?? data.key_metrics ?? data.metrics ?? {};

  return (
    <motion.div {...fade} className="space-y-6">
      <SectionHeader title="Platform Analytics" />

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total Users" value={kpis.total_users ?? data.total_users ?? '-'} color="indigo" />
        <StatCard icon={TrendingUp} label="Growth Rate" value={kpis.growth_rate ?? data.growth_rate ?? '-'} color="emerald" />
        <StatCard icon={Activity} label="Daily Active" value={kpis.daily_active_users ?? data.daily_active ?? '-'} color="blue" />
        <StatCard icon={Target} label="Retention" value={kpis.retention_rate ?? data.retention ?? '-'} color="purple" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {data.usage_by_role && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <SectionHeader title="Usage by Role" />
            <div className="space-y-3">
              {Object.entries(data.usage_by_role).map(([role, count]: [string, any]) => (
                <div key={role} className="flex items-center justify-between py-2">
                  <span className="text-sm text-gray-600 capitalize">{role.replace(/_/g, ' ')}</span>
                  <span className="text-sm font-semibold text-gray-900">{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {data.feature_usage && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <SectionHeader title="Feature Usage" />
            <div className="space-y-3">
              {Object.entries(data.feature_usage).map(([feat, val]: [string, any]) => (
                <div key={feat} className="flex items-center justify-between py-2">
                  <span className="text-sm text-gray-600 capitalize">{feat.replace(/_/g, ' ')}</span>
                  <span className="text-sm font-semibold text-gray-900">{typeof val === 'number' ? val.toLocaleString() : val}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {data.charts && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <SectionHeader title="Summary Statistics" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(data.charts).map(([key, val]: [string, any]) => (
              <div key={key} className="p-4 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 capitalize mb-1">{key.replace(/_/g, ' ')}</p>
                <p className="text-lg font-bold text-gray-800">{typeof val === 'number' ? val.toLocaleString() : JSON.stringify(val)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ── ESCALATION MONITOR VIEW ─────────────────────────────

function EscalationsView() {
  const [escalations, setEscalations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    platformAdminService.getGlobalEscalations().then(r => {
      const d = r.data;
      setEscalations(Array.isArray(d) ? d : d?.escalations ?? []);
    }).catch(() => toast.error('Failed to load escalations')).finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader />;

  const severityIcon: Record<string, string> = { critical: 'text-red-500', high: 'text-orange-500', medium: 'text-amber-500', low: 'text-green-500' };

  return (
    <motion.div {...fade} className="space-y-6">
      <SectionHeader title="Escalation Monitor" />

      <div className="grid sm:grid-cols-4 gap-4">
        {['critical', 'high', 'medium', 'low'].map(sev => {
          const count = escalations.filter(e => (e.severity ?? e.risk_level ?? '').toLowerCase() === sev).length;
          return (
            <div key={sev} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex items-center gap-3">
              <Siren className={`w-5 h-5 ${severityIcon[sev]}`} />
              <div>
                <p className="text-xs text-gray-500 capitalize">{sev}</p>
                <p className="text-xl font-bold text-gray-900">{count}</p>
              </div>
            </div>
          );
        })}
      </div>

      {escalations.length === 0 ? <EmptyState message="No escalations" /> : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Severity', 'Type', 'Patient', 'Hospital', 'Status', 'Created', 'Reason'].map(h => (
                  <th key={h} className="text-left px-5 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {escalations.map((e: any, i: number) => (
                <tr key={i} className="hover:bg-gray-50 transition">
                  <td className="px-5 py-3"><StatusBadge status={e.severity ?? e.risk_level ?? 'medium'} /></td>
                  <td className="px-5 py-3 text-gray-700">{e.risk_type ?? e.type ?? '-'}</td>
                  <td className="px-5 py-3 text-gray-700">{e.patient_name ?? e.patient_id ?? '-'}</td>
                  <td className="px-5 py-3 text-gray-500">{e.hospital_name ?? e.hospital ?? '-'}</td>
                  <td className="px-5 py-3"><StatusBadge status={e.status ?? 'open'} /></td>
                  <td className="px-5 py-3 text-gray-500 text-xs">{e.created_at ? new Date(e.created_at).toLocaleString() : '-'}</td>
                  <td className="px-5 py-3 text-gray-500 text-xs max-w-[200px] truncate">{e.escalation_reason ?? e.reason ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  );
}

// ── BILLING VIEW ────────────────────────────────────────

function BillingView() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    platformAdminService.getBillingData().then(r => setData(r.data)).catch(() => toast.error('Failed to load billing')).finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader />;
  if (!data) return <EmptyState message="No billing data" />;

  const plans = data.plans ?? [];
  const subscriptions = data.subscriptions ?? [];

  return (
    <motion.div {...fade} className="space-y-6">
      <SectionHeader title="Billing & Subscriptions" />

      <div className="grid sm:grid-cols-3 gap-4">
        <StatCard icon={DollarSign} label="Monthly Recurring Revenue" value={`$${(data.mrr ?? 0).toLocaleString()}`} color="emerald" />
        <StatCard icon={CreditCard} label="Active Subscriptions" value={data.active_subscriptions ?? subscriptions.length} color="indigo" />
        <StatCard icon={TrendingUp} label="Revenue Growth" value={data.growth ?? data.revenue_growth ?? '-'} color="blue" />
      </div>

      {plans.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <SectionHeader title="Plans" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {plans.map((p: any, i: number) => (
              <div key={i} className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900">{p.name}</h4>
                <p className="text-2xl font-bold text-indigo-600 mt-1">${p.price ?? p.amount}<span className="text-sm text-gray-400 font-normal">/{p.interval ?? 'mo'}</span></p>
                <p className="text-xs text-gray-500 mt-2">{p.subscribers ?? p.count ?? 0} subscribers</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {subscriptions.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100"><h4 className="font-semibold text-gray-900">Subscriptions</h4></div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Organization', 'Plan', 'Status', 'Amount', 'Next Billing'].map(h => (
                  <th key={h} className="text-left px-5 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {subscriptions.map((s: any, i: number) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-900">{s.organization ?? s.org_name ?? '-'}</td>
                  <td className="px-5 py-3 text-gray-600">{s.plan ?? s.plan_name ?? '-'}</td>
                  <td className="px-5 py-3"><StatusBadge status={s.status ?? 'active'} /></td>
                  <td className="px-5 py-3 text-gray-700">${s.amount ?? s.price ?? '-'}</td>
                  <td className="px-5 py-3 text-gray-500 text-xs">{s.next_billing ?? s.renewal_date ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  );
}

// ── INFRASTRUCTURE VIEW ─────────────────────────────────

function InfrastructureView() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    platformAdminService.getInfrastructure().then(r => setData(r.data)).catch(() => toast.error('Failed to load infrastructure')).finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader />;
  if (!data) return <EmptyState message="No infrastructure data" />;

  const servers = data.servers ?? [];
  const databases = data.databases ?? [];
  const services = data.services ?? [];

  return (
    <motion.div {...fade} className="space-y-6">
      <SectionHeader title="Infrastructure" />

      {data.latency_ms != null && (
        <div className="grid sm:grid-cols-3 gap-4">
          <StatCard icon={Gauge} label="Avg Latency" value={`${data.latency_ms}ms`} color="blue" />
          <StatCard icon={Server} label="Total Servers" value={servers.length} color="indigo" />
          <StatCard icon={Database} label="Databases" value={databases.length} color="purple" />
        </div>
      )}

      {servers.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <SectionHeader title="Servers" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {servers.map((s: any, i: number) => (
              <div key={i} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-gray-900 text-sm">{s.name ?? s.id}</h4>
                  <StatusBadge status={s.status ?? 'running'} />
                </div>
                <div className="space-y-1.5 text-xs text-gray-500">
                  {s.region && <p>Region: <span className="text-gray-700">{s.region}</span></p>}
                  {s.load != null && (
                    <div>
                      <p className="mb-1">Load: <span className="text-gray-700">{typeof s.load === 'number' ? `${s.load}%` : s.load}</span></p>
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div className={`h-1.5 rounded-full ${Number(s.load) > 80 ? 'bg-red-500' : Number(s.load) > 50 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(Number(s.load) || 0, 100)}%` }} />
                      </div>
                    </div>
                  )}
                  {s.uptime && <p>Uptime: <span className="text-gray-700">{s.uptime}</span></p>}
                  {s.cpu && <p>CPU: <span className="text-gray-700">{s.cpu}</span></p>}
                  {s.memory && <p>Memory: <span className="text-gray-700">{s.memory}</span></p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {databases.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <SectionHeader title="Database Health" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {databases.map((db: any, i: number) => (
              <div key={i} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-purple-500" />
                    <h4 className="font-semibold text-gray-900 text-sm">{db.name ?? db.type}</h4>
                  </div>
                  <StatusBadge status={db.status ?? 'healthy'} />
                </div>
                <div className="space-y-1 text-xs text-gray-500">
                  {db.size && <p>Size: <span className="text-gray-700">{db.size}</span></p>}
                  {db.connections != null && <p>Connections: <span className="text-gray-700">{db.connections}</span></p>}
                  {db.replication && <p>Replication: <span className="text-gray-700">{db.replication}</span></p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {services.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <SectionHeader title="Services" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {services.map((svc: any, i: number) => (
              <div key={i} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
                {(svc.status ?? '').toLowerCase() === 'running' || (svc.status ?? '').toLowerCase() === 'healthy' ?
                  <Wifi className="w-4 h-4 text-emerald-500 shrink-0" /> :
                  <WifiOff className="w-4 h-4 text-red-500 shrink-0" />
                }
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{svc.name}</p>
                  <p className="text-xs text-gray-500">{svc.status ?? '-'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ── SECURITY & COMPLIANCE VIEW ──────────────────────────

function SecurityView() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    platformAdminService.getSecurity().then(r => setData(r.data)).catch(() => toast.error('Failed to load security data')).finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader />;
  if (!data) return <EmptyState message="No security data" />;

  const compliance = data.compliance ?? {};
  const auth = data.authentication ?? {};
  const encryption = data.encryption ?? {};
  const vulns = data.vulnerabilities ?? [];
  const accessControl = data.access_control ?? {};

  return (
    <motion.div {...fade} className="space-y-6">
      <SectionHeader title="Security & Compliance" />

      {Object.keys(compliance).length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <SectionHeader title="Compliance Status" />
          <div className="flex flex-wrap gap-3">
            {Object.entries(compliance).map(([standard, status]: [string, any]) => {
              const isCompliant = status === true || status === 'compliant' || status === 'passed';
              return (
                <div key={standard} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border ${isCompliant ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                  {isCompliant ? <ShieldCheck className="w-5 h-5 text-emerald-600" /> : <ShieldAlert className="w-5 h-5 text-red-600" />}
                  <span className={`text-sm font-semibold ${isCompliant ? 'text-emerald-700' : 'text-red-700'}`}>{standard.toUpperCase()}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {Object.keys(auth).length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <SectionHeader title="Authentication" />
            <div className="space-y-3">
              {Object.entries(auth).map(([key, val]: [string, any]) => (
                <div key={key} className="flex justify-between py-2 border-b border-gray-50 last:border-0">
                  <span className="text-sm text-gray-600 capitalize">{key.replace(/_/g, ' ')}</span>
                  <span className="text-sm font-medium text-gray-800">{typeof val === 'boolean' ? (val ? 'Enabled' : 'Disabled') : String(val)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {Object.keys(encryption).length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <SectionHeader title="Encryption" />
            <div className="space-y-3">
              {Object.entries(encryption).map(([key, val]: [string, any]) => (
                <div key={key} className="flex justify-between py-2 border-b border-gray-50 last:border-0">
                  <span className="text-sm text-gray-600 capitalize">{key.replace(/_/g, ' ')}</span>
                  <span className="text-sm font-medium text-gray-800 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-indigo-400" />{String(val)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {Array.isArray(vulns) && vulns.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <SectionHeader title="Vulnerability Scan Results" />
          <div className="space-y-3">
            {vulns.map((v: any, i: number) => (
              <div key={i} className="flex items-start gap-3 p-3 border border-gray-100 rounded-lg">
                <AlertCircle className={`w-5 h-5 shrink-0 mt-0.5 ${(v.severity ?? '').toLowerCase() === 'critical' ? 'text-red-500' : (v.severity ?? '').toLowerCase() === 'high' ? 'text-orange-500' : 'text-amber-500'}`} />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900">{v.title ?? v.name ?? v.description}</p>
                    <StatusBadge status={v.severity ?? 'medium'} />
                  </div>
                  {v.description && v.title && <p className="text-xs text-gray-500 mt-1">{v.description}</p>}
                  <p className="text-xs text-gray-400 mt-1">{v.status ?? 'Open'} · {v.detected ?? v.found_at ?? ''}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {Object.keys(accessControl).length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <SectionHeader title="Access Control" />
          <div className="grid sm:grid-cols-2 gap-4">
            {Object.entries(accessControl).map(([key, val]: [string, any]) => (
              <div key={key} className="flex justify-between py-2 border-b border-gray-50">
                <span className="text-sm text-gray-600 capitalize">{key.replace(/_/g, ' ')}</span>
                <span className="text-sm font-medium text-gray-800">{typeof val === 'boolean' ? (val ? 'Enabled' : 'Disabled') : String(val)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ── COMMUNICATION CENTER VIEW ───────────────────────────

function CommunicationView() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAnnounce, setShowAnnounce] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', target: 'all' });

  useEffect(() => {
    platformAdminService.getCommunication().then(r => setData(r.data)).catch(() => toast.error('Failed to load communication data')).finally(() => setLoading(false));
  }, []);

  const handleAnnounce = async () => {
    if (!form.title.trim() || !form.content.trim()) { toast.error('Title and content are required'); return; }
    try {
      await platformAdminService.createAnnouncement(form);
      toast.success('Announcement created');
      setShowAnnounce(false);
      setForm({ title: '', content: '', target: 'all' });
      platformAdminService.getCommunication().then(r => setData(r.data));
    } catch { toast.error('Failed to create announcement'); }
  };

  if (loading) return <Loader />;
  if (!data) return <EmptyState message="No communication data" />;

  const channels = data.channels ?? [];
  const announcements = data.announcements ?? [];
  const templates = data.templates ?? [];

  return (
    <motion.div {...fade} className="space-y-6">
      <SectionHeader title="Communication Center" actions={
        <button onClick={() => setShowAnnounce(true)} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition"><Megaphone className="w-4 h-4" /> New Announcement</button>
      } />

      <AnimatePresence>
        {showAnnounce && (
          <motion.div {...fade} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-gray-900">Create Announcement</h4>
              <button onClick={() => setShowAnnounce(false)}><X className="w-4 h-4 text-gray-400" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Title</label>
                <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Announcement title" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Content</label>
                <textarea value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} rows={3} placeholder="Write your announcement…" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none resize-none" />
              </div>
              <div className="flex justify-end">
                <button onClick={handleAnnounce} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition"><Send className="w-4 h-4" /> Publish</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {channels.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <SectionHeader title="Channels" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {channels.map((ch: any, i: number) => (
              <div key={i} className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg">
                <MessagesSquare className="w-5 h-5 text-indigo-500 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">{ch.name}</p>
                  <StatusBadge status={ch.status ?? 'active'} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {announcements.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <SectionHeader title="Announcements" />
          <div className="space-y-3">
            {announcements.map((a: any, i: number) => (
              <div key={i} className="p-4 border border-gray-100 rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-sm font-semibold text-gray-900">{a.title}</h4>
                  <span className="text-xs text-gray-400">{a.created_at ?? a.date ?? ''}</span>
                </div>
                <p className="text-sm text-gray-600">{a.content ?? a.message}</p>
                {a.target && <p className="text-xs text-gray-400 mt-1">Target: {a.target}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {templates.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <SectionHeader title="Message Templates" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((t: any, i: number) => (
              <div key={i} className="p-4 border border-gray-200 rounded-lg">
                <p className="text-sm font-medium text-gray-900 mb-1">{t.name ?? t.title}</p>
                <p className="text-xs text-gray-500 line-clamp-2">{t.content ?? t.body ?? t.template}</p>
                {t.type && <span className="text-xs text-gray-400 mt-2 block">{t.type}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ── AUDIT LOGS VIEW ─────────────────────────────────────

function AuditLogsView() {
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [limit, setLimit] = useState(50);

  const load = (l: number) => {
    setLoading(true);
    platformAdminService.getAuditLogs(l).then(r => {
      const d = r.data;
      setLogs(Array.isArray(d) ? d : d?.logs ?? []);
      setTotal(d?.total ?? (Array.isArray(d) ? d.length : 0));
    }).catch(() => toast.error('Failed to load audit logs')).finally(() => setLoading(false));
  };

  useEffect(() => { load(limit); }, [limit]);

  if (loading) return <Loader />;

  return (
    <motion.div {...fade} className="space-y-6">
      <SectionHeader title={`Audit Logs (${total})`} actions={
        <select value={limit} onChange={e => setLimit(Number(e.target.value))} className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white">
          <option value={25}>Last 25</option>
          <option value={50}>Last 50</option>
          <option value={100}>Last 100</option>
          <option value={200}>Last 200</option>
        </select>
      } />

      {logs.length === 0 ? <EmptyState message="No audit logs" /> : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Timestamp', 'Action', 'User', 'Resource', 'IP Address', 'Details'].map(h => (
                    <th key={h} className="text-left px-5 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map((l: any, i: number) => (
                  <tr key={i} className="hover:bg-gray-50 transition">
                    <td className="px-5 py-3 text-gray-500 text-xs whitespace-nowrap">{l.timestamp ? new Date(l.timestamp).toLocaleString() : '-'}</td>
                    <td className="px-5 py-3 font-medium text-gray-900">{l.action ?? l.event}</td>
                    <td className="px-5 py-3 text-gray-600">{l.user ?? l.user_email ?? l.actor ?? '-'}</td>
                    <td className="px-5 py-3 text-gray-600">{l.resource ?? l.resource_type ?? '-'}</td>
                    <td className="px-5 py-3 text-gray-500 font-mono text-xs">{l.ip_address ?? l.ip ?? '-'}</td>
                    <td className="px-5 py-3 text-gray-500 text-xs max-w-[200px] truncate">{l.details ?? l.description ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ── INTEGRATIONS VIEW ───────────────────────────────────

function IntegrationsView() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    platformAdminService.getIntegrations().then(r => setData(r.data)).catch(() => toast.error('Failed to load integrations')).finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader />;
  if (!data) return <EmptyState message="No integrations data" />;

  const active = data.active ?? [];
  const available = data.available ?? [];

  return (
    <motion.div {...fade} className="space-y-6">
      <SectionHeader title="Integrations" />

      {active.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <SectionHeader title="Active Integrations" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {active.map((int: any, i: number) => (
              <div key={i} className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg">
                <div className="p-2.5 bg-emerald-50 rounded-lg"><Plug className="w-5 h-5 text-emerald-600" /></div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">{int.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <StatusBadge status={int.status ?? 'connected'} />
                    {int.last_sync && <span className="text-xs text-gray-400">Synced: {int.last_sync}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {available.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <SectionHeader title="Available Integrations" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {available.map((int: any, i: number) => (
              <div key={i} className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg border-dashed">
                <div className="p-2.5 bg-gray-50 rounded-lg"><Plug className="w-5 h-5 text-gray-400" /></div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900">{int.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{int.description ?? 'Available to configure'}</p>
                </div>
                <button className="px-3 py-1.5 text-xs font-medium text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition whitespace-nowrap">Configure</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ── SUPPORT & TICKETS VIEW ──────────────────────────────

function SupportView() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ subject: '', description: '', priority: 'medium' });

  const load = () => {
    setLoading(true);
    platformAdminService.getSupportTickets().then(r => setData(r.data)).catch(() => toast.error('Failed to load support data')).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!form.subject.trim()) { toast.error('Subject is required'); return; }
    try {
      await platformAdminService.createSupportTicket(form);
      toast.success('Ticket created');
      setShowCreate(false);
      setForm({ subject: '', description: '', priority: 'medium' });
      load();
    } catch { toast.error('Failed to create ticket'); }
  };

  if (loading) return <Loader />;
  if (!data) return <EmptyState message="No support data" />;

  const tickets = data.tickets ?? [];
  const stats = data.stats ?? {};

  return (
    <motion.div {...fade} className="space-y-6">
      <SectionHeader title="Support & Tickets" actions={
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition"><Plus className="w-4 h-4" /> New Ticket</button>
      } />

      <AnimatePresence>
        {showCreate && (
          <motion.div {...fade} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-gray-900">Create Support Ticket</h4>
              <button onClick={() => setShowCreate(false)}><X className="w-4 h-4 text-gray-400" /></button>
            </div>
            <div className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Subject</label>
                  <input value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} placeholder="Ticket subject" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Priority</label>
                  <select value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Description</label>
                <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3} placeholder="Describe the issue…" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none resize-none" />
              </div>
              <div className="flex justify-end">
                <button onClick={handleCreate} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition"><Save className="w-4 h-4" /> Create</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid sm:grid-cols-3 gap-4">
        <StatCard icon={AlertCircle} label="Open" value={stats.open ?? tickets.filter((t: any) => t.status === 'open').length} color="amber" />
        <StatCard icon={Clock} label="In Progress" value={stats.in_progress ?? tickets.filter((t: any) => t.status === 'in_progress' || t.status === 'in-progress').length} color="blue" />
        <StatCard icon={Check} label="Resolved" value={stats.resolved ?? tickets.filter((t: any) => t.status === 'resolved').length} color="emerald" />
      </div>

      {tickets.length === 0 ? <EmptyState message="No tickets" /> : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Subject', 'Priority', 'Status', 'Created By', 'Created', 'Updated'].map(h => (
                  <th key={h} className="text-left px-5 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tickets.map((t: any, i: number) => (
                <tr key={i} className="hover:bg-gray-50 transition">
                  <td className="px-5 py-3 font-medium text-gray-900">{t.subject ?? t.title}</td>
                  <td className="px-5 py-3"><StatusBadge status={t.priority ?? 'medium'} /></td>
                  <td className="px-5 py-3"><StatusBadge status={t.status ?? 'open'} /></td>
                  <td className="px-5 py-3 text-gray-600">{t.created_by ?? t.reporter ?? '-'}</td>
                  <td className="px-5 py-3 text-gray-500 text-xs">{t.created_at ? new Date(t.created_at).toLocaleDateString() : '-'}</td>
                  <td className="px-5 py-3 text-gray-500 text-xs">{t.updated_at ? new Date(t.updated_at).toLocaleDateString() : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  );
}

// ── REPORTS VIEW ────────────────────────────────────────

function ReportsView() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    platformAdminService.getReports().then(r => setData(r.data)).catch(() => toast.error('Failed to load reports')).finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader />;
  if (!data) return <EmptyState message="No reports data" />;

  const summary = data.summary ?? {};
  const risk = data.risk_overview ?? {};
  const escalations = data.escalations ?? {};
  const health = data.platform_health ?? {};

  return (
    <motion.div {...fade} className="space-y-6">
      <SectionHeader title="Reports" />

      {Object.keys(summary).length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <SectionHeader title="Summary" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(summary).map(([key, val]: [string, any]) => (
              <div key={key} className="p-4 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 capitalize mb-1">{key.replace(/_/g, ' ')}</p>
                <p className="text-lg font-bold text-gray-800">{typeof val === 'number' ? val.toLocaleString() : String(val)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {Object.keys(risk).length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <SectionHeader title="Risk Overview" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(risk).map(([key, val]: [string, any]) => (
              <div key={key} className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg">
                <AlertTriangle className={`w-5 h-5 shrink-0 ${key.includes('critical') || key.includes('high') ? 'text-red-500' : 'text-amber-500'}`} />
                <div>
                  <p className="text-xs text-gray-500 capitalize">{key.replace(/_/g, ' ')}</p>
                  <p className="text-lg font-bold text-gray-800">{typeof val === 'number' ? val.toLocaleString() : String(val)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {Object.keys(escalations).length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <SectionHeader title="Escalations Summary" />
            <div className="space-y-3">
              {Object.entries(escalations).map(([key, val]: [string, any]) => (
                <div key={key} className="flex justify-between py-2 border-b border-gray-50 last:border-0">
                  <span className="text-sm text-gray-600 capitalize">{key.replace(/_/g, ' ')}</span>
                  <span className="text-sm font-semibold text-gray-900">{typeof val === 'number' ? val.toLocaleString() : String(val)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {Object.keys(health).length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <SectionHeader title="Platform Health" />
            <div className="space-y-3">
              {Object.entries(health).map(([key, val]: [string, any]) => (
                <div key={key} className="flex justify-between py-2 border-b border-gray-50 last:border-0">
                  <span className="text-sm text-gray-600 capitalize">{key.replace(/_/g, ' ')}</span>
                  <span className="text-sm font-semibold text-gray-900">{typeof val === 'number' ? val.toLocaleString() : String(val)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ── SETTINGS VIEW ───────────────────────────────────────

function SettingsView() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [edited, setEdited] = useState<any>(null);

  useEffect(() => {
    platformAdminService.getSettings().then(r => {
      setData(r.data);
      setEdited(r.data);
    }).catch(() => toast.error('Failed to load settings')).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await platformAdminService.updateSettings(edited);
      toast.success('Settings saved');
      setData(edited);
    } catch { toast.error('Failed to save settings'); }
    finally { setSaving(false); }
  };

  if (loading) return <Loader />;
  if (!data) return <EmptyState message="No settings data" />;

  const sections: { key: string; title: string; icon: any }[] = [
    { key: 'general', title: 'General Configuration', icon: Settings },
    { key: 'ml_pipeline', title: 'ML Pipeline Settings', icon: Brain },
    { key: 'notifications', title: 'Notification Preferences', icon: Megaphone },
    { key: 'data_retention', title: 'Data Retention', icon: Archive },
  ];

  const renderValue = (sectionKey: string, key: string, val: any) => {
    if (typeof val === 'boolean') {
      return (
        <button
          onClick={() => setEdited((prev: any) => ({ ...prev, [sectionKey]: { ...prev[sectionKey], [key]: !val } }))}
          className={`relative w-10 h-5 rounded-full transition ${val ? 'bg-indigo-600' : 'bg-gray-300'}`}
        >
          <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${val ? 'left-5' : 'left-0.5'}`} />
        </button>
      );
    }
    if (typeof val === 'number') {
      return (
        <input
          type="number"
          value={val}
          onChange={e => setEdited((prev: any) => ({ ...prev, [sectionKey]: { ...prev[sectionKey], [key]: Number(e.target.value) } }))}
          className="w-24 px-2 py-1 text-right border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none"
        />
      );
    }
    if (typeof val === 'string') {
      return (
        <input
          value={val}
          onChange={e => setEdited((prev: any) => ({ ...prev, [sectionKey]: { ...prev[sectionKey], [key]: e.target.value } }))}
          className="w-48 px-2 py-1 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none"
        />
      );
    }
    return <span className="text-sm text-gray-700">{JSON.stringify(val)}</span>;
  };

  return (
    <motion.div {...fade} className="space-y-6">
      <SectionHeader title="Settings" actions={
        <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition disabled:opacity-50">
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      } />

      {sections.map(({ key, title, icon: Icon }) => {
        const sectionData = edited?.[key];
        if (!sectionData || typeof sectionData !== 'object') return null;
        return (
          <div key={key} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Icon className="w-5 h-5 text-indigo-500" />
              <h4 className="font-semibold text-gray-900">{title}</h4>
            </div>
            <div className="space-y-3">
              {Object.entries(sectionData).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
                  <span className="text-sm text-gray-600 capitalize">{k.replace(/_/g, ' ')}</span>
                  {renderValue(key, k, v)}
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {Object.keys(data).filter(k => !sections.some(s => s.key === k)).length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h4 className="font-semibold text-gray-900 mb-4">Other Settings</h4>
          <div className="space-y-3">
            {Object.entries(data).filter(([k]) => !sections.some(s => s.key === k)).map(([k, v]) => (
              <div key={k} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
                <span className="text-sm text-gray-600 capitalize">{k.replace(/_/g, ' ')}</span>
                <span className="text-sm text-gray-700">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ── VIEW ROUTER ─────────────────────────────────────────

function resolveView(pathname: string) {
  const p = pathname.replace(/\/+$/, '') || '/admin';
  const map: Record<string, () => JSX.Element> = {
    '/admin': () => <OverviewView />,
    '/admin/organizations': () => <OrganizationsView />,
    '/admin/hospitals': () => <HospitalsView />,
    '/admin/users': () => <UsersView />,
    '/admin/ai-control': () => <AIControlView />,
    '/admin/analytics': () => <AnalyticsView />,
    '/admin/escalations': () => <EscalationsView />,
    '/admin/billing': () => <BillingView />,
    '/admin/infrastructure': () => <InfrastructureView />,
    '/admin/security': () => <SecurityView />,
    '/admin/communication': () => <CommunicationView />,
    '/admin/audit-logs': () => <AuditLogsView />,
    '/admin/integrations': () => <IntegrationsView />,
    '/admin/support': () => <SupportView />,
    '/admin/reports': () => <ReportsView />,
    '/admin/settings': () => <SettingsView />,
  };
  return (map[p] ?? map['/admin'])();
}

const ADMIN_VIEW_TITLES: Record<string, string> = {
  '/admin': 'Overview',
  '/admin/organizations': 'Organizations',
  '/admin/hospitals': 'Hospitals',
  '/admin/users': 'Users & Roles',
  '/admin/ai-control': 'AI Control Center',
  '/admin/analytics': 'Platform Analytics',
  '/admin/escalations': 'Escalation Monitor',
  '/admin/billing': 'Billing & Subscriptions',
  '/admin/infrastructure': 'Infrastructure',
  '/admin/security': 'Security & Compliance',
  '/admin/communication': 'Communication Center',
  '/admin/audit-logs': 'Audit Logs',
  '/admin/integrations': 'Integrations',
  '/admin/support': 'Support & Tickets',
  '/admin/reports': 'Reports',
  '/admin/settings': 'Settings',
};

function getViewTitle(pathname: string) {
  const p = pathname.replace(/\/+$/, '') || '/admin';
  return ADMIN_VIEW_TITLES[p] ?? 'Overview';
}

// ── MAIN COMPONENT ──────────────────────────────────────

export default function AdminDashboardPage() {
  const location = useLocation();
  const pathname = location.pathname;

  return (
    <div className="h-full min-h-0 flex flex-col">
      <div className="flex-1 min-w-0 overflow-y-auto bg-gray-50">
        <div className="sticky top-0 z-10 bg-gradient-to-r from-slate-900 to-indigo-900 px-6 py-5 lg:px-8">
          <h1 className="text-xl font-bold text-white">{getViewTitle(pathname)}</h1>
          <p className="text-sm text-indigo-200 mt-0.5">Platform Administration</p>
        </div>

        <div className="p-4 lg:p-6 space-y-6">
          <AnimatePresence mode="wait">
            <motion.div key={pathname} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
              {resolveView(pathname)}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
