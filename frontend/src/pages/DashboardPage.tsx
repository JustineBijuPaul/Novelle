import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, Brain, Baby, AlertTriangle, TrendingUp, Heart, 
  Calendar, Droplets, CheckCircle2, Bell, Plus, Stethoscope, 
  Pill, Sparkles, ShieldAlert, ArrowRight, History, Zap,
  Clock, CheckSquare, ListTodo, Star, Info
} from 'lucide-react';
import { 
  profileService, healthService, riskService, 
  mentalService, telemedicineService, patientService 
} from '../services/endpoints';
import { useAppStore } from '../stores/appStore';
import { useAuthStore } from '../stores/authStore';
import { cn, getRiskBadge, formatDate, getWeekDescription } from '../utils/helpers';
import { getMilestoneForWeek } from '../utils/fetalData';
import type { RiskDashboard, HealthLogSummary, MoodTrend } from '../types';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, AreaChart, Area 
} from 'recharts';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { profile, setProfile, setRiskDashboard, setHealthSummary } = useAppStore();
  const [riskData, setRiskData] = useState<RiskDashboard | null>(null);
  const [healthSummary, setHealthSummaryLocal] = useState<HealthLogSummary | null>(null);
  const [moodTrend, setMoodTrend] = useState<MoodTrend | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTasks, setActiveTasks] = useState<{id: string|number; text: string; completed: boolean}[]>([]);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const [profileRes, riskRes, healthRes, moodRes, goalsRes] = await Promise.allSettled([
        profileService.get(),
        riskService.getFullReport(),
        healthService.getSummary(7),
        mentalService.getMoodTrend(14),
        patientService.getDailyGoals(),
      ]);

      if (profileRes.status === 'fulfilled') {
        setProfile(profileRes.value.data);
      }
      if (riskRes.status === 'fulfilled') {
        setRiskData(riskRes.value.data);
        setRiskDashboard(riskRes.value.data);
      }
      if (healthRes.status === 'fulfilled') {
        setHealthSummaryLocal(healthRes.value.data);
        setHealthSummary(healthRes.value.data);
      }
      if (moodRes.status === 'fulfilled') {
        setMoodTrend(moodRes.value.data);
      }
      if (goalsRes.status === 'fulfilled' && goalsRes.value.data?.goals) {
        setActiveTasks(goalsRes.value.data.goals.map((g: any) => ({ id: g.id, text: g.text, completed: g.completed })));
      } else {
        setActiveTasks([
          { id: 'vitals', text: 'Log morning vitals', completed: false },
          { id: 'water', text: 'Drink 2.5L water', completed: false },
          { id: 'vitamins', text: 'Take prenatal vitamins', completed: false },
          { id: 'walk', text: '15 minute walk', completed: false },
        ]);
      }
    } catch {
      // Silently handle
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-pulse-soft text-primary-400">
            <Heart className="w-12 h-12 animate-float" />
          </div>
          <p className="text-sm font-medium text-gray-400">Personalizing your experience...</p>
        </div>
      </div>
    );
  }

  const milestone = profile ? getMilestoneForWeek(profile.pregnancy_week) : null;
  const latestRisk = riskData?.latest_risk;
  const wellnessScore = 84; // Mock calculation based on logs and risk

  return (
    <div className="max-w-[1600px] mx-auto pb-12 space-y-8 animate-fade-in">
      {/* Top Section: Greeting & Quick Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-gray-900 tracking-tight">
            Good Morning, {user?.full_name?.split(' ')[0]} 🌸
          </h1>
          <p className="text-gray-500 mt-1 font-medium">
            Today is {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex -space-x-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-primary-100 flex items-center justify-center">
                <UserIcon i={i} />
              </div>
            ))}
          </div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">3 Doctors Online</p>
        </div>
      </div>

      {/* Emergency Banner (Conditional) */}
      {latestRisk?.physical_risk_level === 'HIGH' && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-center gap-4 text-red-700 shadow-sm"
        >
          <div className="w-10 h-10 rounded-xl bg-red-500 flex items-center justify-center shrink-0 animate-pulse">
            <ShieldAlert className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-sm">Elevated Health Risk Detected</p>
            <p className="text-xs opacity-80 mt-0.5">Our AI has detected abnormal vitals. We recommend contacting your doctor immediately.</p>
          </div>
          <button className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-700 transition-all shadow-md shadow-red-200">
            Contact Doctor
          </button>
        </motion.div>
      )}

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        
        {/* Left Column: Core Intelligence (8 cols) */}
        <div className="xl:col-span-8 space-y-8">
          
          {/* Pregnancy Week Hero Card */}
          {profile && milestone && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative overflow-hidden bg-gradient-to-br from-primary-600 via-primary-500 to-lavender-500 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-primary-200"
            >
              <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-bold uppercase tracking-widest mb-6">
                    <Star className="w-3 h-3 fill-white" /> {getWeekDescription(profile.pregnancy_week)}
                  </div>
                  <h2 className="text-4xl font-display font-bold leading-tight mb-4">
                    Your baby is the size of a <span className="text-white underline decoration-white/30 decoration-4 underline-offset-8">{milestone.size}</span>!
                  </h2>
                  <p className="text-primary-50 opacity-90 text-sm leading-relaxed mb-8 max-w-md">
                    {milestone.developments[0]}. {milestone.tips[0]}
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    <HeroBadge icon={Droplets} label={`${milestone.length} cm`} />
                    <HeroBadge icon={Activity} label={`${milestone.weight} g`} />
                    <HeroBadge icon={CheckCircle2} label={`${profile.profile_completion_score}% Profile`} />
                  </div>
                </div>
                <div className="flex justify-center md:justify-end">
                  <div className="relative">
                    <div className="absolute inset-0 bg-white/20 blur-3xl rounded-full" />
                    <Baby className="w-48 h-48 text-white/40 relative z-10 animate-float" />
                  </div>
                </div>
              </div>
              {/* Decorative elements */}
              <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
              <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-primary-400/20 rounded-full blur-3xl" />
            </motion.div>
          )}

          {/* AI Insights & Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="card group hover:border-primary-200 transition-all">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center text-primary-600">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <h3 className="font-display font-bold text-gray-900">AI Health Summary</h3>
                </div>
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              </div>
              <p className="text-sm text-gray-600 leading-relaxed italic border-l-4 border-primary-100 pl-4 py-1">
                "Based on your 7-day vitals, your cardiovascular health remains stable. Blood pressure is within the optimal range for the 24th week. We notice a slight decrease in sleep quality—consider restorative yoga before bed."
              </p>
            </div>

            <div className="card bg-gray-900 text-white border-none shadow-xl shadow-gray-200">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-primary-400">
                  <Zap className="w-5 h-5" />
                </div>
                <h3 className="font-display font-bold">AI Recommendations</h3>
              </div>
              <div className="space-y-4">
                <RecommendationItem 
                  icon={Droplets} 
                  title="Increase Water Intake" 
                  desc="Aim for 3L today to reduce edema risk." 
                />
                <RecommendationItem 
                  icon={Heart} 
                  title="Iron Supplement" 
                  desc="Take with Vit C for maximum absorption." 
                />
              </div>
            </div>
          </div>

          {/* Wellness Score & Trends */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="card md:col-span-1 flex flex-col items-center justify-center text-center py-8">
              <div className="relative w-32 h-32 mb-4">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-gray-100" />
                  <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-primary-500" strokeDasharray={364} strokeDashoffset={364 - (364 * wellnessScore) / 100} strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-display font-bold text-gray-900">{wellnessScore}</span>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Wellness</span>
                </div>
              </div>
              <p className="text-sm font-semibold text-gray-900">Good Progress</p>
              <p className="text-xs text-gray-500 mt-1">You're doing better than 82% of similar profiles.</p>
            </div>

            <div className="card md:col-span-2">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-5 h-5 text-primary-500" />
                  <h3 className="font-display font-bold text-gray-900">Blood Pressure Trend</h3>
                </div>
                <button className="text-[10px] font-bold text-primary-600 hover:text-primary-700 uppercase tracking-widest transition-colors">View History</button>
              </div>
              <div className="h-[180px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={healthSummary?.bp_trend || []}>
                    <defs>
                      <linearGradient id="colorBp" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ec4899" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#ec4899" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                    <Area type="monotone" dataKey="systolic" stroke="#ec4899" strokeWidth={3} fillOpacity={1} fill="url(#colorBp)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Actions & Operations (4 cols) */}
        <div className="xl:col-span-4 space-y-8">
          
          {/* Quick Actions */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Quick Actions</h4>
            <div className="grid grid-cols-2 gap-3">
              <QuickActionBtn icon={Plus} label="Log Health" color="primary" />
              <QuickActionBtn icon={CheckCircle2} label="Mood Check" color="lavender" />
              <QuickActionBtn icon={Calendar} label="Schedule" color="accent" />
              <QuickActionBtn icon={Zap} label="Ask AI" color="gray" />
            </div>
          </div>

          {/* Daily Tasks */}
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600">
                  <ListTodo className="w-4 h-4" />
                </div>
                <h3 className="font-display font-bold text-gray-900">Daily Tasks</h3>
              </div>
              <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
                {activeTasks.filter(t => t.completed).length}/{activeTasks.length}
              </span>
            </div>
            <div className="space-y-3">
              {activeTasks.map(task => (
                <div key={task.id} className="flex items-center gap-3 group">
                  <button className={cn(
                    "w-5 h-5 rounded-md border transition-all flex items-center justify-center",
                    task.completed ? "bg-emerald-500 border-emerald-500 text-white" : "border-gray-200 hover:border-emerald-300"
                  )}>
                    {task.completed && <CheckCircle2 className="w-3 h-3" />}
                  </button>
                  <span className={cn("text-xs font-medium transition-all", task.completed ? "text-gray-400 line-through" : "text-gray-700")}>
                    {task.text}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Upcoming Appointments */}
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                  <Calendar className="w-4 h-4" />
                </div>
                <h3 className="font-display font-bold text-gray-900">Appointments</h3>
              </div>
              <button className="p-1 hover:bg-gray-50 rounded-lg text-gray-400"><Plus className="w-4 h-4" /></button>
            </div>
            <div className="space-y-4">
              <AppointmentItem 
                title="Regular Checkup" 
                doctor="Dr. Sarah Miller" 
                time="Tomorrow, 10:30 AM" 
                type="In-person" 
              />
              <AppointmentItem 
                title="Nutrition Scan" 
                doctor="Clinical Lab" 
                time="May 12, 09:00 AM" 
                type="Lab Visit" 
              />
            </div>
          </div>

          {/* Notifications Feed */}
          <div className="card border-none bg-gray-50/50">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-gray-400 border border-gray-100">
                <Bell className="w-4 h-4" />
              </div>
              <h3 className="font-display font-bold text-gray-900">Notifications</h3>
            </div>
            <div className="space-y-4">
              <NotificationItem 
                icon={Info} 
                text="Your weekly health report is ready." 
                time="2h ago" 
              />
              <NotificationItem 
                icon={Stethoscope} 
                text="Dr. Miller confirmed your checkup." 
                time="5h ago" 
              />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

// Helper Components
function UserIcon({ i }: { i: number }) {
  return <div className={cn("w-full h-full rounded-full bg-cover", i === 1 ? "bg-primary-200" : i === 2 ? "bg-lavender-200" : "bg-accent-200")} />;
}

function HeroBadge({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 backdrop-blur-md rounded-xl text-xs font-medium">
      <Icon className="w-3.5 h-3.5" />
      {label}
    </div>
  );
}

function RecommendationItem({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer group">
      <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-primary-400" />
      </div>
      <div>
        <p className="text-xs font-bold leading-none mb-1 group-hover:text-primary-300 transition-colors">{title}</p>
        <p className="text-[10px] text-gray-400 leading-tight">{desc}</p>
      </div>
      <ArrowRight className="w-3 h-3 text-white/20 ml-auto self-center group-hover:text-white/60 transition-all" />
    </div>
  );
}

function QuickActionBtn({ icon: Icon, label, color }: { icon: any; label: string; color: string }) {
  const styles: any = {
    primary: "bg-primary-50 text-primary-600 hover:bg-primary-100 border-primary-100",
    lavender: "bg-lavender-50 text-lavender-600 hover:bg-lavender-100 border-lavender-100",
    accent: "bg-accent-50 text-accent-600 hover:bg-accent-100 border-accent-100",
    gray: "bg-gray-50 text-gray-600 hover:bg-gray-100 border-gray-100"
  };
  return (
    <button className={cn(
      "flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border transition-all hover:shadow-md active:scale-95",
      styles[color]
    )}>
      <Icon className="w-5 h-5" />
      <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
    </button>
  );
}

function AppointmentItem({ title, doctor, time, type }: { title: string; doctor: string; time: string; type: string }) {
  return (
    <div className="p-3 rounded-xl border border-gray-100 hover:border-primary-100 transition-all group cursor-pointer">
      <div className="flex justify-between items-start mb-2">
        <p className="text-xs font-bold text-gray-900 group-hover:text-primary-600 transition-colors">{title}</p>
        <span className="text-[8px] font-black uppercase tracking-widest bg-gray-50 px-1.5 py-0.5 rounded text-gray-400">{type}</span>
      </div>
      <div className="flex items-center gap-2 text-[10px] text-gray-500 mb-1">
        <UserIcon i={1} />
        <span>{doctor}</span>
      </div>
      <div className="flex items-center gap-1.5 text-[10px] font-bold text-primary-500">
        <Clock className="w-3 h-3" />
        {time}
      </div>
    </div>
  );
}

function NotificationItem({ icon: Icon, text, time }: { icon: any; text: string; time: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-6 h-6 rounded-md bg-white flex items-center justify-center shrink-0 border border-gray-100">
        <Icon className="w-3 h-3 text-gray-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-gray-700 leading-snug">{text}</p>
        <p className="text-[9px] font-bold text-gray-400 mt-0.5">{time}</p>
      </div>
    </div>
  );
}
