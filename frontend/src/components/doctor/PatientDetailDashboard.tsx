import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Brain, Activity, Baby, Shield, TrendingUp, Clock,
  Calendar, MessageSquare, Plus, FileText, ChevronRight,
  AlertCircle, CheckCircle2, Zap, LayoutDashboard, Stethoscope,
  Video, Pill, FileUp, Download, Share2, Info
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, BarChart, Bar, Cell
} from 'recharts';
import type { PatientDashboardData, ClinicalNote, Appointment, Medication } from '../../types';
import { formatDate, getRiskBadge, cn } from '../../utils/helpers';

interface Props {
  data: PatientDashboardData;
  patientName: string;
  onBack: () => void;
  onAddNote: (content: string) => Promise<void>;
  onAddAppointment: (date: string, reason: string) => Promise<void>;
}

export default function PatientDetailDashboard({ data, patientName, onBack, onAddNote, onAddAppointment }: Props) {
  const [activeTab, setActiveTab] = useState<'overview' | 'charts' | 'notes' | 'history'>('overview');
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [newNote, setNewNote] = useState('');

  const currentWeek = data.profile?.pregnancy_week || 0;
  const progress = (currentWeek / 40) * 100;

  // Derive Clinical Status
  const adherence = 87; // This could be calculated from data.medications logs
  const compliance = "High";
  const missedLogs = 1;

  const handleQuickAction = (action: string) => {
    console.log(`Executing quick action: ${action}`);
    if (action === 'Schedule') {
      // Trigger appointment modal
    } else if (action === 'Video Call') {
      window.open(data.appointments?.[0]?.telemedicine_link || '#', '_blank');
    }
    // Add other handlers...
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </button>
          <div>
            <h1 className="text-2xl font-display font-bold text-gray-900">{patientName}</h1>
            <p className="text-sm text-gray-500 flex items-center gap-2">
              <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-md font-medium">Week {currentWeek}</span>
              <span className="text-gray-300">•</span>
              <span>{data.profile?.trimester} Trimester</span>
              <span className="text-gray-300">•</span>
              <span>Due: {data.profile?.due_date || 'TBD'}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button className="btn-secondary text-xs py-2 flex items-center gap-2">
            <Share2 className="w-3.5 h-3.5" /> Export PDF
          </button>
          <button className="btn-secondary text-xs py-2 flex items-center gap-2">
            <Video className="w-3.5 h-3.5" /> Telehealth
          </button>
          <button onClick={() => setShowNoteModal(true)} className="btn-primary text-xs py-2 flex items-center gap-2">
            <Plus className="w-3.5 h-3.5" /> Clinical Note
          </button>
        </div>
      </div>

      {/* Pregnancy Timeline */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary-500" /> Pregnancy Timeline
          </h3>
          <span className="text-xs text-gray-400">Week {currentWeek} of 40</span>
        </div>
        <div className="relative h-3 bg-gray-100 rounded-full mb-8">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-primary-400 to-primary-600 rounded-full"
          />
          {/* Milestones */}
          {[12, 20, 28, 36, 40].map((week) => (
            <div
              key={week}
              className="absolute top-1/2 -translate-y-1/2 flex flex-col items-center"
              style={{ left: `${(week / 40) * 100}%` }}
            >
              <div className={`w-2 h-2 rounded-full ${currentWeek >= week ? 'bg-primary-500' : 'bg-gray-300'}`} />
              <span className="absolute top-4 text-[10px] text-gray-400 whitespace-nowrap">Week {week}</span>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12">
          <TimelineMilestone label="Conception" date="Jan 15" status="completed" />
          <TimelineMilestone label="Nuchal Scan" date="Feb 28" status="completed" />
          <TimelineMilestone label="Anomaly Scan" date="Apr 15" status="current" />
          <TimelineMilestone label="GTT Test" date="May 10" status="upcoming" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Content Area (75%) */}
        <div className="lg:col-span-3 space-y-6">
          {/* Tabs */}
          <div className="flex border-b border-gray-100">
            {['overview', 'charts', 'notes', 'history'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`px-6 py-3 text-sm font-medium transition-colors relative ${
                  activeTab === tab ? 'text-primary-600' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                {activeTab === tab && (
                  <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500" />
                )}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {/* Explainable AI Explaination Panel */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="card bg-gradient-to-br from-white to-primary-50/30">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <Zap className="w-4 h-4 text-amber-500" /> Explainable AI Analysis
                      </h3>
                      <button className="text-[10px] text-primary-600 font-medium hover:underline">Full Report</button>
                    </div>
                    <div className="space-y-4">
                      <div className="p-3 bg-white/80 rounded-xl border border-primary-100 shadow-sm">
                        <p className="text-xs font-semibold text-gray-800 mb-2">Primary Risk Drivers</p>
                        <ul className="space-y-2">
                          {data.shap_analysis ? (
                            Object.entries(data.shap_analysis).flatMap(([domain, features]: [string, any]) => 
                              Object.entries(features || {}).map(([feature, impact]: [string, any]) => (
                                <RiskFactor 
                                  key={`${domain}-${feature}`}
                                  label={feature.replace('_', ' ')} 
                                  description={impact > 0.1 ? "Significant upward pressure" : impact > 0 ? "Mild upward pressure" : "Downward pressure (protective)"} 
                                  impact={impact > 0 ? "negative" : "positive"} 
                                />
                              ))
                            ).slice(0, 4)
                          ) : (
                            <>
                              <RiskFactor label="Baseline" description="Model is using population defaults" impact="neutral" />
                              <RiskFactor label="Data Density" description="Historical logs are within normal ranges" impact="positive" />
                            </>
                          )}
                        </ul>
                      </div>
                      <div className="flex gap-2">
                        <div className="flex-1 bg-white/80 p-2 rounded-lg border border-gray-100">
                          <p className="text-[10px] text-gray-500">Model Confidence</p>
                          <p className="text-sm font-bold text-gray-900">
                            {Math.round(((data.physical_predictions?.confidence || 0.9) + (data.mental_predictions?.confidence || 0.9)) / 2 * 100)}%
                          </p>
                        </div>
                        <div className="flex-1 bg-white/80 p-2 rounded-lg border border-gray-100">
                          <p className="text-[10px] text-gray-500">Interpretation</p>
                          <p className="text-sm font-bold text-gray-900 uppercase">SHAP-Deep</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="card">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                      <Shield className="w-4 h-4 text-green-500" /> Smart Recommendations
                    </h3>
                    <div className="space-y-3">
                      <RecommendationItem
                        icon={Stethoscope}
                        title="Schedule Glucose Test"
                        desc="Recommended between Week 24-28 based on history."
                        priority="high"
                      />
                      <RecommendationItem
                        icon={Activity}
                        title="Monitor Fetal Movement"
                        desc="Increase count logs to twice daily due to slight BP increase."
                        priority="medium"
                      />
                      <RecommendationItem
                        icon={MessageSquare}
                        title="Mental Health Check-in"
                        desc="Brief counseling session suggested for mood fluctuations."
                        priority="low"
                      />
                    </div>
                  </div>
                </div>

                {/* Mini Charts Preview */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="card h-64">
                    <h4 className="text-xs font-semibold text-gray-500 mb-4">Blood Pressure Trend</h4>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={data.recent_vitals.slice().reverse()}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis dataKey="date" hide />
                        <YAxis domain={['auto', 'auto']} hide />
                        <Tooltip />
                        <Line type="monotone" dataKey="bp_systolic" stroke="#ef4444" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="bp_diastolic" stroke="#3b82f6" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="card h-64">
                    <h4 className="text-xs font-semibold text-gray-500 mb-4">Mood & Stress History</h4>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={data.mental_health_history.slice().reverse()}>
                        <defs>
                          <linearGradient id="colorMood" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.1}/>
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="date" hide />
                        <YAxis hide />
                        <Tooltip />
                        <Area type="monotone" dataKey="mood" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorMood)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'charts' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-6"
              >
                <div className="card h-96">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-sm font-semibold text-gray-700">Detailed Physiological Analytics</h3>
                    <div className="flex gap-2">
                      <button className="text-[10px] px-2 py-1 bg-gray-100 rounded">BP</button>
                      <button className="text-[10px] px-2 py-1 bg-gray-100 rounded">Glucose</button>
                      <button className="text-[10px] px-2 py-1 bg-gray-100 rounded">Weight</button>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.recent_vitals.slice().reverse()}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="date" tick={{fontSize: 10}} />
                      <YAxis tick={{fontSize: 10}} />
                      <Tooltip />
                      <Line name="Systolic" type="monotone" dataKey="bp_systolic" stroke="#ef4444" strokeWidth={3} dot={{ r: 4 }} />
                      <Line name="Diastolic" type="monotone" dataKey="bp_diastolic" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>
            )}

            {activeTab === 'notes' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-4"
              >
                {data.clinical_notes.length === 0 ? (
                  <div className="py-20 text-center">
                    <FileText className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                    <p className="text-gray-500">No clinical notes recorded yet.</p>
                  </div>
                ) : (
                  data.clinical_notes.map((note) => (
                    <div key={note.id} className="card hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-primary-500 bg-primary-50 px-2 py-0.5 rounded">
                          {note.note_type}
                        </span>
                        <span className="text-[10px] text-gray-400">{formatDate(note.created_at)}</span>
                      </div>
                      <p className="text-sm text-gray-700 leading-relaxed">{note.content}</p>
                      {note.ai_summary && (
                        <div className="mt-3 p-2 bg-amber-50 rounded-lg text-xs text-amber-800 border border-amber-100">
                          <strong>AI Summary:</strong> {note.ai_summary}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Sidebar (25%) */}
        <div className="space-y-6">
          {/* 1. Critical Alerts Widget */}
          <div className="card border-red-100 bg-red-50/30">
            <h3 className="text-xs font-bold uppercase tracking-widest text-red-600 mb-4 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> Critical Alerts
            </h3>
            <div className="space-y-2">
              <AlertCard 
                label="BP crossed 145/95" 
                level="red" 
                time="2h ago"
              />
              <AlertCard 
                label="Missed 3 check-ins" 
                level="orange" 
                time="Today"
              />
              <AlertCard 
                label="PHQ-9 increased" 
                level="yellow" 
                time="Yesterday"
              />
            </div>
          </div>

          {/* 2. Quick Actions Panel */}
          <div className="card">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-2">
              <ActionButton icon={Calendar} label="Schedule" color="blue" onClick={() => handleQuickAction('Schedule')} />
              <ActionButton icon={Video} label="Video Call" color="purple" onClick={() => handleQuickAction('Video Call')} />
              <ActionButton icon={MessageSquare} label="Message" color="primary" onClick={() => handleQuickAction('Message')} />
              <ActionButton icon={Pill} label="Prescribe" color="orange" onClick={() => handleQuickAction('Prescribe')} />
              <ActionButton icon={Zap} label="Escalate" color="red" onClick={() => handleQuickAction('Escalate')} />
              <ActionButton icon={FileText} label="Report" color="gray" onClick={() => handleQuickAction('Report')} />
            </div>
          </div>

          {/* 3. Patient Status Card */}
          <div className="card">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Clinical Status</h3>
            <div className="space-y-4">
              <StatusRow label="Last active" value={data.recent_vitals?.[0]?.log_date ? formatDate(data.recent_vitals[0].log_date) : 'Today'} />
              <StatusRow label="Last vitals" value={data.recent_vitals?.[0]?.log_date ? formatDate(data.recent_vitals[0].log_date) : 'Today'} />
              <div className="pt-2">
                <div className="flex justify-between text-[10px] font-bold text-gray-500 mb-1">
                  <span>Medication Adherence</span>
                  <span className="text-green-600">{adherence}%</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${adherence}%` }} className="h-full bg-green-500" />
                </div>
              </div>
              <div className="flex gap-2">
                <div className="flex-1 bg-gray-50 p-2 rounded-lg text-center">
                  <p className="text-[10px] text-gray-500">Missed Logs</p>
                  <p className="text-sm font-bold text-red-500">{missedLogs}</p>
                </div>
                <div className="flex-1 bg-gray-50 p-2 rounded-lg text-center">
                  <p className="text-[10px] text-gray-500">Compliance</p>
                  <p className="text-sm font-bold text-primary-600">{compliance}</p>
                </div>
              </div>
            </div>
          </div>

          {/* 4. Upcoming Tasks */}
          <div className="card">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Pending Tasks</h3>
            <div className="space-y-3">
              <TaskItem label="Review glucose report" priority="high" />
              <TaskItem label="Follow-up in 3 days" priority="medium" />
              <TaskItem label="Mental health check pending" priority="medium" />
              <TaskItem label="Scan due next week" priority="low" />
            </div>
          </div>

          {/* 5. Appointment Timeline (Compact) */}
          <div className="card bg-primary-900 text-white border-none shadow-lg">
            <h3 className="text-xs font-bold uppercase tracking-widest text-primary-300 mb-4">Timeline</h3>
            <div className="space-y-4 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-white/10">
              {data.appointments.slice(0, 3).map((app, idx) => (
                <TimelineEvent 
                  key={app.id}
                  type={idx === 0 ? "Upcoming" : "Scheduled"} 
                  label={app.reason || 'General Checkup'} 
                  date={formatDate(app.appointment_date)} 
                  isLast={idx === 2 || idx === data.appointments.length - 1} 
                  active={idx === 0}
                />
              ))}
              {data.appointments.length === 0 && (
                <p className="text-[10px] text-gray-400 italic">No appointments found</p>
              )}
            </div>
            <button className="w-full mt-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-medium transition-colors">
              View Detailed History
            </button>
          </div>
        </div>
      </div>

      {/* Note Modal */}
      <AnimatePresence>
        {showNoteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowNoteModal(false)}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Add Clinical Note</h3>
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Enter diagnosis, consultation notes, or recommendations..."
                  className="w-full h-48 p-4 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none"
                />
                <div className="flex gap-3 mt-6">
                  <button onClick={() => setShowNoteModal(false)} className="flex-1 btn-secondary">Cancel</button>
                  <button
                    onClick={() => {
                      onAddNote(newNote);
                      setShowNoteModal(false);
                      setNewNote('');
                    }}
                    className="flex-1 btn-primary"
                    disabled={!newNote.trim()}
                  >
                    Save Note
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TimelineMilestone({ label, date, status }: { label: string; date: string; status: 'completed' | 'current' | 'upcoming' }) {
  return (
    <div className={`p-3 rounded-xl border ${
      status === 'current' ? 'bg-primary-50 border-primary-200' : 'bg-gray-50 border-gray-100'
    }`}>
      <div className="flex items-center justify-between mb-1">
        <span className={`text-[10px] font-bold uppercase tracking-wider ${
          status === 'completed' ? 'text-green-600' : status === 'current' ? 'text-primary-600' : 'text-gray-400'
        }`}>
          {status}
        </span>
        {status === 'completed' && <CheckCircle2 className="w-3 h-3 text-green-500" />}
      </div>
      <p className="text-xs font-bold text-gray-800">{label}</p>
      <p className="text-[10px] text-gray-500">{date}</p>
    </div>
  );
}

function AlertCard({ label, level, time }: { label: string; level: 'red' | 'orange' | 'yellow'; time: string }) {
  const styles = {
    red: 'bg-red-100 text-red-800 border-red-200',
    orange: 'bg-orange-100 text-orange-800 border-orange-200',
    yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  };
  const dots = {
    red: 'bg-red-500',
    orange: 'bg-orange-500',
    yellow: 'bg-yellow-500',
  };
  return (
    <div className={`px-3 py-2 rounded-lg border flex items-center justify-between gap-3 ${styles[level]}`}>
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full animate-pulse ${dots[level]}`} />
        <span className="text-xs font-bold">{label}</span>
      </div>
      <span className="text-[10px] opacity-70">{time}</span>
    </div>
  );
}

function ActionButton({ icon: Icon, label, color, onClick }: { icon: any; label: string; color: string; onClick?: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="flex flex-col items-center justify-center p-3 rounded-xl border border-gray-100 hover:border-primary-200 hover:bg-primary-50 transition-all gap-1.5 group"
    >
      <div className="p-2 rounded-lg bg-gray-50 group-hover:bg-white transition-colors">
        <Icon className="w-4 h-4 text-gray-500 group-hover:text-primary-500" />
      </div>
      <span className="text-[10px] font-medium text-gray-600 group-hover:text-primary-700">{label}</span>
    </button>
  );
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-1 border-b border-gray-50 last:border-0">
      <span className="text-[10px] text-gray-500 font-medium">{label}</span>
      <span className="text-xs font-bold text-gray-900">{value}</span>
    </div>
  );
}

function TaskItem({ label, priority }: { label: string; priority: 'high' | 'medium' | 'low' }) {
  const colors = {
    high: 'text-red-600 bg-red-50',
    medium: 'text-amber-600 bg-amber-50',
    low: 'text-blue-600 bg-blue-50',
  };
  return (
    <div className="flex items-center gap-3 group cursor-pointer">
      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
        priority === 'high' ? 'bg-red-500' : priority === 'medium' ? 'bg-amber-500' : 'bg-blue-500'
      }`} />
      <span className="text-xs text-gray-600 group-hover:text-gray-900 transition-colors flex-1">{label}</span>
      <ChevronRight className="w-3 h-3 text-gray-300 group-hover:text-gray-500" />
    </div>
  );
}

function TimelineEvent({ type, label, date, isLast, active }: { type: string; label: string; date: string; isLast: boolean; active?: boolean }) {
  return (
    <div className="relative pl-6 pb-2">
      {!isLast && <div className="absolute left-2 top-2 bottom-0 w-0.5 bg-white/10" />}
      <div className={`absolute left-0 top-1.5 w-4 h-4 rounded-full border-2 border-primary-900 flex items-center justify-center ${
        active ? 'bg-primary-500' : 'bg-white/20'
      }`}>
        {active && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
      </div>
      <div>
        <p className={`text-[10px] font-bold uppercase tracking-wider ${active ? 'text-primary-300' : 'text-gray-400'}`}>
          {type}
        </p>
        <p className="text-xs font-bold">{label}</p>
        <p className="text-[10px] opacity-60">{date}</p>
      </div>
    </div>
  );
}

function RiskFactor({ label, description, impact }: { label: string; description: string; impact: 'positive' | 'negative' | 'neutral' }) {
  return (
    <li className="flex items-start gap-2">
      <div className={`w-1 h-1 rounded-full mt-1.5 ${
        impact === 'negative' ? 'bg-red-500' : impact === 'positive' ? 'bg-green-500' : 'bg-gray-400'
      }`} />
      <div>
        <span className="text-[10px] font-bold text-gray-700">{label}: </span>
        <span className="text-[10px] text-gray-600">{description}</span>
      </div>
    </li>
  );
}

function RecommendationItem({ icon: Icon, title, desc, priority }: { icon: any; title: string; desc: string; priority: 'high' | 'medium' | 'low' }) {
  const colors = {
    high: 'bg-red-50 text-red-700 border-red-100',
    medium: 'bg-blue-50 text-blue-700 border-blue-100',
    low: 'bg-gray-50 text-gray-700 border-gray-100'
  };
  return (
    <div className={`p-3 rounded-xl border ${colors[priority]} flex gap-3`}>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
        priority === 'high' ? 'bg-red-100' : priority === 'medium' ? 'bg-blue-100' : 'bg-gray-100'
      }`}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <p className="text-xs font-bold">{title}</p>
        <p className="text-[10px] opacity-80">{desc}</p>
      </div>
    </div>
  );
}

function PulseItem({ label, level }: { label: string; level: string }) {
  const color = level === 'HIGH' ? 'bg-red-500' : level === 'MEDIUM' ? 'bg-yellow-500' : 'bg-green-500';
  return (
    <div>
      <div className="flex justify-between text-[10px] font-bold text-gray-500 mb-1">
        <span>{label}</span>
        <span className={level === 'HIGH' ? 'text-red-500' : level === 'MEDIUM' ? 'text-yellow-600' : 'text-green-600'}>{level}</span>
      </div>
      <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: level === 'HIGH' ? '90%' : level === 'MEDIUM' ? '60%' : '30%' }}
          className={`h-full ${color}`}
        />
      </div>
    </div>
  );
}
