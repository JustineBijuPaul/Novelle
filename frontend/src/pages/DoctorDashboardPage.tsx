import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Stethoscope, Users, AlertTriangle, ShieldAlert, Eye, Clock, Activity, Brain, Baby, CheckCircle2, XCircle } from 'lucide-react';
import { doctorService, escalationService } from '../services/endpoints';
import { getRiskBadge, formatDate } from '../utils/helpers';
import type { Escalation } from '../types';

interface PatientSummary {
  user_id: string;
  name: string;
  email: string;
  pregnancy_week?: number;
  latest_risk?: {
    mental_risk_level: string;
    physical_risk_level: string;
    fetal_risk_level: string;
  };
}

export default function DoctorDashboardPage() {
  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'escalations'>('overview');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [pRes, eRes] = await Promise.allSettled([
        doctorService.getDashboard(),
        escalationService.list(),
      ]);
      if (pRes.status === 'fulfilled') setPatients(pRes.value.data.patients || []);
      if (eRes.status === 'fulfilled') setEscalations(eRes.value.data || []);
    } catch {
      // handled
    } finally {
      setLoading(false);
    }
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

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="disclaimer-banner">
        <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <span>Risk scores are algorithm-generated estimates. Clinical judgment should always take precedence.</span>
      </div>

      {/* Header */}
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

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card text-center">
          <p className="text-3xl font-bold text-primary-500">{patients.length}</p>
          <p className="text-xs text-gray-500 mt-1">Total Patients</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-red-500">
            {patients.filter(p => p.latest_risk?.mental_risk_level === 'HIGH' || p.latest_risk?.physical_risk_level === 'HIGH' || p.latest_risk?.fetal_risk_level === 'HIGH').length}
          </p>
          <p className="text-xs text-gray-500 mt-1">High Risk</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-yellow-500">
            {escalations.filter(e => e.status === 'pending').length}
          </p>
          <p className="text-xs text-gray-500 mt-1">Pending Escalations</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-green-500">
            {escalations.filter(e => e.status === 'resolved').length}
          </p>
          <p className="text-xs text-gray-500 mt-1">Resolved</p>
        </div>
      </div>

      {/* Patients Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-3">
          {patients.length === 0 ? (
            <div className="text-center py-16">
              <Users className="w-12 h-12 text-gray-200 mx-auto mb-4" />
              <p className="text-gray-500">No patients assigned yet</p>
            </div>
          ) : (
            patients.map((patient, i) => (
              <motion.div key={patient.user_id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="card"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-gray-900">{patient.name}</h4>
                    <p className="text-xs text-gray-400">{patient.email}</p>
                    {patient.pregnancy_week && (
                      <p className="text-xs text-gray-500 mt-1">Week {patient.pregnancy_week}</p>
                    )}
                  </div>
                  {patient.latest_risk && (
                    <div className="flex gap-2">
                      <div className="text-center">
                        <Brain className="w-4 h-4 text-lavender-400 mx-auto mb-1" />
                        <span className={`text-xs ${getRiskBadge(patient.latest_risk.mental_risk_level)}`}>
                          {patient.latest_risk.mental_risk_level}
                        </span>
                      </div>
                      <div className="text-center">
                        <Activity className="w-4 h-4 text-red-400 mx-auto mb-1" />
                        <span className={`text-xs ${getRiskBadge(patient.latest_risk.physical_risk_level)}`}>
                          {patient.latest_risk.physical_risk_level}
                        </span>
                      </div>
                      <div className="text-center">
                        <Baby className="w-4 h-4 text-green-400 mx-auto mb-1" />
                        <span className={`text-xs ${getRiskBadge(patient.latest_risk.fetal_risk_level)}`}>
                          {patient.latest_risk.fetal_risk_level}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}

      {/* Escalations Tab */}
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
                        esc.severity === 'HIGH' ? 'bg-red-100 text-red-600' : esc.severity === 'MEDIUM' ? 'bg-yellow-100 text-yellow-600' : 'bg-green-100 text-green-600'
                      }`}>
                        {esc.severity}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        esc.status === 'pending' ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'
                      }`}>
                        {esc.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">{esc.reason}</p>
                    <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {formatDate(esc.created_at)}
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
    </div>
  );
}
