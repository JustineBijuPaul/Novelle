import { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Users, Building2, Stethoscope, Search, Plus, Edit3, Trash2,
  X, Save, ChevronDown, ChevronUp, UserCheck, UserX, Activity,
  Check, AlertTriangle, BarChart3, Sparkles, MapPin, ShieldAlert,
  CreditCard, Zap, MessagesSquare, FileBarChart, Settings, Globe,
  Terminal, Server, Database, ShieldCheck, Heart, ArrowUpRight,
  TrendingUp, Clock, Info, MoreVertical, LayoutDashboard, UserCog, UserPlus
} from 'lucide-react';
import { platformAdminService } from '../services/endpoints';
import toast from 'react-hot-toast';
import { cn } from '../utils/helpers';

export default function AdminDashboardPage() {
  const location = useLocation();
  const path = location.pathname;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setData(null);
    fetchDashboardData();
  }, [path]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      if (path === '/admin') {
        const res = await platformAdminService.getOverview();
        setData(res.data);
      } else if (path === '/admin/organizations') {
        const res = await platformAdminService.listOrganizations();
        setData(res.data);
      } else if (path === '/admin/ai-control') {
        const res = await platformAdminService.getAIControl();
        setData(res.data);
      } else if (path === '/admin/infrastructure') {
        const res = await platformAdminService.getInfrastructure();
        setData(res.data);
      } else if (path === '/admin/hospitals') {
        const res = await platformAdminService.listHospitals();
        setData(res.data);
      } else if (path === '/admin/users') {
        const res = await platformAdminService.listGlobalUsers();
        setData(res.data);
      }
    } catch (err) {
      toast.error('Failed to load platform data');
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    switch (path) {
      case '/admin':
        return <PlatformOverview data={data} />;
      case '/admin/organizations':
        return <OrganizationsView data={data} />;
      case '/admin/ai-control':
        return <AIControlCenter data={data} />;
      case '/admin/infrastructure':
        return <InfrastructureView data={data} />;
      case '/admin/hospitals':
        return <HospitalsView data={data} refresh={fetchDashboardData} />;
      case '/admin/users':
        return <UsersManagementView data={data} refresh={fetchDashboardData} />;
      default:
        return (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Settings className="w-16 h-16 mb-4 animate-spin-slow opacity-20" />
            <p className="text-xl font-display font-bold">Module Under Construction</p>
            <p className="text-sm">We are building this enterprise feature for you.</p>
          </div>
        );
    }
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-[70vh]">
        <div className="relative">
          <div className="w-20 h-20 border-4 border-primary-100 border-t-primary-600 rounded-full animate-spin" />
          <Shield className="w-8 h-8 text-primary-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
             <span className="px-2 py-0.5 bg-primary-900 text-primary-100 text-[10px] font-black rounded uppercase tracking-widest">Global Admin</span>
             <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          </div>
          <h1 className="text-3xl font-display font-black text-gray-900 flex items-center gap-3">
             {getPageTitle(path)}
          </h1>
        </div>
        
        <div className="flex items-center gap-3">
           <div className="flex -space-x-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center overflow-hidden">
                  <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i + 10}`} alt="Admin" />
                </div>
              ))}
           </div>
           <button className="p-2.5 bg-white border border-gray-100 rounded-2xl shadow-sm hover:bg-gray-50 transition-all relative">
              <ShieldAlert className="w-5 h-5 text-red-500" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white">3</span>
           </button>
        </div>
      </div>

      {renderContent()}
    </div>
  );
}

function getPageTitle(path: string) {
  const titles: any = {
    '/admin': 'Platform Command Center',
    '/admin/organizations': 'Global Organizations',
    '/admin/ai-control': 'AI Intelligence Hub',
    '/admin/infrastructure': 'Infrastructure Telemetry',
    '/admin/users': 'Global Identity Management',
    '/admin/analytics': 'Ecosystem Analytics',
    '/admin/billing': 'Revenue & Monetization'
  };
  return titles[path] || 'Administrative Hub';
}

// ── Platform Overview ────────────────────────────────

function PlatformOverview({ data }: { data: any }) {
  if (!data) return null;
  const { stats, revenue, health, activity } = data;

  return (
    <div className="space-y-8">
      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPIWidget label="Total Revenue (MRR)" value={`$${(revenue.mrr / 1000).toFixed(0)}k`} subtext={`+${revenue.growth}% growth`} icon={TrendingUp} color="blue" />
        <KPIWidget label="Active Hospitals" value={stats.hospitals} subtext="Across 12 regions" icon={Building2} color="purple" />
        <KPIWidget label="Global Patients" value={stats.patients} subtext="Real-time monitoring" icon={Users} color="pink" />
        <KPIWidget label="Critical Cases" value={stats.escalations} subtext="System-wide alerts" icon={ShieldAlert} color="red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* AI Analytics Center */}
        <div className="lg:col-span-2 bg-white rounded-[40px] border border-gray-100 p-8 shadow-sm space-y-8">
           <div className="flex items-center justify-between">
              <div>
                 <h3 className="text-xl font-black text-gray-900">AI Performance Matrix</h3>
                 <p className="text-sm text-gray-400 font-medium italic">Prediction accuracy vs load across all clusters</p>
              </div>
              <div className="flex gap-2">
                 <span className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-black uppercase tracking-widest border border-green-100">Optimal</span>
              </div>
           </div>
           
           <div className="h-[300px] w-full bg-gray-50 rounded-[32px] border border-dashed border-gray-200 flex items-center justify-center relative overflow-hidden">
              {/* Mock Chart Visualization */}
              <div className="absolute inset-0 p-8 flex items-end gap-2">
                 {[40, 70, 45, 90, 65, 85, 45, 100, 70, 80, 50, 90].map((h, i) => (
                   <div key={i} className="flex-1 bg-primary-500/20 rounded-t-lg relative group transition-all hover:bg-primary-500/40" style={{ height: `${h}%` }}>
                      <div className="absolute top-0 left-0 right-0 h-1 bg-primary-600 rounded-full" />
                      <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-2 py-1 rounded-lg pointer-events-none transition-all">
                        {h}%
                      </div>
                   </div>
                 ))}
              </div>
              <Activity className="w-12 h-12 text-gray-200" />
           </div>

           <div className="grid grid-cols-3 gap-6 pt-4">
              <MiniStat label="Avg Accuracy" value="94.2%" trend="+0.5%" />
              <MiniStat label="Latency" value="240ms" trend="-12ms" />
              <MiniStat label="False Positives" value="0.8%" trend="-0.1%" />
           </div>
        </div>

        {/* System Health Sidebar */}
        <div className="space-y-6">
           <div className="bg-primary-900 rounded-[40px] p-8 text-white shadow-xl">
              <h3 className="text-lg font-black mb-6 flex items-center gap-2">
                 <Zap className="w-5 h-5 text-amber-400" />
                 System Health
              </h3>
              <div className="space-y-6">
                 <HealthBar label="API Uptime" value={health.api_uptime} status="Stable" />
                 <HealthBar label="Database Load" value={health.db_load} status="Normal" />
                 <div className="pt-4 border-t border-primary-800 space-y-4">
                    <div className="flex items-center justify-between text-xs font-bold text-primary-200 uppercase tracking-widest">
                       <span>Infrastructure</span>
                       <span className="text-green-400">All Systems Go</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                       <div className="bg-primary-800/50 rounded-2xl p-3 border border-primary-700/50">
                          <p className="text-[10px] text-primary-300 font-bold mb-1">Queue Health</p>
                          <p className="text-sm font-black">{health.queue_status}</p>
                       </div>
                       <div className="bg-primary-800/50 rounded-2xl p-3 border border-primary-700/50">
                          <p className="text-[10px] text-primary-300 font-bold mb-1">AI Engine</p>
                          <p className="text-sm font-black">{health.ai_status}</p>
                       </div>
                    </div>
                 </div>
              </div>
           </div>

           {/* Global Risk Heatmap Placeholder */}
           <div className="bg-white rounded-[40px] border border-gray-100 p-8 shadow-sm h-[320px] flex flex-col">
              <div className="flex items-center justify-between mb-6">
                 <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest">Risk Distribution</h4>
                 <Globe className="w-5 h-5 text-primary-500" />
              </div>
              <div className="flex-1 bg-gray-50 rounded-[32px] border border-gray-100 flex items-center justify-center text-gray-300 relative overflow-hidden">
                 <MapPin className="w-12 h-12 opacity-10" />
                 <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-32 h-32 bg-primary-500/10 rounded-full animate-ping" />
                 </div>
                 <p className="absolute bottom-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Interactive Map Layer</p>
              </div>
           </div>
        </div>
      </div>

      {/* Activity Feed */}
      <div className="bg-white rounded-[40px] border border-gray-100 p-8 shadow-sm">
         <div className="flex items-center justify-between mb-8">
            <div>
               <h3 className="text-xl font-black text-gray-900">Live Platform Activity</h3>
               <p className="text-sm text-gray-400 font-medium">Real-time audit stream from all organizations</p>
            </div>
            <button className="text-primary-600 text-xs font-black uppercase tracking-widest flex items-center gap-1">
               View All Logs <ArrowUpRight className="w-4 h-4" />
            </button>
         </div>

         <div className="space-y-4">
            {Array.isArray(activity) && activity.map((item: any) => (
              <div key={item.id} className="flex items-center gap-6 p-4 hover:bg-gray-50 rounded-[24px] transition-all group">
                 <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 group-hover:bg-primary-50 group-hover:text-primary-600 transition-all shrink-0">
                    <Clock className="w-5 h-5" />
                 </div>
                 <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                       <h4 className="text-sm font-black text-gray-900">{item.event}</h4>
                       <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{item.time}</span>
                    </div>
                    <p className="text-xs text-gray-500 font-medium italic">{item.details}</p>
                 </div>
                 <div className="flex gap-2">
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-lg text-[10px] font-black uppercase tracking-widest group-hover:bg-primary-100 group-hover:text-primary-700 transition-all">Audit</span>
                    <button className="p-2 text-gray-400 hover:text-gray-900"><MoreVertical className="w-4 h-4" /></button>
                 </div>
              </div>
            ))}
         </div>
      </div>
    </div>
  );
}

// ── Organizations View ───────────────────────────────

function OrganizationsView({ data }: { data: any }) {
  if (!data) return null;

  return (
    <div className="space-y-8">
       <div className="flex items-center justify-between">
          <div>
             <h3 className="text-2xl font-black text-gray-900">Network Overview</h3>
             <p className="text-sm text-gray-500 font-medium">Managing 2 multi-hospital organizations</p>
          </div>
          <button className="btn-primary rounded-2xl px-6 py-3 flex items-center gap-2">
             <Plus className="w-5 h-5" /> Register Organization
          </button>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {Array.isArray(data) && data.map((org: any) => (
            <motion.div 
              key={org.id}
              whileHover={{ y: -5 }}
              className="bg-white rounded-[40px] border border-gray-100 p-8 shadow-sm hover:shadow-md transition-all relative overflow-hidden group"
            >
               <div className="absolute top-0 right-0 p-8">
                  <span className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                    org.plan === 'ENTERPRISE' ? "bg-purple-50 text-purple-700 border-purple-100" : "bg-blue-50 text-blue-700 border-blue-100"
                  )}>
                    {org.plan}
                  </span>
               </div>

               <div className="space-y-6">
                  <div className="w-16 h-16 bg-gray-50 rounded-3xl flex items-center justify-center text-primary-600 group-hover:bg-primary-50 transition-all">
                     <Building2 className="w-8 h-8" />
                  </div>
                  
                  <div>
                     <h4 className="text-xl font-black text-gray-900 mb-1">{org.name}</h4>
                     <p className="text-sm text-gray-400 font-medium flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5" /> 12 Hospital Nodes
                     </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     <div className="p-4 bg-gray-50 rounded-[24px] border border-gray-100">
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Status</p>
                        <p className="text-sm font-black text-green-600 flex items-center gap-1.5">
                           <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> {org.status}
                        </p>
                     </div>
                     <div className="p-4 bg-gray-50 rounded-[24px] border border-gray-100">
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Compliance</p>
                        <p className="text-sm font-black text-gray-900">{org.compliance}</p>
                     </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                     <div className="flex -space-x-2">
                        {[1, 2, 3, 4].map(i => (
                          <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center overflow-hidden">
                            <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${org.name}${i}`} alt="Admin" />
                          </div>
                        ))}
                        <div className="w-8 h-8 rounded-full border-2 border-white bg-primary-100 flex items-center justify-center text-[10px] font-black text-primary-700">
                           +2
                        </div>
                     </div>
                     <button className="px-4 py-2 bg-gray-900 text-white text-xs font-black rounded-xl hover:bg-black transition-all">
                        Manage Organization
                     </button>
                  </div>
               </div>
            </motion.div>
          ))}
       </div>
    </div>
  );
}

