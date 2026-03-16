import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Users, Building2, Stethoscope, Search, Plus, Edit3, Trash2,
  X, Save, ChevronDown, ChevronUp, UserCheck, UserX, Activity,
  Check, AlertTriangle, BarChart3,
} from 'lucide-react';
import { adminService } from '../services/endpoints';
import toast from 'react-hot-toast';

type Tab = 'overview' | 'users' | 'hospitals' | 'doctors';

interface AdminStats {
  total_users: number;
  active_users: number;
  total_doctors: number;
  total_hospitals: number;
  total_patients: number;
  role_counts: Record<string, number>;
}

interface AdminUser {
  id: number;
  email: string;
  full_name: string;
  phone?: string;
  role: string;
  is_active: boolean;
  city?: string;
  state?: string;
  created_at?: string;
}

interface AdminHospital {
  id: number;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  phone?: string;
  has_obgyn: boolean;
  has_nicu: boolean;
  is_emergency_capable: boolean;
  is_24x7: boolean;
  hospital_type?: string;
  specialties?: string[];
  rating?: number;
  location_lat?: number;
  location_lng?: number;
}

interface AdminDoctor {
  id: number;
  name: string;
  email?: string;
  specialty?: string;
  contact?: string;
  license_number?: string;
  hospital_id?: number;
  hospital_name?: string;
  user_id?: number;
  available_for_escalation: boolean;
}

export default function AdminDashboardPage() {
  const [tab, setTab] = useState<Tab>('overview');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const res = await adminService.getStats();
      setStats(res.data);
    } catch {
      toast.error('Failed to load admin stats');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Shield className="w-10 h-10 text-primary-300 animate-pulse-soft" />
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'hospitals', label: 'Hospitals', icon: Building2 },
    { id: 'doctors', label: 'Doctors', icon: Stethoscope },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-display font-bold flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary-500" />
          Admin Dashboard
        </h2>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap flex items-center gap-1.5 ${
              tab === t.id ? 'bg-primary-500 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && <OverviewTab stats={stats} />}
      {tab === 'users' && <UsersTab />}
      {tab === 'hospitals' && <HospitalsTab />}
      {tab === 'doctors' && <DoctorsTab />}
    </div>
  );
}


