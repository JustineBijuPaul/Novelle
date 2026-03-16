import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Stethoscope, Users, AlertTriangle, ShieldAlert, Eye, Clock, Activity,
  Brain, Baby, CheckCircle2, ChevronDown, ChevronUp, TrendingUp,
  Heart, Droplets, Thermometer, Shield, Zap, UserCheck, ArrowLeft,
} from 'lucide-react';
import { doctorService, escalationService } from '../services/endpoints';
import { getRiskBadge, formatDate } from '../utils/helpers';
import type { Escalation } from '../types';

interface PatientRisk {
  mental_risk_level: string | null;
  physical_risk_level: string | null;
  fetal_risk_level: string | null;
  crisis_flag?: string;
  depression_risk?: string | null;
  anxiety_risk?: string | null;
  hypertension_risk?: string | null;
  diabetes_risk?: string | null;
  anemia_risk?: string | null;
  preterm_risk?: string | null;
  low_birth_weight_risk?: string | null;
  growth_abnormality_risk?: string | null;
  mental_confidence?: number | null;
  physical_confidence?: number | null;
  fetal_confidence?: number | null;
  scored_at?: string | null;
}

interface PatientSummary {
  user_id: number;
  name: string;
  email: string;
  phone?: string;
  city?: string;
  pregnancy_week?: number;
  trimester?: string;
  age?: number;
  latest_risk?: PatientRisk;
}

interface PredictionDetail {
  overall_risk: string;
  confidence: number;
  recommendations: string[];
  [key: string]: unknown;
}

interface PatientPredictions {
  patient_id: number;
  profile: Record<string, unknown> | null;
  fetal_predictions: PredictionDetail | null;
  physical_predictions: PredictionDetail | null;
  mental_predictions: PredictionDetail | null;
  recent_vitals: { date: string; bp: string | null; sugar_fasting: number | null; weight: number | null; fetal_movements: number | null }[];
  mental_health_history: { date: string; phq9: number | null; gad7: number | null; mood: number | null; stress: number | null }[];
  risk_trend: { scored_at: string; mental: string; physical: string; fetal: string }[];
}

