import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldAlert, AlertTriangle, CheckCircle2, Clock, 
  Users, Search, Filter, MoreVertical, ChevronRight,
  TrendingUp, History, Activity, Zap, X, Bell
} from 'lucide-react';
import { cn } from '../utils/helpers';
import { hospitalAdminService } from '../services/endpoints';

export default function HospitalAdminEscalations() {
  const [activeTab, setActiveTab] = React.useState('Pending');
  const [escalations, setEscalations] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [showAssignModal, setShowAssignModal] = React.useState(false);
  const [selectedEsc, setSelectedEsc] = React.useState<any>(null);

  const fetchEscalations = async () => {
    setLoading(true);
    try {
      const res = await hospitalAdminService.listEscalations({ 
        status: activeTab.toLowerCase() === 'pending' ? 'pending' : 
                activeTab.toLowerCase() === 'resolved' ? 'resolved' : ''
      });
      setEscalations(res.data);
    } catch (error) {
      console.error("Failed to fetch escalations", error);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchEscalations();
  }, [activeTab]);

  const handleResolve = async (id: number) => {
    try {
      await hospitalAdminService.updateEscalation(id, { status: 'resolved' });
      fetchEscalations();
    } catch (error) {
      console.error("Failed to resolve", error);
    }
  };

  const tabs = ["Pending", "Urgent", "Resolved", "Emergency Cases", "Escalation Analytics"];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">Risk Escalation Center</h1>
            <div className="px-2 py-0.5 bg-red-100 text-red-600 text-[10px] font-black rounded-full animate-pulse uppercase tracking-wider">Live</div>
          </div>
          <p className="text-sm text-gray-500">Monitor AI-triggered clinical alerts and manage emergency response protocols</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            <Zap className="w-4 h-4" /> Trigger Protocol
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 transition-colors shadow-sm">
            <Bell className="w-4 h-4" /> Broadcast Alert
          </button>
        </div>
      </div>

      {/* SLA Monitor */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Avg. Response Time', value: '4.2m', sub: 'Target: < 5m', icon: Clock, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Resolution Rate', value: '98.4%', sub: '+2.1% from last week', icon: CheckCircle2, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Active Critical', value: '03', sub: 'Immediate Action Required', icon: ShieldAlert, color: 'text-red-600', bg: 'bg-red-50' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-5 rounded-2xl border border-gray-100 flex items-center gap-5">
            <div className={cn("p-4 rounded-2xl", stat.bg)}>
              <stat.icon className={cn("w-6 h-6", stat.color)} />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{stat.label}</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-black text-gray-900">{stat.value}</p>
                <p className="text-[10px] font-bold text-gray-500 uppercase">{stat.sub}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="bg-white p-1.5 rounded-2xl border border-gray-100 flex overflow-x-auto no-scrollbar gap-1">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-6 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap",
              activeTab === tab 
                ? "bg-red-600 text-white shadow-lg shadow-red-500/20" 
                : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Escalations List */}
      <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-50/30">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search by patient or risk type..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500/10 transition-all"
            />
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50">
              <Filter className="w-4 h-4" /> Filter
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50">
              <TrendingUp className="w-4 h-4" /> Analytics
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Alert Info</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Patient Details</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Risk Category</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">SLA Status</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500 font-bold">Retrieving alerts...</td>
                </tr>
              ) : escalations.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500 font-medium">All systems normal. No active escalations found.</td>
                </tr>
              ) : (
                escalations.map((esc) => (
                  <tr key={esc.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-12 h-12 rounded-2xl flex items-center justify-center border",
                          esc.risk_level === 'HIGH' ? "bg-red-50 border-red-100 text-red-600" : "bg-orange-50 border-orange-100 text-orange-600"
                        )}>
                          <ShieldAlert className="w-6 h-6" />
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-sm font-black text-gray-900">#{esc.id} - {esc.risk_level} Risk</p>
                          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                            {new Date(esc.triggered_at).toLocaleTimeString()} · {new Date(esc.triggered_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-0.5">
                        <p className="text-sm font-bold text-gray-900">{esc.patient_name}</p>
                        <p className="text-[10px] font-bold text-gray-400 uppercase">Patient Profile Linked</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border",
                          esc.risk_type === 'PHYSICAL' ? "bg-blue-50 border-blue-100 text-blue-600" : 
                          esc.risk_type === 'MENTAL' ? "bg-purple-50 border-purple-100 text-purple-600" :
                          "bg-pink-50 border-pink-100 text-pink-600"
                        )}>
                          {esc.risk_type}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5 text-[10px] font-black text-green-600 uppercase tracking-widest">
                            <Clock className="w-3 h-3" /> Within SLA
                          </div>
                          <div className="w-24 h-1 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-green-500 w-[70%]" />
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleResolve(esc.id)}
                          className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-black text-gray-700 hover:bg-gray-50 transition-all"
                        >
                          Resolve
                        </button>
                        <button className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Assignment Modal Placeholder */}
      <AnimatePresence>
        {showAssignModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-6 border border-white/20"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-black text-gray-900">Assign Specialist</h3>
                <button onClick={() => setShowAssignModal(false)}><X className="w-6 h-6 text-gray-400" /></button>
              </div>
              {/* Specialist List would go here */}
              <div className="space-y-4">
                <p className="text-sm text-gray-500">Select a clinician to handle this escalation:</p>
                <div className="grid grid-cols-1 gap-3">
                  {[1, 2, 3].map(i => (
                    <button key={i} className="p-4 rounded-2xl border border-gray-100 hover:border-primary-200 hover:bg-primary-50 transition-all flex items-center justify-between group">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-500">DW</div>
                        <div className="text-left">
                          <p className="text-sm font-bold text-gray-900">Dr. Wilson {i}</p>
                          <p className="text-[10px] font-bold text-gray-400 uppercase">On-Call Specialist</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-primary-500 transition-all" />
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
