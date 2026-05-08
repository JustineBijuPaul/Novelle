import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Target, CheckCircle2, Circle, Loader2,
  AlertCircle, Sparkles, Apple, Dumbbell,
  Heart, Pill, Brain, Baby
} from 'lucide-react';
import { patientService } from '../services/endpoints';

interface Goal {
  id: string;
  text: string;
  completed: boolean;
  category: string;
}

interface DailyGoalsData {
  date: string;
  goals: Goal[];
  completed: number;
  total: number;
  progress_percent: number;
}

const CATEGORY_CONFIG: Record<string, { icon: typeof Target; color: string; bg: string }> = {
  health: { icon: Heart, color: 'text-rose-600', bg: 'bg-rose-50' },
  nutrition: { icon: Apple, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  exercise: { icon: Dumbbell, color: 'text-blue-600', bg: 'bg-blue-50' },
  medication: { icon: Pill, color: 'text-purple-600', bg: 'bg-purple-50' },
  mental: { icon: Brain, color: 'text-amber-600', bg: 'bg-amber-50' },
  baby: { icon: Baby, color: 'text-pink-600', bg: 'bg-pink-50' },
};

function getMotivationalMessage(percent: number): string {
  if (percent === 100) return "Amazing! You've completed all your goals today! 🎉";
  if (percent >= 75) return "Almost there! You're doing wonderfully today! 💪";
  if (percent >= 50) return "Great progress! Keep up the good work! ✨";
  if (percent >= 25) return "Good start! Every small step counts! 🌱";
  return "A new day, a fresh start! You've got this! 🌅";
}

export default function DailyGoalsPage() {
  const [data, setData] = useState<DailyGoalsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());

  const fetchGoals = useCallback(async () => {
    try {
      setError(null);
      const res = await patientService.getDailyGoals();
      setData(res.data);
    } catch {
      setError('Failed to load daily goals. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  const toggleGoal = async (goalId: string, currentCompleted: boolean) => {
    if (!data) return;

    setTogglingIds(prev => new Set(prev).add(goalId));

    const previousData = { ...data };
    const updatedGoals = data.goals.map(g =>
      g.id === goalId ? { ...g, completed: !currentCompleted } : g
    );
    const completedCount = updatedGoals.filter(g => g.completed).length;
    setData({
      ...data,
      goals: updatedGoals,
      completed: completedCount,
      total: updatedGoals.length,
      progress_percent: Math.round((completedCount / updatedGoals.length) * 100),
    });

    try {
      await patientService.updateGoal(goalId, !currentCompleted);
    } catch {
      setData(previousData);
    } finally {
      setTogglingIds(prev => {
        const next = new Set(prev);
        next.delete(goalId);
        return next;
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
          <p className="text-sm text-gray-500 font-medium">Loading your daily goals...</p>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-4 text-center max-w-sm"
        >
          <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center">
            <AlertCircle className="w-7 h-7 text-red-500" />
          </div>
          <p className="text-sm text-gray-700 font-medium">{error}</p>
          <button
            onClick={() => { setLoading(true); fetchGoals(); }}
            className="px-6 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 transition-colors"
          >
            Retry
          </button>
        </motion.div>
      </div>
    );
  }

  if (!data) return null;

  const { goals, completed, total, progress_percent, date } = data;
  const circumference = 2 * Math.PI * 54;
  const strokeDashoffset = circumference - (progress_percent / 100) * circumference;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-4xl mx-auto pb-20 space-y-8"
    >
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Target className="w-8 h-8 text-primary-500" />
          Daily Goals
        </h1>
        <p className="text-gray-500 mt-1">
          {new Date(date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Progress Ring + Motivation */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <div className="flex flex-col md:flex-row items-center gap-8">
          {/* Circular Progress */}
          <div className="relative w-36 h-36 shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
              <circle
                cx="60" cy="60" r="54"
                fill="none"
                stroke="#f3f4f6"
                strokeWidth="8"
              />
              <motion.circle
                cx="60" cy="60" r="54"
                fill="none"
                stroke="url(#progressGradient)"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
              <defs>
                <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#8b5cf6" />
                  <stop offset="100%" stopColor="#ec4899" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold text-gray-900">{progress_percent}%</span>
              <span className="text-xs text-gray-400 font-medium">{completed}/{total}</span>
            </div>
          </div>

          {/* Motivation */}
          <div className="flex-1 text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-50 text-amber-700 rounded-full text-xs font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              Daily Motivation
            </div>
            <p className="text-lg font-semibold text-gray-800">
              {getMotivationalMessage(progress_percent)}
            </p>
            <p className="text-sm text-gray-500 mt-2">
              {completed} of {total} goals completed today
            </p>
          </div>
        </div>
      </div>

      {/* Goals List */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-50">
        <div className="p-6 pb-4">
          <h2 className="text-lg font-semibold text-gray-900">Today's Goals</h2>
        </div>

        <div className="divide-y divide-gray-50">
          {goals.map((goal, index) => {
            const categoryConfig = CATEGORY_CONFIG[goal.category] || CATEGORY_CONFIG.health;
            const Icon = categoryConfig.icon;
            const isToggling = togglingIds.has(goal.id);

            return (
              <motion.div
                key={goal.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50/50 transition-colors"
              >
                {/* Checkbox */}
                <button
                  onClick={() => toggleGoal(goal.id, goal.completed)}
                  disabled={isToggling}
                  className="shrink-0 transition-transform active:scale-90 disabled:opacity-50"
                >
                  {goal.completed ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                  ) : (
                    <Circle className="w-6 h-6 text-gray-300 hover:text-primary-400 transition-colors" />
                  )}
                </button>

                {/* Goal text */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium transition-all ${goal.completed ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                    {goal.text}
                  </p>
                </div>

                {/* Category badge */}
                <div className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${categoryConfig.bg}`}>
                  <Icon className={`w-3.5 h-3.5 ${categoryConfig.color}`} />
                  <span className={`text-[10px] font-semibold uppercase tracking-wide ${categoryConfig.color}`}>
                    {goal.category}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
