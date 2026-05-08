import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Brain, Activity, Baby, AlertTriangle, Sparkles,
  TrendingUp, Shield, Heart, Droplets, Zap,
} from 'lucide-react';
import { patientService } from '../services/endpoints';

// ── Types matching the backend response ──────────────────

interface RiskSummary {
  physical: 'LOW' | 'MEDIUM' | 'HIGH';
  mental: 'LOW' | 'MEDIUM' | 'HIGH';
  fetal: 'LOW' | 'MEDIUM' | 'HIGH';
  scored_at: string;
}

interface SubRisks {
  depression: number;
  anxiety: number;
  hypertension: number;
  diabetes: number;
  anemia: number;
  preterm: number;
}

interface Alert {
  type: string;
  level: string;
  message: string;
}

interface Recommendation {
  category: string;
  title: string;
  detail: string;
}

interface WeeklyStats {
  avg_bp_systolic: number;
  avg_sleep_quality: number;
  health_logs_count: number;
  mental_assessments_count: number;
}

interface RiskTrendEntry {
  date: string;
  physical: string;
  mental: string;
  fetal: string;
}

interface AIInsightsData {
  risk_summary: RiskSummary;
  sub_risks: SubRisks;
  alerts: Alert[];
  recommendations: Recommendation[];
  weekly_stats: WeeklyStats;
  risk_trend: RiskTrendEntry[];
}

// ── Helpers ──────────────────────────────────────────────

const RISK_CONFIG = {
  LOW: { color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', badge: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
  MEDIUM: { color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', badge: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
  HIGH: { color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200', badge: 'bg-rose-100 text-rose-700', dot: 'bg-rose-500' },
} as const;

function riskToNumeric(level: string): number {
  if (level === 'HIGH') return 3;
  if (level === 'MEDIUM') return 2;
  return 1;
}

const SUB_RISK_META: Record<keyof SubRisks, { label: string; icon: React.ElementType; gradient: string }> = {
  depression: { label: 'Depression', icon: Brain, gradient: 'from-indigo-500 to-indigo-600' },
  anxiety: { label: 'Anxiety', icon: Zap, gradient: 'from-violet-500 to-violet-600' },
  hypertension: { label: 'Hypertension', icon: Activity, gradient: 'from-rose-500 to-rose-600' },
  diabetes: { label: 'Diabetes', icon: Droplets, gradient: 'from-amber-500 to-amber-600' },
  anemia: { label: 'Anemia', icon: Heart, gradient: 'from-pink-500 to-pink-600' },
  preterm: { label: 'Preterm Risk', icon: Baby, gradient: 'from-orange-500 to-orange-600' },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.5, ease: 'easeOut' } }),
};

// ── Main Component ───────────────────────────────────────

