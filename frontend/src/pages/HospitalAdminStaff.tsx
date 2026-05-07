import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Stethoscope, Plus, Search, Filter, Mail, Phone,
  Calendar, BarChart3, Users, Building2, MoreVertical,
  CheckCircle2, Clock, Trash2, ShieldAlert, TrendingUp, X, Activity
} from 'lucide-react';
import { cn } from '../utils/helpers';
import { hospitalAdminService } from '../services/endpoints';

const tabs = [
  { id: 'Doctors', label: 'Doctors' },
  { id: 'Nurses', label: 'Nurses' },
  { id: 'Specialists', label: 'Specialists' },
  { id: 'Schedules', label: 'Schedules' },
  { id: 'Departments', label: 'Departments' },
  { id: 'Performance', label: 'Performance' },
];

export default function HospitalAdminStaff() {
  const [activeTab, setActiveTab] = React.useState('Doctors');
  const [staff, setStaff] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [showAddModal, setShowAddModal] = React.useState(false);
  const [showAnalytics, setShowAnalytics] = React.useState(false);
  const [newStaff, setNewStaff] = React.useState({
    name: '',
    email: '',
    specialty: 'OB-GYN',
    license: ''
  });

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const roleMap: any = { 'Doctors': 'OB-GYN', 'Nurses': 'Nurse', 'Specialists': 'Specialist' };
      const res = await hospitalAdminService.listStaff({ role: roleMap[activeTab] });
      setStaff(res.data);
    } catch (error) {
      console.error("Failed to fetch staff", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await hospitalAdminService.addStaff(newStaff);
      alert(`Staff member ${newStaff.name} added successfully!`);
      setShowAddModal(false);
      setNewStaff({ name: '', email: '', specialty: 'OB-GYN', license: '' });
      fetchStaff();
    } catch (error) {
      console.error("Failed to add staff", error);
      alert("Failed to add staff member.");
    }
  };

  const handleRemoveStaff = async (id: number) => {
    if (!confirm("Are you sure you want to remove this staff member?")) return;
    try {
      await hospitalAdminService.removeStaff(id);
      fetchStaff();
    } catch (error) {
      console.error("Failed to remove staff", error);
    }
  };

  React.useEffect(() => {
    if (['Doctors', 'Nurses', 'Specialists'].includes(activeTab)) {
      fetchStaff();
    }
  }, [activeTab]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Medical Staff Management</h1>
          <p className="text-sm text-gray-500">Monitor workload, performance, and schedules for your healthcare team</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowAnalytics(!showAnalytics)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 border rounded-xl text-sm font-medium transition-all",
              showAnalytics 
                ? "bg-primary-50 border-primary-200 text-primary-600" 
                : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
            )}
          >
            <BarChart3 className="w-4 h-4" /> {showAnalytics ? "Close Analytics" : "Performance Analytics"}
          </button>
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" /> Add Staff Member
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-2xl border border-gray-100 p-2 shadow-sm">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap",
                activeTab === tab.id 
                  ? "bg-primary-50 text-primary-600 shadow-sm border border-primary-100/50" 
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {['Doctors', 'Nurses', 'Specialists'].includes(activeTab) ? (
        <div className="space-y-4">
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StaffStatCard label="Active Now" value={staff.filter(s => s.status === 'Active').length} icon={Users} color="green" />
            <StaffStatCard label="Avg Workload" value="8.4 Patients" icon={Building2} color="blue" />
            <StaffStatCard label="Avg Response" value="12 mins" icon={Clock} color="purple" />
          </div>

          {/* Search & Actions */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="text" 
                placeholder={`Search ${activeTab.toLowerCase()}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-primary-500/20"
              />
            </div>
            <div className="flex items-center gap-2">
              <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">
                <Filter className="w-5 h-5" />
              </button>
              <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">
                <MoreVertical className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Staff Table */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100">
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Medical Staff</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Role/Dept</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Workload</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Performance</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  <AnimatePresence mode="popLayout">
                    {loading ? (
                      Array.from({ length: 4 }).map((_, i) => (
                        <tr key={i} className="animate-pulse">
                          <td colSpan={6} className="px-6 py-4">
                            <div className="h-12 bg-gray-100 rounded-xl"></div>
                          </td>
                        </tr>
                      ))
                    ) : staff.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-20 text-center">
                          <div className="flex flex-col items-center gap-2">
                            <Users className="w-12 h-12 text-gray-200" />
                            <p className="text-sm text-gray-500 font-medium">No {activeTab.toLowerCase()} found in registry</p>
                            <button className="mt-2 text-sm text-primary-600 font-bold hover:underline">Add New Staff</button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      staff.map((member) => (
                        <motion.tr 
                          key={member.id}
                          layout
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="hover:bg-gray-50/50 transition-colors group"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center font-bold relative">
                                {member.name[0]}
                                <div className={cn("absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white", member.status === 'Active' ? 'bg-green-500' : 'bg-gray-300')} />
                              </div>
                              <div>
                                <p className="text-sm font-bold text-gray-900">{member.name}</p>
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                  <Mail className="w-3 h-3" /> {member.email}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-xs font-bold text-gray-700">{member.specialty}</p>
                            <p className="text-[10px] text-gray-500">{member.department}</p>
                          </td>
                          <td className="px-6 py-4">
                            <span className={cn(
                              "px-2 py-0.5 rounded-full text-[10px] font-bold border",
                              member.status === 'Active' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-gray-50 text-gray-500 border-gray-100'
                            )}>
                              {member.status}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden max-w-[60px]">
                                <div 
                                  className={cn("h-full rounded-full", member.workload > 10 ? "bg-orange-500" : "bg-primary-500")}
                                  style={{ width: `${(member.workload / 20) * 100}%` }}
                                />
                              </div>
                              <span className="text-xs font-medium text-gray-600">{member.workload} pts</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-green-600">
                              <TrendingUp className="w-3 h-3" />
                              {member.performance}%
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-all">
                                <Calendar className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => handleRemoveStaff(member.id)}
                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                              >
                                <Trash2 className="w-4 h-4" />
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
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 p-20 text-center shadow-sm">
          <div className="flex flex-col items-center gap-3">
            <Building2 className="w-12 h-12 text-primary-100" />
            <h3 className="text-lg font-bold text-gray-900">{activeTab} View</h3>
            <p className="text-sm text-gray-500 max-w-sm mx-auto">
              This module is currently being optimized for high-volume facility management. 
              {activeTab === 'Schedules' ? ' Real-time roster synchronization is pending.' : ' Department-wide analytics will be available shortly.'}
            </p>
            <button className="mt-4 px-6 py-2 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-black transition-all shadow-lg">
              Contact Systems Administrator
            </button>
          </div>
        </div>
      )}

      {/* Add Staff Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <h3 className="text-lg font-bold text-gray-900">Register Staff Member</h3>
                <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-gray-100 rounded-xl">
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <form onSubmit={handleAddStaff} className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Full Name</label>
                  <input 
                    type="text" required
                    value={newStaff.name}
                    onChange={e => setNewStaff({...newStaff, name: e.target.value})}
                    placeholder="Dr. John Smith"
                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-primary-500/20"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Email</label>
                    <input 
                      type="email" required
                      value={newStaff.email}
                      onChange={e => setNewStaff({...newStaff, email: e.target.value})}
                      placeholder="john@hospital.com"
                      className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-primary-500/20"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">License No.</label>
                    <input 
                      type="text" required
                      value={newStaff.license}
                      onChange={e => setNewStaff({...newStaff, license: e.target.value})}
                      placeholder="MD-12345"
                      className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-primary-500/20"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Role / Specialty</label>
                  <select 
                    value={newStaff.specialty}
                    onChange={e => setNewStaff({...newStaff, specialty: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-primary-500/20"
                  >
                    <option value="OB-GYN">OB-GYN</option>
                    <option value="Nurse">Nurse</option>
                    <option value="Specialist">Specialist</option>
                    <option value="Emergency">Emergency Doctor</option>
                  </select>
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    type="button" 
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold text-sm hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-[2] py-3 bg-primary-600 text-white rounded-xl font-bold text-sm hover:bg-primary-700 shadow-lg shadow-primary-500/20"
                  >
                    Save Member
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Analytics Overlay */}
      <AnimatePresence>
        {showAnalytics && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-8 right-8 z-[50] w-full max-w-sm"
          >
            <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
              <div className="p-4 bg-primary-600 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  <span className="font-bold">Team Performance</span>
                </div>
                <button onClick={() => setShowAnalytics(false)}><X className="w-4 h-4" /></button>
              </div>
              <div className="p-6 space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold text-gray-500">
                    <span>Clinical Efficiency</span>
                    <span>94%</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 w-[94%]" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold text-gray-500">
                    <span>Avg Response Time</span>
                    <span>88%</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 w-[88%]" />
                  </div>
                </div>
                <div className="pt-4 border-t border-gray-50 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1 text-green-600 font-bold">
                    <TrendingUp className="w-3 h-3" /> +5.2% this month
                  </div>
                  <button className="text-primary-600 font-bold hover:underline">Full Report</button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StaffStatCard({ label, value, icon: Icon, color }: any) {
  const colors: any = {
    green: 'bg-green-50 text-green-600 border-green-100',
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
  };

  return (
    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
      <div className={cn("p-3 rounded-xl border", colors[color])}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{label}</p>
        <p className="text-xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
}