// ── Hospitals View ──────────────────────────────────

function HospitalsView({ data, refresh }: { data: any, refresh: () => void }) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'regional'>('list');
  const [formData, setFormData] = useState({
    name: '', address: '', city: '', state: '', zip_code: '', phone: '', email: ''
  });
  const [regionalStats, setRegionalStats] = useState<any[]>([]);

  useEffect(() => {
    if (viewMode === 'regional') {
      platformAdminService.getRegionalStats().then(res => setRegionalStats(res.data));
    }
  }, [viewMode]);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    try {
      await platformAdminService.createHospital(formData);
      toast.success('Hospital registered successfully');
      setShowAddModal(false);
      refresh();
    } catch (err) {
      toast.error('Failed to register hospital');
    }
  };

  if (!data && viewMode === 'list') return null;

  return (
    <div className="space-y-8">
       <div className="flex items-center justify-between">
          <div>
             <h3 className="text-2xl font-black text-gray-900">Hospital Network</h3>
             <p className="text-sm text-gray-500 font-medium">
                {viewMode === 'list' ? `Monitoring ${data?.length || 0} active facilities` : 'Regional distribution & infrastructure load'}
             </p>
          </div>
          <div className="flex gap-4">
             <button 
                onClick={() => setViewMode(viewMode === 'list' ? 'regional' : 'list')}
                className={cn(
                  "px-6 py-3 border rounded-2xl text-sm font-black transition-all flex items-center gap-2",
                  viewMode === 'regional' ? "bg-primary-900 text-white border-primary-900" : "bg-white border-gray-100 text-gray-600 hover:bg-gray-50"
                )}
             >
                {viewMode === 'list' ? (
                  <><MapPin className="w-4 h-4" /> Regional View</>
                ) : (
                  <><LayoutDashboard className="w-4 h-4" /> List View</>
                )}
             </button>
             <button 
                onClick={() => setShowAddModal(true)}
                className="btn-primary rounded-2xl px-6 py-3 flex items-center gap-2"
             >
                <Plus className="w-5 h-5" /> Add Hospital
             </button>
          </div>
       </div>

       {viewMode === 'list' ? (
         <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
             <table className="w-full text-left border-collapse">
                <thead>
                   <tr className="border-b border-gray-50 bg-gray-50/50">
                      <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Facility</th>
                      <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                      <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Region</th>
                      <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Patients/Doctors</th>
                      <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Perf. Score</th>
                      <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Actions</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                   {Array.isArray(data) && data.map((hospital: any) => (
                     <motion.tr 
                       key={hospital.id}
                       initial={{ opacity: 0 }}
                       animate={{ opacity: 1 }}
                       className="group hover:bg-gray-50/50 transition-all"
                     >
                        <td className="px-8 py-6">
                           <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center text-primary-600">
                                 <Building2 className="w-5 h-5" />
                              </div>
                              <div>
                                 <h4 className="text-sm font-black text-gray-900">{hospital.name}</h4>
                                 <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{hospital.location}</p>
                              </div>
                           </div>
                        </td>
                        <td className="px-8 py-6">
                           <span className={cn(
                             "px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest border",
                             hospital.status === 'ACTIVE' ? "bg-green-50 text-green-700 border-green-100" : "bg-amber-50 text-amber-700 border-amber-100"
                           )}>
                              {hospital.status}
                           </span>
                        </td>
                        <td className="px-8 py-6">
                           <span className="text-xs font-bold text-gray-600">{hospital.region}</span>
                        </td>
                        <td className="px-8 py-6">
                           <div className="flex items-center gap-2">
                              <div className="text-xs font-black text-gray-900">{hospital.patients}</div>
                              <div className="text-[10px] text-gray-400 font-bold">/</div>
                              <div className="text-xs font-bold text-gray-500">{hospital.doctors}</div>
                           </div>
                        </td>
                        <td className="px-8 py-6">
                           <div className="flex items-center gap-3">
                              <div className="flex-1 h-1.5 w-16 bg-gray-100 rounded-full overflow-hidden">
                                 <div 
                                   className={cn(
                                     "h-full rounded-full transition-all duration-1000",
                                     hospital.performance > 90 ? "bg-green-500" : hospital.performance > 80 ? "bg-blue-500" : "bg-amber-500"
                                   )} 
                                   style={{ width: `${hospital.performance}%` }} 
                                 />
                              </div>
                              <span className="text-[10px] font-black text-gray-900">{hospital.performance}%</span>
                           </div>
                        </td>
                        <td className="px-8 py-6">
                           <div className="flex items-center gap-2">
                              <button className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all">
                                 <Activity className="w-4 h-4" />
                              </button>
                              <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
                                 <Edit3 className="w-4 h-4" />
                              </button>
                              <button className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
                                 <MoreVertical className="w-4 h-4" />
                              </button>
                           </div>
                        </td>
                     </motion.tr>
                   ))}
                </tbody>
             </table>
          </div>
       </div>
       ) : (
         <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {regionalStats.map((reg, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-[40px] border border-gray-100 p-8 shadow-sm"
              >
                 <div className="flex items-center justify-between mb-6">
                    <h4 className="text-lg font-black text-gray-900">{reg.region}</h4>
                    <Globe className="w-5 h-5 text-primary-500" />
                 </div>
                 <div className="space-y-6">
                    <div className="flex justify-between items-center">
                       <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Active Units</span>
                       <span className="text-lg font-black text-gray-900">{reg.active} / {reg.count}</span>
                    </div>
                    <div className="space-y-2">
                       <div className="flex justify-between text-[10px] font-black uppercase">
                          <span className="text-gray-400">Territory Load</span>
                          <span className={cn(reg.load > 60 ? "text-red-500" : "text-green-500")}>{reg.load}%</span>
                       </div>
                       <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className={cn("h-full rounded-full transition-all duration-1000", reg.load > 60 ? "bg-red-500" : "bg-primary-500")} style={{ width: `${reg.load}%` }} />
                       </div>
                    </div>
                 </div>
              </motion.div>
            ))}
         </div>
       )}

       <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white rounded-[40px] border border-gray-100 p-8 shadow-sm">
             <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Verification Queue</h4>
             <div className="space-y-4">
                {[1, 2].map((i) => (
                  <div key={i} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between">
                     <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-amber-500 shadow-sm">
                           <ShieldAlert className="w-4 h-4" />
                        </div>
                        <div>
                           <p className="text-xs font-black text-gray-900">Mercy Hospital {i}</p>
                           <p className="text-[9px] text-gray-400 font-bold uppercase">Pending Docs</p>
                        </div>
                     </div>
                     <button className="text-[10px] font-black text-primary-600 hover:underline">REVIEW</button>
                  </div>
                ))}
             </div>
          </div>

          <div className="bg-primary-900 rounded-[40px] p-8 text-white shadow-xl col-span-2">
             <div className="flex items-center justify-between mb-8">
                <h4 className="text-sm font-black uppercase tracking-widest">Network Growth Analytics</h4>
                <div className="flex gap-2">
                   <div className="px-3 py-1 bg-white/10 rounded-full text-[10px] font-black uppercase">Q2 2026</div>
                </div>
             </div>
             <div className="h-32 flex items-end gap-3 px-4">
                {[45, 60, 45, 75, 55, 90, 85].map((v, i) => (
                  <div key={i} className="flex-1 bg-white/20 rounded-t-lg relative group" style={{ height: `${v}%` }}>
                     <div className="absolute top-0 left-0 right-0 h-1 bg-primary-400 rounded-full" />
                     <div className="opacity-0 group-hover:opacity-100 absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-black">
                        {v}%
                     </div>
                  </div>
                ))}
             </div>
          </div>
       </div>

       {/* Add Hospital Modal */}
       <AnimatePresence>
          {showAddModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
               <motion.div 
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 exit={{ opacity: 0 }}
                 onClick={() => setShowAddModal(false)}
                 className="absolute inset-0 bg-black/20 backdrop-blur-sm"
               />
               <motion.div 
                 initial={{ opacity: 0, y: 20, scale: 0.95 }}
                 animate={{ opacity: 1, y: 0, scale: 1 }}
                 exit={{ opacity: 0, y: 20, scale: 0.95 }}
                 className="relative w-full max-w-xl bg-white rounded-[48px] p-10 shadow-2xl overflow-hidden"
               >
                  <div className="absolute top-0 right-0 p-8">
                     <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-all">
                        <X className="w-6 h-6 text-gray-400" />
                     </button>
                  </div>

                  <h3 className="text-3xl font-black text-gray-900 mb-2">Register Facility</h3>
                  <p className="text-gray-500 font-medium mb-8">Provision a new clinical unit to the Novelle network.</p>

                  <form onSubmit={handleSubmit} className="space-y-6">
                     <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <div className="space-y-1.5">
                              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Hospital Name</label>
                              <input 
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({...formData, name: e.target.value})}
                                className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-primary-500/20 outline-none transition-all" 
                                placeholder="St. Mary's Medical"
                              />
                           </div>
                           <div className="space-y-1.5">
                              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Contact Email</label>
                              <input 
                                required
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({...formData, email: e.target.value})}
                                className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-primary-500/20 outline-none transition-all" 
                                placeholder="admin@hospital.com"
                              />
                           </div>
                        </div>
                        <div className="space-y-1.5">
                           <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Full Address</label>
                           <input 
                             required
                             value={formData.address}
                             onChange={(e) => setFormData({...formData, address: e.target.value})}
                             className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-primary-500/20 outline-none transition-all" 
                             placeholder="123 Health Ave, Suite 500"
                           />
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                           <div className="space-y-1.5">
                              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">City</label>
                              <input 
                                required
                                value={formData.city}
                                onChange={(e) => setFormData({...formData, city: e.target.value})}
                                className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-primary-500/20 outline-none transition-all" 
                                placeholder="New York"
                              />
                           </div>
                           <div className="space-y-1.5">
                              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">State</label>
                              <input 
                                required
                                value={formData.state}
                                onChange={(e) => setFormData({...formData, state: e.target.value})}
                                className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-primary-500/20 outline-none transition-all" 
                                placeholder="NY"
                              />
                           </div>
                           <div className="space-y-1.5">
                              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Zip Code</label>
                              <input 
                                required
                                value={formData.zip_code}
                                onChange={(e) => setFormData({...formData, zip_code: e.target.value})}
                                className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-primary-500/20 outline-none transition-all" 
                                placeholder="10001"
                              />
                           </div>
                        </div>
                     </div>

                     <div className="pt-4 flex gap-4">
                        <button 
                          type="button"
                          onClick={() => setShowAddModal(false)}
                          className="flex-1 px-8 py-4 bg-gray-50 text-gray-600 font-black rounded-3xl hover:bg-gray-100 transition-all"
                        >
                           DISCARD
                        </button>
                        <button 
                          type="submit"
                          className="flex-[2] btn-primary rounded-3xl py-4 font-black shadow-xl shadow-primary-500/20"
                        >
                           COMPLETE REGISTRATION
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

