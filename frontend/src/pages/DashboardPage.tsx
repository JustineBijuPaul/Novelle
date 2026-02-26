import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, Brain, Baby, AlertTriangle, TrendingUp, Heart, Calendar, Droplets } from 'lucide-react';
import { profileService, healthService, riskService, mentalService } from '../services/endpoints';
import { useAppStore } from '../stores/appStore';
import { cn, getRiskBadge, formatDate, getWeekDescription } from '../utils/helpers';
import { getMilestoneForWeek } from '../utils/fetalData';
import type { RiskDashboard, HealthLogSummary, MoodTrend } from '../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function DashboardPage() {
  const { profile, setProfile, setRiskDashboard, setHealthSummary } = useAppStore();
  const [riskData, setRiskData] = useState<RiskDashboard | null>(null);
  const [healthSummary, setHealthSummaryLocal] = useState<HealthLogSummary | null>(null);
  const [moodTrend, setMoodTrend] = useState<MoodTrend | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const [profileRes, riskRes, healthRes, moodRes] = await Promise.allSettled([
        profileService.get(),
        riskService.getFullReport(),
        healthService.getSummary(7),
        mentalService.getMoodTrend(14),
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
    } catch {
      // Silently handle - dashboard shows empty states
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse-soft text-primary-400">
          <Heart className="w-12 h-12 animate-float" />
        </div>
      </div>
    );
  }

  const milestone = profile ? getMilestoneForWeek(profile.pregnancy_week) : null;
  const latestRisk = riskData?.latest_risk;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Disclaimer */}
      <div className="disclaimer-banner">
        <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <span>This system does not replace professional medical advice. All outputs are risk likelihood estimates only.</span>
      </div>

      {/* Hero - Pregnancy Week Card */}
      {profile && milestone && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-primary-500 to-lavender-500 rounded-2xl p-6 text-white shadow-lg"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-primary-100 text-sm font-medium">{getWeekDescription(profile.pregnancy_week)}</p>
              <h2 className="text-2xl font-display font-bold mt-1">Your baby is the size of a {milestone.size}!</h2>
              <p className="text-primary-100 mt-2 text-sm max-w-md">
                {milestone.developments[0]}. {milestone.tips[0]}
              </p>
              <div className="flex items-center gap-4 mt-4 text-sm">
                <span className="bg-white/20 px-3 py-1 rounded-full">{milestone.length} cm</span>
                <span className="bg-white/20 px-3 py-1 rounded-full">{milestone.weight}g</span>
                <span className="bg-white/20 px-3 py-1 rounded-full">Profile {profile.profile_completion_score}% complete</span>
              </div>
            </div>
            <div className="hidden md:block">
              <Baby className="w-20 h-20 text-white/30" />
            </div>
          </div>
        </motion.div>
      )}

      {/* Risk Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-lavender-100 flex items-center justify-center">
              <Brain className="w-5 h-5 text-lavender-500" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Mental Health</p>
              <p className="font-semibold">Risk Level</p>
            </div>
          </div>
          <span className={getRiskBadge(latestRisk?.mental_risk_level)}>
            {latestRisk?.mental_risk_level || 'Not assessed'}
          </span>
          {latestRisk?.mental_confidence && (
            <p className="text-xs text-gray-400 mt-2">Confidence: {(latestRisk.mental_confidence * 100).toFixed(0)}%</p>
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
              <Activity className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Physical Health</p>
              <p className="font-semibold">Risk Level</p>
            </div>
          </div>
          <span className={getRiskBadge(latestRisk?.physical_risk_level)}>
            {latestRisk?.physical_risk_level || 'Not assessed'}
          </span>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="card">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-accent-100 flex items-center justify-center">
              <Baby className="w-5 h-5 text-accent-500" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Fetal Health</p>
              <p className="font-semibold">Risk Level</p>
            </div>
          </div>
          <span className={getRiskBadge(latestRisk?.fetal_risk_level)}>
            {latestRisk?.fetal_risk_level || 'Not assessed'}
          </span>
        </motion.div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* BP Trend */}
        <div className="card">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary-500" />
            Blood Pressure Trend (7 days)
          </h3>
          {healthSummary?.bp_trend && healthSummary.bp_trend.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={healthSummary.bp_trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="systolic" stroke="#ec4899" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="diastolic" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-gray-400 text-center py-8">No blood pressure data yet. Start logging your vitals!</p>
          )}
        </div>

        {/* Mood Trend */}
        <div className="card">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Brain className="w-4 h-4 text-lavender-500" />
            Mood Trend (14 days)
          </h3>
          {moodTrend?.mood_trend && moodTrend.mood_trend.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={moodTrend.mood_trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis domain={[1, 10]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="mood_score" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} name="Mood" />
                <Line type="monotone" dataKey="stress_level" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} name="Stress" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-gray-400 text-center py-8">No mood data yet. Take your first mood check-in!</p>
          )}
        </div>
      </div>

      {/* Health Summary Stats */}
      {healthSummary && healthSummary.total_logs > 0 && (
        <div className="card">
          <h3 className="font-semibold mb-4">7-Day Health Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <p className="text-xs text-gray-500">Avg BP</p>
              <p className="text-lg font-bold text-gray-900">
                {healthSummary.avg_bp_systolic?.toFixed(0) || '—'}/{healthSummary.avg_bp_diastolic?.toFixed(0) || '—'}
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <p className="text-xs text-gray-500">Avg Sleep</p>
              <p className="text-lg font-bold text-gray-900">{healthSummary.avg_sleep_quality?.toFixed(1) || '—'}/5</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <p className="text-xs text-gray-500">Days Logged</p>
              <p className="text-lg font-bold text-gray-900">{healthSummary.total_logs}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <p className="text-xs text-gray-500">Symptom Flags</p>
              <p className="text-lg font-bold text-gray-900">
                {Object.values(healthSummary.symptom_flags || {}).reduce((a: number, b: number) => a + b, 0)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
