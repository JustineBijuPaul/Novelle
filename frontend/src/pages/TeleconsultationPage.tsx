import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Video, Clock, History, Search, Filter, 
  Plus, MoreVertical, ChevronRight, CheckCircle2, 
  AlertCircle, Phone, MapPin, X, Calendar,
  UserPlus, Activity, ArrowRight, ClipboardCheck, 
  Stethoscope, Info, RefreshCw, MessageSquare,
  ShieldCheck, Mic, VideoOff, Settings, Zap,
  Play, ExternalLink, Users
} from 'lucide-react';
import { hospitalAdminService, telemedicineService, patientService } from '../services/endpoints';
import { useAuthStore } from '../stores/authStore';
import { cn } from '../utils/helpers';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function TeleconsultationPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSession, setActiveSession] = useState<any>(null);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const res = await patientService.listAppointments();
      const teleSessions = res.data.filter((a: any) => a.appointment_type === 'TELEMEDICINE');
      setSessions(teleSessions);
      
      // Look for a session starting within 15 mins
      const now = new Date();
      const soon = teleSessions.find((s: any) => {
        const start = new Date(s.appointment_date);
        const diff = (start.getTime() - now.getTime()) / (1000 * 60);
        return diff > -60 && diff < 15; // Active if started < 1hr ago or starts in < 15 mins
      });
      setActiveSession(soon);
    } catch (error) {
      console.error("Failed to fetch sessions");
    } finally {
      setLoading(false);
    }
  };

  const handleJoinSession = (sessionId: string) => {
    navigate(`/telemedicine/${sessionId}`);
  };

  const upcoming = sessions.filter(s => new Date(s.appointment_date) >= new Date());
  const past = sessions.filter(s => new Date(s.appointment_date) < new Date());

  return (
    <div className="max-w-[1400px] mx-auto pb-20 space-y-10 animate-fade-in">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-display font-bold text-gray-900 tracking-tight flex items-center gap-4">
            Remote Consultation Hub <Video className="w-8 h-8 text-primary-500" />
          </h1>
          <p className="text-gray-500 text-lg font-medium mt-2">
            Connect with clinical specialists instantly via secure, HIPAA-compliant telehealth.
          </p>
        </div>
        <div className="flex items-center gap-3 px-4 py-2 bg-blue-50 text-blue-700 rounded-2xl border border-blue-100">
           <ShieldCheck className="w-5 h-5" />
           <span className="text-[10px] font-black uppercase tracking-widest">End-to-End Encrypted</span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        
        {/* Main Content (8 cols) */}
        <div className="xl:col-span-8 space-y-8">
          
          {/* Active Call / Waiting Room */}
          <AnimatePresence>
            {activeSession ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-gray-900 rounded-[2.5rem] p-10 text-white flex flex-col md:flex-row items-center gap-12 shadow-2xl shadow-gray-200 relative overflow-hidden"
              >
                <div className="relative z-10 w-32 h-32 rounded-full bg-primary-500/20 flex items-center justify-center shrink-0 border-4 border-primary-500/30 animate-pulse">
                   <Video className="w-14 h-14 text-primary-400" />
                </div>
                <div className="relative z-10 flex-1 text-center md:text-left space-y-4">
                   <div>
                      <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-[10px] font-black uppercase tracking-widest border border-red-500/30">Live Now</span>
                      <h2 className="text-3xl font-display font-bold mt-3">Ready to Join Call</h2>
                      <p className="text-gray-400 text-sm font-medium mt-1">Consultation with {activeSession.doctor_name || 'Dr. Sarah Wilson'} is ready.</p>
                   </div>
                   <div className="flex flex-wrap justify-center md:justify-start gap-4">
                      <button 
                        onClick={() => handleJoinSession(activeSession.id)}
                        className="px-8 py-4 bg-primary-600 text-white rounded-2xl font-bold text-sm hover:bg-primary-700 transition-all shadow-xl shadow-primary-500/20 flex items-center gap-2"
                      >
                         <Play className="w-5 h-5 fill-current" /> Join Clinical Stream
                      </button>
                      <button className="px-8 py-4 bg-white/10 text-white border border-white/10 rounded-2xl font-bold text-sm hover:bg-white/20 transition-all flex items-center gap-2">
                         <Settings className="w-5 h-5" /> Test Audio/Video
                      </button>
                   </div>
                </div>
                <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-primary-500/10 rounded-full blur-[100px]" />
              </motion.div>
            ) : (
              <div className="card p-10 bg-blue-50/50 border-blue-100 flex flex-col items-center justify-center text-center">
                 <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center shadow-sm mb-4">
                    <Clock className="w-8 h-8 text-blue-500" />
                 </div>
                 <h2 className="text-xl font-display font-bold text-gray-900">Virtual Waiting Room</h2>
                 <p className="text-sm text-gray-500 max-w-sm mt-2">
                    No active sessions currently. Your doctor will notify you when they are ready for your scheduled telehealth visit.
                 </p>
                 <button className="mt-6 text-xs font-bold text-blue-600 hover:underline flex items-center gap-2">
                    Refresh Waiting Room Status <RefreshCw className="w-4 h-4" />
                 </button>
              </div>
            )}
          </AnimatePresence>

          {/* Upcoming Sessions List */}
          <section>
            <div className="flex items-center justify-between mb-6 px-1">
              <h2 className="text-xl font-display font-bold text-gray-900">Upcoming Virtual Sessions</h2>
              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">{upcoming.length} Sessions</span>
            </div>
            
            <div className="space-y-4">
              {upcoming.length > 0 ? upcoming.map((appo, i) => (
                <div key={i} className="card p-6 flex flex-col md:flex-row items-center justify-between gap-6 hover:shadow-xl transition-all border-l-4 border-l-blue-500">
                   <div className="flex items-center gap-6">
                      <div className="w-14 h-14 rounded-2xl bg-gray-50 flex flex-col items-center justify-center border border-gray-100">
                        <span className="text-[10px] font-bold text-gray-400 leading-none">MAY</span>
                        <span className="text-lg font-black text-gray-700 leading-tight">{new Date(appo.appointment_date).getDate()}</span>
                      </div>
                      <div>
                         <p className="text-xs font-bold text-gray-900">{new Date(appo.appointment_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                         <h4 className="text-sm font-display font-bold text-gray-500 uppercase tracking-wider">{appo.reason}</h4>
                         <div className="flex items-center gap-2 text-[10px] font-medium text-gray-400 mt-1">
                            <Users className="w-3 h-3" /> {appo.doctor_name || 'Dr. Sarah Wilson'}
                         </div>
                      </div>
                   </div>
                   <div className="flex items-center gap-3">
                      <button className="p-3 bg-gray-50 text-gray-400 rounded-xl hover:bg-gray-100 transition-all">
                         <Calendar className="w-4 h-4" />
                      </button>
                      <button className="px-6 py-3 bg-gray-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-800 transition-all">
                         View Pre-Visit Guide
                      </button>
                   </div>
                </div>
              )) : (
                <div className="card p-12 text-center opacity-40">
                   <Video className="w-10 h-10 mx-auto mb-4" />
                   <p className="text-xs font-bold uppercase tracking-widest">No virtual sessions scheduled</p>
                </div>
              )}
            </div>
          </section>

          {/* Past Summaries & Notes */}
          <section>
             <h2 className="text-xl font-display font-bold text-gray-900 mb-6 px-1">Consultation Summaries</h2>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {past.slice(0, 4).map((appo, i) => (
                  <div key={i} className="card p-6 group hover:border-primary-200 transition-all">
                     <div className="flex justify-between items-start mb-4">
                        <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:text-primary-500 transition-colors">
                           <ClipboardCheck className="w-5 h-5" />
                        </div>
                        <span className="text-[9px] font-bold text-gray-400">{new Date(appo.appointment_date).toLocaleDateString()}</span>
                     </div>
                     <h4 className="text-sm font-bold text-gray-900 mb-2">{appo.reason}</h4>
                     <p className="text-[11px] text-gray-500 leading-relaxed mb-4 line-clamp-2">
                        Clinical summary from {appo.doctor_name || 'Dr. Sarah Wilson'} regarding recent vitals and trimester progress...
                     </p>
                     <button className="text-[10px] font-bold text-primary-600 hover:underline flex items-center gap-1">
                        Read Full Summary <ExternalLink className="w-3 h-3" />
                     </button>
                  </div>
                ))}
             </div>
          </section>
        </div>

        {/* Sidebar: Diagnostics & Tools (4 cols) */}
        <div className="xl:col-span-4 space-y-8">
           
           {/* Telehealth Diagnostic Tool */}
           <div className="card p-8 bg-gradient-to-br from-gray-900 to-primary-950 text-white border-none shadow-2xl shadow-gray-200 overflow-hidden relative">
              <div className="relative z-10">
                 <h3 className="text-lg font-display font-bold mb-4">Diagnostic Pre-Check</h3>
                 <p className="text-xs text-gray-400 leading-relaxed mb-8">
                    Run a quick system scan to ensure your audio, video, and connection are optimal for the session.
                 </p>
                 <div className="space-y-6 mb-8">
                    <DiagnosticStat icon={Mic} label="Microphone" status="Optimal" />
                    <DiagnosticStat icon={Video} label="Camera" status="Active" />
                    <DiagnosticStat icon={Activity} label="Connection" status="142ms Latency" />
                 </div>
                 <button className="w-full py-4 bg-primary-600 text-white rounded-2xl text-xs font-bold hover:bg-primary-700 transition-all shadow-xl shadow-primary-500/20">
                    Run Full System Diagnostic
                 </button>
              </div>
              <div className="absolute -top-10 -left-10 w-40 h-40 bg-primary-500/10 rounded-full blur-3xl" />
           </div>

           {/* AI Transcription Feature */}
           <div className="card p-6 border-l-4 border-l-amber-400 bg-amber-50/30">
              <div className="flex items-center gap-3 mb-4">
                 <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600">
                    <Zap className="w-5 h-5" />
                 </div>
                 <h3 className="font-display font-bold text-gray-900">AI Transcription</h3>
              </div>
              <p className="text-[11px] text-gray-500 leading-relaxed">
                 All virtual sessions are automatically transcribed and summarized by Novelle AI. 
                 You will receive a clinical summary within 15 minutes of session completion.
              </p>
           </div>

           {/* Emergency Quick Dial */}
           <div className="card p-6 bg-red-50 border-red-100">
              <h3 className="text-xs font-bold text-red-600 uppercase tracking-widest mb-4">Emergency Support</h3>
              <p className="text-[11px] text-gray-600 mb-6">
                 If you are experiencing acute symptoms, do not wait for a scheduled session.
              </p>
              <button className="w-full py-3 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-500/20">
                 <Phone className="w-4 h-4" /> Immediate Call
              </button>
           </div>

        </div>
      </div>
    </div>
  );
}

// Sub-components
function DiagnosticStat({ icon: Icon, label, status }: { icon: any; label: string; status: string }) {
  return (
    <div className="flex items-center justify-between">
       <div className="flex items-center gap-3">
          <Icon className="w-4 h-4 text-primary-400" />
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label}</span>
       </div>
       <span className="text-[10px] font-bold text-white">{status}</span>
    </div>
  );
}
