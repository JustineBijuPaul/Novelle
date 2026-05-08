import { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Users, Building2, Stethoscope, Search, Plus, Edit3, Trash2,
  X, Save, ChevronDown, ChevronUp, UserCheck, UserX, Activity, ShieldCheck,
  Check, AlertTriangle, BarChart3, Sparkles, MapPin, ShieldAlert,
  CreditCard, Zap, MessagesSquare, FileBarChart, Settings, Globe,
  Terminal, Server, Database, Heart, ArrowUpRight,
  TrendingUp, Clock, Info, MoreVertical, LayoutDashboard, UserCog, UserPlus,
  Brain, Cpu, Layers, History, ChevronRight, PlayCircle, Settings2, TrendingDown, Target, Map, PieChart,
  Siren, PhoneForwarded, AlertCircle, FileText, Download, DollarSign, Gem, Briefcase
} from 'lucide-react';
import { platformAdminService, mlopsService, complianceService } from '../services/endpoints';
import toast from 'react-hot-toast';
import { cn } from '../utils/helpers';

// ── AI Control Center View ──────────────────────────

function AIControlCenterView({ data }: { data: any }) {
  const [selectedModel, setSelectedModel] = useState<any>(null);
  const [isRetraining, setIsRetraining] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [modelSettings, setModelSettings] = useState<any>(null);
  const [registryModels, setRegistryModels] = useState<any[]>([]);
  const [driftReports, setDriftReports] = useState<Record<string, any>>({});

  useEffect(() => {
    const fetchRegistry = async () => {
      try {
        const res = await mlopsService.listModels();
        setRegistryModels(res.data);
        
        // Fetch drift for each model
        const driftPromises = res.data.map((m: any) => mlopsService.getDriftReport(m.model_name));
        const driftResults = await Promise.all(driftPromises);
        const driftMap: any = {};
        driftResults.forEach((r: any, i: number) => {
          driftMap[res.data[i].model_name] = r.data;
        });
        setDriftReports(driftMap);
      } catch (err) {
        console.error("MLOps sync failed", err);
      }
    };
    fetchRegistry();
  }, []);

  const handlePromote = async (modelId: string, status: string) => {
    try {
      await mlopsService.promoteModel(modelId, status as any);
      toast.success(`Model successfully promoted to ${status}`);
    } catch (err) {
      toast.error("Promotion failed");
    }
  };

  if (!data?.models) return null;

  const handleRetrain = async (modelName: string) => {
    try {
      setIsRetraining(true);
      const loadingToast = toast.loading(`Initializing background retraining for ${modelName}...`);
      await platformAdminService.retrainModel(modelName);
      toast.dismiss(loadingToast);
      toast.success('Retraining pipeline successfully initiated in non-repudiable background layer.');
    } catch (error) {
      toast.error('Retraining pipeline initialization failed.');
    } finally {
      setIsRetraining(false);
    }
  };

  const handleUpdateSettings = async (modelName: string) => {
    try {
      await platformAdminService.updateModelSettings(modelName, modelSettings);
      toast.success('Model hyperparameters updated and saved to persistent ledger.');
      setShowSettings(false);
      // Refresh data would be ideal here, but for now we just close
    } catch (error) {
      toast.error('Failed to update model settings.');
    }
  };

  return (
    <div className="space-y-8 pb-20">
       <div className="flex items-center justify-between">
          <div>
             <h3 className="text-2xl font-black text-gray-900">AI Control Center</h3>
             <p className="text-sm text-gray-500 font-medium">Platform-wide model governance & neural monitoring</p>
          </div>
          <div className="flex gap-4">
             <button 
               onClick={async () => {
                 const res = await complianceService.getAuditLogs();
                 toast.success('Live audit stream retrieved from non-repudiable ledger');
                 console.log(res.data);
               }}
               className="px-6 py-3 bg-white border border-gray-100 rounded-2xl text-sm font-black text-gray-600 hover:bg-gray-50 transition-all flex items-center gap-2"
             >
                <History className="w-4 h-4" /> Audit Logs
             </button>
             <button 
               onClick={() => toast.loading('Initializing secure model deployment pipeline...')}
               className="btn-primary rounded-2xl px-6 py-3 flex items-center gap-2 shadow-xl shadow-primary-500/20"
             >
                <Plus className="w-5 h-5" /> Deploy Model
             </button>
          </div>
       </div>

       {/* Model Grid */}
       <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {data.models.map((model: any, i: number) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white rounded-[40px] border border-gray-100 p-8 shadow-sm group hover:shadow-xl hover:shadow-primary-500/5 transition-all"
            >
               <div className="flex items-center justify-between mb-8">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center",
                    model.status === 'OPTIMAL' ? "bg-green-50 text-green-600" : "bg-amber-50 text-amber-600"
                  )}>
                     <Brain className="w-6 h-6" />
                  </div>
                  <span className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                    model.status === 'OPTIMAL' ? "bg-green-500 text-white" : "bg-amber-500 text-white"
                  )}>
                    {model.status}
                  </span>
               </div>
               
               <h4 className="text-xl font-black text-gray-900 mb-1">{model.name}</h4>
               <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-6">Version {model.version}</p>

               <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-2xl">
                     <span className="text-[10px] font-black text-gray-400 uppercase">Accuracy</span>
                     <span className="text-sm font-black text-primary-600">{model.accuracy}%</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-2xl">
                     <span className="text-[10px] font-black text-gray-400 uppercase">Avg Latency</span>
                     <span className="text-sm font-black text-gray-900">{model.latency}</span>
                  </div>
               </div>

               <button 
                 onClick={() => setSelectedModel(model)}
                 className="w-full mt-8 py-4 border border-gray-100 rounded-3xl text-[10px] font-black text-gray-400 uppercase tracking-widest group-hover:bg-primary-900 group-hover:text-white group-hover:border-primary-900 transition-all flex items-center justify-center gap-2"
               >
                  View Analytics <ChevronRight className="w-4 h-4" />
               </button>
            </motion.div>
          ))}
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Prediction Analytics */}
          <div className="bg-white rounded-[40px] border border-gray-100 p-8 shadow-sm">
             <div className="flex items-center justify-between mb-10">
                <div>
                   <h4 className="text-lg font-black text-gray-900">Neural Performance</h4>
                   <p className="text-xs text-gray-400 font-medium">Real-time prediction accuracy trend</p>
                </div>
                <div className="px-4 py-2 bg-primary-50 rounded-xl text-primary-600 font-black text-xs">
                   +2.4% vs L7D
                </div>
             </div>
             
             <div className="h-48 flex items-end gap-3 px-4">
                {data.accuracy_trend.map((v: number, i: number) => (
                  <div key={i} className="flex-1 bg-primary-500/10 rounded-t-xl relative group transition-all hover:bg-primary-500/20" style={{ height: `${v}%` }}>
                     <div className="absolute top-0 left-0 right-0 h-1 bg-primary-500 rounded-full" />
                     <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-primary-900 text-white text-[10px] font-black px-2 py-1 rounded-lg pointer-events-none">
                        {v}%
                     </div>
                  </div>
                ))}
             </div>
             <div className="mt-6 flex justify-between px-4">
                {['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'].map((t, i) => (
                  <span key={i} className="text-[10px] font-black text-gray-300 uppercase">{t}</span>
                ))}
             </div>
          </div>

          {/* Model Confidence Distribution */}
          <div className="bg-primary-900 rounded-[40px] p-8 text-white shadow-xl relative overflow-hidden">
             <div className="relative z-10">
                <div className="flex items-center justify-between mb-10">
                   <div>
                      <h4 className="text-lg font-black">Confidence Index</h4>
                      <p className="text-xs text-white/60 font-medium">Platform-wide average confidence</p>
                   </div>
                   <div className="text-4xl font-black">{data.stats.avg_confidence}%</div>
                </div>

                <div className="space-y-6">
                   {data.confidence_distribution.map((v: number, i: number) => (
                     <div key={i} className="space-y-2">
                        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-white/40">
                           <span>{(i + 5) * 10}% - {(i + 6) * 10}% Interval</span>
                           <span>{v}% Density</span>
                        </div>
                        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                           <motion.div 
                             initial={{ width: 0 }}
                             animate={{ width: `${v * 4}%` }}
                             className="h-full bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)]" 
                           />
                        </div>
                     </div>
                   ))}
                </div>
             </div>
             {/* Decorative Background Element */}
             <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none" />
          </div>
       </div>

       {/* System Status Grid */}
       <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-3xl border border-gray-100 p-6 flex items-center gap-4 shadow-sm">
             <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                <Zap className="w-6 h-6" />
             </div>
             <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Throughput</p>
                <p className="text-lg font-black text-gray-900">{data.stats.throughput}</p>
             </div>
          </div>
          <div className="bg-white rounded-3xl border border-gray-100 p-6 flex items-center gap-4 shadow-sm">
             <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600">
                <Layers className="w-6 h-6" />
             </div>
             <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Active Jobs</p>
                <p className="text-lg font-black text-gray-900">{data.stats.active_jobs} Pipeline</p>
             </div>
          </div>
          <div className="bg-white rounded-3xl border border-gray-100 p-6 flex items-center gap-4 shadow-sm">
             <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center text-green-600">
                <Cpu className="w-6 h-6" />
             </div>
             <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Infra Load</p>
                <p className="text-lg font-black text-gray-900">{data.stats.gpu_load}% GPU</p>
             </div>
          </div>
          <div className="bg-white rounded-3xl border border-gray-100 p-6 flex items-center gap-4 shadow-sm">
             <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center text-red-600">
                <ShieldAlert className="w-6 h-6" />
             </div>
             <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Failure Rate</p>
                <p className="text-lg font-black text-gray-900">{data.stats.failures_24h}.00%</p>
             </div>
          </div>
        </div>

        {/* Analytics Side Drawer */}
        <AnimatePresence>
           {selectedModel && (
             <>
               <motion.div 
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 exit={{ opacity: 0 }}
                 onClick={() => {
                   setSelectedModel(null);
                   setShowSettings(false);
                 }}
                 className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
               />
               <motion.div 
                 initial={{ x: '100%' }}
                 animate={{ x: 0 }}
                 exit={{ x: '100%' }}
                 transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                 className="fixed right-0 top-0 bottom-0 w-[500px] bg-white z-[101] shadow-2xl p-12 overflow-y-auto"
               >
                  <div className="flex items-center justify-between mb-12">
                     <div className="w-16 h-16 bg-primary-900 rounded-3xl flex items-center justify-center text-white">
                        <Brain className="w-8 h-8" />
                     </div>
                     <button 
                       onClick={() => {
                         setSelectedModel(null);
                         setShowSettings(false);
                       }}
                       className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 hover:text-gray-900 transition-all"
                     >
                        <X className="w-6 h-6" />
                     </button>
                  </div>

                  <div className="mb-12">
                     <div className="flex items-center gap-3 mb-2">
                        <h2 className="text-3xl font-black text-gray-900">{selectedModel.name}</h2>
                        <span className="px-3 py-1 bg-green-500 text-white rounded-full text-[10px] font-black uppercase tracking-widest">
                           {selectedModel.status}
                        </span>
                     </div>
                     <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Production Engine • Version {selectedModel.version}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-12">
                     <div className="bg-gray-50 rounded-3xl p-6">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Logic-Gates</p>
                        <p className="text-xl font-black text-gray-900">12.4M Parameters</p>
                     </div>
                     <div className="bg-gray-50 rounded-3xl p-6">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Avg Inference</p>
                        <p className="text-xl font-black text-gray-900">{selectedModel.latency}</p>
                     </div>
                  </div>

                  <div className="space-y-8">
                    {showSettings ? (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-gray-50 rounded-[32px] p-8 border border-gray-100 space-y-6"
                      >
                         <h4 className="font-black text-gray-900 uppercase tracking-widest text-[10px] mb-2">Neural Configuration</h4>
                         
                         <div className="space-y-4">
                            {[
                              { label: 'Estimators (Trees)', key: 'n_estimators', type: 'number' },
                              { label: 'Max Depth', key: 'max_depth', type: 'number' },
                              { label: 'Learning Rate', key: 'learning_rate', type: 'number', step: '0.01' },
                              { label: 'Training Samples', key: 'samples', type: 'number' }
                            ].map((field) => (
                              <div key={field.key} className="space-y-1.5">
                                 <label className="text-[10px] font-black text-gray-400 uppercase tracking-tighter pl-1">{field.label}</label>
                                 <input 
                                   type={field.type}
                                   step={field.step}
                                   value={modelSettings?.[field.key] || ''}
                                   onChange={(e) => setModelSettings({ ...modelSettings, [field.key]: parseFloat(e.target.value) })}
                                   className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-primary-500/20 outline-none transition-all"
                                 />
                              </div>
                            ))}
                         </div>

                         <div className="pt-4 flex gap-3">
                            <button 
                              onClick={() => handleUpdateSettings(selectedModel.name)}
                              className="flex-1 bg-primary-900 text-white rounded-xl py-3 text-xs font-black uppercase tracking-widest shadow-lg shadow-primary-900/10"
                            >
                              Save Settings
                            </button>
                            <button 
                              onClick={() => setShowSettings(false)}
                              className="px-6 bg-white border border-gray-200 rounded-xl py-3 text-xs font-black text-gray-400 uppercase tracking-widest"
                            >
                              Cancel
                            </button>
                         </div>
                      </motion.div>
                    ) : (
                      <>
                        <div>
                           <div className="flex items-center justify-between mb-6">
                              <h4 className="font-black text-gray-900 uppercase tracking-widest text-xs">Neural Confidence Trend</h4>
                              <div className="flex items-center gap-2 text-green-500 text-[10px] font-black">
                                 <TrendingUp className="w-3 h-3" /> STABLE
                              </div>
                           </div>
                           <div className="h-40 flex items-end gap-2 bg-gray-50/50 p-6 rounded-3xl border border-dashed border-gray-200">
                              {[40, 60, 45, 90, 85, 98, 92, 95].map((h, i) => (
                                <div key={i} className="flex-1 bg-primary-900 rounded-t-lg transition-all hover:bg-primary-600" style={{ height: `${h}%` }} />
                              ))}
                           </div>
                        </div>

                        <div>
                           <h4 className="font-black text-gray-900 uppercase tracking-widest text-xs mb-6">Internal Service Health</h4>
                           <div className="space-y-4">
                              {[
                                { name: 'Model Weights API', status: 'HEALTHY', latency: '12ms' },
                                { name: 'Vector Database', status: 'HEALTHY', latency: '4ms' },
                                { name: 'Feature Engineering', status: 'DEGRADED', latency: '120ms' }
                              ].map((s, i) => (
                                <div key={i} className="flex items-center justify-between p-4 border border-gray-100 rounded-2xl">
                                   <div className="flex items-center gap-3">
                                      <div className={cn("w-2 h-2 rounded-full", s.status === 'HEALTHY' ? "bg-green-500" : "bg-amber-500")} />
                                      <span className="text-sm font-black text-gray-700">{s.name}</span>
                                   </div>
                                   <span className="text-[10px] font-black text-gray-400">{s.latency}</span>
                                </div>
                              ))}
                           </div>
                        </div>
                      </>
                    )}
                  </div>

                   <div className="mt-12 flex gap-4">
                      <button 
                        disabled={isRetraining}
                        onClick={() => handleRetrain(selectedModel.name)}
                        className="flex-1 btn-primary rounded-2xl py-4 font-black text-sm shadow-xl shadow-primary-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                         {isRetraining ? (
                           <>
                             <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                             Retraining...
                           </>
                         ) : 'Retrain Model'}
                      </button>
                      <button 
                        onClick={() => {
                          setShowSettings(!showSettings);
                          if (!showSettings) setModelSettings(selectedModel.settings);
                        }}
                        className={cn(
                          "px-6 py-4 border rounded-2xl transition-all",
                          showSettings ? "bg-primary-50 border-primary-200 text-primary-600" : "border-gray-100 text-gray-400 hover:bg-gray-50"
                        )}
                      >
                         <Settings2 className="w-5 h-5" />
                      </button>
                   </div>
               </motion.div>
             </>
           )}
        </AnimatePresence>
     </div>
   );
 }

