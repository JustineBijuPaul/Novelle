import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LineChart, Line, AreaChart, Area, XAxis, YAxis, 
  CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { 
  Brain, Zap, ShieldCheck, FileSearch, History, 
  Sparkles, TrendingUp, AlertTriangle, ChevronRight, 
  ArrowUpRight, Info, Cpu, CheckCircle2, ListFilter
} from 'lucide-react';
import { cn } from '../utils/helpers';
import { hospitalAdminService } from '../services/endpoints';

export default function HospitalAdminAIInsights() {
  const [activeTab, setActiveTab] = React.useState('AI Copilot');
  const [forecastData, setForecastData] = React.useState<any>(null);
  const [recommendations, setRecommendations] = React.useState<any[]>([]);
  const [auditLogs, setAuditLogs] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  const fetchAIInsights = async () => {
    setLoading(true);
    try {
      const [forecast, recs, logs] = await Promise.all([
        hospitalAdminService.getRiskForecasts(),
        hospitalAdminService.getAIRecommendations(),
        hospitalAdminService.getAIAuditLogs()
      ]);
      setForecastData(forecast.data);
      setRecommendations(recs.data);
      setAuditLogs(logs.data);
    } catch (error) {
      console.error("Failed to fetch AI insights", error);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchAIInsights();
  }, []);

  const tabs = [
    "AI Copilot", "Risk Forecasts", "Model Explanations", 
    "Smart Recommendations", "AI Audit Logs"
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-16 h-16 relative">
          <div className="absolute inset-0 border-4 border-primary-100 rounded-full" />
          <div className="absolute inset-0 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
          <Brain className="w-8 h-8 text-primary-500 absolute inset-0 m-auto animate-pulse" />
        </div>
        <p className="text-gray-500 font-bold">Initializing AI Intelligence Core...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
             <div className="px-2 py-0.5 bg-primary-100 text-primary-700 text-[10px] font-black rounded-md uppercase tracking-wider">Experimental AI</div>
             <h1 className="text-2xl font-bold text-gray-900">Facility AI Insights</h1>
          </div>
          <p className="text-sm text-gray-500">Predictive facility risk modeling and AI-driven resource recommendations</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">
            <ListFilter className="w-4 h-4" /> Filter Insights
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 transition-colors shadow-lg shadow-primary-500/20">
            <Zap className="w-4 h-4" /> Run New Prediction
          </button>
        </div>
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

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Forecasts & Copilot */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Predictive Trends */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm space-y-6 overflow-hidden relative"
          >
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h3 className="text-lg font-black text-gray-900">30-Day Risk Forecast</h3>
                <p className="text-xs text-gray-500 font-medium">Predicted high-risk case volume based on current patient pool</p>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 bg-red-50 text-red-600 rounded-full text-[10px] font-black uppercase tracking-wider">
                <TrendingUp className="w-3 h-3" /> {forecastData?.trend}
              </div>
            </div>

            <div className="h-[300px] w-full">
               <ResponsiveContainer width="100%" height="100%">
                 <AreaChart data={forecastData?.weekly_breakdown}>
                    <defs>
                      <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#9ca3af'}} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#9ca3af'}} />
                    <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                    <Area type="monotone" dataKey="risk" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorRisk)" dot={{ r: 4, fill: '#6366f1' }} />
                 </AreaChart>
               </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-3 gap-6 pt-4">
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Expected High-Risk</p>
                <p className="text-xl font-black text-gray-900">{forecastData?.predicted_high_risk_volume}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Model Confidence</p>
                <p className="text-xl font-black text-gray-900">92.4%</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Growth Factor</p>
                <p className="text-xl font-black text-primary-600">+18%</p>
              </div>
            </div>
          </motion.div>

          {/* AI Copilot Section */}
          <div className="bg-gray-900 rounded-[32px] p-8 text-white relative overflow-hidden">
             <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div className="space-y-4">
                   <div className="w-12 h-12 bg-primary-500/20 rounded-2xl flex items-center justify-center">
                      <Sparkles className="w-6 h-6 text-primary-400" />
                   </div>
                   <h2 className="text-2xl font-black">AI Admin Copilot</h2>
                   <p className="text-gray-400 text-sm leading-relaxed">
                     Ask complex facility management questions like "How will the upcoming holiday weekend affect our NICU capacity?" or "Which staff members are currently overloaded?"
                   </p>
                   <div className="relative">
                      <input 
                        type="text" 
                        placeholder="Ask Copilot anything..."
                        className="w-full bg-gray-800 border-none rounded-2xl px-6 py-4 text-sm focus:ring-2 focus:ring-primary-500 pr-12"
                      />
                      <button className="absolute right-2 top-2 p-2 bg-primary-600 rounded-xl hover:bg-primary-700 transition-all">
                        <ArrowUpRight className="w-5 h-5 text-white" />
                      </button>
                   </div>
                </div>
                <div className="hidden md:block">
                   <div className="space-y-4">
                      {[
                        "Predict next week's OPD load",
                        "Analyze staff performance gap",
                        "Generate facility risk report"
                      ].map((item, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-xl border border-gray-700 hover:border-primary-500 transition-all cursor-pointer group">
                           <Info className="w-4 h-4 text-gray-500 group-hover:text-primary-400" />
                           <span className="text-xs font-bold text-gray-300 group-hover:text-white">{item}</span>
                        </div>
                      ))}
                   </div>
                </div>
             </div>
             <div className="absolute top-0 right-0 p-8 opacity-10">
                <Cpu className="w-64 h-64" />
             </div>
          </div>
        </div>

        {/* Right Column: Recommendations & Audit */}
        <div className="space-y-8">
          
          {/* Smart Recommendations */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest">Smart Actions</h4>
              <ShieldCheck className="w-5 h-5 text-green-500" />
            </div>
            {recommendations.map((rec) => (
              <motion.div 
                key={rec.id}
                whileHover={{ y: -4 }}
                className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:border-primary-100 transition-all space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className={cn(
                    "px-2 py-0.5 text-[8px] font-black rounded-md uppercase tracking-widest",
                    rec.priority === 'HIGH' ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"
                  )}>
                    {rec.priority} Priority
                  </span>
                  <span className="text-[10px] font-bold text-gray-400">{rec.type}</span>
                </div>
                <h5 className="font-black text-gray-900">{rec.title}</h5>
                <p className="text-xs text-gray-500 leading-relaxed">{rec.description}</p>
                <div className="flex items-center gap-2 p-2 bg-green-50 text-green-700 rounded-xl text-[10px] font-bold">
                  <Zap className="w-3 h-3" /> Impact: {rec.impact}
                </div>
                <button className="w-full py-2 bg-gray-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-800 transition-colors">
                  Approve Recommendation
                </button>
              </motion.div>
            ))}
          </div>

          {/* AI Audit Logs Mini */}
          <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest">AI Decision Log</h4>
              <History className="w-5 h-5 text-gray-400" />
            </div>
            <div className="space-y-4">
              {auditLogs.slice(0, 3).map((log, i) => (
                <div key={i} className="flex gap-3 relative pb-4 border-l border-gray-100 ml-1.5 pl-4 last:border-0 last:pb-0">
                  <div className="absolute left-[-5px] top-0 w-2.5 h-2.5 bg-primary-500 rounded-full border-2 border-white shadow-sm" />
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-gray-900 uppercase tracking-tight">{log.action}</p>
                    <p className="text-[9px] text-gray-500 leading-tight">Triggered by {log.trigger}</p>
                    <p className="text-[8px] font-bold text-gray-400">{new Date(log.timestamp).toLocaleTimeString()}</p>
                  </div>
                </div>
              ))}
            </div>
            <button className="w-full py-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-primary-600 transition-colors">
              View Full Audit Trail
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
