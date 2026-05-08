import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldAlert, Phone, AlertTriangle, Loader2,
  AlertCircle, Siren, X, CheckCircle2,
  Clock, PhoneCall, Activity, Info
} from 'lucide-react';
import { patientService } from '../services/endpoints';

interface Helpline {
  name: string;
  number: string;
  type: string;
  available: string;
}

interface Escalation {
  id: number;
  type: string;
  level: string;
  status: string;
  date: string;
}

interface EmergencyData {
  helplines: Helpline[];
  danger_signs: string[];
  current_risk_level: string;
  recent_escalations: Escalation[];
}

function getRiskLevelStyle(level: string): { bg: string; text: string; label: string } {
  switch (level.toLowerCase()) {
    case 'high':
      return { bg: 'bg-red-50', text: 'text-red-700', label: 'High Risk' };
    case 'medium':
      return { bg: 'bg-amber-50', text: 'text-amber-700', label: 'Medium Risk' };
    case 'low':
      return { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Low Risk' };
    default:
      return { bg: 'bg-gray-50', text: 'text-gray-700', label: level };
  }
}

function getStatusStyle(status: string): { bg: string; text: string } {
  switch (status.toLowerCase()) {
    case 'resolved':
      return { bg: 'bg-emerald-50', text: 'text-emerald-700' };
    case 'pending':
      return { bg: 'bg-amber-50', text: 'text-amber-700' };
    case 'active':
      return { bg: 'bg-red-50', text: 'text-red-700' };
    default:
      return { bg: 'bg-gray-50', text: 'text-gray-700' };
  }
}

export default function EmergencySupportPage() {
  const [data, setData] = useState<EmergencyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSOSModal, setShowSOSModal] = useState(false);
  const [sosReason, setSosReason] = useState('');
  const [sosSeverity, setSosSeverity] = useState('HIGH');
  const [sendingSOS, setSendingSOS] = useState(false);
  const [sosSuccess, setSOSSuccess] = useState(false);

  const fetchEmergencyData = useCallback(async () => {
    try {
      setError(null);
      const res = await patientService.getEmergencyInfo();
      setData(res.data);
    } catch {
      setError('Failed to load emergency information. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmergencyData();
  }, [fetchEmergencyData]);

  const handleSOS = async () => {
    if (!sosReason.trim()) return;
    setSendingSOS(true);
    try {
      await patientService.triggerSOS(sosReason, sosSeverity);
      setSOSSuccess(true);
      setTimeout(() => {
        setShowSOSModal(false);
        setSOSSuccess(false);
        setSosReason('');
      }, 2500);
    } catch {
      setError('Failed to send SOS. Please call emergency services directly.');
    } finally {
      setSendingSOS(false);
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
          <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
          <p className="text-sm text-gray-500 font-medium">Loading emergency info...</p>
        </motion.div>
      </div>
    );
  }

  if (error && !data) {
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
            onClick={() => { setLoading(true); fetchEmergencyData(); }}
            className="px-6 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </motion.div>
      </div>
    );
  }

  if (!data) return null;

  const riskStyle = getRiskLevelStyle(data.current_risk_level);

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
            <ShieldAlert className="w-8 h-8 text-red-600" />
            Emergency Support
          </h1>
          <p className="text-gray-500 mt-1">Immediate help and emergency contacts</p>
        </div>
        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl ${riskStyle.bg}`}>
          <Activity className="w-4 h-4" />
          <span className={`text-xs font-bold uppercase tracking-wide ${riskStyle.text}`}>
            {riskStyle.label}
          </span>
        </div>
      </div>

      {/* SOS Button */}
      <div className="bg-gradient-to-br from-red-600 to-red-700 rounded-2xl p-8 text-center shadow-lg shadow-red-200/50">
        <h2 className="text-white text-xl font-bold mb-2">Emergency SOS</h2>
        <p className="text-red-100 text-sm mb-6">
          Press to alert your care team and emergency contacts immediately
        </p>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setShowSOSModal(true)}
          className="w-40 h-40 mx-auto rounded-full bg-white text-red-600 shadow-2xl flex flex-col items-center justify-center gap-2 border-4 border-red-300/30 hover:border-white/50 transition-all"
        >
          <Siren className="w-12 h-12" />
          <span className="text-sm font-black uppercase tracking-wide">SOS</span>
        </motion.button>
        <p className="text-red-200 text-xs mt-6">
          This will notify your doctor, emergency contacts, and local services
        </p>
      </div>

      {/* Helplines */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <PhoneCall className="w-5 h-5 text-emerald-500" />
            Helplines
          </h2>
        </div>
        <div className="divide-y divide-gray-50">
          {data.helplines.map((helpline, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center justify-between px-6 py-4 hover:bg-gray-50/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <Phone className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{helpline.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-gray-500 capitalize">{helpline.type}</span>
                    <span className="text-gray-300">|</span>
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {helpline.available}
                    </span>
                  </div>
                </div>
              </div>
              <a
                href={`tel:${helpline.number.replace(/\s/g, '')}`}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-700 transition-colors shadow-sm"
              >
                <Phone className="w-3.5 h-3.5" />
                {helpline.number}
              </a>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Danger Signs */}
      <div className="bg-white rounded-2xl shadow-sm border border-red-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-red-50 bg-red-50/30">
          <h2 className="text-lg font-semibold text-red-800 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            Danger Signs to Watch For
          </h2>
          <p className="text-xs text-red-600/70 mt-1">
            Seek immediate medical attention if you experience any of the following
          </p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {data.danger_signs.map((sign, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-start gap-3 p-3 rounded-xl bg-red-50/50 border border-red-100/50"
              >
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span className="text-sm text-red-800 font-medium">{sign}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Escalations */}
      {data.recent_escalations.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Info className="w-5 h-5 text-gray-400" />
              Recent Escalation History
            </h2>
          </div>
          <div className="divide-y divide-gray-50">
            {data.recent_escalations.map((esc) => {
              const statusStyle = getStatusStyle(esc.status);
              const levelStyle = getRiskLevelStyle(esc.level);
              return (
                <div key={esc.id} className="flex items-center justify-between px-6 py-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-2 h-2 rounded-full ${
                      esc.status.toLowerCase() === 'resolved' ? 'bg-emerald-400' :
                      esc.status.toLowerCase() === 'active' ? 'bg-red-400 animate-pulse' : 'bg-amber-400'
                    }`} />
                    <div>
                      <p className="text-sm font-medium text-gray-800">{esc.type}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(esc.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded ${levelStyle.bg} ${levelStyle.text}`}>
                      {esc.level}
                    </span>
                    <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded ${statusStyle.bg} ${statusStyle.text}`}>
                      {esc.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SOS Confirmation Modal */}
      <AnimatePresence>
        {showSOSModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              {sosSuccess ? (
                <div className="p-8 text-center">
                  <div className="w-16 h-16 mx-auto rounded-full bg-emerald-50 flex items-center justify-center mb-4">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">SOS Sent Successfully</h3>
                  <p className="text-sm text-gray-500">Your care team has been notified.</p>
                </div>
              ) : (
                <>
                  <div className="p-6 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <Siren className="w-5 h-5 text-red-600" />
                        Confirm SOS Alert
                      </h3>
                      <button
                        onClick={() => setShowSOSModal(false)}
                        className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                      >
                        <X className="w-4 h-4 text-gray-500" />
                      </button>
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                      This will immediately alert your doctor and emergency contacts.
                    </p>
                  </div>

                  <div className="p-6 space-y-4">
                    <div>
                      <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5 block">
                        What's happening? *
                      </label>
                      <textarea
                        value={sosReason}
                        onChange={(e) => setSosReason(e.target.value)}
                        placeholder="Describe your emergency briefly..."
                        className="w-full h-24 bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-300 outline-none resize-none transition-all"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5 block">
                        Severity
                      </label>
                      <div className="flex gap-2">
                        {['MEDIUM', 'HIGH', 'CRITICAL'].map(level => (
                          <button
                            key={level}
                            onClick={() => setSosSeverity(level)}
                            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                              sosSeverity === level
                                ? 'bg-red-600 text-white shadow-sm'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            {level}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="p-6 border-t border-gray-100 flex gap-3">
                    <button
                      onClick={() => setShowSOSModal(false)}
                      className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSOS}
                      disabled={sendingSOS || !sosReason.trim()}
                      className="flex-1 py-3 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {sendingSOS ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Siren className="w-4 h-4" />
                      )}
                      {sendingSOS ? 'Sending...' : 'Send SOS'}
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