// ── Platform Analytics View ────────────────────────

function PlatformAnalyticsView({ data }: { data: any }) {
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
  const [showGoals, setShowGoals] = useState(false);
  const [goals, setGoals] = useState<any[]>([]);
  const [isExporting, setIsExporting] = useState(false);

  if (!data?.growth) return null;

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const res = await platformAdminService.exportAnalyticsReport();
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Novelle_Platform_Audit_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      toast.success('Platform audit report exported successfully');
    } catch (err) {
      toast.error('Report export failed');
    } finally {
      setIsExporting(false);
    }
  };

  const handleShowGoals = async () => {
    try {
      const res = await platformAdminService.getStrategicGoals();
      setGoals(res.data.goals);
      setShowGoals(true);
    } catch (err) {
      toast.error('Failed to load strategic goals');
    }
  };

  return (
    <div className="space-y-8 pb-20">
       <div className="flex items-center justify-between">
          <div>
             <h3 className="text-2xl font-black text-gray-900">Platform Intelligence</h3>
             <p className="text-sm text-gray-500 font-medium">Cross-institutional clinical & business insights</p>
          </div>
          <div className="flex gap-4">
             <button 
               onClick={handleExport}
               disabled={isExporting}
               className="px-6 py-3 bg-white border border-gray-100 rounded-2xl text-sm font-black text-gray-600 hover:bg-gray-50 transition-all flex items-center gap-2"
             >
                <FileBarChart className="w-4 h-4" /> {isExporting ? 'Exporting...' : 'Export Report'}
             </button>
             <button 
               onClick={handleShowGoals}
               className="btn-primary rounded-2xl px-6 py-3 flex items-center gap-2 shadow-xl shadow-primary-500/20"
             >
                <Target className="w-5 h-5" /> Strategic Goals
             </button>
          </div>
       </div>

       {/* Top Metrics Grid */}
       <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm">
             <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center text-green-600">
                   <Users className="w-5 h-5" />
                </div>
                <div className="flex items-center text-[10px] font-black text-green-600 bg-green-50 px-2 py-0.5 rounded-lg">
                   <TrendingUp className="w-3 h-3 mr-1" /> 12%
                </div>
             </div>
             <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Patients</p>
             <p className="text-2xl font-black text-gray-900">{data.growth?.patients?.[data.growth.patients.length - 1]?.toLocaleString() || '0'}</p>
             
             <button 
               onClick={() => setSelectedMetric('patients')}
               className="w-full mt-8 py-4 border border-gray-100 rounded-3xl text-[10px] font-black text-gray-400 uppercase tracking-widest group-hover:bg-primary-900 group-hover:text-white group-hover:border-primary-900 transition-all flex items-center justify-center gap-2"
             >
                View Analytics <ChevronRight className="w-4 h-4" />
             </button>
          </div>
          <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm">
             <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                   <Building2 className="w-5 h-5" />
                </div>
                <div className="flex items-center text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg">
                   <TrendingUp className="w-3 h-3 mr-1" /> 4%
                </div>
             </div>
             <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Active Hospitals</p>
             <p className="text-2xl font-black text-gray-900">{data.growth.hospitals[data.growth.hospitals.length - 1]}</p>

             <button 
               onClick={() => setSelectedMetric('hospitals')}
               className="w-full mt-8 py-4 border border-gray-100 rounded-3xl text-[10px] font-black text-gray-400 uppercase tracking-widest group-hover:bg-primary-900 group-hover:text-white group-hover:border-primary-900 transition-all flex items-center justify-center gap-2"
             >
                View Analytics <ChevronRight className="w-4 h-4" />
             </button>
          </div>
          <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm">
             <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600">
                   <Activity className="w-5 h-5" />
                </div>
                <div className="flex items-center text-[10px] font-black text-green-600 bg-green-50 px-2 py-0.5 rounded-lg">
                   <TrendingUp className="w-3 h-3 mr-1" /> 18%
                </div>
             </div>
             <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Outcome Improvement</p>
             <p className="text-2xl font-black text-gray-900">+{data.health_insights.outcome_improvement}%</p>

             <button 
               onClick={() => setSelectedMetric('outcomes')}
               className="w-full mt-8 py-4 border border-gray-100 rounded-3xl text-[10px] font-black text-gray-400 uppercase tracking-widest group-hover:bg-primary-900 group-hover:text-white group-hover:border-primary-900 transition-all flex items-center justify-center gap-2"
             >
                View Analytics <ChevronRight className="w-4 h-4" />
             </button>
          </div>
          <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm">
             <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-red-600">
                   <ShieldAlert className="w-5 h-5" />
                </div>
                <div className="flex items-center text-[10px] font-black text-red-600 bg-red-50 px-2 py-0.5 rounded-lg">
                   <TrendingDown className="w-3 h-3 mr-1" /> 2%
                </div>
             </div>
             <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">High Risk Density</p>
             <p className="text-2xl font-black text-gray-900">{data.health_insights.high_risk_cases}%</p>

             <button 
               onClick={() => setSelectedMetric('risk')}
               className="w-full mt-8 py-4 border border-gray-100 rounded-3xl text-[10px] font-black text-gray-400 uppercase tracking-widest group-hover:bg-primary-900 group-hover:text-white group-hover:border-primary-900 transition-all flex items-center justify-center gap-2"
             >
                View Analytics <ChevronRight className="w-4 h-4" />
             </button>
          </div>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Growth Chart */}
          <div className="bg-white rounded-[40px] border border-gray-100 p-10 shadow-sm">
             <div className="flex items-center justify-between mb-10">
                <div>
                   <h4 className="text-xl font-black text-gray-900">Platform Scaling</h4>
                   <p className="text-sm text-gray-500 font-medium">Monthly revenue & user growth velocity</p>
                </div>
                <div className="flex gap-2">
                   <button className="px-3 py-1 bg-primary-50 text-primary-600 text-[10px] font-black rounded-lg">6 MONTHS</button>
                </div>
             </div>
             
             <div className="h-64 flex items-end gap-4 px-4">
                {data.growth.revenue.map((v: number, i: number) => (
                  <div key={i} className="flex-1 group relative h-full flex flex-col justify-end">
                     {/* Revenue Bar */}
                     <motion.div 
                        initial={{ height: 0 }}
                        animate={{ height: `${(v / 800) * 100}%` }}
                        className="w-full bg-primary-500 rounded-t-xl relative z-10 hover:bg-primary-600 transition-all cursor-pointer"
                     >
                        <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-primary-900 text-white text-[10px] font-black px-2 py-1 rounded-lg pointer-events-none">
                           ${v}k
                        </div>
                     </motion.div>
                     {/* Patients Dot (Overlay) */}
                     <div 
                        className="absolute left-1/2 -translate-x-1/2 w-2 h-2 bg-purple-500 rounded-full border-2 border-white shadow-sm z-20"
                        style={{ bottom: `${(data.growth.patients[i] / 15000) * 100}%` }}
                     />
                  </div>
                ))}
             </div>
             <div className="mt-6 flex justify-between px-4 border-t border-gray-50 pt-4">
                {['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN'].map((m, i) => (
                  <span key={i} className="text-[10px] font-black text-gray-300 uppercase tracking-widest">{m}</span>
                ))}
             </div>
          </div>

          {/* Regional Health Index */}
          <div className="bg-primary-900 rounded-[40px] p-10 text-white shadow-xl relative overflow-hidden">
             <div className="relative z-10 h-full flex flex-col">
                <div className="flex items-center justify-between mb-10">
                   <div>
                      <h4 className="text-xl font-black">Regional Health Audits</h4>
                      <p className="text-sm text-white/50 font-medium">Institutional health index by territory</p>
                   </div>
                   <Map className="w-8 h-8 text-white/20" />
                </div>

                <div className="flex-1 space-y-8">
                   {data.regional_health.map((reg: any, i: number) => (
                     <div key={i} className="space-y-3">
                        <div className="flex justify-between items-end">
                           <div>
                              <p className="text-sm font-black">{reg.region}</p>
                              <div className={cn(
                                "text-[9px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded border inline-block",
                                reg.risk_level === 'LOW' ? "bg-green-500/20 text-green-300 border-green-500/30" : 
                                reg.risk_level === 'MEDIUM' ? "bg-amber-500/20 text-amber-300 border-amber-500/30" : 
                                "bg-red-500/20 text-red-300 border-red-500/30"
                              )}>
                                 {reg.risk_level} RISK
                              </div>
                           </div>
                           <p className="text-2xl font-black">{reg.health_index}%</p>
                        </div>
                        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                           <motion.div 
                             initial={{ width: 0 }}
                             animate={{ width: `${reg.health_index}%` }}
                             className="h-full bg-white rounded-full" 
                           />
                        </div>
                     </div>
                   ))}
                </div>
             </div>
             {/* Abstract Grid Pattern */}
             <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
          </div>
       </div>

       {/* Strategic Goals Modal */}
       <AnimatePresence>
          {showGoals && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
               <motion.div 
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 exit={{ opacity: 0 }}
                 onClick={() => setShowGoals(false)}
                 className="absolute inset-0 bg-black/40 backdrop-blur-sm"
               />
               <motion.div 
                 initial={{ opacity: 0, y: 20, scale: 0.95 }}
                 animate={{ opacity: 1, y: 0, scale: 1 }}
                 exit={{ opacity: 0, y: 20, scale: 0.95 }}
                 className="relative w-full max-w-2xl bg-white rounded-[48px] p-10 shadow-2xl overflow-hidden"
               >
                  <div className="absolute top-0 right-0 p-8">
                     <button onClick={() => setShowGoals(false)} className="p-2 hover:bg-gray-100 rounded-full transition-all">
                        <X className="w-6 h-6 text-gray-400" />
                     </button>
                  </div>

                  <div className="flex items-center gap-4 mb-8">
                     <div className="w-16 h-16 bg-primary-900 rounded-3xl flex items-center justify-center text-white">
                        <Target className="w-8 h-8" />
                     </div>
                     <div>
                        <h3 className="text-3xl font-black text-gray-900">Strategic Governance</h3>
                        <p className="text-gray-500 font-medium">Platform-wide KPIs & institutional targets</p>
                     </div>
                  </div>

                  <div className="grid grid-cols-1 gap-6 mb-8">
                     {goals.map((goal, i) => (
                       <div key={i} className="bg-gray-50 rounded-3xl p-8 border border-gray-100 group hover:border-primary-200 transition-all">
                          <div className="flex items-center justify-between mb-4">
                             <div>
                                <h4 className="text-lg font-black text-gray-900">{goal.title}</h4>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{goal.metric}</p>
                             </div>
                             <span className={cn(
                               "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                               goal.status === 'ON_TRACK' ? "bg-green-500 text-white" : 
                               goal.status === 'AT_RISK' ? "bg-red-500 text-white" : "bg-blue-500 text-white"
                             )}>
                                {goal.status.replace('_', ' ')}
                             </span>
                          </div>
                          
                          <div className="flex items-center gap-8">
                             <div className="flex-1">
                                <div className="flex justify-between text-[10px] font-black uppercase mb-2">
                                   <span className="text-gray-400">Completion</span>
                                   <span className="text-gray-900">{Math.round((goal.current / goal.target) * 100)}%</span>
                                </div>
                                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                   <div 
                                     className={cn(
                                       "h-full rounded-full transition-all duration-1000",
                                       goal.status === 'ON_TRACK' ? "bg-green-500" : 
                                       goal.status === 'AT_RISK' ? "bg-red-500" : "bg-blue-500"
                                     )} 
                                     style={{ width: `${Math.min((goal.current / goal.target) * 100, 100)}%` }} 
                                   />
                                </div>
                             </div>
                             <div className="text-right">
                                <p className="text-2xl font-black text-gray-900">{goal.current}{goal.unit}</p>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Target: {goal.target}{goal.unit}</p>
                             </div>
                          </div>
                       </div>
                     ))}
                  </div>

                  <button 
                    onClick={() => setShowGoals(false)}
                    className="w-full btn-primary rounded-3xl py-4 font-black shadow-xl shadow-primary-500/20"
                  >
                     ACKNOWLEDGE TARGETS
                  </button>
               </motion.div>
            </div>
          )}
       </AnimatePresence>

       {/* Risk Distribution & Population Analytics */}
       <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white rounded-[40px] border border-gray-100 p-8 shadow-sm col-span-2">
             <div className="flex items-center justify-between mb-8">
                <h4 className="text-lg font-black text-gray-900">Maternal Risk Trends</h4>
                <div className="flex items-center gap-4 text-xs font-black text-gray-400">
                   <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 bg-primary-500 rounded-full" /> HIGH RISK
                   </div>
                   <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 bg-gray-200 rounded-full" /> CONTROL GROUP
                   </div>
                </div>
             </div>
             <div className="h-40 flex items-end gap-1.5">
                {data.risk_trends.map((v: number, i: number) => (
                  <div key={i} className="flex-1 group relative">
                     <motion.div 
                        initial={{ height: 0 }}
                        animate={{ height: `${v * 6}%` }}
                        className="w-full bg-primary-500/10 rounded-t-lg group-hover:bg-primary-500/20 transition-all border-t-2 border-primary-500"
                     />
                  </div>
                ))}
             </div>
             <p className="mt-6 text-xs text-center text-gray-400 font-bold uppercase tracking-widest">Global Risk Distribution - Last 6 Months</p>
          </div>

          <div className="bg-white rounded-[40px] border border-gray-100 p-8 shadow-sm flex flex-col justify-center text-center">
             <div className="w-20 h-20 bg-primary-50 rounded-full flex items-center justify-center text-primary-600 mx-auto mb-6">
                <PieChart className="w-10 h-10" />
             </div>
             <h4 className="text-xl font-black text-gray-900 mb-2">Care Efficiency</h4>
             <p className="text-sm text-gray-500 font-medium mb-6">Platform-wide average care standard achievement</p>
             <div className="text-5xl font-black text-primary-600 mb-2">{data.health_insights.avg_care_score}%</div>
             <p className="text-[10px] font-black text-green-600 uppercase tracking-widest">+5.2% ACHIEVED THIS MONTH</p>
          </div>
       </div>

       {/* Metric Analytics Drawer */}
       <AnimatePresence>
          {selectedMetric && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedMetric(null)}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
              />
              <motion.div 
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed right-0 top-0 bottom-0 w-[550px] bg-white z-[101] shadow-2xl p-12 overflow-y-auto"
              >
                 <div className="flex items-center justify-between mb-12">
                    <div className="w-16 h-16 bg-primary-900 rounded-3xl flex items-center justify-center text-white">
                       <Activity className="w-8 h-8" />
                    </div>
                    <button 
                      onClick={() => setSelectedMetric(null)}
                      className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 hover:text-gray-900 transition-all"
                    >
                       <X className="w-6 h-6" />
                    </button>
                 </div>

                 <div className="mb-12">
                    <h2 className="text-3xl font-black text-gray-900 capitalize">{selectedMetric.replace('_', ' ')} Analytics</h2>
                    <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Production Database Audit • {new Date().toLocaleDateString()}</p>
                 </div>

                 {selectedMetric === 'patients' && (
                   <div className="space-y-12">
                      <div className="grid grid-cols-2 gap-4">
                         <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Pregnant Users</p>
                            <p className="text-3xl font-black text-primary-900">{data.demographics?.pregnant || 0}</p>
                         </div>
                         <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Postpartum</p>
                            <p className="text-3xl font-black text-primary-900">{data.demographics?.postpartum || 0}</p>
                         </div>
                      </div>

                      <div>
                         <h4 className="font-black text-gray-900 uppercase tracking-widest text-xs mb-6">Clinical Trimester Velocity</h4>
                         <div className="space-y-6">
                            {[
                              { label: 'First Trimester', val: data.demographics?.trimesters?.first || 0, color: 'bg-blue-500' },
                              { label: 'Second Trimester', val: data.demographics?.trimesters?.second || 0, color: 'bg-purple-500' },
                              { label: 'Third Trimester', val: data.demographics?.trimesters?.third || 0, color: 'bg-pink-500' }
                            ].map((t, i) => (
                              <div key={i} className="space-y-2">
                                 <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-gray-400">
                                    <span>{t.label}</span>
                                    <span className="text-gray-900">{t.val} patients</span>
                                 </div>
                                 <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                    <motion.div 
                                      initial={{ width: 0 }}
                                      animate={{ width: data.demographics?.pregnant ? `${(t.val / data.demographics.pregnant) * 100}%` : '0%' }}
                                      className={cn("h-full rounded-full", t.color)}
                                    />
                                 </div>
                              </div>
                            ))}
                         </div>
                      </div>

                      <div>
                         <h4 className="font-black text-gray-900 uppercase tracking-widest text-xs mb-6">Clinical Baselines (Avg)</h4>
                         <div className="grid grid-cols-2 gap-8">
                            <div>
                               <p className="text-4xl font-black text-gray-900">{data.clinical_stats?.avg_hb} g/dL</p>
                               <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Hemoglobin Index</p>
                            </div>
                            <div>
                               <p className="text-4xl font-black text-gray-900">{data.clinical_stats?.avg_age} yrs</p>
                               <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Mean Patient Age</p>
                            </div>
                         </div>
                      </div>
                   </div>
                 )}

                 {selectedMetric === 'hospitals' && (
                   <div className="space-y-8">
                      <h4 className="font-black text-gray-900 uppercase tracking-widest text-xs mb-6">Institutional Performance Index</h4>
                      <div className="space-y-4">
                         {data.regional_health.map((reg: any, i: number) => (
                           <div key={i} className="p-6 bg-gray-50 rounded-3xl border border-gray-100 flex items-center justify-between">
                              <div>
                                 <p className="text-sm font-black text-gray-900">{reg.region}</p>
                                 <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Oversight Priority: {reg.risk_level}</p>
                              </div>
                              <div className="text-right">
                                 <p className="text-2xl font-black text-primary-900">{reg.health_index}%</p>
                                 <p className="text-[10px] font-black text-green-600 uppercase tracking-widest">Stable</p>
                              </div>
                           </div>
                         ))}
                      </div>
                   </div>
                 )}

                 {(selectedMetric === 'outcomes' || selectedMetric === 'risk') && (
                   <div className="space-y-8">
                      <div className="bg-primary-900 rounded-[40px] p-8 text-white">
                         <h4 className="text-xl font-black mb-2">Neural Risk Forecast</h4>
                         <p className="text-sm text-white/50 mb-8">Aggregated population risk vectors across all clinical domains.</p>
                         <div className="space-y-6">
                            {['Physical Risk', 'Mental Risk', 'Fetal Health'].map((r, i) => (
                              <div key={i} className="space-y-2">
                                 <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-white/40">
                                    <span>{r}</span>
                                    <span className="text-white">{85 - i * 5}% Optimal</span>
                                 </div>
                                 <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                                    <div className="h-full bg-white rounded-full" style={{ width: `${85 - i * 5}%` }} />
                                 </div>
                              </div>
                            ))}
                         </div>
                      </div>
                   </div>
                 )}

                 <div className="mt-12">
                    <button className="w-full btn-primary rounded-2xl py-4 font-black text-sm shadow-xl shadow-primary-500/20">
                       Export Detailed Dataset (.CSV)
                    </button>
                 </div>
              </motion.div>
            </>
          )}
       </AnimatePresence>
    </div>
  );
}

