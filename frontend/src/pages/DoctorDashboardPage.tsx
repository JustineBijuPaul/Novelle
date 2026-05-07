import { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Stethoscope, Users, AlertTriangle, ShieldAlert, Eye, Clock, Activity,
  Brain, Baby, CheckCircle2, TrendingUp, Zap
} from 'lucide-react';
import { doctorService, escalationService } from '../services/endpoints';
import { getRiskBadge, formatDate } from '../utils/helpers';
import type { Escalation, PatientDashboardData } from '../types';
import PatientDetailDashboard from '../components/doctor/PatientDetailDashboard';

interface PatientRisk {
  mental_risk_level: string | null;
  physical_risk_level: string | null;
  fetal_risk_level: string | null;
  crisis_flag?: string;
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

export default function DoctorDashboardPage() {
  const location = useLocation();
  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [loading, setLoading] = useState(true);
  
  const activeTab = location.pathname.includes('escalations') ? 'escalations' : 'overview';
  
  const [selectedPatient, setSelectedPatient] = useState<number | null>(null);
  const [predictions, setPredictions] = useState<PatientDashboardData | null>(null);
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

  const loadPredictions = async (patientId: number) => {
    setSelectedPatient(patientId);
    setLoadingPredictions(true);
    try {
      const res = await doctorService.getPatientPredictions(patientId);
      setPredictions(res.data);
    } catch (error) {
      console.error('Failed to load predictions:', error);
    } finally {
      setLoadingPredictions(false);
    }
  };

  const handleAddNote = async (content: string) => {
    if (!selectedPatient) return;
    try {
      await doctorService.addNote(selectedPatient, content);
      await loadPredictions(selectedPatient);
    } catch (error) {
      console.error('Failed to add note:', error);
    }
  };

  const handleAddAppointment = async (date: string, reason: string) => {
    if (!selectedPatient) return;
    try {
      await doctorService.scheduleAppointment(selectedPatient, { appointment_date: date, reason });
      await loadPredictions(selectedPatient);
    } catch (error) {
      console.error('Failed to add appointment:', error);
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
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PatientDetailDashboard
          data={predictions}
          patientName={patients.find(p => p.user_id === selectedPatient)?.name || 'Patient'}
          onBack={closePredictions}
          onAddNote={handleAddNote}
          onAddAppointment={handleAddAppointment}
        />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-fade-in">
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
          <Link to="/doctor/patients"
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'overview' ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}>
            <Users className="w-4 h-4 inline mr-1" /> Patients
          </Link>
          <Link to="/doctor/escalations"
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all relative ${
              activeTab === 'escalations' ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}>
            <ShieldAlert className="w-4 h-4 inline mr-1" /> Escalations
            {escalations.filter(e => e.status === 'pending').length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {escalations.filter(e => e.status === 'pending').length}
              </span>
            )}
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard value={stats.total_patients || patients.length} label="Total Patients" color="text-primary-500" />
        <StatCard value={stats.high_risk || 0} label="High Risk" color="text-red-500" />
        <StatCard value={stats.pending || 0} label="Pending Escalations" color="text-yellow-500" />
        <StatCard value={stats.resolved || 0} label="Resolved" color="text-green-500" />
      </div>

      {activeTab === 'overview' ? (
        <div className="space-y-3">
          {patients.length === 0 ? (
            <EmptyState icon={Users} message="No patients found" />
          ) : (
            patients.map((patient, i) => (
              <PatientListItem
                key={patient.user_id}
                patient={patient}
                index={i}
                onClick={() => loadPredictions(patient.user_id)}
              />
            ))
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {escalations.length === 0 ? (
            <EmptyState icon={ShieldAlert} message="No escalations" />
          ) : (
            escalations.map((esc, i) => (
              <EscalationListItem
                key={esc.id || i}
                esc={esc}
                index={i}
                onResolve={resolveEscalation}
              />
            ))
          )}
        </div>
      )}

      {loadingPredictions && <LoadingOverlay message="Loading clinical data..." />}
    </div>
  );
}

function StatCard({ value, label, color }: { value: number | string; label: string; color: string }) {
  return (
    <div className="card text-center">
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  );
}

function EmptyState({ icon: Icon, message }: { icon: any; message: string }) {
  return (
    <div className="text-center py-16">
      <Icon className="w-12 h-12 text-gray-200 mx-auto mb-4" />
      <p className="text-gray-500">{message}</p>
    </div>
  );
}

function LoadingOverlay({ message }: { message: string }) {
  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="card p-8 text-center shadow-2xl">
        <Stethoscope className="w-8 h-8 text-primary-400 animate-pulse mx-auto mb-3" />
        <p className="text-sm font-medium text-gray-700">{message}</p>
      </div>
    </div>
  );
}

function PatientListItem({ patient, index, onClick }: { patient: PatientSummary; index: number; onClick: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="card hover:shadow-md transition-shadow cursor-pointer"
      onClick={onClick}
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
            {patient.pregnancy_week && <p className="text-xs text-gray-500">Week {patient.pregnancy_week}</p>}
            {patient.trimester && <p className="text-xs text-gray-500 capitalize">{patient.trimester} trimester</p>}
            {patient.age && <p className="text-xs text-gray-500">Age {patient.age}</p>}
          </div>
        </div>
        <div className="flex items-center gap-4">
          {patient.latest_risk && (
            <div className="flex gap-3">
              <RiskBadgeCompact icon={Brain} level={patient.latest_risk.mental_risk_level} color="text-purple-400" />
              <RiskBadgeCompact icon={Activity} level={patient.latest_risk.physical_risk_level} color="text-red-400" />
              <RiskBadgeCompact icon={Baby} level={patient.latest_risk.fetal_risk_level} color="text-green-400" />
            </div>
          )}
          <Eye className="w-4 h-4 text-gray-400" />
        </div>
      </div>
    </motion.div>
  );
}

function EscalationListItem({ esc, index, onResolve }: { esc: Escalation; index: number; onResolve: (id: string) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className={`card border-l-4 ${esc.status === 'pending' ? 'border-l-red-500' : 'border-l-green-500'}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              esc.severity === 'HIGH' || esc.severity === 'URGENT' ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-600'
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
          <button onClick={() => esc.id && onResolve(esc.id)} className="btn-secondary text-xs flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Resolve
          </button>
        )}
      </div>
    </motion.div>
  );
}

function RiskBadgeCompact({ icon: Icon, level, color }: { icon: any; level: string | null; color: string }) {
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
