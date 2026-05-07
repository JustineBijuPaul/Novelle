import React from 'react';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, Users, ShieldAlert, Calendar, Stethoscope,
  TrendingUp, Activity, AlertTriangle, ChevronRight, Plus,
  Search, Bell, Sparkles, Building2, Clock, CheckCircle2
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';
import { cn } from '../utils/helpers';
import { hospitalAdminService } from '../services/endpoints';

const riskData = [
  { name: 'Week 1', high: 4, medium: 12, low: 45 },
  { name: 'Week 2', high: 7, medium: 15, low: 42 },
  { name: 'Week 3', high: 3, medium: 18, low: 48 },
  { name: 'Week 4', high: 5, medium: 10, low: 52 },
];

const deptData = [
  { name: 'OBGYN', count: 85, color: '#ec4899' },
  { name: 'NICU', count: 12, color: '#8b5cf6' },
  { name: 'Postpartum', count: 45, color: '#3b82f6' },
  { name: 'Emergency', count: 8, color: '#ef4444' },
];

export default function HospitalAdminDashboard() {
  const [stats, setStats] = React.useState<any>(null);
  const [riskTrends, setRiskTrends] = React.useState<any>([]);
  const [deptLoad, setDeptLoad] = React.useState<any>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, trendsRes, loadRes] = await Promise.all([
          hospitalAdminService.getStats(),
          hospitalAdminService.getRiskTrends(),
          hospitalAdminService.getDeptLoad()
        ]);
        setStats(statsRes.data);
        setRiskTrends(trendsRes.data);
        setDeptLoad(loadRes.data);
      } catch (error) {
        console.error("Failed to fetch hospital admin data", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-fade-in">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Hospital Command Center</h1>
          <p className="text-sm text-gray-500">Live operational overview for St. Mary's Maternal Wing</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search patients, doctors..." 
              className="pl-9 pr-4 py-2 bg-white border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 w-64"
            />
          </div>
          <button className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors relative">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard 
          title="Total Patients" 
          value={stats?.total_patients || "0"} 
          change="+12%" 
          trend="up" 
          icon={Users} 
          color="blue" 
        />
        <KPICard 
          title="High Risk Cases" 
          value={stats?.high_risk || "0"} 
          change="-4" 
          trend="down" 
          icon={ShieldAlert} 
          color="red" 
        />
        <KPICard 
          title="Doctors Online" 
          value={`${stats?.doctors_online || 0}/15`} 
          change="Live" 
          trend="neutral" 
          icon={Stethoscope} 
          color="purple" 
        />
        <KPICard 
          title="Active Escalations" 
          value={stats?.pending_escalations || "0"} 
          change="3 Urgent" 
          trend="up" 
          icon={AlertTriangle} 
          color="orange" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Risk Analytics Chart */}
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary-500" /> Population Risk Trends
            </h3>
            <select className="text-xs border-none bg-gray-50 rounded-lg px-2 py-1">
              <option>Last 30 Days</option>
              <option>Last 7 Days</option>
            </select>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={riskTrends.length > 0 ? riskTrends : riskData}>
                <defs>
                  <linearGradient id="colorHigh" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#9ca3af'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#9ca3af'}} />
                <Tooltip />
                <Area type="monotone" dataKey="high" stroke="#ef4444" fillOpacity={1} fill="url(#colorHigh)" strokeWidth={2} />
                <Area type="monotone" dataKey="medium" stroke="#f59e0b" fill="transparent" strokeWidth={2} />
                <Area type="monotone" dataKey="low" stroke="#10b981" fill="transparent" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Live Alerts Panel */}
        <div className="card">
          <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-red-500" /> Emergency Alerts
          </h3>
          <div className="space-y-3">
            <AlertItem 
              patient="Sarah Jenkins" 
              reason="BP Critical (165/105)" 
              time="2m ago" 
              severity="urgent"
            />
            <AlertItem 
              patient="Maria Garcia" 
              reason="Fetal movement low" 
              time="15m ago" 
              severity="high"
            />
            <AlertItem 
              patient="Emma Wilson" 
              reason="Preterm contraction risk" 
              time="1h ago" 
              severity="medium"
            />
          </div>
          <button className="w-full mt-4 py-2 text-sm text-primary-600 font-medium hover:bg-primary-50 rounded-lg transition-colors">
            View All Escalations
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department Distribution */}
        <div className="card">
          <h3 className="font-bold text-gray-800 mb-6">Patient Load by Department</h3>
          <div className="flex items-center gap-8">
            <div className="w-1/2 h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={deptLoad.length > 0 ? deptLoad : deptData}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="count"
                  >
                    {(deptLoad.length > 0 ? deptLoad : deptData).map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-1/2 space-y-3">
              {(deptLoad.length > 0 ? deptLoad : deptData).map((dept: any) => (
                <div key={dept.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: dept.color }} />
                    <span className="text-sm text-gray-600">{dept.name}</span>
                  </div>
                  <span className="text-sm font-bold text-gray-900">{dept.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions & AI Copilot */}
        <div className="card bg-primary-900 text-white border-none shadow-xl overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-6">
              <Sparkles className="w-5 h-5 text-primary-300" />
              <h3 className="font-bold">AI Administrative Copilot</h3>
            </div>
            <p className="text-primary-100 text-sm mb-6">
              "Based on current trends, OBGYN patient load is expected to increase by 15% next week. Recommend opening 2 additional recovery beds."
            </p>
            <div className="grid grid-cols-2 gap-3">
              <AdminAction icon={Plus} label="Add Patient" />
              <AdminAction icon={Calendar} label="Schedule Staff" />
              <AdminAction icon={Building2} label="Manage Beds" />
              <AdminAction icon={Clock} label="Wait Times" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function KPICard({ title, value, change, trend, icon: Icon, color }: any) {
  const colors: any = {
    blue: 'bg-blue-50 text-blue-600',
    red: 'bg-red-50 text-red-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
  };

  return (
    <motion.div whileHover={{ y: -2 }} className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <div className={cn("p-2 rounded-xl", colors[color])}>
          <Icon className="w-5 h-5" />
        </div>
        <div className={cn(
          "text-[10px] font-bold px-2 py-0.5 rounded-full",
          trend === 'up' ? 'bg-green-100 text-green-700' : 
          trend === 'down' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
        )}>
          {change}
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-400 mt-1">{title}</p>
    </motion.div>
  );
}

function AlertItem({ patient, reason, time, severity }: any) {
  const severities: any = {
    urgent: 'bg-red-500',
    high: 'bg-orange-500',
    medium: 'bg-yellow-500',
  };

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-gray-50 hover:border-gray-100 transition-colors group cursor-pointer">
      <div className={cn("w-1.5 h-10 rounded-full shrink-0", severities[severity])} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-gray-900">{patient}</p>
        <p className="text-xs text-gray-500 truncate">{reason}</p>
      </div>
      <div className="text-right">
        <p className="text-[10px] text-gray-400">{time}</p>
        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
      </div>
    </div>
  );
}

function AdminAction({ icon: Icon, label }: any) {
  return (
    <button className="flex items-center gap-2 w-full p-2.5 rounded-xl bg-white/10 hover:bg-white/20 transition-colors border border-white/5 text-left">
      <Icon className="w-4 h-4 text-primary-300" />
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}