// ── Escalation Monitor View ───────────────────────

function EscalationMonitorView({ data }: { data: any }) {
  const [selectedEscalation, setSelectedEscalation] = useState<any>(null);
  const [auditData, setAuditData] = useState<any>(null);
  const [isAuditing, setIsAuditing] = useState(false);
  const [isPriorityOnly, setIsPriorityOnly] = useState(false);

  if (!data?.critical_cases) return null;

  const handleAudit = async (escId: number) => {
    try {
      setIsAuditing(true);
      const res = await platformAdminService.getEscalationAudit(escId);
      setAuditData(res.data);
      setSelectedEscalation(escId);
    } catch (err) {
      toast.error('Failed to retrieve escalation audit trail');
    } finally {
      setIsAuditing(false);
    }
  };

  const filteredCases = isPriorityOnly 
    ? data.critical_cases.filter((c: any) => c.risk === 'CRITICAL' || c.risk === 'EMERGENCY')
    : data.critical_cases;

  return (
    <div className={cn("space-y-8 pb-20 transition-all duration-500", isPriorityOnly && "bg-red-50/30 p-8 rounded-[60px] ring-4 ring-red-500/10")}>
       <div className="flex items-center justify-between">
          <div>
             <div className="flex items-center gap-3 mb-1">
                <h3 className="text-2xl font-black text-gray-900">Escalation Monitor</h3>
                {isPriorityOnly && (
                  <span className="px-3 py-1 bg-red-600 text-white text-[10px] font-black rounded-full animate-pulse uppercase tracking-widest">
                    High-Priority Triage Active
                  </span>
                )}
             </div>
             <p className="text-sm text-gray-500 font-medium">Real-time global oversight of high-risk clinical events</p>
          </div>
          <div className="flex gap-4">
             <button 
               onClick={() => {
                 setIsPriorityOnly(false);
                 toast.success('Institutional governance oversight activated: High-precision auditing enabled');
               }}
               className={cn(
                 "px-6 py-3 border rounded-2xl text-sm font-black transition-all flex items-center gap-2",
                 !isPriorityOnly ? "bg-primary-900 text-white border-primary-900 shadow-xl shadow-primary-900/20" : "bg-white border-gray-100 text-gray-600 hover:bg-gray-50"
               )}
             >
                <ShieldCheck className="w-4 h-4" /> Governance Mode
             </button>
             <button 
               onClick={() => {
                 setIsPriorityOnly(true);
                 toast.error('Emergency Response Protocol initialized: Global facility channels prioritized');
               }}
               className={cn(
                 "rounded-2xl px-6 py-3 flex items-center gap-2 transition-all",
                 isPriorityOnly 
                   ? "bg-red-600 text-white shadow-xl shadow-red-600/40 ring-4 ring-red-600/10" 
                   : "bg-white border border-gray-100 text-red-600 hover:bg-red-50"
               )}
             >
                <Siren className="w-5 h-5" /> Emergency Protocol
             </button>
          </div>
       </div>

       {/* Live Escalation Feed */}
       <div className={cn(
         "bg-white rounded-[40px] border shadow-sm overflow-hidden transition-all duration-500",
         isPriorityOnly ? "border-red-200" : "border-gray-100"
       )}>
          <div className={cn(
            "px-8 py-6 border-b flex items-center justify-between transition-colors",
            isPriorityOnly ? "bg-red-50/50 border-red-100" : "bg-gray-50/30 border-gray-50"
          )}>
             <div className="flex items-center gap-2">
                <div className={cn("w-2 h-2 rounded-full animate-pulse", isPriorityOnly ? "bg-red-600" : "bg-red-500")} />
                <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest">
                  {isPriorityOnly ? 'Priority Emergency Stream' : 'Active High-Risk Stream'}
                </h4>
             </div>
             <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                Last updated: 12 seconds ago
             </div>
          </div>
          <div className="overflow-x-auto">
             <table className="w-full text-left border-collapse">
                <thead>
                   <tr className={cn(
                     "border-b transition-colors",
                     isPriorityOnly ? "bg-red-50/20 border-red-50" : "bg-gray-50/20 border-gray-50"
                   )}>
                      <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Case ID</th>
                      <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Patient / Hospital</th>
                      <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Condition</th>
                      <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Risk Level</th>
                      <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Wait Time</th>
                      <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                      <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Oversight</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                   <AnimatePresence mode="popLayout">
                     {filteredCases.map((esc: any) => (
                       <motion.tr 
                         key={esc.id}
                         layout
                         initial={{ opacity: 0, x: -20 }}
                         animate={{ opacity: 1, x: 0 }}
                         exit={{ opacity: 0, scale: 0.95 }}
                         className="group hover:bg-gray-50/50 transition-all"
                       >
                          <td className="px-8 py-6">
                             <span className="text-xs font-black text-gray-400">#{esc.id}</span>
                          </td>
                          <td className="px-8 py-6">
                             <div>
                                <p className="text-sm font-black text-gray-900">{esc.patient}</p>
                                <p className="text-[10px] text-gray-400 font-bold uppercase">{esc.hospital}</p>
                             </div>
                          </td>
                          <td className="px-8 py-6">
                             <span className="text-xs font-bold text-gray-600">{esc.type}</span>
                          </td>
                          <td className="px-8 py-6">
                             <span className={cn(
                               "px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest border",
                               esc.risk === 'CRITICAL' ? "bg-red-900 text-white border-red-900 shadow-lg shadow-red-900/20" :
                               esc.risk === 'EMERGENCY' ? "bg-red-50 text-red-700 border-red-100" :
                               "bg-amber-50 text-amber-700 border-amber-100"
                             )}>
                                {esc.risk}
                             </span>
                          </td>
                          <td className="px-8 py-6">
                             <div className="flex items-center gap-2">
                                <Clock className={cn("w-3 h-3", esc.timer.includes('m') && parseInt(esc.timer) < 10 ? "text-red-500 animate-pulse" : "text-gray-400")} />
                                <span className="text-xs font-black text-gray-900">{esc.timer}</span>
                             </div>
                          </td>
                          <td className="px-8 py-6">
                             <div className="flex items-center gap-2">
                                <div className={cn("w-1.5 h-1.5 rounded-full", esc.status === 'PENDING' ? "bg-amber-500" : "bg-green-500")} />
                                <span className="text-[10px] font-black uppercase tracking-widest">{esc.status}</span>
                             </div>
                          </td>
                          <td className="px-8 py-6 text-right">
                             <button 
                                onClick={() => handleAudit(esc.db_id)}
                                disabled={isAuditing && selectedEscalation === esc.db_id}
                                className={cn(
                                  "px-4 py-2 text-[10px] font-black rounded-xl transition-all disabled:opacity-50",
                                  isPriorityOnly ? "bg-red-600 text-white hover:bg-red-700" : "bg-primary-900 text-white hover:bg-black"
                                )}
                             >
                                {isAuditing && selectedEscalation === esc.db_id ? 'AUDITING...' : 'AUDIT CASE'}
                             </button>
                          </td>
                       </motion.tr>
                     ))}
                   </AnimatePresence>
                   {filteredCases.length === 0 && (
                     <tr>
                        <td colSpan={7} className="px-8 py-20 text-center">
                           <div className="flex flex-col items-center justify-center text-gray-400">
                              <ShieldCheck className="w-12 h-12 mb-4 opacity-20" />
                              <p className="text-lg font-black">No Priority Cases Detected</p>
                              <p className="text-xs font-medium">All clinical metrics are currently within stable oversight parameters.</p>
                           </div>
                        </td>
                     </tr>
                   )}
                </tbody>
             </table>
          </div>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Institutional Response Audits */}
          <div className="bg-white rounded-[40px] border border-gray-100 p-10 shadow-sm">
             <div className="flex items-center justify-between mb-10">
                <div>
                   <h4 className="text-xl font-black text-gray-900">Hospital Performance</h4>
                   <p className="text-sm text-gray-500 font-medium">Critical response velocity monitoring</p>
                </div>
                <div className="px-4 py-2 bg-gray-50 rounded-xl text-gray-400 font-black text-[10px] uppercase">
                   AVG: {data.stats.avg_response_time}
                </div>
             </div>
             
             <div className="space-y-6">
                {data.hospital_performance.map((hosp: any, i: number) => (
                  <div key={i} className="group cursor-pointer">
                     <div className="flex justify-between items-center mb-2">
                        <div>
                           <p className="text-sm font-black text-gray-900">{hosp.name}</p>
                           <p className="text-[10px] text-gray-400 font-bold uppercase">{hosp.load}% Network Load</p>
                        </div>
                        <div className="text-right">
                           <p className="text-lg font-black text-primary-600">{hosp.response}</p>
                           <p className="text-[9px] text-gray-400 font-black uppercase">RESPONSE TIME</p>
                        </div>
                     </div>
                     <div className="h-2 bg-gray-50 rounded-full overflow-hidden">
                        <motion.div 
                           initial={{ width: 0 }}
                           animate={{ width: `${(10 - parseFloat(hosp.response)) * 10}%` }}
                           className="h-full bg-primary-500 rounded-full"
                        />
                     </div>
                  </div>
                ))}
             </div>
          </div>

          {/* Alert Distribution */}
          <div className="bg-red-600 rounded-[40px] p-10 text-white shadow-xl relative overflow-hidden">
             <div className="relative z-10">
                <div className="flex items-center justify-between mb-10">
                   <div>
                      <h4 className="text-xl font-black">Escalation Velocity</h4>
                      <p className="text-sm text-white/60 font-medium">Platform-wide emergency trajectory</p>
                   </div>
                   <AlertCircle className="w-8 h-8 text-white/30" />
                </div>

                <div className="flex-1 space-y-8">
                   <div className="flex justify-between items-end border-b border-white/10 pb-6">
                      <div>
                         <p className="text-xs font-black uppercase tracking-widest text-white/50">Active Emergencies</p>
                         <p className="text-4xl font-black">{data.stats.active_emergencies}</p>
                      </div>
                      <div className="text-right">
                         <p className="text-xs font-black uppercase tracking-widest text-white/50">Unresolved (24h)</p>
                         <p className="text-4xl font-black text-amber-300">{data.stats.unresolved_24h}</p>
                      </div>
                   </div>
                   
                   <div className="space-y-4 pt-2">
                      <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-4">Response Efficiency Trend</p>
                      <div className="h-24 flex items-end gap-2">
                         {data.response_trend.map((v: number, i: number) => (
                           <motion.div 
                              key={i}
                              initial={{ height: 0 }}
                              animate={{ height: `${(10 - v) * 10}%` }}
                              className="flex-1 bg-white/20 rounded-t-lg border-t-2 border-white/60 hover:bg-white/40 transition-all cursor-pointer relative group"
                           >
                              <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-white text-red-600 text-[10px] font-black px-2 py-1 rounded-lg pointer-events-none">
                                 {v}m
                              </div>
                           </motion.div>
                         ))}
                      </div>
                      <div className="flex justify-between pt-2">
                         <span className="text-[9px] font-black text-white/30 uppercase">6H AGO</span>
                         <span className="text-[9px] font-black text-white/30 uppercase">NOW</span>
                      </div>
                   </div>
                </div>
             </div>
             {/* Background Glow */}
             <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
          </div>
       </div>

       {/* Global Analytics Preview */}
       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-3xl border border-gray-100 p-6 flex items-center gap-4 shadow-sm">
             <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center text-red-600">
                <Siren className="w-6 h-6" />
             </div>
             <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Escalations</p>
                <p className="text-lg font-black text-gray-900">{data.stats.total_resolved.toLocaleString()}</p>
             </div>
          </div>
          <div className="bg-white rounded-3xl border border-gray-100 p-6 flex items-center gap-4 shadow-sm">
             <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600">
                <PhoneForwarded className="w-6 h-6" />
             </div>
             <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Transfer Rate</p>
                <p className="text-lg font-black text-gray-900">4.2%</p>
             </div>
          </div>
          <div className="bg-white rounded-3xl border border-gray-100 p-6 flex items-center gap-4 shadow-sm">
             <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                <Activity className="w-6 h-6" />
             </div>
             <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Surv. Accuracy</p>
                <p className="text-lg font-black text-gray-900">99.8%</p>
             </div>
          </div>
       </div>

       {/* Audit Modal */}
       <AnimatePresence>
          {selectedEscalation && auditData && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
               <motion.div 
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 exit={{ opacity: 0 }}
                 onClick={() => setSelectedEscalation(null)}
                 className="absolute inset-0 bg-black/60 backdrop-blur-sm"
               />
               <motion.div 
                 initial={{ opacity: 0, scale: 0.9, y: 20 }}
                 animate={{ opacity: 1, scale: 1, y: 0 }}
                 exit={{ opacity: 0, scale: 0.9, y: 20 }}
                 className="relative w-full max-w-4xl bg-white rounded-[48px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
               >
                  <div className="p-10 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                     <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-red-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-red-600/20">
                           <Siren className="w-6 h-6" />
                        </div>
                        <div>
                           <h3 className="text-2xl font-black text-gray-900">Case Audit: #{auditData.escalation.id}</h3>
                           <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Global Clinical Oversight • Non-Repudiable Log</p>
                        </div>
                     </div>
                     <button 
                       onClick={() => setSelectedEscalation(null)}
                       className="w-12 h-12 bg-white border border-gray-100 rounded-2xl flex items-center justify-center text-gray-400 hover:text-gray-900 transition-all"
                     >
                        <X className="w-6 h-6" />
                     </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-10 space-y-10">
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="space-y-4">
                           <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Patient Profile</h4>
                           <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100">
                              <p className="text-lg font-black text-gray-900">{auditData.patient.name}</p>
                              <p className="text-xs text-gray-500 mb-4">{auditData.patient.email}</p>
                              <button className="text-[10px] font-black text-primary-600 hover:underline">VIEW FULL EHR</button>
                           </div>
                        </div>
                        <div className="space-y-4">
                           <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Institutional Care</h4>
                           <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100">
                              <p className="text-lg font-black text-gray-900">{auditData.hospital.name}</p>
                              <p className="text-xs text-gray-500 mb-4">{auditData.hospital.location}</p>
                              <button className="text-[10px] font-black text-primary-600 hover:underline">FACILITY STATS</button>
                           </div>
                        </div>
                        <div className="space-y-4">
                           <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Escalation Metadata</h4>
                           <div className="p-6 bg-gray-900 rounded-3xl text-white shadow-xl">
                              <p className="text-xs font-black uppercase tracking-widest opacity-50 mb-1">Risk Signature</p>
                              <p className="text-lg font-black mb-4">{auditData.escalation.risk_type.toUpperCase()} / {auditData.escalation.risk_level}</p>
                              <div className="flex items-center gap-2">
                                 <Clock className="w-3 h-3 opacity-50" />
                                 <span className="text-[10px] font-bold">{new Date(auditData.escalation.triggered_at).toLocaleString()}</span>
                              </div>
                           </div>
                        </div>
                     </div>

                     <div className="space-y-6">
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Trigger Reason & Neural Insight</h4>
                        <div className="p-8 bg-red-50 border border-red-100 rounded-[32px]">
                           <p className="text-red-900 font-medium leading-relaxed italic">
                              "{auditData.escalation.reason || 'No specific reason provided by trigger engine.'}"
                           </p>
                        </div>
                     </div>

                     {auditData.escalation.doctor_notes && (
                       <div className="space-y-6">
                          <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Clinical Response Notes</h4>
                          <div className="p-8 bg-blue-50 border border-blue-100 rounded-[32px]">
                             <p className="text-blue-900 font-medium leading-relaxed">
                                {auditData.escalation.doctor_notes}
                             </p>
                          </div>
                       </div>
                     )}

                     <div className="grid grid-cols-2 gap-8">
                        <div className="bg-gray-50 p-6 rounded-3xl flex items-center justify-between border border-gray-100">
                           <div>
                              <p className="text-[10px] font-black text-gray-400 uppercase">Resolution Status</p>
                              <p className="text-sm font-black text-gray-900 uppercase">{auditData.escalation.status}</p>
                           </div>
                           <div className={cn("w-3 h-3 rounded-full", auditData.escalation.status === 'resolved' ? 'bg-green-500' : 'bg-amber-500')} />
                        </div>
                        <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                           <p className="text-[10px] font-black text-gray-400 uppercase">Closure Timestamp</p>
                           <p className="text-sm font-black text-gray-900">
                              {auditData.escalation.resolved_at ? new Date(auditData.escalation.resolved_at).toLocaleString() : 'PENDING ACTION'}
                           </p>
                        </div>
                     </div>
                  </div>

                  <div className="p-10 bg-gray-50 border-t border-gray-100 flex gap-4">
                     <button 
                       onClick={() => setSelectedEscalation(null)}
                       className="flex-1 py-4 bg-white border border-gray-200 rounded-2xl text-xs font-black text-gray-500 uppercase tracking-widest hover:bg-gray-100 transition-all"
                     >
                        CLOSE AUDIT
                     </button>
                     <button 
                       onClick={() => toast.success('Secure case report is being compiled for download')}
                       className="flex-[2] py-4 bg-primary-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-primary-900/20 hover:bg-black transition-all"
                     >
                        DOWNLOAD CASE REPORT (PDF)
                     </button>
                  </div>
               </motion.div>
            </div>
          )}
       </AnimatePresence>
    </div>
  );
}