export default function AIInsightsPage() {
  const [data, setData] = useState<AIInsightsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInsights = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await patientService.getAIInsights();
      setData(res.data);
    } catch (err: any) {
      console.error('Failed to load AI insights', err);
      setError(err?.response?.data?.detail || 'Unable to load AI insights. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, []);

  // ── Loading State ──

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-6">
        <div className="relative">
          <div className="absolute inset-0 w-24 h-24 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full blur-2xl opacity-30 animate-pulse" />
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
            className="relative"
          >
            <Sparkles className="w-14 h-14 text-purple-500" />
          </motion.div>
        </div>
        <div className="text-center space-y-2">
          <p className="text-sm font-semibold text-gray-600">Analyzing your health data&hellip;</p>
          <p className="text-xs text-gray-400">Our AI models are generating personalized insights</p>
        </div>
      </div>
    );
  }

  // ── Error State ──

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 flex items-center justify-center">
          <AlertTriangle className="w-8 h-8 text-rose-500" />
        </div>
        <div className="text-center space-y-2 max-w-md">
          <h2 className="text-lg font-bold text-gray-800">Something went wrong</h2>
          <p className="text-sm text-gray-500">{error || 'No data available.'}</p>
        </div>
        <button
          onClick={fetchInsights}
          className="px-6 py-2.5 rounded-xl bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  const { risk_summary, sub_risks, alerts, recommendations, weekly_stats, risk_trend } = data;

  // ── Render ──

  return (
    <div className="max-w-7xl mx-auto pb-24 space-y-10 px-4">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-600 p-8 md:p-10 text-white"
      >
        <div className="absolute top-0 right-0 w-72 h-72 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full blur-2xl translate-y-1/3 -translate-x-1/4" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-yellow-300" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/70">
                AI-Powered Analysis
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Maternal Health Insights</h1>
            <p className="mt-2 text-white/70 text-sm md:text-base max-w-xl">
              Personalized risk assessment and clinical recommendations powered by predictive analytics.
            </p>
            {risk_summary.scored_at && (
              <p className="mt-3 text-[11px] text-white/50">
                Last analyzed: {new Date(risk_summary.scored_at).toLocaleString()}
              </p>
            )}
          </div>
          <button
            onClick={fetchInsights}
            className="shrink-0 flex items-center gap-2 px-5 py-2.5 bg-white/15 hover:bg-white/25 rounded-xl text-sm font-semibold transition-colors backdrop-blur-sm border border-white/20"
          >
            <TrendingUp className="w-4 h-4" />
            Refresh Analysis
          </button>
        </div>
      </motion.div>

      {/* Risk Overview Cards */}
      <section>
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 ml-1">Risk Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <RiskCard icon={Activity} label="Physical" level={risk_summary.physical} index={0} />
          <RiskCard icon={Brain} label="Mental" level={risk_summary.mental} index={1} />
          <RiskCard icon={Baby} label="Fetal" level={risk_summary.fetal} index={2} />
        </div>
      </section>

      {/* Alerts */}
      {alerts.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Active Alerts</h2>
          {alerts.map((alert, i) => (
            <AlertBanner key={i} alert={alert} index={i} />
          ))}
        </section>
      )}

      {/* Two-column layout: Recommendations + Sub-risks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recommendations */}
        <section>
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 ml-1">Recommendations</h2>
          {recommendations.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 p-10 text-center">
              <Shield className="w-10 h-10 mx-auto text-gray-300 mb-3" />
              <p className="text-sm text-gray-400 font-medium">No recommendations at this time. Keep up the good work!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recommendations.map((rec, i) => (
                <motion.div
                  key={i}
                  custom={i}
                  initial="hidden"
                  animate="visible"
                  variants={fadeUp}
                  className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-4">
                    <div className="shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-purple-100 to-indigo-100 flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-purple-600" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-purple-500">{rec.category}</span>
                      </div>
                      <h3 className="text-sm font-bold text-gray-800">{rec.title}</h3>
                      <p className="text-xs text-gray-500 mt-1 leading-relaxed">{rec.detail}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </section>

        {/* Sub-Risk Breakdown */}
        <section>
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 ml-1">Risk Breakdown</h2>
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-5">
            {(Object.keys(SUB_RISK_META) as (keyof SubRisks)[]).map((key, i) => {
              const meta = SUB_RISK_META[key];
              const value = sub_risks[key];
              const pct = Math.round(value * 100);
              const Icon = meta.icon;
              return (
                <motion.div
                  key={key}
                  custom={i}
                  initial="hidden"
                  animate="visible"
                  variants={fadeUp}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-gray-500" />
                      <span className="text-xs font-semibold text-gray-700">{meta.label}</span>
                    </div>
                    <span className={`text-xs font-bold ${pct >= 70 ? 'text-rose-600' : pct >= 40 ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {pct}%
                    </span>
                  </div>
                  <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.8, delay: i * 0.1, ease: 'easeOut' }}
                      className={`h-full rounded-full bg-gradient-to-r ${meta.gradient}`}
                    />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Weekly Statistics */}
      <section>
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 ml-1">This Week at a Glance</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Avg BP (Systolic)" value={`${weekly_stats.avg_bp_systolic} mmHg`} icon={Activity} index={0} />
          <StatCard label="Sleep Quality" value={`${weekly_stats.avg_sleep_quality}/10`} icon={Shield} index={1} />
          <StatCard label="Health Logs" value={String(weekly_stats.health_logs_count)} icon={Heart} index={2} />
          <StatCard label="Mental Assessments" value={String(weekly_stats.mental_assessments_count)} icon={Brain} index={3} />
        </div>
      </section>

      {/* Risk Trend */}
      {risk_trend.length > 0 && (
        <section>
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 ml-1">Risk Trend</h2>
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm overflow-x-auto">
            <div className="min-w-[500px]">
              {/* Header */}
              <div className="grid grid-cols-4 gap-4 mb-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2">
                <span>Date</span>
                <span>Physical</span>
                <span>Mental</span>
                <span>Fetal</span>
              </div>
              {/* Rows */}
              <div className="space-y-2">
                {risk_trend.map((entry, i) => (
                  <motion.div
                    key={i}
                    custom={i}
                    initial="hidden"
                    animate="visible"
                    variants={fadeUp}
                    className="grid grid-cols-4 gap-4 items-center rounded-xl px-3 py-2.5 bg-gray-50/60 hover:bg-gray-100/80 transition-colors"
                  >
                    <span className="text-xs font-medium text-gray-600">
                      {new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                    <RiskBadge level={entry.physical} />
                    <RiskBadge level={entry.mental} />
                    <RiskBadge level={entry.fetal} />
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

// ── Sub-Components ───────────────────────────────────────

function RiskCard({ icon: Icon, label, level, index }: { icon: React.ElementType; label: string; level: string; index: number }) {
  const cfg = RISK_CONFIG[level as keyof typeof RISK_CONFIG] || RISK_CONFIG.LOW;

  return (
    <motion.div
      custom={index}
      initial="hidden"
      animate="visible"
      variants={fadeUp}
      className={`rounded-2xl border ${cfg.border} ${cfg.bg} p-6 shadow-sm hover:shadow-md transition-all`}
    >
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${cfg.badge}`}>
          <Icon className="w-5 h-5" />
        </div>
        <span className="text-sm font-semibold text-gray-700">{label} Health</span>
      </div>
      <div className="flex items-end justify-between">
        <span className={`text-3xl font-extrabold tracking-tight ${cfg.color}`}>{level}</span>
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${cfg.dot} animate-pulse`} />
          <span className="text-[10px] font-semibold text-gray-400">LIVE</span>
        </div>
      </div>
    </motion.div>
  );
}

function AlertBanner({ alert, index }: { alert: Alert; index: number }) {
  const isHigh = alert.level === 'HIGH';
  const bgClass = isHigh ? 'bg-rose-50 border-rose-200' : 'bg-amber-50 border-amber-200';
  const iconColor = isHigh ? 'text-rose-500' : 'text-amber-500';
  const textColor = isHigh ? 'text-rose-700' : 'text-amber-700';
  const tagColor = isHigh ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600';

  return (
    <motion.div
      custom={index}
      initial="hidden"
      animate="visible"
      variants={fadeUp}
      className={`flex items-start gap-4 p-4 rounded-2xl border ${bgClass}`}
    >
      <div className="shrink-0 mt-0.5">
        <AlertTriangle className={`w-5 h-5 ${iconColor}`} />
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-[10px] font-bold uppercase tracking-widest ${tagColor} px-2 py-0.5 rounded`}>
            {alert.level}
          </span>
          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{alert.type}</span>
        </div>
        <p className={`text-sm font-medium ${textColor}`}>{alert.message}</p>
      </div>
    </motion.div>
  );
}

function StatCard({ label, value, icon: Icon, index }: { label: string; value: string; icon: React.ElementType; index: number }) {
  return (
    <motion.div
      custom={index}
      initial="hidden"
      animate="visible"
      variants={fadeUp}
      className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm text-center"
    >
      <div className="w-10 h-10 mx-auto rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center mb-3">
        <Icon className="w-5 h-5 text-gray-500" />
      </div>
      <p className="text-xl font-bold text-gray-800">{value}</p>
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mt-1">{label}</p>
    </motion.div>
  );
}

function RiskBadge({ level }: { level: string }) {
  const cfg = RISK_CONFIG[(level || 'LOW').toUpperCase() as keyof typeof RISK_CONFIG] || RISK_CONFIG.LOW;
  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-lg ${cfg.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {level}
    </span>
  );
}
