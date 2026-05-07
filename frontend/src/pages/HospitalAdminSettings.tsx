import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Settings, Shield, Users, Lock, 
  History, Puzzle, Brain, CreditCard,
  Save, RefreshCw, ChevronRight, AlertCircle,
  Key, Eye, EyeOff, CheckCircle2, XCircle,
  Bell, Database, Terminal, Zap, Globe
} from 'lucide-react';
import { cn } from '../utils/helpers';
import { hospitalAdminService } from '../services/endpoints';
import { toast } from 'react-hot-toast';

export default function HospitalAdminSettings() {
  const [activeTab, setActiveTab] = React.useState('General Settings');
  const [settings, setSettings] = React.useState<any>(null);
  const [auditLogs, setAuditLogs] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [settingsRes, logsRes] = await Promise.all([
        hospitalAdminService.getSettings(),
        hospitalAdminService.getSystemAuditLogs()
      ]);
      setSettings(settingsRes.data);
      setAuditLogs(logsRes.data);
    } catch (error) {
      console.error("Failed to fetch settings", error);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchData();
  }, []);

  const updateSetting = (section: string, key: string, value: any) => {
    setSettings((prev: any) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await hospitalAdminService.updateSettings(settings);
      toast.success("Settings updated successfully");
    } catch (error) {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { name: "General Settings", icon: Settings },
    { name: "User Roles", icon: Users },
    { name: "Permissions", icon: Shield },
    { name: "Security", icon: Lock },
    { name: "Audit Logs", icon: History },
    { name: "Integrations", icon: Puzzle },
    { name: "AI Settings", icon: Brain },
    { name: "Billing", icon: CreditCard }
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 font-bold animate-pulse">Initializing system configuration...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-gray-900">System Configuration</h1>
          <p className="text-sm text-gray-500">Manage facility rules, AI thresholds, and organizational security</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-bold hover:bg-primary-700 transition-colors shadow-lg shadow-primary-500/20 disabled:opacity-50"
        >
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Changes
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* Navigation Sidebar */}
        <aside className="lg:w-64 space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.name}
              onClick={() => setActiveTab(tab.name)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all",
                activeTab === tab.name 
                  ? "bg-gray-900 text-white shadow-lg" 
                  : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
              )}
            >
              <tab.icon className={cn("w-4 h-4", activeTab === tab.name ? "text-primary-400" : "text-gray-400")} />
              {tab.name}
              {activeTab === tab.name && <ChevronRight className="w-4 h-4 ml-auto" />}
            </button>
          ))}
        </aside>

        {/* Content Area */}
        <main className="flex-1">
           <AnimatePresence mode="wait">
              {activeTab === 'General Settings' && (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="bg-white rounded-[32px] border border-gray-100 p-8 shadow-sm space-y-8"
                >
                   <div className="space-y-6">
                      <h3 className="text-xl font-black text-gray-900">Facility Information</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div className="space-y-2">
                            <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Hospital Name</label>
                            <input 
                              type="text" 
                              value={settings?.general.hospital_name}
                              onChange={(e) => updateSetting('general', 'hospital_name', e.target.value)}
                              className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary-500 transition-all"
                            />
                         </div>
                         <div className="space-y-2">
                            <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Primary Language</label>
                            <select 
                              value={settings?.general.language}
                              onChange={(e) => updateSetting('general', 'language', e.target.value)}
                              className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary-500 transition-all"
                            >
                               <option>English (US)</option>
                               <option>Spanish</option>
                               <option>French</option>
                            </select>
                         </div>
                         <div className="space-y-2">
                            <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Timezone</label>
                            <div className="relative">
                               <Globe className="w-4 h-4 absolute left-4 top-3.5 text-gray-400" />
                               <select 
                                 value={settings?.general.timezone}
                                 onChange={(e) => updateSetting('general', 'timezone', e.target.value)}
                                 className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary-500 transition-all"
                               >
                                  <option>UTC-5 (Eastern Time)</option>
                                  <option>UTC-8 (Pacific Time)</option>
                                  <option>UTC+0 (GMT)</option>
                               </select>
                            </div>
                         </div>
                         <div className="space-y-2">
                            <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Contact Email</label>
                            <input 
                              type="email" 
                              value={settings?.general.contact_email}
                              onChange={(e) => updateSetting('general', 'contact_email', e.target.value)}
                              className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary-500 transition-all"
                            />
                         </div>
                      </div>
                   </div>

                   <div className="pt-8 border-t border-gray-50 space-y-6">
                      <div className="flex items-center justify-between">
                         <div>
                            <h3 className="text-lg font-black text-gray-900">Communication Preferences</h3>
                            <p className="text-sm text-gray-500">Configure how the system notifies patients and staff</p>
                         </div>
                      </div>
                      <div className="space-y-4">
                         {[
                           { label: "SMS Notifications", desc: "Send automated text alerts for urgent escalations", enabled: true },
                           { label: "AI Insights Digest", desc: "Weekly operational summary sent to administrators", enabled: true },
                           { label: "Emergency Broadcasts", desc: "Allow system-wide priority alerts during crises", enabled: false }
                         ].map((pref, i) => (
                           <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:border-primary-100 transition-all">
                              <div className="space-y-0.5">
                                 <p className="text-sm font-black text-gray-900">{pref.label}</p>
                                 <p className="text-xs text-gray-500 font-medium">{pref.desc}</p>
                              </div>
                              <button className={cn(
                                "w-12 h-6 rounded-full transition-all relative",
                                pref.enabled ? "bg-primary-600" : "bg-gray-200"
                              )}>
                                 <div className={cn(
                                   "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                                   pref.enabled ? "left-7" : "left-1"
                                 )} />
                              </button>
                           </div>
                         ))}
                      </div>
                   </div>
                </motion.div>
              )}

              {activeTab === 'AI Settings' && (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="bg-white rounded-[32px] border border-gray-100 p-8 shadow-sm space-y-8"
                >
                   <div className="space-y-6">
                      <div className="flex items-center gap-3">
                         <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl">
                            <Brain className="w-6 h-6" />
                         </div>
                         <div>
                            <h3 className="text-xl font-black text-gray-900">AI Intelligence Core</h3>
                            <p className="text-sm text-gray-500">Fine-tune the risk predictive models and autonomous clinical flagging</p>
                         </div>
                      </div>

                      <div className="space-y-8 pt-4">
                         <div className="space-y-4">
                            <div className="flex items-center justify-between">
                               <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Global Risk Threshold</label>
                               <span className="px-2 py-1 bg-purple-50 text-purple-700 rounded-lg text-xs font-black">{(settings?.ai.risk_threshold * 100).toFixed(0)}%</span>
                            </div>
                            <input 
                               type="range" 
                               min="0" max="100" 
                               value={settings?.ai.risk_threshold * 100}
                               onChange={(e) => updateSetting('ai', 'risk_threshold', parseInt(e.target.value) / 100)}
                               className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-primary-600"
                            />
                            <p className="text-[10px] text-gray-400 font-medium italic">Clinical flags will trigger when risk scores exceed this percentile.</p>
                         </div>

                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100 space-y-4 hover:border-purple-200 transition-all group">
                               <div className="flex items-center justify-between">
                                  <Zap className="w-5 h-5 text-amber-500" />
                                  <button 
                                    onClick={() => updateSetting('ai', 'auto_escalation', !settings?.ai.auto_escalation)}
                                    className={cn(
                                      "w-10 h-5 rounded-full relative transition-all",
                                      settings?.ai.auto_escalation ? "bg-primary-600" : "bg-gray-200"
                                    )}
                                  >
                                     <div className={cn(
                                       "absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all",
                                       settings?.ai.auto_escalation ? "left-5.5" : "left-0.5"
                                     )} />
                                  </button>
                               </div>
                               <div className="space-y-1">
                                  <h4 className="text-sm font-black text-gray-900">Auto-Escalation</h4>
                                  <p className="text-[11px] text-gray-500 font-medium leading-relaxed">Automatically assign high-risk patients to specialists without manual triage.</p>
                               </div>
                            </div>
                            <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100 space-y-4 hover:border-purple-200 transition-all group">
                               <div className="flex items-center justify-between">
                                  <Terminal className="w-5 h-5 text-gray-700" />
                                  <select 
                                    value={settings?.ai.explainability_detail}
                                    onChange={(e) => updateSetting('ai', 'explainability_detail', e.target.value)}
                                    className="bg-transparent border-none text-xs font-black text-gray-900 focus:ring-0 cursor-pointer"
                                  >
                                     <option>HIGH</option>
                                     <option>MEDIUM</option>
                                     <option>LOW</option>
                                  </select>
                               </div>
                               <div className="space-y-1">
                                  <h4 className="text-sm font-black text-gray-900">Explainability Level</h4>
                                  <p className="text-[11px] text-gray-500 font-medium leading-relaxed">Control the depth of AI logic justification in risk reports and doctor views.</p>
                               </div>
                            </div>
                         </div>
                      </div>
                   </div>
                </motion.div>
              )}

              {activeTab === 'Audit Logs' && (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden"
                >
                   <div className="p-8 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
                      <div>
                         <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">System Audit Trail</h3>
                         <p className="text-xs text-gray-500 font-medium">Tracking administrative actions and system events</p>
                      </div>
                      <div className="flex items-center gap-2">
                         <button className="p-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-600 transition-all">
                            <Database className="w-4 h-4" />
                         </button>
                      </div>
                   </div>
                   <div className="divide-y divide-gray-50">
                      {auditLogs.map((log) => (
                        <div key={log.id} className="p-6 hover:bg-gray-50 transition-colors group">
                           <div className="flex items-start justify-between">
                              <div className="flex gap-4">
                                 <div className={cn(
                                   "p-3 rounded-2xl",
                                   log.action.includes('SUCCESS') ? "bg-green-50 text-green-600" : "bg-blue-50 text-blue-600"
                                 )}>
                                    <Terminal className="w-5 h-5" />
                                 </div>
                                 <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                       <span className="text-xs font-black text-gray-900">{log.action}</span>
                                       <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">on {log.target}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                       <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {log.user}</span>
                                       <span>•</span>
                                       <span className="flex items-center gap-1"><History className="w-3 h-3" /> {new Date(log.timestamp).toLocaleTimeString()}</span>
                                    </div>
                                 </div>
                              </div>
                              <div className="text-right">
                                 <span className="text-[10px] font-mono text-gray-400 bg-gray-100 px-2 py-1 rounded-md">{log.ip}</span>
                              </div>
                           </div>
                        </div>
                      ))}
                   </div>
                   <button className="w-full py-4 bg-gray-50 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-all border-t border-gray-100">
                      Export Full Security Audit
                   </button>
                </motion.div>
              )}

              {/* Placeholder for other tabs */}
              {!['General Settings', 'AI Settings', 'Audit Logs'].includes(activeTab) && (
                <div className="bg-white rounded-[32px] border border-gray-100 p-12 text-center space-y-4">
                   <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto">
                      <Settings className="w-8 h-8 text-gray-300" />
                   </div>
                   <div>
                      <h3 className="text-lg font-black text-gray-900">{activeTab} Interface</h3>
                      <p className="text-sm text-gray-500 max-w-xs mx-auto">This module is currently being optimized for high-security clinical environments.</p>
                   </div>
                </div>
              )}
           </AnimatePresence>
        </main>

      </div>
    </div>
  );
}
