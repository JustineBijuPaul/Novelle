import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Baby, Calendar, Heart, Star, Clock, Activity,
  Stethoscope, GraduationCap, TrendingUp, Layers,
  CheckCircle2, ArrowRight, Droplets, AlertTriangle,
  Scale, Thermometer, ShieldCheck, Info
} from 'lucide-react';
import { patientService } from '../services/endpoints';
import { cn, getWeekDescription } from '../utils/helpers';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts';

interface ProfileData {
  age: number;
  pregnancy_week: number;
  trimester: number;
  due_date: string | null;
  days_remaining: number | null;
  blood_group: string | null;
  bmi: number | null;
  height_cm: number | null;
  weight_kg: number | null;
  hemoglobin_level: number | null;
  gestational_diabetes: boolean;
  chronic_hypertension: boolean;
  thyroid_disorder: boolean;
  previous_pregnancies: number | null;
  past_complications: string[] | null;
  profile_completion: number;
}

interface MilestoneData {
  week: number;
  size: string;
  length: number;
  weight: number;
  developments: string[];
  tips: string[];
}

interface WeightTrendPoint {
  date: string;
  weight: number;
}

interface MyPregnancyData {
  profile: ProfileData;
  milestone: MilestoneData | null;
  weight_trend: WeightTrendPoint[];
  progress_percent: number;
}