export default function DoctorDashboardPage() {
  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'escalations'>('overview');
  const [selectedPatient, setSelectedPatient] = useState<number | null>(null);
  const [predictions, setPredictions] = useState<PatientPredictions | null>(null);
  const [loadingPredictions, setLoadingPredictions] = useState(false);
  const [stats, setStats] = useState({ total_patients: 0, high_risk: 0, pending: 0, resolved: 0 });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [pRes, eRes] = await Promise.allSettled([
        doctorService.getDashboard(),
        escalationService.list(),
      ]);
      if (pRes.status === 'fulfilled') {
        setPatients(pRes.value.data.patients || []);
        setStats(pRes.value.data.stats || {});
      }
      if (eRes.status === 'fulfilled') setEscalations(eRes.value.data || []);
    } catch {
      // handled
    } finally {
      setLoading(false);
    }
  };

  const viewPredictions = async (patientId: number) => {
    setSelectedPatient(patientId);
    setLoadingPredictions(true);
    try {
      const res = await doctorService.getPatientPredictions(patientId);
      setPredictions(res.data);
    } catch {
      setPredictions(null);
    } finally {
      setLoadingPredictions(false);
    }
  };

  const closePredictions = () => {
    setSelectedPatient(null);
    setPredictions(null);
  };

  const resolveEscalation = async (id: string) => {
    try {
      await escalationService.resolve(id, { status: 'resolved', notes: 'Reviewed and resolved by doctor' });
      setEscalations(prev => prev.map(e => e.id === id ? { ...e, status: 'resolved' } : e));
    } catch {
      // handled
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Stethoscope className="w-10 h-10 text-primary-300 animate-pulse-soft" />
      </div>
    );
  }

  if (selectedPatient && predictions) {
    return <PatientPredictionView predictions={predictions} patient={patients.find(p => p.user_id === selectedPatient)!} onBack={closePredictions} />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="disclaimer-banner">
        <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <span>Risk scores are algorithm-generated estimates. Clinical judgment should always take precedence.</span>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-display font-bold flex items-center gap-2">
          <Stethoscope className="w-5 h-5 text-primary-500" />
          Doctor Dashboard
        </h2>
        <div className="flex gap-2">
          <button onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'overview' ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}>
            <Users className="w-4 h-4 inline mr-1" /> Patients
          </button>
          <button onClick={() => setActiveTab('escalations')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all relative ${
              activeTab === 'escalations' ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}>
            <ShieldAlert className="w-4 h-4 inline mr-1" /> Escalations
            {escalations.filter(e => e.status === 'pending').length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {escalations.filter(e => e.status === 'pending').length}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card text-center">
          <p className="text-3xl font-bold text-primary-500">{stats.total_patients || patients.length}</p>
          <p className="text-xs text-gray-500 mt-1">Total Patients</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-red-500">{stats.high_risk || 0}</p>
          <p className="text-xs text-gray-500 mt-1">High Risk</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-yellow-500">{stats.pending || escalations.filter(e => e.status === 'pending').length}</p>
          <p className="text-xs text-gray-500 mt-1">Pending Escalations</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-green-500">{stats.resolved || escalations.filter(e => e.status === 'resolved').length}</p>
          <p className="text-xs text-gray-500 mt-1">Resolved</p>
        </div>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-3">
          {patients.length === 0 ? (
            <div className="text-center py-16">
              <Users className="w-12 h-12 text-gray-200 mx-auto mb-4" />
              <p className="text-gray-500">No patients found</p>
            </div>
          ) : (
            patients.map((patient, i) => (
              <motion.div key={patient.user_id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="card hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => viewPredictions(patient.user_id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h4 className="font-semibold text-gray-900">{patient.name}</h4>
                      {patient.latest_risk?.crisis_flag === 'URGENT' && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium animate-pulse">CRISIS</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400">{patient.email}</p>
                    <div className="flex gap-3 mt-1">
                      {patient.pregnancy_week && (
                        <p className="text-xs text-gray-500">Week {patient.pregnancy_week}</p>
                      )}
                      {patient.trimester && (
                        <p className="text-xs text-gray-500 capitalize">{patient.trimester} trimester</p>
                      )}
                      {patient.age && (
                        <p className="text-xs text-gray-500">Age {patient.age}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {patient.latest_risk && (
                      <div className="flex gap-3">
                        <RiskBadgeCompact icon={Brain} label="Mental" level={patient.latest_risk.mental_risk_level} color="text-purple-400" />
                        <RiskBadgeCompact icon={Activity} label="Physical" level={patient.latest_risk.physical_risk_level} color="text-red-400" />
                        <RiskBadgeCompact icon={Baby} label="Fetal" level={patient.latest_risk.fetal_risk_level} color="text-green-400" />
                      </div>
                    )}
                    <Eye className="w-4 h-4 text-gray-400" />
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}

      {activeTab === 'escalations' && (
        <div className="space-y-3">
          {escalations.length === 0 ? (
            <div className="text-center py-16">
              <ShieldAlert className="w-12 h-12 text-gray-200 mx-auto mb-4" />
              <p className="text-gray-500">No escalations</p>
            </div>
          ) : (
            escalations.map((esc, i) => (
              <motion.div key={esc.id || i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className={`card border-l-4 ${
                  esc.status === 'pending' ? 'border-l-red-500' : 'border-l-green-500'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        esc.severity === 'HIGH' || esc.severity === 'URGENT' ? 'bg-red-100 text-red-600' : esc.severity === 'MEDIUM' ? 'bg-yellow-100 text-yellow-600' : 'bg-green-100 text-green-600'
                      }`}>
                        {esc.severity}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        esc.status === 'pending' ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'
                      }`}>
                        {esc.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">{esc.escalation_reason || esc.reason}</p>
                    <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {formatDate(esc.created_at || esc.triggered_at)}
                    </p>
                  </div>
                  {esc.status === 'pending' && (
                    <button onClick={() => esc.id && resolveEscalation(esc.id)}
                      className="btn-secondary text-xs flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Resolve
                    </button>
                  )}
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}

      {loadingPredictions && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
          <div className="card p-8 text-center">
            <Stethoscope className="w-8 h-8 text-primary-400 animate-pulse mx-auto mb-3" />
            <p className="text-sm text-gray-600">Loading AI predictions...</p>
          </div>
        </div>
      )}
    </div>
  );
}


function RiskBadgeCompact({ icon: Icon, label, level, color }: { icon: React.ComponentType<{ className?: string }>; label: string; level: string | null; color: string }) {
  const badgeClass = level === 'HIGH' ? 'bg-red-100 text-red-700' : level === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700';
  return (
    <div className="text-center">
      <Icon className={`w-4 h-4 ${color} mx-auto mb-0.5`} />
      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${badgeClass}`}>
        {level || 'N/A'}
      </span>
    </div>
  );
}


function PatientPredictionView({ predictions, patient, onBack }: { predictions: PatientPredictions; patient: PatientSummary; onBack: () => void }) {
  const [expandedSection, setExpandedSection] = useState<string | null>('fetal');

  const toggle = (section: string) => setExpandedSection(prev => prev === section ? null : section);

  return (
    <div className="space-y-6 animate-fade-in">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Patients
      </button>

      <div className="card">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-display font-bold text-gray-900">{patient.name}</h2>
            <p className="text-sm text-gray-500">{patient.email}</p>
            <div className="flex gap-4 mt-2 text-xs text-gray-500">
              {patient.age && <span>Age: {patient.age}</span>}
              {patient.pregnancy_week && <span>Week: {patient.pregnancy_week}</span>}
              {patient.trimester && <span className="capitalize">{patient.trimester} Trimester</span>}
            </div>
          </div>
          {patient.latest_risk && (
            <div className="flex gap-4">
              <RiskBadgeCompact icon={Brain} label="Mental" level={patient.latest_risk.mental_risk_level} color="text-purple-400" />
              <RiskBadgeCompact icon={Activity} label="Physical" level={patient.latest_risk.physical_risk_level} color="text-red-400" />
              <RiskBadgeCompact icon={Baby} label="Fetal" level={patient.latest_risk.fetal_risk_level} color="text-green-400" />
            </div>
          )}
        </div>
      </div>

      {predictions.profile && (
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-primary-500" /> Patient Profile
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            {Boolean(predictions.profile.bmi) && <ProfileItem label="BMI" value={String(predictions.profile.bmi)} />}
            {Boolean(predictions.profile.hemoglobin) && <ProfileItem label="Hemoglobin" value={`${String(predictions.profile.hemoglobin)} g/dL`} />}
            <ProfileItem label="Gest. Diabetes" value={predictions.profile.gestational_diabetes ? 'Yes' : 'No'} warn={!!predictions.profile.gestational_diabetes} />
            <ProfileItem label="Chronic HTN" value={predictions.profile.chronic_hypertension ? 'Yes' : 'No'} warn={!!predictions.profile.chronic_hypertension} />
          </div>
          {Array.isArray(predictions.profile.past_complications) && (predictions.profile.past_complications as string[]).length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-medium text-gray-500 mb-1">Past Complications</p>
              <div className="flex flex-wrap gap-1">
                {(predictions.profile.past_complications as string[]).map((c: string) => (
                  <span key={c} className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-600">{c}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Fetal Health Predictions */}
      <PredictionSection
        title="Fetal Health Predictions"
        icon={Baby}
        iconColor="text-green-500"
        prediction={predictions.fetal_predictions}
        expanded={expandedSection === 'fetal'}
        onToggle={() => toggle('fetal')}
        subRisks={predictions.fetal_predictions ? [
          { label: 'Preterm Risk', value: (predictions.fetal_predictions as Record<string, unknown>).preterm_risk as string },
          { label: 'Low Birth Weight', value: (predictions.fetal_predictions as Record<string, unknown>).low_birth_weight_risk as string },
          { label: 'Growth Abnormality', value: (predictions.fetal_predictions as Record<string, unknown>).growth_abnormality_risk as string },
          { label: 'Missed Care', value: (predictions.fetal_predictions as Record<string, unknown>).missed_care_risk as string },
        ] : []}
      />

      {/* Physical Health Predictions */}
      <PredictionSection
        title="Physical Health Predictions"
        icon={Activity}
        iconColor="text-red-500"
        prediction={predictions.physical_predictions}
        expanded={expandedSection === 'physical'}
        onToggle={() => toggle('physical')}
        subRisks={predictions.physical_predictions ? [
          { label: 'Hypertension', value: (predictions.physical_predictions as Record<string, unknown>).hypertension_risk as string },
          { label: 'Diabetes', value: (predictions.physical_predictions as Record<string, unknown>).diabetes_risk as string },
          { label: 'Anemia', value: (predictions.physical_predictions as Record<string, unknown>).anemia_risk as string },
          { label: 'Infection', value: (predictions.physical_predictions as Record<string, unknown>).infection_risk as string },
          { label: 'Nutrition', value: (predictions.physical_predictions as Record<string, unknown>).nutrition_risk as string },
        ] : []}
      />

      {/* Mental Health Predictions */}
      <PredictionSection
        title="Mental Health Predictions"
        icon={Brain}
        iconColor="text-purple-500"
        prediction={predictions.mental_predictions}
        expanded={expandedSection === 'mental'}
        onToggle={() => toggle('mental')}
        subRisks={predictions.mental_predictions ? [
          { label: 'Depression', value: (predictions.mental_predictions as Record<string, unknown>).depression_risk as string },
          { label: 'Anxiety', value: (predictions.mental_predictions as Record<string, unknown>).anxiety_risk as string },
          { label: 'Isolation', value: (predictions.mental_predictions as Record<string, unknown>).isolation_detected ? 'DETECTED' : 'None' },
          { label: 'Postpartum', value: (predictions.mental_predictions as Record<string, unknown>).postpartum_risk as string },
          { label: 'Crisis Flag', value: (predictions.mental_predictions as Record<string, unknown>).crisis_flag as string },
        ] : []}
      />

      {/* Recent Vitals */}
      {predictions.recent_vitals.length > 0 && (
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Thermometer className="w-4 h-4 text-orange-500" /> Recent Vitals (7 days)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="pb-2 pr-4">Date</th>
                  <th className="pb-2 pr-4">BP</th>
                  <th className="pb-2 pr-4">Sugar (F)</th>
                  <th className="pb-2 pr-4">Weight</th>
                  <th className="pb-2">Fetal Movements</th>
                </tr>
              </thead>
              <tbody>
                {predictions.recent_vitals.map((v, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    <td className="py-2 pr-4 text-gray-600">{v.date}</td>
                    <td className="py-2 pr-4 font-medium">{v.bp || '—'}</td>
                    <td className="py-2 pr-4">{v.sugar_fasting ?? '—'}</td>
                    <td className="py-2 pr-4">{v.weight ? `${v.weight} kg` : '—'}</td>
                    <td className="py-2">{v.fetal_movements ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Mental Health History */}
      {predictions.mental_health_history.length > 0 && (
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Brain className="w-4 h-4 text-purple-500" /> Mental Health History
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="pb-2 pr-4">Date</th>
                  <th className="pb-2 pr-4">PHQ-9</th>
                  <th className="pb-2 pr-4">GAD-7</th>
                  <th className="pb-2 pr-4">Mood</th>
                  <th className="pb-2">Stress</th>
                </tr>
              </thead>
              <tbody>
                {predictions.mental_health_history.map((m, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    <td className="py-2 pr-4 text-gray-600">{m.date}</td>
                    <td className={`py-2 pr-4 font-medium ${(m.phq9 || 0) >= 15 ? 'text-red-600' : (m.phq9 || 0) >= 10 ? 'text-yellow-600' : ''}`}>
                      {m.phq9 ?? '—'}
                    </td>
                    <td className={`py-2 pr-4 font-medium ${(m.gad7 || 0) >= 15 ? 'text-red-600' : (m.gad7 || 0) >= 10 ? 'text-yellow-600' : ''}`}>
                      {m.gad7 ?? '—'}
                    </td>
                    <td className="py-2 pr-4">{m.mood ?? '—'}/10</td>
                    <td className="py-2">{m.stress ?? '—'}/10</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="disclaimer-banner">
        <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <span>All predictions are AI-generated estimates for decision support. They do not constitute medical diagnoses.</span>
      </div>
    </div>
  );
}


function ProfileItem({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="bg-gray-50 rounded-lg p-2">
      <p className="text-gray-500 text-[10px]">{label}</p>
      <p className={`font-medium ${warn ? 'text-red-600' : 'text-gray-800'}`}>{value}</p>
    </div>
  );
}


function PredictionSection({
  title, icon: Icon, iconColor, prediction, expanded, onToggle, subRisks,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  prediction: PredictionDetail | null;
  expanded: boolean;
  onToggle: () => void;
  subRisks: { label: string; value: string }[];
}) {
  if (!prediction) {
    return (
      <div className="card opacity-60">
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${iconColor}`} />
          <span className="text-sm font-semibold text-gray-500">{title}</span>
          <span className="text-xs text-gray-400 ml-auto">No data available</span>
        </div>
      </div>
    );
  }

  const riskColor = prediction.overall_risk === 'HIGH' ? 'border-l-red-500' : prediction.overall_risk === 'MEDIUM' ? 'border-l-yellow-500' : 'border-l-green-500';
  const riskBg = prediction.overall_risk === 'HIGH' ? 'bg-red-50' : prediction.overall_risk === 'MEDIUM' ? 'bg-yellow-50' : 'bg-green-50';
  const riskText = prediction.overall_risk === 'HIGH' ? 'text-red-700' : prediction.overall_risk === 'MEDIUM' ? 'text-yellow-700' : 'text-green-700';

  return (
    <div className={`card border-l-4 ${riskColor}`}>
      <button onClick={onToggle} className="w-full flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={`w-5 h-5 ${iconColor}`} />
          <span className="text-sm font-semibold text-gray-800">{title}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-xs px-3 py-1 rounded-full font-bold ${riskBg} ${riskText}`}>
            {prediction.overall_risk}
          </span>
          {prediction.confidence && (
            <span className="text-[10px] text-gray-400">{Math.round(prediction.confidence * 100)}% conf.</span>
          )}
          {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-4 space-y-4">
              {/* Sub-risks */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {subRisks.map(sr => (
                  <div key={sr.label} className="bg-gray-50 rounded-lg p-2.5">
                    <p className="text-[10px] text-gray-500 mb-0.5">{sr.label}</p>
                    <p className={`text-xs font-bold ${
                      sr.value === 'HIGH' || sr.value === 'URGENT' || sr.value === 'DETECTED' ? 'text-red-600'
                      : sr.value === 'MEDIUM' || sr.value === 'REVIEW_NEEDED' ? 'text-yellow-600'
                      : 'text-green-600'
                    }`}>
                      {sr.value || 'LOW'}
                    </p>
                  </div>
                ))}
              </div>

              {/* Recommendations */}
              {prediction.recommendations.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-600 mb-2 flex items-center gap-1">
                    <Shield className="w-3 h-3" /> AI Recommendations
                  </p>
                  <div className="space-y-1.5">
                    {prediction.recommendations.map((rec, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-gray-700 bg-blue-50/50 rounded-lg p-2">
                        <TrendingUp className="w-3 h-3 text-blue-500 mt-0.5 flex-shrink-0" />
                        <span>{rec}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