// ── Billing & Subscriptions View ──────────────────

function BillingSubscriptionsView({ data }: { data: any }) {
  if (!data?.plans || !data?.stats) return null;

  return (
    <div className="space-y-8 pb-20">
       <div className="flex items-center justify-between">
          <div>
             <h3 className="text-2xl font-black text-gray-900">Revenue Command Center</h3>
             <p className="text-sm text-gray-500 font-medium">Global SaaS monetization & institutional billing governance</p>
          </div>
          <div className="flex gap-4">
             <button className="px-6 py-3 bg-white border border-gray-100 rounded-2xl text-sm font-black text-gray-600 hover:bg-gray-50 transition-all flex items-center gap-2">
                <FileText className="w-4 h-4" /> Billing Policy
             </button>
             <button className="btn-primary rounded-2xl px-6 py-3 flex items-center gap-2 shadow-xl shadow-primary-500/20">
                <Plus className="w-5 h-5" /> Create Plan
             </button>
          </div>
       </div>

       {/* Financial Stats Grid */}
       <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-primary-900 rounded-[40px] p-8 text-white shadow-xl">
             <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">Monthly Recurring Revenue</p>
             <p className="text-3xl font-black">${(data.stats.mrr / 1000).toFixed(1)}k</p>
             <div className="mt-4 flex items-center text-[10px] font-black text-green-400 bg-white/5 px-2 py-1 rounded-lg w-fit">
                <TrendingUp className="w-3 h-3 mr-1" /> +12.5%
             </div>
          </div>
          <div className="bg-white rounded-[40px] border border-gray-100 p-8 shadow-sm">
             <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Annual Run Rate</p>
             <p className="text-3xl font-black text-gray-900">${(data.stats.arr / 1000000).toFixed(2)}M</p>
             <p className="mt-4 text-[10px] font-black text-gray-400">Projection for FY 2024</p>
          </div>
          <div className="bg-white rounded-[40px] border border-gray-100 p-8 shadow-sm">
             <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Avg Hospital LTV</p>
             <p className="text-3xl font-black text-gray-900">${data.stats.avg_hospital_ltv.toLocaleString()}</p>
             <p className="mt-4 text-[10px] font-black text-blue-600 uppercase tracking-widest">High Retentivity</p>
          </div>
          <div className="bg-white rounded-[40px] border border-gray-100 p-8 shadow-sm">
             <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Net Churn Rate</p>
             <p className="text-3xl font-black text-gray-900">{(data.stats.churn_rate * 100).toFixed(1)}%</p>
             <div className="mt-4 flex items-center text-[10px] font-black text-green-600 bg-green-50 px-2 py-1 rounded-lg w-fit">
                Optimal Performance
             </div>
          </div>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Subscription Plans */}
          <div className="bg-white rounded-[40px] border border-gray-100 p-10 shadow-sm col-span-2">
             <div className="flex items-center justify-between mb-10">
                <h4 className="text-xl font-black text-gray-900">Institutional Plans</h4>
                <div className="flex gap-2">
                   <button className="p-2 hover:bg-gray-50 rounded-xl transition-all">
                      <Settings className="w-5 h-5 text-gray-400" />
                   </button>
                </div>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {data.plans.map((plan: any, i: number) => (
                  <motion.div 
                    key={i}
                    whileHover={{ y: -5 }}
                    className="p-6 bg-gray-50 rounded-3xl border border-gray-100 group transition-all hover:bg-primary-900 hover:text-white"
                  >
                     <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-primary-600 mb-6 group-hover:bg-white/10 group-hover:text-white">
                        <Gem className="w-5 h-5" />
                     </div>
                     <h5 className="text-sm font-black mb-1">{plan.name}</h5>
                     <p className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-6">{plan.hospitals} Hospitals</p>
                     
                     <div className="space-y-2">
                        <p className="text-lg font-black">${(plan.revenue / 1000).toFixed(0)}k</p>
                        <div className={cn(
                          "text-[9px] font-black uppercase tracking-widest flex items-center gap-1",
                          plan.growth > 0 ? "text-green-500 group-hover:text-green-300" : "text-red-500 group-hover:text-red-300"
                        )}>
                           {plan.growth > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                           {Math.abs(plan.growth)}% Growth
                        </div>
                     </div>
                  </motion.div>
                ))}
             </div>
          </div>

          {/* Revenue Velocity Chart */}
          <div className="bg-white rounded-[40px] border border-gray-100 p-10 shadow-sm">
             <div className="flex items-center justify-between mb-8">
                <h4 className="text-lg font-black text-gray-900">Revenue Velocity</h4>
                <div className="w-2 h-2 bg-primary-500 rounded-full animate-pulse" />
             </div>
             <div className="h-48 flex items-end gap-2">
                {data.revenue_trend.map((v: number, i: number) => (
                  <div key={i} className="flex-1 bg-primary-500/10 rounded-t-lg relative group transition-all hover:bg-primary-500/20" style={{ height: `${(v / 300) * 100}%` }}>
                     <div className="absolute top-0 left-0 right-0 h-1 bg-primary-500 rounded-full" />
                     <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-primary-900 text-white text-[10px] font-black px-2 py-1 rounded-lg pointer-events-none">
                        ${v}k
                     </div>
                  </div>
                ))}
             </div>
             <div className="mt-6 flex justify-between px-2">
                {['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN'].map((m, i) => (
                  <span key={i} className="text-[9px] font-black text-gray-300 uppercase">{m}</span>
                ))}
             </div>
          </div>
       </div>

       {/* Global Invoice Stream */}
       <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-8 py-6 border-b border-gray-50 flex items-center justify-between">
             <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest">Global Institutional Invoices</h4>
             <button className="text-[10px] font-black text-primary-600 uppercase tracking-widest hover:underline">View All Invoices</button>
          </div>
          <div className="overflow-x-auto">
             <table className="w-full text-left border-collapse">
                <thead>
                   <tr className="bg-gray-50/30">
                      <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Invoice ID</th>
                      <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Hospital Entity</th>
                      <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Billing Cycle</th>
                      <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Amount</th>
                      <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                      <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Actions</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                   {data.recent_invoices.map((inv: any) => (
                     <tr key={inv.id} className="group hover:bg-gray-50 transition-all">
                        <td className="px-8 py-6">
                           <span className="text-xs font-black text-gray-900">{inv.id}</span>
                        </td>
                        <td className="px-8 py-6">
                           <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 group-hover:bg-primary-900 group-hover:text-white transition-all">
                                 <Building2 className="w-4 h-4" />
                              </div>
                              <span className="text-sm font-black text-gray-900">{inv.hospital}</span>
                           </div>
                        </td>
                        <td className="px-8 py-6">
                           <span className="text-xs font-bold text-gray-400">{inv.date}</span>
                        </td>
                        <td className="px-8 py-6">
                           <span className="text-sm font-black text-gray-900">${inv.amount.toLocaleString()}</span>
                        </td>
                        <td className="px-8 py-6">
                           <span className={cn(
                             "px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest border",
                             inv.status === 'PAID' ? "bg-green-50 text-green-700 border-green-100" : "bg-amber-50 text-amber-700 border-amber-100"
                           )}>
                              {inv.status}
                           </span>
                        </td>
                        <td className="px-8 py-6">
                           <button className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all">
                              <Download className="w-4 h-4" />
                           </button>
                        </td>
                     </tr>
                   ))}
                </tbody>
             </table>
          </div>
       </div>
    </div>
  );
}

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
        const res = await platformAdminService.getAiMetrics();
        setData(res.data);
      } else if (path === '/admin/analytics') {
        const res = await platformAdminService.getGlobalAnalytics();
        setData(res.data);
      } else if (path === '/admin/escalations') {
        const res = await platformAdminService.getGlobalEscalations();
        setData(res.data);
      } else if (path === '/admin/billing') {
        const res = await platformAdminService.getBillingData();
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
        return <AIControlCenterView data={data} />;
      case '/admin/infrastructure':
        return <InfrastructureView data={data} />;
      case '/admin/hospitals':
        return <HospitalsView data={data} refresh={fetchDashboardData} />;
      case '/admin/users':
        return <UsersManagementView data={data} refresh={fetchDashboardData} />;
      case '/admin/analytics':
        return <PlatformAnalyticsView data={data} />;
      case '/admin/escalations':
        return <EscalationMonitorView data={data} />;
      case '/admin/billing':
        return <BillingSubscriptionsView data={data} />;
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
      <div className="flex items-center justify-between mb-8">
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
  const [editingHospital, setEditingHospital] = useState<any>(null);
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
      if (editingHospital) {
        await platformAdminService.updateHospital(editingHospital.id, formData);
        toast.success('Hospital updated successfully');
      } else {
        await platformAdminService.createHospital(formData);
        toast.success('Hospital registered successfully');
      }
      setShowAddModal(false);
      setEditingHospital(null);
      setFormData({ name: '', address: '', city: '', state: '', zip_code: '', phone: '', email: '' });
      refresh();
    } catch (err) {
      toast.error(editingHospital ? 'Update failed' : 'Registration failed');
    }
  };

  const openEdit = (hospital: any) => {
    setEditingHospital(hospital);
    setFormData({
      name: hospital.name,
      address: hospital.address || '',
      city: hospital.city || '',
      state: hospital.state || '',
      zip_code: hospital.zip_code || '',
      phone: hospital.phone || '',
      email: hospital.email || ''
    });
    setShowAddModal(true);
  };

  const handleDelete = async (hospitalId: number) => {
    if (!window.confirm('Permanently decommission this facility? All associated data will be archived.')) return;
    try {
      await platformAdminService.deleteHospital(hospitalId);
      toast.success('Facility decommissioned');
      refresh();
    } catch (err) {
      toast.error('Decommissioning failed');
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
                              <button 
                                onClick={() => openEdit(hospital)}
                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                              >
                                 <Edit3 className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => handleDelete(hospital.id)}
                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                              >
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
                     <button onClick={() => { setShowAddModal(false); setEditingHospital(null); }} className="p-2 hover:bg-gray-100 rounded-full transition-all">
                        <X className="w-6 h-6 text-gray-400" />
                     </button>
                  </div>

                  <h3 className="text-3xl font-black text-gray-900 mb-2">
                    {editingHospital ? 'Edit Facility' : 'Register Facility'}
                  </h3>
                  <p className="text-gray-500 font-medium mb-8">
                    {editingHospital ? 'Update clinical unit metadata and infrastructure details.' : 'Provision a new clinical unit to the Novelle network.'}
                  </p>

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
                           {editingHospital ? 'SAVE CHANGES' : 'COMPLETE REGISTRATION'}
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