export default function MyPregnancyPage() {
  const [data, setData] = useState<MyPregnancyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await patientService.getMyPregnancy();
      setData(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to load pregnancy data.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-pulse-soft text-primary-400">
            <Baby className="w-12 h-12 animate-float" />
          </div>
          <p className="text-sm font-medium text-gray-400">Loading your pregnancy journey...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="card p-10 text-center max-w-md">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-lg font-display font-bold text-gray-900 mb-2">Something went wrong</h2>
          <p className="text-sm text-gray-500 mb-6">{error || 'No pregnancy data available.'}</p>
          <button
            onClick={loadData}
            className="px-6 py-3 bg-primary-600 text-white rounded-2xl text-xs font-bold hover:bg-primary-700 transition-all shadow-lg shadow-primary-200"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const { profile, milestone: rawMilestone, weight_trend, progress_percent } = data;
  const milestone = rawMilestone || { week: profile?.pregnancy_week || 24, size: 'Unknown', length: 0, weight: 0, developments: [], tips: [] };
  const currentWeek = profile?.pregnancy_week || 24;
  const currentTrimester = profile?.trimester || 2;

  const dueDate = profile.due_date
    ? new Date(profile.due_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null;

  const activeConditions = [
    profile.gestational_diabetes && 'Gestational Diabetes',
    profile.chronic_hypertension && 'Chronic Hypertension',
    profile.thyroid_disorder && 'Thyroid Disorder',
  ].filter(Boolean) as string[];

  return (
    <div className="max-w-[1400px] mx-auto pb-20 space-y-10 animate-fade-in">

      {/* Header & Due Date Countdown */}
      <div className="flex flex-col lg:flex-row gap-8 items-start lg:items-stretch">
        <div className="flex-1 space-y-4">
          <h1 className="text-4xl font-display font-bold text-gray-900 tracking-tight">
            My Pregnancy Journey
          </h1>
          <p className="text-gray-500 text-lg font-medium max-w-2xl leading-relaxed">
            Every day is a step closer to meeting your little one. Track your milestones,
            monitor fetal growth, and stay informed at every trimester.
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gray-900 text-white rounded-[2rem] p-8 min-w-[320px] relative overflow-hidden shadow-2xl shadow-gray-200"
        >
          <div className="relative z-10">
            <p className="text-[10px] font-bold text-primary-400 uppercase tracking-[0.2em] mb-4">Countdown to Arrival</p>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-6xl font-display font-bold tracking-tighter">
                {profile.days_remaining ?? '—'}
              </span>
              <span className="text-xl font-medium text-gray-400">Days Left</span>
            </div>
            {dueDate && (
              <p className="text-sm font-medium text-gray-400">
                Estimated Due Date: <span className="text-white">{dueDate}</span>
              </p>
            )}
          </div>
          <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-primary-500/10 rounded-full blur-3xl" />
        </motion.div>
      </div>

      {/* Trimester Progress */}
      <div className="card p-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Layers className="w-5 h-5 text-primary-500" />
            <h2 className="text-xl font-display font-bold text-gray-900">Trimester Progress</h2>
          </div>
          <span className="text-xs font-bold text-primary-600 bg-primary-50 px-3 py-1 rounded-full uppercase tracking-widest">
            {currentTrimester === 1 ? 'First' : currentTrimester === 2 ? 'Second' : 'Third'} Trimester
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative">
          <TrimesterBar
            label="Trimester 1" active={currentTrimester >= 1} current={currentTrimester === 1}
            progress={currentTrimester === 1 ? (currentWeek / 12) * 100 : currentTrimester > 1 ? 100 : 0}
            weeks="Weeks 1-12"
          />
          <TrimesterBar
            label="Trimester 2" active={currentTrimester >= 2} current={currentTrimester === 2}
            progress={currentTrimester === 2 ? ((currentWeek - 12) / 14) * 100 : currentTrimester > 2 ? 100 : 0}
            weeks="Weeks 13-26"
          />
          <TrimesterBar
            label="Trimester 3" active={currentTrimester >= 3} current={currentTrimester === 3}
            progress={currentTrimester === 3 ? ((currentWeek - 26) / 14) * 100 : 0}
            weeks="Weeks 27-40"
          />
        </div>

        {/* Overall progress bar */}
        <div className="mt-6 pt-6 border-t border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-400">Overall Progress</span>
            <span className="text-xs font-bold text-primary-600">{Math.round(progress_percent)}%</span>
          </div>
          <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress_percent}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="h-full rounded-full bg-gradient-to-r from-primary-500 to-lavender-500"
            />
          </div>
        </div>
      </div>

      {/* Baby Development & Growth */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">

        {/* Main Content (8 cols) */}
        <div className="xl:col-span-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Baby Size Card */}
            <motion.div
              whileHover={{ y: -5 }}
              className="card bg-gradient-to-br from-lavender-50 to-white border-lavender-100 overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-lavender-500 flex items-center justify-center text-white shadow-lg shadow-lavender-200">
                    <Baby className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-bold text-lavender-500 uppercase tracking-widest">Week {milestone.week}</span>
                </div>
                <h3 className="text-2xl font-display font-bold text-gray-900 mb-4">
                  Baby is a <span className="text-lavender-600">{milestone.size}</span>
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Approx. Length</span>
                    <span className="font-bold text-gray-900">{milestone.length} cm</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Approx. Weight</span>
                    <span className="font-bold text-gray-900">{milestone.weight} g</span>
                  </div>
                </div>
              </div>
              <div className="h-24 bg-lavender-100/50 flex items-center justify-center">
                <div className="relative">
                  <div className="absolute inset-0 bg-lavender-500/20 blur-xl rounded-full" />
                  <Baby className="w-10 h-10 text-lavender-600 relative z-10" />
                </div>
              </div>
            </motion.div>

            {/* Weekly Development Card */}
            <div className="card p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center text-primary-600">
                  <Activity className="w-5 h-5" />
                </div>
                <h3 className="font-display font-bold text-gray-900">Weekly Development</h3>
              </div>
              <div className="space-y-4">
                {milestone.developments.map((dev, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary-500 mt-1.5 shrink-0" />
                    <p className="text-sm text-gray-600 leading-relaxed">{dev}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Weight Trend Chart */}
          {weight_trend.length > 0 && (
            <div className="card p-8">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-5 h-5 text-accent-500" />
                  <h3 className="font-display font-bold text-gray-900">Maternal Weight Trend</h3>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                  <div className="w-2 h-2 rounded-full bg-primary-500" /> Weight (kg)
                </div>
              </div>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={weight_trend}>
                    <defs>
                      <linearGradient id="colorWeightTrend" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ec4899" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#ec4899" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis
                      dataKey="date"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: '#9ca3af' }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: '#9ca3af' }}
                      domain={['dataMin - 2', 'dataMax + 2']}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: '12px',
                        border: 'none',
                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                      }}
                      formatter={(value: number) => [`${value} kg`, 'Weight']}
                    />
                    <Area
                      type="monotone"
                      dataKey="weight"
                      stroke="#ec4899"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorWeightTrend)"
                      name="Weight (kg)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Health Profile */}
          <div className="card p-8">
            <div className="flex items-center gap-3 mb-8">
              <Stethoscope className="w-5 h-5 text-blue-500" />
              <h3 className="font-display font-bold text-gray-900">Health Profile</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <HealthStat
                icon={Droplets}
                label="Blood Group"
                value={profile.blood_group || '—'}
                color="red"
              />
              <HealthStat
                icon={Scale}
                label="BMI"
                value={profile.bmi != null ? profile.bmi.toFixed(1) : '—'}
                color="blue"
              />
              <HealthStat
                icon={Thermometer}
                label="Hemoglobin"
                value={profile.hemoglobin_level != null ? `${profile.hemoglobin_level} g/dL` : '—'}
                color="emerald"
              />
              <HealthStat
                icon={Activity}
                label="Weight"
                value={profile.weight_kg != null ? `${profile.weight_kg} kg` : '—'}
                color="violet"
              />
            </div>

            {/* Conditions */}
            {activeConditions.length > 0 && (
              <div className="mt-6 pt-6 border-t border-gray-100">
                <p className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-400 mb-3">Active Conditions</p>
                <div className="flex flex-wrap gap-2">
                  {activeConditions.map((cond) => (
                    <span
                      key={cond}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 rounded-full text-[10px] font-bold uppercase tracking-widest"
                    >
                      <AlertTriangle className="w-3 h-3" />
                      {cond}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {activeConditions.length === 0 && (
              <div className="mt-6 pt-6 border-t border-gray-100">
                <div className="flex items-center gap-2 text-emerald-600">
                  <ShieldCheck className="w-4 h-4" />
                  <span className="text-xs font-bold">No active conditions reported</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (4 cols) */}
        <div className="xl:col-span-4 space-y-8">

          {/* Key Milestones */}
          <div className="card p-6">
            <h3 className="font-display font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-500" />
              Key Milestones
            </h3>
            <div className="space-y-6 relative">
              <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-gray-100" />
              <MilestoneItem week={4} title="Conception & Implantation" completed={currentWeek >= 4} />
              <MilestoneItem week={12} title="First Ultrasound" completed={currentWeek >= 12} />
              <MilestoneItem week={20} title="Anatomy Scan (Gender)" completed={currentWeek >= 20} />
              <MilestoneItem week={24} title="Glucose Screening" completed={currentWeek >= 24} />
              <MilestoneItem week={36} title="Final Growth Scan" completed={currentWeek >= 36} />
              <MilestoneItem week={40} title="Arrival of Baby" completed={currentWeek >= 40} />
            </div>
          </div>

          {/* Tips for This Week */}
          {milestone.tips.length > 0 && (
            <div className="card p-6 bg-primary-900 text-white border-none shadow-xl shadow-primary-100">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-primary-400">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <h3 className="font-display font-bold">Tips for Week {milestone.week}</h3>
              </div>
              <div className="space-y-4">
                {milestone.tips.map((tip, i) => (
                  <div key={i} className="p-3 rounded-xl bg-white/5 border border-white/10">
                    <div className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-primary-500/30 flex items-center justify-center shrink-0 mt-0.5">
                        <span className="text-[9px] font-bold text-primary-200">{i + 1}</span>
                      </div>
                      <p className="text-xs font-medium text-white/90 leading-relaxed">{tip}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Profile Vitals Summary */}
          <div className="card p-6">
            <h3 className="font-display font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Heart className="w-5 h-5 text-primary-500" />
              Vitals Summary
            </h3>
            <div className="space-y-4">
              <VitalRow label="Age" value={`${profile.age} years`} />
              <VitalRow label="Height" value={profile.height_cm != null ? `${profile.height_cm} cm` : '—'} />
              <VitalRow label="Current Weight" value={profile.weight_kg != null ? `${profile.weight_kg} kg` : '—'} />
              <VitalRow label="Previous Pregnancies" value={profile.previous_pregnancies != null ? `${profile.previous_pregnancies}` : '—'} />
              <VitalRow label="Profile Completion" value={`${profile.profile_completion}%`} />
            </div>

            {/* Profile completion bar */}
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all"
                  style={{ width: `${profile.profile_completion}%` }}
                />
              </div>
              {profile.profile_completion < 100 && (
                <p className="text-[10px] text-gray-400 mt-2 flex items-center gap-1">
                  <Info className="w-3 h-3" />
                  Complete your profile for better AI insights
                </p>
              )}
            </div>
          </div>

          {/* Past Complications */}
          {profile.past_complications && profile.past_complications.length > 0 && (
            <div className="card p-6 border-l-4 border-l-amber-400 bg-amber-50/30">
              <h3 className="font-display font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-500" />
                Past Complications
              </h3>
              <div className="space-y-2">
                {profile.past_complications.map((comp, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-gray-600">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                    <span>{String(comp)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────

function TrimesterBar({ label, progress, active, current, weeks }: {
  label: string; progress: number; active: boolean; current: boolean; weeks: string;
}) {
  return (
    <div className={cn("space-y-3 transition-all", active ? "opacity-100" : "opacity-30")}>
      <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.15em]">
        <span className={active ? "text-primary-600" : "text-gray-400"}>{label}</span>
        <span className="text-gray-400">{weeks}</span>
      </div>
      <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden relative">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(progress, 100)}%` }}
          className={cn(
            "h-full rounded-full",
            current ? "bg-gradient-to-r from-primary-500 to-lavender-500" : "bg-primary-600"
          )}
        />
      </div>
      {current && (
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-primary-500 animate-pulse">
          <div className="w-1.5 h-1.5 rounded-full bg-primary-500" />
          Currently Here
        </div>
      )}
    </div>
  );
}

function MilestoneItem({ week, title, completed }: { week: number; title: string; completed: boolean }) {
  return (
    <div className="flex items-start gap-4 relative z-10 group">
      <div className={cn(
        "w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
        completed ? "bg-primary-600 border-primary-600 text-white" : "bg-white border-gray-200"
      )}>
        {completed
          ? <CheckCircle2 className="w-3.5 h-3.5" />
          : <span className="text-[10px] font-bold text-gray-400">{week}</span>
        }
      </div>
      <div>
        <p className={cn(
          "text-xs font-bold transition-all",
          completed ? "text-gray-900" : "text-gray-400 group-hover:text-gray-600"
        )}>{title}</p>
        <p className="text-[9px] font-medium text-gray-400 uppercase tracking-widest mt-0.5">Week {week}</p>
      </div>
    </div>
  );
}

function HealthStat({ icon: Icon, label, value, color }: {
  icon: any; label: string; value: string; color: string;
}) {
  const colorMap: Record<string, string> = {
    red: 'bg-red-50 text-red-600',
    blue: 'bg-blue-50 text-blue-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    violet: 'bg-violet-50 text-violet-600',
  };

  return (
    <div className="p-4 rounded-2xl border border-gray-100 hover:border-gray-200 transition-all text-center space-y-3">
      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mx-auto", colorMap[color] || 'bg-gray-50 text-gray-600')}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-lg font-display font-bold text-gray-900">{value}</p>
        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{label}</p>
      </div>
    </div>
  );
}

function VitalRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-xs font-bold text-gray-900">{value}</span>
    </div>
  );
}
