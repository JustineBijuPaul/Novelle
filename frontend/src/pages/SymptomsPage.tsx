import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity, Loader2, AlertCircle, Filter,
  Calendar, ThermometerSun, Frown, Inbox
} from 'lucide-react';
import { patientService } from '../services/endpoints';

interface Symptom {
  date: string;
  name: string;
  severity: number;
  category: string;
  detail?: string;
}

interface SymptomsData {
  symptoms: Symptom[];
  total: number;
}

function getSeverityColor(severity: number): { text: string; bg: string; ring: string } {
  if (severity <= 3) return { text: 'text-emerald-700', bg: 'bg-emerald-50', ring: 'ring-emerald-200' };
  if (severity <= 6) return { text: 'text-amber-700', bg: 'bg-amber-50', ring: 'ring-amber-200' };
  return { text: 'text-red-700', bg: 'bg-red-50', ring: 'ring-red-200' };
}

function getSeverityLabel(severity: number): string {
  if (severity <= 3) return 'Mild';
  if (severity <= 6) return 'Moderate';
  return 'Severe';
}

function groupByDate(symptoms: Symptom[]): Record<string, Symptom[]> {
  return symptoms.reduce((acc, symptom) => {
    const key = symptom.date;
    if (!acc[key]) acc[key] = [];
    acc[key].push(symptom);
    return acc;
  }, {} as Record<string, Symptom[]>);
}

export default function SymptomsPage() {
  const [data, setData] = useState<SymptomsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const fetchSymptoms = useCallback(async () => {
    try {
      setError(null);
      const res = await patientService.listSymptoms();
      setData(res.data);
    } catch {
      setError('Failed to load symptoms. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSymptoms();
  }, [fetchSymptoms]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
          <p className="text-sm text-gray-500 font-medium">Loading symptom history...</p>
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
            onClick={() => { setLoading(true); fetchSymptoms(); }}
            className="px-6 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 transition-colors"
          >
            Retry
          </button>
        </motion.div>
      </div>
    );
  }

  if (!data) return null;

  const categories = ['all', ...Array.from(new Set(data.symptoms.map(s => s.category)))];
  const filteredSymptoms = selectedCategory === 'all'
    ? data.symptoms
    : data.symptoms.filter(s => s.category === selectedCategory);
  const grouped = groupByDate(filteredSymptoms);
  const sortedDates = Object.keys(grouped).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-4xl mx-auto pb-20 space-y-8"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Activity className="w-8 h-8 text-primary-500" />
            Symptom Tracker
          </h1>
          <p className="text-gray-500 mt-1">
            {data.total} symptom{data.total !== 1 ? 's' : ''} recorded
          </p>
        </div>

        {/* Severity Legend */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-emerald-400" />
            <span className="text-xs text-gray-500">Mild</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-amber-400" />
            <span className="text-xs text-gray-500">Moderate</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <span className="text-xs text-gray-500">Severe</span>
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-gray-400" />
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Filter by Category</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                selectedCategory === cat
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline */}
      {sortedDates.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center"
        >
          <Inbox className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-1">No symptoms recorded</h3>
          <p className="text-sm text-gray-500">
            {selectedCategory !== 'all'
              ? `No symptoms found in the "${selectedCategory}" category.`
              : 'Your symptom log is empty. Symptoms logged by your care team will appear here.'}
          </p>
        </motion.div>
      ) : (
        <div className="space-y-6">
          <AnimatePresence mode="popLayout">
            {sortedDates.map((date, dateIndex) => (
              <motion.div
                key={date}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ delay: dateIndex * 0.05 }}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
              >
                {/* Date Header */}
                <div className="flex items-center gap-3 px-6 py-4 bg-gray-50/80 border-b border-gray-100">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-semibold text-gray-700">
                    {new Date(date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </span>
                  <span className="ml-auto text-xs text-gray-400 font-medium">
                    {grouped[date].length} symptom{grouped[date].length !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Symptoms for this date */}
                <div className="divide-y divide-gray-50">
                  {grouped[date].map((symptom, i) => {
                    const severity = getSeverityColor(symptom.severity);
                    return (
                      <div key={`${date}-${i}`} className="flex items-center gap-4 px-6 py-4">
                        {/* Timeline dot */}
                        <div className="relative flex flex-col items-center">
                          <div className={`w-3 h-3 rounded-full ring-4 ${severity.ring} ${severity.bg}`}>
                            <div className={`w-full h-full rounded-full ${
                              symptom.severity <= 3 ? 'bg-emerald-400' :
                              symptom.severity <= 6 ? 'bg-amber-400' : 'bg-red-400'
                            }`} />
                          </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-gray-800">{symptom.name}</span>
                            <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded ${severity.bg} ${severity.text}`}>
                              {getSeverityLabel(symptom.severity)}
                            </span>
                          </div>
                          {symptom.detail && (
                            <p className="text-xs text-gray-500 mt-1 line-clamp-1">{symptom.detail}</p>
                          )}
                        </div>

                        {/* Severity badge */}
                        <div className="shrink-0 flex flex-col items-center">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${severity.bg}`}>
                            <span className={`text-sm font-bold ${severity.text}`}>{symptom.severity}</span>
                          </div>
                          <span className="text-[9px] text-gray-400 mt-1">/ 10</span>
                        </div>

                        {/* Category */}
                        <div className="shrink-0 hidden sm:block">
                          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide bg-gray-100 px-2 py-1 rounded">
                            {symptom.category}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}
