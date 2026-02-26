import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, Brain, Activity, Baby, AlertTriangle, Lightbulb, RefreshCw, Clock, TrendingUp } from 'lucide-react';
import { riskService } from '../services/endpoints';
import { getRiskBadge, formatDate } from '../utils/helpers';
import type { RiskScore, RiskDashboard } from '../types';

export default function RiskReportPage() {
  const [data, setData] = useState<RiskDashboard | null>(null);
  const [history, setHistory] = useState<RiskScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [reportRes, historyRes] = await Promise.allSettled([
        riskService.getFullReport(),
        riskService.getHistory(10),
      ]);
      if (reportRes.status === 'fulfilled') setData(reportRes.value.data);
      if (historyRes.status === 'fulfilled') setHistory(historyRes.value.data);
    } catch {
      // handled
    } finally {
      setLoading(false);
    }
  };

  const refreshReport = async () => {
    setRefreshing(true);
    try {
      const res = await riskService.getFullReport();
      setData(res.data);
    } catch {
      // handled
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <ShieldAlert className="w-10 h-10 text-primary-300 animate-pulse-soft" />
      </div>
    );
  }

  const risk = data?.latest_risk;

  const riskDomains = [
    { key: 'mental', label: 'Mental Health', level: risk?.mental_risk_level, confidence: risk?.mental_confidence, icon: Brain, color: 'lavender' },
    { key: 'physical', label: 'Physical Health', level: risk?.physical_risk_level, confidence: risk?.physical_confidence, icon: Activity, color: 'red' },
    { key: 'fetal', label: 'Fetal Health', level: risk?.fetal_risk_level, confidence: risk?.fetal_confidence, icon: Baby, color: 'green' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="disclaimer-banner">
        <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <span>Risk scores are statistical estimates, not diagnoses. Always consult your healthcare provider for medical decisions.</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-display font-bold flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-primary-500" />
          Risk Assessment Report
        </h2>
        <button onClick={refreshReport} disabled={refreshing}
          className="btn-secondary text-sm flex items-center gap-2">
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Analyzing...' : 'Refresh Analysis'}
        </button>
      </div>

      {/* 3 Risk Domain Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {riskDomains.map((domain, i) => (
          <motion.div key={domain.key}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="card border-t-4"
            style={{ borderTopColor: domain.level === 'HIGH' ? '#ef4444' : domain.level === 'MEDIUM' ? '#f59e0b' : '#22c55e' }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
                <domain.icon className="w-6 h-6 text-gray-600" />
              </div>
              <div>
                <p className="font-semibold">{domain.label}</p>
                <span className={getRiskBadge(domain.level)}>{domain.level || 'N/A'}</span>
              </div>
            </div>
            {domain.confidence != null && (
              <div className="mt-2">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Confidence</span>
                  <span>{(domain.confidence * 100).toFixed(0)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-primary-500 h-2 rounded-full transition-all"
                    style={{ width: `${domain.confidence * 100}%` }}
                  />
                </div>
              </div>
            )}
            {risk?.shap_features && risk.shap_features[domain.key] && (
              <div className="mt-4">
                <p className="text-xs font-medium text-gray-500 mb-2">Top Contributing Factors:</p>
                <ul className="space-y-1">
                  {Object.entries(risk.shap_features[domain.key] || {}).slice(0, 3).map(([feat, val]) => (
                    <li key={feat} className="flex justify-between text-xs">
                      <span className="text-gray-600">{feat.replace(/_/g, ' ')}</span>
                      <span className={Number(val) > 0 ? 'text-red-500' : 'text-green-500'}>
                        {Number(val) > 0 ? '↑' : '↓'} {Math.abs(Number(val)).toFixed(2)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Recommendations */}
      {data?.recommendations && data.recommendations.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="card">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-yellow-500" />
            Recommendations
          </h3>
          <ul className="space-y-3">
            {data.recommendations.map((rec, i) => (
              <li key={i} className="flex items-start gap-3 bg-yellow-50 p-3 rounded-xl">
                <span className="w-6 h-6 rounded-full bg-yellow-200 flex items-center justify-center text-xs font-bold text-yellow-700 flex-shrink-0">
                  {i + 1}
                </span>
                <span className="text-sm text-gray-700">{rec}</span>
              </li>
            ))}
          </ul>
        </motion.div>
      )}

      {/* Escalation Alert */}
      {data?.escalation_triggered && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="bg-red-50 border border-red-200 rounded-2xl p-6"
        >
          <div className="flex items-center gap-3 mb-2">
            <AlertTriangle className="w-6 h-6 text-red-500" />
            <h3 className="font-bold text-red-700">Clinical Escalation Triggered</h3>
          </div>
          <p className="text-sm text-red-600">
            Your risk assessment indicates a HIGH-level concern. A notification has been prepared for your assigned healthcare provider. 
            Please contact your doctor or nearest emergency service if you feel unsafe.
          </p>
        </motion.div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div className="card">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-500" />
            Assessment History
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-gray-500 border-b">
                <tr>
                  <th className="pb-2 font-medium">Date</th>
                  <th className="pb-2 font-medium">Mental</th>
                  <th className="pb-2 font-medium">Physical</th>
                  <th className="pb-2 font-medium">Fetal</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="py-2 text-gray-600">{formatDate(h.created_at)}</td>
                    <td className="py-2"><span className={getRiskBadge(h.mental_risk_level)}>{h.mental_risk_level}</span></td>
                    <td className="py-2"><span className={getRiskBadge(h.physical_risk_level)}>{h.physical_risk_level}</span></td>
                    <td className="py-2"><span className={getRiskBadge(h.fetal_risk_level)}>{h.fetal_risk_level}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
