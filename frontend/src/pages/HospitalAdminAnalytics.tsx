import React from 'react';
import { motion } from 'framer-motion';
import { 
  LineChart, Line, AreaChart, Area, BarChart, Bar, 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { 
  TrendingUp, TrendingDown, Activity, Users, 
  ShieldAlert, Brain, Star, Clock, Filter, 
  Download, Calendar, ChevronRight, CheckCircle2
} from 'lucide-react';
import { cn } from '../utils/helpers';
import { hospitalAdminService } from '../services/endpoints';

export default function HospitalAdminAnalytics() {
  const [activeTab, setActiveTab] = React.useState('Risk Analytics');
  const [riskData, setRiskData] = React.useState([]);
  const [deptData, setDeptData] = React.useState([]);
  const [maternalStats, setMaternalStats] = React.useState<any>(null);
  const [performance, setPerformance] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const [risk, dept, maternal, perf] = await Promise.all([
        hospitalAdminService.getRiskTrends(),
        hospitalAdminService.getDeptLoad(),
        hospitalAdminService.getMaternalHealthStats(),
        hospitalAdminService.getPerformanceMetrics()
      ]);
      setRiskData(risk.data);
      setDeptData(dept.data);
      setMaternalStats(maternal.data);
      setPerformance(perf.data);
    } catch (error) {
      console.error("Failed to fetch analytics", error);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchAnalytics();
  }, []);

  const COLORS = ['#ec4899', '#8b5cf6', '#3b82f6', '#ef4444', '#10b981'];

  const tabs = [
    "Risk Analytics", "Department Analytics", "Maternal Health Trends", 
    "Population Health", "Performance Metrics", "Predictive Analytics"
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 font-bold animate-pulse">Processing facility intelligence...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-gray-900">Hospital Intelligence Dashboard</h1>
          <p className="text-sm text-gray-500">Facility-wide clinical analytics, AI predictions, and performance monitoring</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            <Calendar className="w-4 h-4" /> Last 30 Days
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 transition-colors shadow-sm">
            <Download className="w-4 h-4" /> Export Report
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

      {/* Analytics Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Risk Trend Chart */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm space-y-6"
        >
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-lg font-black text-gray-900">Patient Risk Distribution</h3>
              <p className="text-xs text-gray-500 font-medium">Weekly trend of fetal & physical risk levels</p>
            </div>
            <div className="p-3 bg-pink-50 rounded-2xl text-pink-600">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={riskData}>
                <defs>
                  <linearGradient id="colorHigh" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#9ca3af'}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#9ca3af'}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Area type="monotone" dataKey="high" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorHigh)" />
                <Area type="monotone" dataKey="medium" stroke="#f59e0b" strokeWidth={3} fillOpacity={0} />
                <Area type="monotone" dataKey="low" stroke="#10b981" strokeWidth={3} fillOpacity={0} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Department Comparison */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm space-y-6"
        >
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-lg font-black text-gray-900">Department Occupancy</h3>
              <p className="text-xs text-gray-500 font-medium">Current patient load per clinical wing</p>
            </div>
            <div className="p-3 bg-purple-50 rounded-2xl text-purple-600">
              <Users className="w-5 h-5" />
            </div>
          </div>
          
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deptData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#4b5563'}} width={80} />
                <Tooltip cursor={{fill: '#f9fafb'}} contentStyle={{ borderRadius: '16px', border: 'none' }} />
                <Bar dataKey="count" radius={[0, 8, 8, 0]} barSize={24}>
                  {deptData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Maternal Health Insights */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm space-y-6"
        >
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-lg font-black text-gray-900">Trimester Distribution</h3>
              <p className="text-xs text-gray-500 font-medium">Facility population health breakdown</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-2xl text-blue-600">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="h-[220px] w-full max-w-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={maternalStats?.trimester_distribution || []}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={8}
                    dataKey="value"
                  >
                    {maternalStats?.trimester_distribution.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 grid grid-cols-1 gap-3 w-full">
              {maternalStats?.trimester_distribution.map((item: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-xs font-bold text-gray-700">{item.name}</span>
                  </div>
                  <span className="text-xs font-black text-gray-900">{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* AI & Performance Metrics */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-6"
        >
          {/* Predictive Card */}
          <div className="bg-gray-900 rounded-[32px] p-8 text-white relative overflow-hidden group shadow-xl shadow-gray-200">
            <div className="relative z-10 space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary-500/20 rounded-lg flex items-center justify-center">
                  <Brain className="w-4 h-4 text-primary-400" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary-400">AI Predictive Insights</span>
              </div>
              <div className="space-y-1">
                <h4 className="text-xl font-black">NICU Load Forecast</h4>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Based on current 3rd-trimester risks, we predict a <span className="text-white font-bold">15% increase</span> in NICU admissions over the next 14 days.
                </p>
              </div>
              <button className="flex items-center gap-2 text-xs font-bold text-primary-400 hover:text-primary-300 transition-colors">
                View Predictive Models <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <div className="absolute top-0 right-0 p-8">
               <ShieldAlert className="w-24 h-24 text-white/5 -rotate-12" />
            </div>
          </div>

          {/* Performance Grid */}
          <div className="grid grid-cols-2 gap-4">
             <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-2">
               <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">SLA Speed</p>
                  <Clock className="w-3.5 h-3.5 text-gray-400" />
               </div>
               <p className="text-2xl font-black text-gray-900">{performance?.sla_response_time}</p>
               <p className="text-[10px] font-bold text-green-500 uppercase tracking-tighter">↑ 2m faster than avg</p>
             </div>
             <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-2">
               <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Efficiency</p>
                  <Activity className="w-3.5 h-3.5 text-gray-400" />
               </div>
               <p className="text-2xl font-black text-gray-900">{performance?.staff_efficiency}%</p>
               <div className="w-full h-1 bg-gray-50 rounded-full overflow-hidden">
                 <div className="h-full bg-primary-500" style={{ width: '88%' }} />
               </div>
             </div>
             <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-2">
               <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Satisfaction</p>
                  <Star className="w-3.5 h-3.5 text-orange-400 fill-orange-400" />
               </div>
               <p className="text-2xl font-black text-gray-900">{performance?.patient_satisfaction}</p>
               <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Out of 5.0 Rating</p>
             </div>
             <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-2">
               <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Fulfillment</p>
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
               </div>
               <p className="text-2xl font-black text-gray-900">{performance?.appointment_fulfillment}%</p>
               <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Appointment Success</p>
             </div>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