// ── Users Management View ────────────────────────────

function UsersManagementView({ data, refresh }: { data: any, refresh: () => void }) {
  const [showProvisionModal, setShowProvisionModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '', email: '', role: 'doctor'
  });

  const handleProvision = async (e: any) => {
    e.preventDefault();
    try {
      if (editingUser) {
        await platformAdminService.updateUser(editingUser.id, formData);
        toast.success('User updated successfully');
      } else {
        await platformAdminService.provisionUser(formData);
        toast.success('User provisioned successfully');
      }
      setShowProvisionModal(false);
      setEditingUser(null);
      setFormData({ name: '', email: '', role: 'doctor' });
      refresh();
    } catch (err) {
      toast.error(editingUser ? 'Update failed' : 'Provisioning failed');
    }
  };

  const openEdit = (user: any) => {
    setEditingUser(user);
    setFormData({ name: user.name, email: user.email, role: user.role });
    setShowProvisionModal(true);
  };

  const toggleStatus = async (userId: number, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
      await platformAdminService.updateUserStatus(userId, newStatus);
      toast.success(`User ${newStatus.toLowerCase()}`);
      refresh();
    } catch (err) {
      toast.error('Status update failed');
    }
  };

  const handleDelete = async (userId: number) => {
    if (!window.confirm('Permanently delete this user? This action cannot be undone.')) return;
    try {
      await platformAdminService.deleteUser(userId);
      toast.success('User removed from platform');
      refresh();
    } catch (err) {
      toast.error('Deletion failed');
    }
  };

  if (!data) return null;

  return (
    <div className="space-y-8">
       <div className="flex items-center justify-between">
          <div>
             <h3 className="text-2xl font-black text-gray-900">Global Identity Management</h3>
             <p className="text-sm text-gray-500 font-medium">Controlling access for {data.length} users across the ecosystem</p>
          </div>
          <div className="flex gap-4">
             <div className="relative">
                <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Search by name, email..." 
                  className="pl-11 pr-6 py-3 bg-white border border-gray-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all w-64"
                />
             </div>
             <button 
                onClick={() => setShowProvisionModal(true)}
                className="btn-primary rounded-2xl px-6 py-3 flex items-center gap-2"
             >
                <Plus className="w-5 h-5" /> Provision User
             </button>
          </div>
       </div>

       <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
             <table className="w-full text-left border-collapse">
                <thead>
                   <tr className="border-b border-gray-50 bg-gray-50/50">
                      <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">User Profile</th>
                      <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Global Role</th>
                      <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Affiliation</th>
                      <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                      <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Last Active</th>
                      <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Actions</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                   {Array.isArray(data) && data.map((user: any) => (
                     <motion.tr 
                       key={user.id}
                       initial={{ opacity: 0 }}
                       animate={{ opacity: 1 }}
                       className="group hover:bg-gray-50/50 transition-all"
                     >
                        <td className="px-8 py-6">
                           <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 font-black text-xs">
                                 {user.name.split(' ').map((n: string) => n[0]).join('')}
                              </div>
                              <div>
                                 <h4 className="text-sm font-black text-gray-900">{user.name}</h4>
                                 <p className="text-xs text-gray-400 font-medium">{user.email}</p>
                              </div>
                           </div>
                        </td>
                        <td className="px-8 py-6">
                           <div className="flex items-center gap-2">
                              <span className={cn(
                                "px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest border",
                                user.role === 'platform_admin' ? "bg-red-50 text-red-700 border-red-100" :
                                user.role === 'hospital_admin' ? "bg-purple-50 text-purple-700 border-purple-100" :
                                user.role === 'doctor' ? "bg-blue-50 text-blue-700 border-blue-100" :
                                "bg-gray-50 text-gray-700 border-gray-100"
                              )}>
                                 {user.role.replace('_', ' ')}
                              </span>
                           </div>
                        </td>
                        <td className="px-8 py-6">
                           <span className="text-xs font-bold text-gray-500">{user.hospital}</span>
                        </td>
                        <td className="px-8 py-6">
                           <div className="flex items-center gap-2">
                              <div className={cn("w-1.5 h-1.5 rounded-full", user.status === 'ACTIVE' ? "bg-green-500" : "bg-red-500")} />
                              <span className="text-xs font-black text-gray-900">{user.status}</span>
                           </div>
                        </td>
                        <td className="px-8 py-6">
                           <span className="text-xs font-medium text-gray-400">{user.last_login}</span>
                        </td>
                        <td className="px-8 py-6">
                           <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                              <button 
                                onClick={() => toggleStatus(user.id, user.status)}
                                title={user.status === 'ACTIVE' ? 'Suspend Account' : 'Activate Account'}
                                className={cn(
                                  "p-2 rounded-lg transition-all",
                                  user.status === 'ACTIVE' ? "text-amber-400 hover:text-amber-600 hover:bg-amber-50" : "text-green-400 hover:text-green-600 hover:bg-green-50"
                                )}
                              >
                                 <ShieldCheck className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => openEdit(user)}
                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                              >
                                 <UserCog className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => handleDelete(user.id)}
                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                              >
                                 <UserX className="w-4 h-4" />
                              </button>
                           </div>
                        </td>
                     </motion.tr>
                   ))}
                </tbody>
             </table>
          </div>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <RoleCard title="Platform Admins" count={2} color="red" icon={ShieldAlert} />
          <RoleCard title="Hospital Admins" count={12} color="purple" icon={Building2} />
          <RoleCard title="Doctors" count={85} color="blue" icon={Stethoscope} />
          <RoleCard title="Patients" count={1240} color="green" icon={Heart} />
       </div>

       {/* Provision User Modal */}
       <AnimatePresence>
          {showProvisionModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
               <motion.div 
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 exit={{ opacity: 0 }}
                 onClick={() => setShowProvisionModal(false)}
                 className="absolute inset-0 bg-black/20 backdrop-blur-sm"
               />
               <motion.div 
                 initial={{ opacity: 0, y: 20, scale: 0.95 }}
                 animate={{ opacity: 1, y: 0, scale: 1 }}
                 exit={{ opacity: 0, y: 20, scale: 0.95 }}
                 className="relative w-full max-w-lg bg-white rounded-[48px] p-10 shadow-2xl overflow-hidden"
               >
                  <div className="absolute top-0 right-0 p-8">
                     <button onClick={() => { setShowProvisionModal(false); setEditingUser(null); }} className="p-2 hover:bg-gray-100 rounded-full transition-all">
                        <X className="w-6 h-6 text-gray-400" />
                     </button>
                  </div>

                  <h3 className="text-3xl font-black text-gray-900 mb-2">
                    {editingUser ? 'Edit Profile' : 'Provision User'}
                  </h3>
                  <p className="text-gray-500 font-medium mb-8">
                    {editingUser ? 'Update stakeholder metadata and access levels.' : 'Onboard a new stakeholder to the Novelle platform.'}
                  </p>

                  <form onSubmit={handleProvision} className="space-y-6">
                     <div className="space-y-4">
                        <div className="space-y-1.5">
                           <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Full Name</label>
                           <input 
                             required
                             value={formData.name}
                             onChange={(e) => setFormData({...formData, name: e.target.value})}
                             className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-primary-500/20 outline-none transition-all" 
                             placeholder="John Doe"
                           />
                        </div>
                        <div className="space-y-1.5">
                           <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Email Address</label>
                           <input 
                             required
                             type="email"
                             value={formData.email}
                             onChange={(e) => setFormData({...formData, email: e.target.value})}
                             className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-primary-500/20 outline-none transition-all" 
                             placeholder="john@example.com"
                           />
                        </div>
                        <div className="space-y-1.5">
                           <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Platform Role</label>
                           <select 
                             value={formData.role}
                             onChange={(e) => setFormData({...formData, role: e.target.value})}
                             className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-primary-500/20 outline-none transition-all appearance-none"
                           >
                              <option value="doctor">Doctor</option>
                              <option value="hospital_admin">Hospital Admin</option>
                              <option value="platform_admin">Platform Admin</option>
                              <option value="pregnant_user">Patient</option>
                           </select>
                        </div>
                     </div>

                     <div className="pt-4 flex gap-4">
                        <button 
                          type="button"
                          onClick={() => setShowProvisionModal(false)}
                          className="flex-1 px-8 py-4 bg-gray-50 text-gray-600 font-black rounded-3xl hover:bg-gray-100 transition-all"
                        >
                           DISCARD
                        </button>
                        <button 
                          type="submit"
                          className="flex-[2] btn-primary rounded-3xl py-4 font-black shadow-xl shadow-primary-500/20"
                        >
                           {editingUser ? 'SAVE CHANGES' : 'COMPLETE ONBOARDING'}
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

function RoleCard({ title, count, color, icon: Icon }: any) {
  const colors: any = {
    red: "bg-red-50 text-red-600 border-red-100",
    purple: "bg-purple-50 text-purple-600 border-purple-100",
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    green: "bg-green-50 text-green-600 border-green-100"
  };

  return (
    <div className={cn("p-6 rounded-[32px] border flex items-center justify-between", colors[color])}>
       <div>
          <p className="text-2xl font-black">{count}</p>
          <p className="text-[10px] font-black uppercase tracking-widest opacity-70">{title}</p>
       </div>
       <Icon className="w-8 h-8 opacity-20" />
    </div>
  );
}

// ── AI Control Center ────────────────────────────────

function AIControlCenter({ data }: { data: any }) {
  if (!data) return null;

  return (
    <div className="space-y-8">
       <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
             <div className="bg-white rounded-[40px] border border-gray-100 p-8 shadow-sm">
                <h3 className="text-xl font-black text-gray-900 mb-8 flex items-center gap-2">
                   <Terminal className="w-6 h-6 text-primary-600" />
                   Active Model Inventory
                </h3>
                <div className="space-y-4">
                   {data.models.map((model: any, i: number) => (
                     <div key={i} className="p-6 bg-gray-50 rounded-[32px] border border-gray-100 flex items-center gap-6 hover:border-primary-200 transition-all group">
                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-primary-600 shadow-sm">
                           <Sparkles className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                           <h4 className="text-sm font-black text-gray-900 mb-1">{model.name}</h4>
                           <div className="flex items-center gap-3">
                              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{model.status}</span>
                              <span className="w-1 h-1 rounded-full bg-gray-300" />
                              <span className="text-[10px] font-black text-primary-600 uppercase tracking-widest">v{i + 1}.4.2</span>
                           </div>
                        </div>
                        <div className="text-right">
                           <p className="text-lg font-black text-gray-900">{model.accuracy}%</p>
                           <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Accuracy</p>
                        </div>
                        <div className="w-px h-10 bg-gray-200" />
                        <div className="text-right">
                           <p className="text-lg font-black text-gray-900">{model.latency}ms</p>
                           <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Latency</p>
                        </div>
                        <button className="p-2 text-gray-400 hover:text-primary-600 transition-all">
                           <Settings className="w-5 h-5" />
                        </button>
                     </div>
                   ))}
                </div>
             </div>

             <div className="bg-white rounded-[40px] border border-gray-100 p-8 shadow-sm">
                <h3 className="text-xl font-black text-gray-900 mb-6">Inference Accuracy Trend</h3>
                <div className="h-64 w-full bg-gray-50 rounded-[32px] flex items-end p-8 gap-4">
                   {Array.isArray(data.accuracy_trend) && data.accuracy_trend.map((v: number, i: number) => (
                     <div key={i} className="flex-1 bg-primary-600 rounded-t-xl transition-all hover:scale-105" style={{ height: `${v}%` }}>
                        <div className="h-full w-full bg-gradient-to-t from-black/20 to-transparent" />
                     </div>
                   ))}
                </div>
             </div>
          </div>

          <div className="space-y-6">
             <div className="bg-gray-900 rounded-[40px] p-8 text-white shadow-xl">
                <h3 className="text-lg font-black mb-6">Engine Stats</h3>
                <div className="space-y-6">
                   <div>
                      <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">Total Predictions</p>
                      <p className="text-3xl font-black">{data.predictions_total.toLocaleString()}</p>
                   </div>
                   <div className="pt-6 border-t border-gray-800">
                      <h4 className="text-xs font-black uppercase tracking-widest mb-4">Training Pipeline</h4>
                      <div className="space-y-3">
                         <div className="flex items-center justify-between text-xs font-bold">
                            <span className="text-gray-400">Model Retraining</span>
                            <span className="text-amber-400">82%</span>
                         </div>
                         <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                            <div className="h-full bg-amber-400" style={{ width: '82%' }} />
                         </div>
                      </div>
                   </div>
                </div>
             </div>

             <div className="bg-white rounded-[40px] border border-gray-100 p-8 shadow-sm">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6">AI Governance Log</h3>
                <div className="space-y-4">
                   {Array.isArray(data.alerts) && data.alerts.map((alert: any) => (
                     <div key={alert.id} className="p-4 bg-amber-50 border border-amber-100 rounded-2xl">
                        <div className="flex items-center gap-2 mb-1">
                           <Info className="w-3 h-3 text-amber-600" />
                           <span className="text-[10px] font-black text-amber-700 uppercase tracking-widest">{alert.level}</span>
                        </div>
                        <p className="text-[11px] text-amber-800 font-medium leading-relaxed">{alert.msg}</p>
                     </div>
                   ))}
                </div>
             </div>
          </div>
       </div>
    </div>
  );
}

// ── Infrastructure View ──────────────────────────────

function InfrastructureView({ data }: { data: any }) {
  if (!data) return null;

  return (
    <div className="space-y-8">
       <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white rounded-[40px] border border-gray-100 p-8 shadow-sm">
             <h3 className="text-xl font-black text-gray-900 mb-8 flex items-center gap-2">
                <Server className="w-6 h-6 text-blue-600" />
                Edge Compute Clusters
             </h3>
             <div className="space-y-4">
                {Array.isArray(data.servers) && data.servers.map((server: any) => (
                  <div key={server.id} className="p-6 bg-gray-50 rounded-[32px] border border-gray-100 flex items-center justify-between">
                     <div>
                        <h4 className="text-sm font-black text-gray-900">{server.region} Cluster</h4>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{server.id}</p>
                     </div>
                     <div className="text-right">
                        <p className="text-sm font-black text-green-600 mb-1 flex items-center gap-1.5 justify-end">
                           <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> {server.status}
                        </p>
                        <div className="flex items-center gap-3">
                           <div className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div className="h-full bg-blue-500" style={{ width: `${server.load}%` }} />
                           </div>
                           <span className="text-[10px] font-black text-gray-500">{server.load}% Load</span>
                        </div>
                     </div>
                  </div>
                ))}
             </div>
          </div>

          <div className="bg-white rounded-[40px] border border-gray-100 p-8 shadow-sm">
             <h3 className="text-xl font-black text-gray-900 mb-8 flex items-center gap-2">
                <Database className="w-6 h-6 text-purple-600" />
                Persistent Storage Hub
             </h3>
             <div className="space-y-4">
                {Array.isArray(data.databases) && data.databases.map((db: any, i: number) => (
                  <div key={i} className="p-6 bg-gray-50 rounded-[32px] border border-gray-100 flex items-center justify-between">
                     <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-purple-600 shadow-sm">
                           <Database className="w-5 h-5" />
                        </div>
                        <div>
                           <h4 className="text-sm font-black text-gray-900">{db.name}</h4>
                           <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{db.engine}</p>
                        </div>
                     </div>
                     <div className="text-right">
                        <p className="text-sm font-black text-gray-900">{db.size}</p>
                        <p className="text-[10px] text-green-600 font-black uppercase tracking-widest">{db.status}</p>
                     </div>
                  </div>
                ))}
             </div>
          </div>
       </div>

       <div className="bg-primary-900 rounded-[40px] p-8 shadow-xl">
          <div className="flex items-center justify-between mb-8">
             <h3 className="text-xl font-black text-white">Global Latency Distribution</h3>
             <div className="flex gap-4">
                <div className="flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-blue-400" />
                   <span className="text-[10px] font-black text-primary-200 uppercase tracking-widest">Avg Response: 48ms</span>
                </div>
             </div>
          </div>
          <div className="h-48 flex items-end gap-3">
             {Array.isArray(data.latency) && data.latency.map((l: number, i: number) => (
               <div key={i} className="flex-1 bg-blue-500/30 rounded-t-xl relative group" style={{ height: `${l}%` }}>
                  <div className="absolute top-0 left-0 right-0 h-1 bg-blue-400 rounded-full" />
                  <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 text-[10px] font-black text-white">
                    {l}ms
                  </div>
               </div>
             ))}
          </div>
       </div>
    </div>
  );
}

// ── Components ───────────────────────────────────────

function KPIWidget({ label, value, subtext, icon: Icon, color }: any) {
  const colors: any = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
    pink: 'bg-pink-50 text-pink-600 border-pink-100',
    red: 'bg-red-50 text-red-600 border-red-100'
  };

  return (
    <div className="bg-white rounded-[40px] border border-gray-100 p-8 shadow-sm space-y-4">
       <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center border", colors[color])}>
          <Icon className="w-6 h-6" />
       </div>
       <div>
          <p className="text-3xl font-black text-gray-900">{value}</p>
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">{label}</p>
          <p className="text-[10px] text-gray-500 font-medium italic">{subtext}</p>
       </div>
    </div>
  );
}

function MiniStat({ label, value, trend }: any) {
  return (
    <div className="p-4 bg-gray-50 rounded-[24px] border border-gray-100">
       <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">{label}</p>
       <div className="flex items-center justify-between">
          <p className="text-lg font-black text-gray-900">{value}</p>
          <span className="text-[10px] font-black text-green-600 bg-green-50 px-1.5 py-0.5 rounded-lg">{trend}</span>
       </div>
    </div>
  );
}

function HealthBar({ label, value, status }: any) {
  return (
    <div className="space-y-2">
       <div className="flex items-center justify-between text-xs font-bold">
          <span className="text-primary-300 uppercase tracking-widest">{label}</span>
          <span className="text-primary-100">{status}</span>
       </div>
       <div className="flex items-center gap-3">
          <div className="flex-1 h-2 bg-primary-800 rounded-full overflow-hidden">
             <div className="h-full bg-gradient-to-r from-blue-400 to-green-400" style={{ width: `${value}%` }} />
          </div>
          <span className="text-[10px] font-black">{value}%</span>
       </div>
    </div>
  );
}
