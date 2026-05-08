import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, Clock, Video, Users, Search, Filter, 
  Plus, MoreVertical, ChevronRight, CheckCircle2, 
  AlertCircle, Phone, MapPin, X, Calendar as CalendarIcon,
  UserPlus, Activity, ArrowRight, ClipboardCheck, 
  Stethoscope, Info, RefreshCw
} from 'lucide-react';
import { hospitalAdminService, doctorService, patientService } from '../services/endpoints';
import { useAuthStore } from '../stores/authStore';
import { cn } from '../utils/helpers';
import toast from 'react-hot-toast';

export default function AppointmentsPage() {
  const { user } = useAuthStore();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [newAppo, setNewAppo] = useState({
    doctor_id: '',
    appointment_date: '',
    reason: '',
    appointment_type: 'IN_PERSON'
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // In a real app, we'd have a patient-specific endpoint. 
      // Reusing hospitalAdmin for demo or assuming patient-context list.
      const [appoRes, doctorsRes] = await Promise.all([
        patientService.listAppointments(),
        patientService.listDoctors()
      ]);
      setAppointments(appoRes.data);
      setDoctors(doctorsRes.data);
      if (doctorsRes.data.length > 0) {
        setNewAppo(prev => ({ ...prev, doctor_id: doctorsRes.data[0].id.toString() }));
      }
    } catch (error) {
      console.error("Failed to fetch appointments", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      await patientService.createAppointment({
          doctor_id: parseInt(newAppo.doctor_id),
          appointment_date: newAppo.appointment_date,
          reason: newAppo.reason,
          appointment_type: newAppo.appointment_type
        });
      toast.success("Appointment requested successfully!");
      setShowScheduleModal(false);
      fetchData();
    } catch (error) {
      toast.error("Failed to schedule appointment.");
    }
  };

  const upcoming = appointments.filter(a => new Date(a.appointment_date) >= new Date() && a.status !== 'cancelled');
  const past = appointments.filter(a => new Date(a.appointment_date) < new Date() || a.status === 'completed');

  return (
    <div className="max-w-[1400px] mx-auto pb-20 space-y-10 animate-fade-in">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-display font-bold text-gray-900 tracking-tight flex items-center gap-4">
            Clinical Appointments <Calendar className="w-8 h-8 text-primary-500" />
          </h1>
          <p className="text-gray-500 text-lg font-medium mt-2">
            Manage your consultations, follow-ups, and telemedicine sessions.
          </p>
        </div>
        <button 
          onClick={() => setShowScheduleModal(true)}
          className="flex items-center gap-2 px-6 py-4 bg-gray-900 text-white rounded-2xl text-sm font-bold hover:bg-gray-800 transition-all shadow-xl shadow-gray-200"
        >
          <Plus className="w-5 h-5 text-primary-400" /> Book New Consultation
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        
        {/* Main Content (8 cols) */}
        <div className="xl:col-span-8 space-y-8">
          
          {/* Upcoming Visits */}
          <section>
            <div className="flex items-center justify-between mb-6 px-1">
              <h2 className="text-xl font-display font-bold text-gray-900">Upcoming Visits</h2>
              <span className="text-xs font-bold text-primary-600 bg-primary-50 px-3 py-1 rounded-full">{upcoming.length} Scheduled</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {upcoming.length > 0 ? upcoming.map((appo, i) => (
                <AppointmentCard key={i} appo={appo} />
              )) : (
                <div className="col-span-2 card p-10 flex flex-col items-center justify-center text-center opacity-50">
                   <CalendarIcon className="w-12 h-12 mb-4 text-gray-300" />
                   <p className="text-sm font-bold uppercase tracking-widest">No upcoming visits</p>
                   <p className="text-xs text-gray-500 mt-2">Schedule your next checkup to stay on track.</p>
                </div>
              )}
            </div>
          </section>

          {/* Follow-Up Tracker */}
          <section className="card p-8 bg-gray-900 text-white border-none shadow-2xl shadow-gray-200 overflow-hidden relative">
             <div className="relative z-10">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-primary-400">
                    <ClipboardCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-xl">Post-Visit Follow-Ups</h3>
                    <p className="text-xs text-gray-400 font-medium opacity-60">Tasks assigned by your clinical care team</p>
                  </div>
                </div>

                <div className="space-y-4">
                   <FollowUpItem label="Complete Full Blood Count (FBC) Lab Test" dueDate="May 12" completed={false} />
                   <FollowUpItem label="Update Health Log with 24h Blood Pressure data" dueDate="May 09" completed={true} />
                   <FollowUpItem label="Review Trimester 2 Nutrition Guide" dueDate="May 15" completed={false} />
                </div>
             </div>
             <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-primary-500/10 rounded-full blur-3xl" />
          </section>

          {/* Consultation History */}
          <section>
             <h2 className="text-xl font-display font-bold text-gray-900 mb-6 px-1">Consultation History</h2>
             <div className="card overflow-hidden">
                <table className="w-full text-left">
                   <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                         <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Date & Time</th>
                         <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Consultant</th>
                         <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Reason</th>
                         <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Summary</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-50">
                      {past.length > 0 ? past.map((appo, i) => (
                        <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                           <td className="px-6 py-4">
                              <p className="text-xs font-bold text-gray-900">{new Date(appo.appointment_date).toLocaleDateString()}</p>
                              <p className="text-[10px] text-gray-400 font-medium">{new Date(appo.appointment_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                           </td>
                           <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                 <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
                                    <Users className="w-3 h-3 text-gray-400" />
                                 </div>
                                 <span className="text-xs font-medium text-gray-700">{appo.doctor_name || 'Dr. Sarah Wilson'}</span>
                              </div>
                           </td>
                           <td className="px-6 py-4 text-xs text-gray-500">{appo.reason}</td>
                           <td className="px-6 py-4 text-right">
                              <button className="text-[10px] font-bold text-primary-600 hover:underline">View Clinical Note</button>
                           </td>
                        </tr>
                      )) : (
                        <tr>
                           <td colSpan={4} className="px-6 py-12 text-center opacity-30 italic text-xs">No past consultations found.</td>
                        </tr>
                      )}
                   </tbody>
                </table>
             </div>
          </section>
        </div>

        {/* Sidebar (4 cols) */}
        <div className="xl:col-span-4 space-y-8">
           
           {/* Appointment Readiness */}
           <div className="card p-6 border-l-4 border-l-amber-400">
              <h3 className="font-display font-bold text-gray-900 mb-4 flex items-center gap-2">
                 <Info className="w-5 h-5 text-amber-500" />
                 Ready for your visit?
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed mb-6">
                 To ensure a productive consultation, please review these readiness steps:
              </p>
              <div className="space-y-4">
                 <div className="flex gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                    <p className="text-[11px] font-medium text-gray-700">Update your health log with recent vitals.</p>
                 </div>
                 <div className="flex gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                    <p className="text-[11px] font-medium text-gray-700">Prepare 2-3 specific questions for the doctor.</p>
                 </div>
                 <div className="flex gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                    <p className="text-[11px] font-medium text-gray-700">Have your recent lab reports accessible.</p>
                 </div>
              </div>
           </div>

           {/* Telehealth Quick Connect */}
           <div className="card p-6 bg-primary-50 border-primary-100">
              <div className="flex items-center justify-between mb-6">
                <div className="w-10 h-10 rounded-xl bg-primary-500 flex items-center justify-center text-white">
                   <Video className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-primary-600">Telehealth Hub</span>
              </div>
              <h3 className="text-lg font-display font-bold text-gray-900 mb-2">Instant Virtual Care</h3>
              <p className="text-xs text-gray-500 leading-relaxed mb-6">
                 Need a quick consultation? Join the virtual waiting room for the next available provider.
              </p>
              <button className="w-full py-3 bg-primary-600 text-white rounded-xl text-xs font-bold hover:bg-primary-700 transition-all flex items-center justify-center gap-2">
                 Join Waiting Room <ArrowRight className="w-4 h-4" />
              </button>
           </div>

           {/* Stats Summary */}
           <div className="grid grid-cols-2 gap-4">
              <div className="card p-4 text-center">
                 <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Visits</p>
                 <p className="text-2xl font-display font-bold text-gray-900">{appointments.length}</p>
              </div>
              <div className="card p-4 text-center">
                 <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Canceled</p>
                 <p className="text-2xl font-display font-bold text-gray-400">0</p>
              </div>
           </div>

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
              className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden border border-white/20"
            >
              <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <div>
                   <h3 className="text-xl font-display font-bold text-gray-900 tracking-tight">Schedule Consultation</h3>
                   <p className="text-xs text-gray-400 font-medium mt-0.5">Select a provider and preferred time</p>
                </div>
                <button onClick={() => setShowScheduleModal(false)} className="p-2 hover:bg-gray-100 rounded-2xl transition-all">
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>

              <form onSubmit={handleSchedule} className="p-8 space-y-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Select Doctor</label>
                  <select 
                    value={newAppo.doctor_id}
                    onChange={e => setNewAppo({...newAppo, doctor_id: e.target.value})}
                    className="w-full px-4 py-4 bg-gray-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-primary-500/20 outline-none"
                  >
                    {doctors.map(d => (
                      <option key={d.id} value={d.id}>{d.name} ({d.specialty || 'OB-GYN'})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Visit Type</label>
                    <select 
                      value={newAppo.appointment_type}
                      onChange={e => setNewAppo({...newAppo, appointment_type: e.target.value})}
                      className="w-full px-4 py-4 bg-gray-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-primary-500/20 outline-none"
                    >
                      <option value="IN_PERSON">In-Clinic Visit</option>
                      <option value="TELEMEDICINE">Telehealth Session</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Date & Time</label>
                    <input 
                      type="datetime-local" 
                      required
                      value={newAppo.appointment_date}
                      onChange={e => setNewAppo({...newAppo, appointment_date: e.target.value})}
                      className="w-full px-4 py-4 bg-gray-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-primary-500/20 outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Reason for Visit</label>
                  <textarea 
                    rows={3}
                    value={newAppo.reason}
                    onChange={e => setNewAppo({...newAppo, reason: e.target.value})}
                    placeholder="Briefly describe your health concerns..."
                    className="w-full px-4 py-4 bg-gray-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-primary-500/20 outline-none resize-none"
                  />
                </div>

                <div className="pt-4 flex gap-4">
                  <button 
                    type="button" 
                    onClick={() => setShowScheduleModal(false)}
                    className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-gray-200 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-[2] py-4 bg-primary-600 text-white rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-primary-700 transition-all shadow-xl shadow-primary-500/20"
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

// Sub-components
function AppointmentCard({ appo }: { appo: any }) {
  const date = new Date(appo.appointment_date);
  const isTelehealth = appo.appointment_type === 'TELEMEDICINE';

  return (
    <div className="card p-6 flex flex-col group hover:shadow-xl transition-all border-l-4 border-l-primary-500">
       <div className="flex justify-between items-start mb-6">
          <div className="space-y-1">
             <p className="text-[10px] font-black text-primary-600 uppercase tracking-[0.2em]">Next Visit</p>
             <h4 className="text-lg font-display font-bold text-gray-900">{date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</h4>
             <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400">
                <Clock className="w-3 h-3" /> {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
             </div>
          </div>
          <div className={cn(
             "px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border",
             isTelehealth ? "bg-blue-50 text-blue-700 border-blue-100" : "bg-purple-50 text-purple-700 border-purple-100"
          )}>
             {isTelehealth ? "Telehealth" : "In-Clinic"}
          </div>
       </div>

       <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100 mb-6">
          <div className="w-8 h-8 rounded-full bg-white border border-gray-100 flex items-center justify-center">
             <Stethoscope className="w-4 h-4 text-primary-500" />
          </div>
          <div>
             <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Consultant</p>
             <p className="text-xs font-bold text-gray-900">{appo.doctor_name || 'Dr. Sarah Wilson'}</p>
          </div>
       </div>

       <div className="mt-auto pt-4 flex gap-3">
          {isTelehealth ? (
             <button className="flex-1 py-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center justify-center gap-2">
                <Video className="w-3.5 h-3.5" /> Join Session
             </button>
          ) : (
             <button className="flex-1 py-3 bg-gray-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-800 transition-all flex items-center justify-center gap-2">
                <MapPin className="w-3.5 h-3.5" /> Directions
             </button>
          )}
          <button className="px-3 py-3 bg-white border border-gray-100 rounded-xl hover:bg-gray-50 transition-all">
             <MoreVertical className="w-4 h-4 text-gray-400" />
          </button>
       </div>
    </div>
  );
}

function FollowUpItem({ label, dueDate, completed }: { label: string; dueDate: string; completed: boolean }) {
  return (
    <div className={cn(
      "p-4 rounded-2xl border transition-all flex items-center justify-between",
      completed ? "bg-white/5 border-white/10 opacity-60" : "bg-white/10 border-white/20 hover:bg-white/15"
    )}>
      <div className="flex items-center gap-4">
         <div className={cn(
           "w-6 h-6 rounded-lg flex items-center justify-center",
           completed ? "bg-green-500 text-white" : "bg-white/10 text-white/40"
         )}>
            <CheckCircle2 className="w-4 h-4" />
         </div>
         <div>
            <p className={cn("text-xs font-bold", completed ? "line-through text-white/40" : "text-white")}>{label}</p>
            <p className="text-[9px] font-medium text-white/40 uppercase tracking-widest mt-0.5">Due: {dueDate}</p>
         </div>
      </div>
      {!completed && <ChevronRight className="w-4 h-4 text-white/20" />}
    </div>
  );
}
