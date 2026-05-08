import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Search, Filter, Download, MoreHorizontal, 
  ShieldAlert, UserPlus, History, ChevronRight,
  FilterX, CheckCircle2, AlertCircle, Clock, X
} from 'lucide-react';
import { cn } from '../utils/helpers';
import { hospitalAdminService } from '../services/endpoints';
import { toast } from 'react-hot-toast';

const tabs = [
  { id: 'all', label: 'All Patients' },
  { id: 'high-risk', label: 'High Risk' },
  { id: 'admissions', label: 'Admissions' },
  { id: 'discharged', label: 'Discharged' },
  { id: 'tracking', label: 'Pregnancy Tracking' },
];

export default function HospitalAdminPatients() {
  const [activeTab, setActiveTab] = React.useState('all');
  const [patients, setPatients] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [filters, setFilters] = React.useState({ risk: '', trimester: '' });
  const [showAddModal, setShowAddModal] = React.useState(false);
  const [newPatient, setNewPatient] = React.useState({
    full_name: '',
    email: '',
    phone: '',
    trimester: 'first'
  });

  const fetchPatients = async () => {
    setLoading(true);
    try {
      const res = await hospitalAdminService.listPatients({ 
        search: searchQuery,
        risk: activeTab === 'high-risk' ? 'HIGH' : filters.risk,
        trimester: filters.trimester
      });
      setPatients(res.data);
    } catch (error) {
      console.error("Failed to fetch patients", error);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchPatients();
  }, [activeTab, filters]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPatients();
  };

  const handleExport = () => {
    const headers = ['ID', 'Name', 'Email', 'Trimester', 'Risk Level', 'Last Active'];
    const rows = patients.map(p => [
      p.id, p.full_name, p.email, p.trimester, p.risk_level, p.last_active
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers, ...rows].map(e => e.join(",")).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `patients_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAddPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await hospitalAdminService.addPatient(newPatient);
      toast.success(`Patient ${newPatient.full_name} registered successfully.`);
      setShowAddModal(false);
      setNewPatient({ full_name: '', email: '', phone: '', trimester: 'first' });
      fetchPatients();
    } catch (error) {
      console.error("Failed to add patient", error);
      toast.error("Failed to register patient. Please try again.");
    }
  };

  const handleAssignDoctor = async (patientId: number, doctorId?: number) => {
    try {
      const doctorPool = await hospitalAdminService.listStaff();
      const selectedDoctor = doctorId || doctorPool.data?.[0]?.appointment_doctor_id || doctorPool.data?.[0]?.id;
      if (!selectedDoctor) {
        toast.error('No doctors available for assignment.');
        return;
      }
      await hospitalAdminService.assignDoctor(patientId, Number(selectedDoctor));
      toast.success('Doctor assigned successfully.');
      fetchPatients();
    } catch (error) {
      console.error('Failed to assign doctor', error);
      toast.error('Failed to assign doctor.');
    }
  };

  const visiblePatients = React.useMemo(() => {
    if (activeTab === 'high-risk') return patients.filter((p) => String(p.risk_level).toUpperCase() === 'HIGH');
    if (activeTab === 'admissions') return patients.filter((p) => !!p.last_active && (Date.now() - new Date(p.last_active).getTime()) < 7 * 24 * 60 * 60 * 1000);
    if (activeTab === 'discharged') return patients.filter((p) => String(p.trimester).toLowerCase().includes('postpartum'));
    if (activeTab === 'tracking') return patients.filter((p) => !String(p.trimester).toLowerCase().includes('postpartum'));
    return patients;
  }, [patients, activeTab]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Patient Management</h1>
          <p className="text-sm text-gray-500">Monitor and manage all maternal cases in the facility</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Download className="w-4 h-4" /> Export records
          </button>
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 transition-colors shadow-sm"
          >
            <UserPlus className="w-4 h-4" /> Add Patient
          </button>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="bg-white rounded-2xl border border-gray-100 p-2 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-1 overflow-x-auto pb-2 lg:pb-0 scrollbar-hide">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap",
                  activeTab === tab.id 
                    ? "bg-primary-50 text-primary-600" 
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSearch} className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
            <input 
              type="text" 
              placeholder="Search by name, email or ID..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-primary-500/20 w-full lg:w-72 transition-all"
            />
          </form>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-100 rounded-lg text-xs text-gray-600">
          <Filter className="w-3.5 h-3.5" /> Filters:
        </div>
        
        <select 
          value={filters.trimester}
          onChange={(e) => setFilters(f => ({ ...f, trimester: e.target.value }))}
          className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:ring-primary-500/20 outline-none"
        >
          <option value="">All Trimesters</option>
          <option value="first">First Trimester</option>
          <option value="second">Second Trimester</option>
          <option value="third">Third Trimester</option>
          <option value="postpartum">Postpartum</option>
        </select>

        <select 
          value={filters.risk}
          onChange={(e) => setFilters(f => ({ ...f, risk: e.target.value }))}
          className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:ring-primary-500/20 outline-none"
        >
          <option value="">All Risk Levels</option>
          <option value="LOW">Low Risk</option>
          <option value="MEDIUM">Medium Risk</option>
          <option value="HIGH">High Risk</option>
        </select>

        {(filters.risk || filters.trimester || searchQuery) && (
          <button 
            onClick={() => {
              setFilters({ risk: '', trimester: '' });
              setSearchQuery('');
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <FilterX className="w-3.5 h-3.5" /> Clear All
          </button>
        )}
      </div>

      {/* Patients Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Patient</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Stage</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Risk Level</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Assigned Doctor</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Last Active</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              <AnimatePresence mode="popLayout">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={6} className="px-6 py-4">
                        <div className="h-10 bg-gray-100 rounded-lg w-full"></div>
                      </td>
                    </tr>
                  ))
                ) : visiblePatients.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center gap-2">
                        <Users className="w-8 h-8 text-gray-300" />
                        <p>No patients found matching your criteria</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  visiblePatients.map((patient) => (
                    <motion.tr 
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      key={patient.id} 
                      className="hover:bg-gray-50/50 transition-colors group"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center font-bold text-sm">
                            {patient.full_name.split(' ').map((n: string) => n[0]).join('')}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-900">{patient.full_name}</p>
                            <p className="text-xs text-gray-500">{patient.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-medium text-gray-600 capitalize">
                          {patient.trimester} Trimester
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <RiskBadge level={patient.risk_level} />
                      </td>
                      <td className="px-6 py-4">
                        {patient.doctor_id ? (
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                            <span className="text-xs text-gray-600">Assigned</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleAssignDoctor(patient.id)}
                            className="text-xs text-primary-600 font-medium hover:underline flex items-center gap-1"
                          >
                            <UserPlus className="w-3 h-3" /> Assign Doctor
                          </button>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <Clock className="w-3 h-3" />
                          {patient.last_active ? new Date(patient.last_active).toLocaleDateString() : 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all title='View History'">
                            <History className="w-4 h-4" />
                          </button>
                          <button className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all">
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
        
        {/* Pagination placeholder */}
        <div className="px-6 py-4 border-t border-gray-50 flex items-center justify-between bg-gray-50/30">
          <p className="text-xs text-gray-500">Showing {visiblePatients.length} of {patients.length} patients</p>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-400 cursor-not-allowed">Previous</button>
            <button className="px-3 py-1 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50">Next</button>
          </div>
        </div>
      </div>

      {/* Add Patient Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-white/20"
            >
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <h3 className="text-lg font-bold text-gray-900">Register New Patient</h3>
                <button 
                  onClick={() => setShowAddModal(false)}
                  className="p-2 hover:bg-gray-200 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              
              <form onSubmit={handleAddPatient} className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Full Name</label>
                  <input 
                    type="text" 
                    required
                    value={newPatient.full_name}
                    onChange={e => setNewPatient({...newPatient, full_name: e.target.value})}
                    placeholder="e.g. Jane Doe"
                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-primary-500/20"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Email Address</label>
                    <input 
                      type="email" 
                      required
                      value={newPatient.email}
                      onChange={e => setNewPatient({...newPatient, email: e.target.value})}
                      placeholder="jane@example.com"
                      className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-primary-500/20"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Phone Number</label>
                    <input 
                      type="tel" 
                      value={newPatient.phone}
                      onChange={e => setNewPatient({...newPatient, phone: e.target.value})}
                      placeholder="+91 98765 43210"
                      className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-primary-500/20"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Current Trimester</label>
                  <div className="grid grid-cols-4 gap-2">
                    {['first', 'second', 'third', 'postpartum'].map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setNewPatient({...newPatient, trimester: t})}
                        className={cn(
                          "py-2 rounded-xl text-xs font-bold transition-all border capitalize",
                          newPatient.trimester === t 
                            ? "bg-primary-50 border-primary-200 text-primary-600 shadow-sm" 
                            : "bg-gray-50 border-transparent text-gray-500 hover:bg-gray-100"
                        )}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-4 flex items-center gap-3">
                  <button 
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 px-4 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold text-sm hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-[2] px-4 py-3 bg-primary-600 text-white rounded-xl font-bold text-sm hover:bg-primary-700 transition-colors shadow-lg shadow-primary-500/20"
                  >
                    Confirm Registration
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function RiskBadge({ level }: { level: string }) {
  const styles: any = {
    HIGH: 'bg-red-50 text-red-700 border-red-100',
    MEDIUM: 'bg-orange-50 text-orange-700 border-orange-100',
    LOW: 'bg-green-50 text-green-700 border-green-100',
  };

  const icons: any = {
    HIGH: AlertCircle,
    MEDIUM: Clock,
    LOW: CheckCircle2,
  };

  const Icon = icons[level] || icons.LOW;

  return (
    <div className={cn(
      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border",
      styles[level] || styles.LOW
    )}>
      <Icon className="w-3 h-3" />
      {level}
    </div>
  );
}