function OverviewTab({ stats }: { stats: AdminStats | null }) {
  if (!stats) return null;

  const roleLabels: Record<string, string> = {
    pregnant_user: 'Pregnant Users',
    postpartum_user: 'Postpartum Users',
    doctor: 'Doctors',
    hospital_admin: 'Hospital Admins',
    platform_admin: 'Platform Admins',
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard label="Total Users" value={stats.total_users} color="text-primary-500" />
        <StatCard label="Active Users" value={stats.active_users} color="text-green-500" />
        <StatCard label="Patients" value={stats.total_patients} color="text-blue-500" />
        <StatCard label="Doctors" value={stats.total_doctors} color="text-purple-500" />
        <StatCard label="Hospitals" value={stats.total_hospitals} color="text-orange-500" />
      </div>

      <div className="card">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Users by Role</h3>
        <div className="space-y-3">
          {Object.entries(stats.role_counts).map(([role, count]) => (
            <div key={role} className="flex items-center justify-between">
              <span className="text-sm text-gray-600">{roleLabels[role] || role}</span>
              <div className="flex items-center gap-3">
                <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary-400 rounded-full transition-all"
                    style={{ width: `${Math.min(100, (count / Math.max(stats.total_users, 1)) * 100)}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-gray-800 w-8 text-right">{count}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="card text-center">
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  );
}


function UsersTab() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);

  useEffect(() => {
    loadUsers();
  }, [roleFilter]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { limit: 100 };
      if (roleFilter) params.role = roleFilter;
      if (search) params.search = search;
      const res = await adminService.listUsers(params as Parameters<typeof adminService.listUsers>[0]);
      setUsers(res.data.users);
      setTotal(res.data.total);
    } catch {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadUsers();
  };

  const handleUpdateUser = async (userId: number, data: Record<string, unknown>) => {
    try {
      await adminService.updateUser(userId, data);
      toast.success('User updated');
      setEditingUser(null);
      loadUsers();
    } catch {
      toast.error('Failed to update user');
    }
  };

  const handleToggleActive = async (user: AdminUser) => {
    if (user.is_active) {
      try {
        await adminService.deactivateUser(user.id);
        toast.success('User deactivated');
        loadUsers();
      } catch {
        toast.error('Failed to deactivate');
      }
    } else {
      await handleUpdateUser(user.id, { is_active: true });
    }
  };

  const roles = ['', 'pregnant_user', 'postpartum_user', 'doctor', 'hospital_admin', 'platform_admin'];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" className="input-field pl-9" placeholder="Search by name or email..."
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button type="submit" className="btn-primary text-sm px-4">Search</button>
        </form>
        <select className="input-field w-auto" value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
          <option value="">All Roles</option>
          {roles.filter(Boolean).map(r => (
            <option key={r} value={r}>{r.replace('_', ' ')}</option>
          ))}
        </select>
      </div>

      <p className="text-xs text-gray-500">{total} users found</p>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading users...</div>
      ) : (
        <div className="space-y-2">
          {users.map((u, i) => (
            <motion.div key={u.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
              className="card"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-gray-900 text-sm">{u.full_name}</h4>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">{u.email}</p>
                  <div className="flex gap-3 mt-1 text-xs text-gray-500">
                    <span className="px-2 py-0.5 bg-gray-100 rounded-full">{u.role.replace('_', ' ')}</span>
                    {u.city && <span>{u.city}</span>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setEditingUser(u)}
                    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleToggleActive(u)}
                    className={`p-1.5 rounded-lg transition-colors ${
                      u.is_active ? 'hover:bg-red-50 text-red-500' : 'hover:bg-green-50 text-green-500'
                    }`}>
                    {u.is_active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {editingUser && (
          <EditUserModal user={editingUser} onClose={() => setEditingUser(null)} onSave={handleUpdateUser} />
        )}
      </AnimatePresence>
    </div>
  );
}


function EditUserModal({ user, onClose, onSave }: { user: AdminUser; onClose: () => void; onSave: (id: number, data: Record<string, unknown>) => void }) {
  const [form, setForm] = useState({
    full_name: user.full_name,
    role: user.role,
    city: user.city || '',
    state: user.state || '',
  });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
        className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-bold text-gray-900">Edit User</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-600">Full Name</label>
            <input type="text" className="input-field mt-1" value={form.full_name}
              onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Role</label>
            <select className="input-field mt-1" value={form.role}
              onChange={e => setForm(p => ({ ...p, role: e.target.value }))}>
              <option value="pregnant_user">Pregnant User</option>
              <option value="postpartum_user">Postpartum User</option>
              <option value="doctor">Doctor</option>
              <option value="hospital_admin">Hospital Admin</option>
              <option value="platform_admin">Platform Admin</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600">City</label>
              <input type="text" className="input-field mt-1" value={form.city}
                onChange={e => setForm(p => ({ ...p, city: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">State</label>
              <input type="text" className="input-field mt-1" value={form.state}
                onChange={e => setForm(p => ({ ...p, state: e.target.value }))} />
            </div>
          </div>
          <button onClick={() => onSave(user.id, form)}
            className="btn-primary w-full flex items-center justify-center gap-2 mt-4">
            <Save className="w-4 h-4" /> Save Changes
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}


function HospitalsTab() {
  const [hospitals, setHospitals] = useState<AdminHospital[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingHospital, setEditingHospital] = useState<AdminHospital | null>(null);

  useEffect(() => { loadHospitals(); }, []);

  const loadHospitals = async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { limit: 100 };
      if (search) params.search = search;
      const res = await adminService.listHospitals(params as Parameters<typeof adminService.listHospitals>[0]);
      setHospitals(res.data.hospitals);
      setTotal(res.data.total);
    } catch {
      toast.error('Failed to load hospitals');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this hospital?')) return;
    try {
      await adminService.deleteHospital(id);
      toast.success('Hospital deleted');
      loadHospitals();
    } catch {
      toast.error('Failed to delete');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={e => { e.preventDefault(); loadHospitals(); }} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" className="input-field pl-9" placeholder="Search hospitals..."
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button type="submit" className="btn-primary text-sm px-4">Search</button>
        </form>
        <button onClick={() => { setEditingHospital(null); setShowForm(true); }}
          className="btn-primary text-sm flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> Add Hospital
        </button>
      </div>

      <p className="text-xs text-gray-500">{total} hospitals found</p>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading hospitals...</div>
      ) : (
        <div className="space-y-2">
          {hospitals.map((h, i) => (
            <motion.div key={h.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
              className="card"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 text-sm">{h.name}</h4>
                  {h.address && <p className="text-xs text-gray-400">{h.address}</p>}
                  <div className="flex flex-wrap gap-2 mt-1.5">
                    {h.city && <span className="text-xs text-gray-500">{h.city}</span>}
                    {h.has_obgyn && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700">OB-GYN</span>}
                    {h.has_nicu && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">NICU</span>}
                    {h.is_emergency_capable && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-700">Emergency</span>}
                    {h.is_24x7 && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">24x7</span>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setEditingHospital(h); setShowForm(true); }}
                    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"><Edit3 className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(h.id)}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {showForm && (
          <HospitalFormModal
            hospital={editingHospital}
            onClose={() => setShowForm(false)}
            onSaved={() => { setShowForm(false); loadHospitals(); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}


function HospitalFormModal({ hospital, onClose, onSaved }: { hospital: AdminHospital | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: hospital?.name || '',
    address: hospital?.address || '',
    city: hospital?.city || '',
    state: hospital?.state || '',
    pincode: hospital?.pincode || '',
    phone: hospital?.phone || '',
    has_obgyn: hospital?.has_obgyn || false,
    has_nicu: hospital?.has_nicu || false,
    is_emergency_capable: hospital?.is_emergency_capable || false,
    is_24x7: hospital?.is_24x7 || false,
    hospital_type: hospital?.hospital_type || 'general',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    setSaving(true);
    try {
      if (hospital) {
        await adminService.updateHospital(hospital.id, form);
        toast.success('Hospital updated');
      } else {
        await adminService.createHospital(form);
        toast.success('Hospital created');
      }
      onSaved();
    } catch {
      toast.error('Failed to save hospital');
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
        className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-bold text-gray-900">{hospital ? 'Edit Hospital' : 'Add Hospital'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-600">Name *</label>
            <input type="text" className="input-field mt-1" value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Address</label>
            <input type="text" className="input-field mt-1" value={form.address}
              onChange={e => setForm(p => ({ ...p, address: e.target.value }))} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600">City</label>
              <input type="text" className="input-field mt-1" value={form.city}
                onChange={e => setForm(p => ({ ...p, city: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">State</label>
              <input type="text" className="input-field mt-1" value={form.state}
                onChange={e => setForm(p => ({ ...p, state: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Pincode</label>
              <input type="text" className="input-field mt-1" value={form.pincode}
                onChange={e => setForm(p => ({ ...p, pincode: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600">Phone</label>
              <input type="text" className="input-field mt-1" value={form.phone}
                onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Type</label>
              <select className="input-field mt-1" value={form.hospital_type}
                onChange={e => setForm(p => ({ ...p, hospital_type: e.target.value }))}>
                <option value="general">General</option>
                <option value="maternity">Maternity</option>
                <option value="multi-specialty">Multi-Specialty</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input type="checkbox" className="rounded" checked={form.has_obgyn}
                onChange={e => setForm(p => ({ ...p, has_obgyn: e.target.checked }))} />
              Has OB-GYN
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input type="checkbox" className="rounded" checked={form.has_nicu}
                onChange={e => setForm(p => ({ ...p, has_nicu: e.target.checked }))} />
              Has NICU
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input type="checkbox" className="rounded" checked={form.is_emergency_capable}
                onChange={e => setForm(p => ({ ...p, is_emergency_capable: e.target.checked }))} />
              Emergency Capable
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input type="checkbox" className="rounded" checked={form.is_24x7}
                onChange={e => setForm(p => ({ ...p, is_24x7: e.target.checked }))} />
              24x7 Available
            </label>
          </div>
          <button type="submit" disabled={saving} className="btn-primary w-full flex items-center justify-center gap-2 mt-4">
            <Save className="w-4 h-4" /> {saving ? 'Saving...' : hospital ? 'Update Hospital' : 'Create Hospital'}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}


function DoctorsTab() {
  const [doctors, setDoctors] = useState<AdminDoctor[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<AdminDoctor | null>(null);

  useEffect(() => { loadDoctors(); }, []);

  const loadDoctors = async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { limit: 100 };
      if (search) params.search = search;
      const res = await adminService.listDoctors(params as Parameters<typeof adminService.listDoctors>[0]);
      setDoctors(res.data.doctors);
      setTotal(res.data.total);
    } catch {
      toast.error('Failed to load doctors');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this doctor?')) return;
    try {
      await adminService.deleteDoctor(id);
      toast.success('Doctor deleted');
      loadDoctors();
    } catch {
      toast.error('Failed to delete');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={e => { e.preventDefault(); loadDoctors(); }} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" className="input-field pl-9" placeholder="Search doctors..."
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button type="submit" className="btn-primary text-sm px-4">Search</button>
        </form>
        <button onClick={() => { setEditingDoctor(null); setShowForm(true); }}
          className="btn-primary text-sm flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> Add Doctor
        </button>
      </div>

      <p className="text-xs text-gray-500">{total} doctors found</p>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading doctors...</div>
      ) : (
        <div className="space-y-2">
          {doctors.map((d, i) => (
            <motion.div key={d.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
              className="card"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-gray-900 text-sm">{d.name}</h4>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      d.available_for_escalation ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {d.available_for_escalation ? 'Available' : 'Unavailable'}
                    </span>
                  </div>
                  {d.email && <p className="text-xs text-gray-400">{d.email}</p>}
                  <div className="flex flex-wrap gap-2 mt-1 text-xs text-gray-500">
                    {d.specialty && <span className="px-2 py-0.5 bg-purple-50 text-purple-600 rounded-full">{d.specialty}</span>}
                    {d.hospital_name && <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full">{d.hospital_name}</span>}
                    {d.license_number && <span>License: {d.license_number}</span>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setEditingDoctor(d); setShowForm(true); }}
                    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"><Edit3 className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(d.id)}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {showForm && (
          <DoctorFormModal
            doctor={editingDoctor}
            onClose={() => setShowForm(false)}
            onSaved={() => { setShowForm(false); loadDoctors(); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}


function DoctorFormModal({ doctor, onClose, onSaved }: { doctor: AdminDoctor | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: doctor?.name || '',
    email: doctor?.email || '',
    specialty: doctor?.specialty || 'OB-GYN',
    contact: doctor?.contact || '',
    license_number: doctor?.license_number || '',
    available_for_escalation: doctor?.available_for_escalation ?? true,
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    setSaving(true);
    try {
      if (doctor) {
        await adminService.updateDoctor(doctor.id, form);
        toast.success('Doctor updated');
      } else {
        await adminService.createDoctor(form);
        toast.success('Doctor created');
      }
      onSaved();
    } catch {
      toast.error('Failed to save doctor');
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
        className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-bold text-gray-900">{doctor ? 'Edit Doctor' : 'Add Doctor'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-600">Name *</label>
            <input type="text" className="input-field mt-1" value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Email</label>
            <input type="email" className="input-field mt-1" value={form.email}
              onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600">Specialty</label>
              <input type="text" className="input-field mt-1" value={form.specialty}
                onChange={e => setForm(p => ({ ...p, specialty: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Contact</label>
              <input type="text" className="input-field mt-1" value={form.contact}
                onChange={e => setForm(p => ({ ...p, contact: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">License Number</label>
            <input type="text" className="input-field mt-1" value={form.license_number}
              onChange={e => setForm(p => ({ ...p, license_number: e.target.value }))} />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input type="checkbox" className="rounded" checked={form.available_for_escalation}
              onChange={e => setForm(p => ({ ...p, available_for_escalation: e.target.checked }))} />
            Available for Escalation
          </label>
          <button type="submit" disabled={saving} className="btn-primary w-full flex items-center justify-center gap-2 mt-4">
            <Save className="w-4 h-4" /> {saving ? 'Saving...' : doctor ? 'Update Doctor' : 'Create Doctor'}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}
