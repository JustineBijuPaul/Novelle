import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, Clock, Video, Users, Search, Filter, 
  Plus, MoreVertical, ChevronRight, CheckCircle2, 
  AlertCircle, Phone, MapPin, X, Calendar as CalendarIcon,
  UserPlus, Activity
} from 'lucide-react';
import { cn } from '../utils/helpers';
import { hospitalAdminService } from '../services/endpoints';
import { toast } from 'react-hot-toast';

export default function HospitalAdminAppointments() {
  const [activeTab, setActiveTab] = React.useState('Today\'s Appointments');
  const [appointments, setAppointments] = React.useState<any[]>([]);
  const [staff, setStaff] = React.useState<any[]>([]);
  const [patients, setPatients] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [showScheduleModal, setShowScheduleModal] = React.useState(false);
  const [newAppo, setNewAppo] = React.useState({
    patient_id: '',
    doctor_id: '',
    appointment_date: '',
    reason: '',
    appointment_type: 'IN_PERSON'
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [appoRes, staffRes, patientsRes] = await Promise.all([
        hospitalAdminService.listAppointments(),
        hospitalAdminService.listStaff(),
        hospitalAdminService.listPatients()
      ]);
      setAppointments(appoRes.data);
      setStaff(staffRes.data);
      setPatients(patientsRes.data || []);
      if (staffRes.data.length > 0) {
        setNewAppo(prev => ({
          ...prev,
          doctor_id: String(staffRes.data[0].appointment_doctor_id || staffRes.data[0].id),
          patient_id: patientsRes.data?.[0]?.id ? String(patientsRes.data[0].id) : prev.patient_id,
        }));
      }
    } catch (error) {
      console.error("Failed to fetch data", error);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchData();
  }, []);

  const handleSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAppo.patient_id || !newAppo.doctor_id) {
      toast.error('Please select a patient and doctor.');
      return;
    }
    try {
      await hospitalAdminService.scheduleAppointment({
        ...newAppo,
        patient_id: Number(newAppo.patient_id),
        doctor_id: Number(newAppo.doctor_id),
      });
      toast.success('Appointment scheduled successfully.');
      setShowScheduleModal(false);
      setNewAppo({
        patient_id: '',
        doctor_id: '',
        appointment_date: '',
        reason: '',
        appointment_type: 'IN_PERSON'
      });
      fetchData();
    } catch (error) {
      console.error("Failed to schedule", error);
      toast.error("Failed to schedule appointment.");
    }
  };

  const tabs = [
    "Today's Appointments", "Calendar", "Telehealth Sessions", 
    "Pending Requests", "Missed Appointments"
  ];

  const filteredAppointments = React.useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return appointments.filter((appo) => {
      const textMatch = !query || [
        appo.patient_name,
        appo.patient_email,
        appo.doctor_name,
        appo.reason,
      ].filter(Boolean).some((v) => String(v).toLowerCase().includes(query));
      if (!textMatch) return false;

      const status = String(appo.status || '').toLowerCase();
      const type = String(appo.type || appo.appointment_type || '').toUpperCase();
      const dateText = appo.appointment_date || appo.date;
      const when = dateText ? new Date(dateText) : null;
      const isToday = when ? when.toDateString() === new Date().toDateString() : false;

      if (activeTab === "Today's Appointments") return isToday;
      if (activeTab === 'Telehealth Sessions') return type === 'TELEMEDICINE';
      if (activeTab === 'Pending Requests') return status === 'pending';
      if (activeTab === 'Missed Appointments') return status === 'missed' || status === 'cancelled';
      return true;
    });
  }, [appointments, activeTab, searchQuery]);

  const stats = React.useMemo(() => {
    const today = new Date().toDateString();
    const totalToday = appointments.filter((a) => {
      const d = a.appointment_date || a.date;
      return d && new Date(d).toDateString() === today;
    }).length;
    const telemedicine = appointments.filter((a) => String(a.type || a.appointment_type || '').toUpperCase() === 'TELEMEDICINE').length;
    const inPerson = appointments.filter((a) => String(a.type || a.appointment_type || '').toUpperCase() !== 'TELEMEDICINE').length;
    const pending = appointments.filter((a) => String(a.status || '').toLowerCase() === 'pending').length;
    return { totalToday, telemedicine, inPerson, pending };
  }, [appointments]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-gray-900">Appointments Command Center</h1>
          <p className="text-sm text-gray-500">Manage consultations, telemedicine sessions, and emergency scheduling</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            <Activity className="w-4 h-4" /> Load Monitor
          </button>
          <button 
            onClick={() => setShowScheduleModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" /> Emergency Booking
          </button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Today', value: String(stats.totalToday), icon: Calendar, color: 'text-primary-600', bg: 'bg-primary-50' },
          { label: 'Telemedicine', value: String(stats.telemedicine), icon: Video, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'In-Person', value: String(stats.inPerson), icon: Users, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Pending', value: String(stats.pending), icon: Clock, color: 'text-orange-600', bg: 'bg-orange-50' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center gap-4">
            <div className={cn("p-3 rounded-xl", stat.bg)}>
              <stat.icon className={cn("w-5 h-5", stat.color)} />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{stat.label}</p>
              <p className="text-xl font-bold text-gray-900">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="bg-white p-1 rounded-2xl border border-gray-100 flex overflow-x-auto no-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-6 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap",
              activeTab === tab 
                ? "bg-gray-900 text-white shadow-lg" 
                : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Appointments List */}
      <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-gray-50/30">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by patient or doctor..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500/20 transition-all"
            />
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
              <Filter className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Appointment</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Patient Details</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Consultant</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Type & Status</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500 font-medium">Loading appointments...</td>
                </tr>
              ) : filteredAppointments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500 font-medium">No appointments found for this view.</td>
                </tr>
              ) : (
                filteredAppointments.map((appo) => (
                  <tr key={appo.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary-50 flex flex-col items-center justify-center border border-primary-100">
                          <span className="text-[10px] font-bold text-primary-600 leading-none">
                            {new Date(appo.appointment_date || appo.date).toLocaleString('en-US', { month: 'short' }).toUpperCase()}
                          </span>
                          <span className="text-sm font-black text-primary-700 leading-tight">
                            {new Date(appo.appointment_date || appo.date).toLocaleString('en-US', { day: '2-digit' })}
                          </span>
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-sm font-bold text-gray-900">{new Date(appo.appointment_date || appo.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                          <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">{appo.reason}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-0.5">
                        <p className="text-sm font-bold text-gray-900">{appo.patient_name}</p>
                        <p className="text-xs text-gray-500">{appo.patient_email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                          <Users className="w-4 h-4 text-gray-400" />
                        </div>
                        <p className="text-sm font-medium text-gray-700">{appo.doctor_name || 'Unknown Doctor'}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {String(appo.type || appo.appointment_type || '').toUpperCase() === 'TELEMEDICINE' ? (
                          <div className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-[10px] font-bold flex items-center gap-1.5 border border-blue-100">
                            <Video className="w-3 h-3" /> TELEHEALTH
                          </div>
                        ) : (
                          <div className="px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 text-[10px] font-bold flex items-center gap-1.5 border border-purple-100">
                            <MapPin className="w-3 h-3" /> CLINIC
                          </div>
                        )}
                        <div className={cn(
                          "px-2.5 py-1 rounded-lg text-[10px] font-bold border",
                          appo.status === 'scheduled' ? "bg-green-50 text-green-700 border-green-100" : "bg-gray-50 text-gray-700 border-gray-100"
                        )}>
                          {appo.status.toUpperCase()}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-all">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Schedule Modal */}
      <AnimatePresence>
        {showScheduleModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-white/20"
            >
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <h3 className="text-lg font-bold text-gray-900">Schedule Consultation</h3>
                <button onClick={() => setShowScheduleModal(false)} className="p-2 hover:bg-gray-100 rounded-xl">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <form onSubmit={handleSchedule} className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Patient</label>
                  <select
                    value={newAppo.patient_id}
                    onChange={(e) => setNewAppo({ ...newAppo, patient_id: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-primary-500/20"
                    required
                  >
                    <option value="">Select patient</option>
                    {patients.map((p) => (
                      <option key={p.id} value={p.id}>{p.full_name} ({p.email})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Assign Doctor</label>
                    <select 
                      value={newAppo.doctor_id}
                      onChange={e => setNewAppo({...newAppo, doctor_id: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-primary-500/20"
                    >
                      {staff.map(s => (
                        <option key={s.id} value={s.appointment_doctor_id || s.id}>{s.name} ({s.specialty})</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Appointment Type</label>
                    <select 
                      value={newAppo.appointment_type}
                      onChange={e => setNewAppo({...newAppo, appointment_type: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-primary-500/20"
                    >
                      <option value="IN_PERSON">In-Clinic Visit</option>
                      <option value="TELEMEDICINE">Telehealth Session</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Appointment Date</label>
                  <input 
                    type="datetime-local" 
                    required
                    value={newAppo.appointment_date}
                    onChange={e => setNewAppo({...newAppo, appointment_date: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-primary-500/20"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Consultation Reason</label>
                  <textarea 
                    rows={3}
                    value={newAppo.reason}
                    onChange={e => setNewAppo({...newAppo, reason: e.target.value})}
                    placeholder="Brief description of consultation..."
                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-primary-500/20 resize-none"
                  />
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    type="button" 
                    onClick={() => setShowScheduleModal(false)}
                    className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold text-sm hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-[2] py-3 bg-primary-600 text-white rounded-xl font-bold text-sm hover:bg-primary-700 shadow-lg shadow-primary-500/20"
                  >
                    Confirm Booking
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
