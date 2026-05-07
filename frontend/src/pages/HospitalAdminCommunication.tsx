import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Megaphone, Mail, Send, Bell, ShieldAlert, Users, 
  Search, Filter, Plus, Calendar, Clock, ArrowRight,
  MoreVertical, CheckCircle2, AlertCircle, Trash2
} from 'lucide-react';
import { cn } from '../utils/helpers';
import { hospitalAdminService } from '../services/endpoints';

export default function HospitalAdminCommunication() {
  const [activeTab, setActiveTab] = React.useState('Announcements');
  const [announcements, setAnnouncements] = React.useState<any[]>([]);
  const [messages, setMessages] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [showNewMsgModal, setShowNewMsgModal] = React.useState(false);

  const fetchCommunication = async () => {
    setLoading(true);
    try {
      const [annRes, msgRes] = await Promise.all([
        hospitalAdminService.listAnnouncements(),
        hospitalAdminService.listInternalMessages()
      ]);
      setAnnouncements(annRes.data);
      setMessages(msgRes.data);
    } catch (error) {
      console.error("Failed to fetch communication data", error);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchCommunication();
  }, []);

  const tabs = [
    "Announcements", "Doctor Messages", "Emergency Broadcasts", 
    "Notifications", "Patient Communication"
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-gray-900">Communication Center</h1>
          <p className="text-sm text-gray-500">Manage internal announcements, staff messaging, and emergency alerts</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowNewMsgModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" /> Create Broadcast
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white p-1 rounded-2xl border border-gray-100 flex overflow-x-auto no-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-6 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap",
              activeTab === tab 
                ? "bg-gray-900 text-white shadow-lg" 
                : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* List Section */}
        <div className="lg:col-span-2 space-y-4">
          {loading ? (
            <div className="py-20 text-center text-gray-500 font-bold">Synchronizing communication channels...</div>
          ) : announcements.length === 0 ? (
            // Mock data for demo
            [
              { id: 1, title: 'Weekly Staff Meeting', content: 'Reminder for all HODs regarding the upcoming infrastructure audit on Friday.', category: 'STAFF', time: '2 hours ago', sender: 'Admin Office' },
              { id: 2, title: 'New COVID Protocols', content: 'Updated safety measures for the maternity ward starting next week.', category: 'GENERAL', time: '5 hours ago', sender: 'Safety Dept' },
              { id: 3, title: 'NICU Maintenance', content: 'Scheduled power backup testing for NICU Cots on Saturday 02:00 AM.', category: 'EMERGENCY', time: '1 day ago', sender: 'Maintenance' },
            ].map((ann) => (
              <motion.div 
                key={ann.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:border-primary-100 transition-all group relative overflow-hidden"
              >
                <div className="flex items-start justify-between relative z-10">
                  <div className="flex gap-4">
                    <div className={cn(
                      "p-3 rounded-2xl",
                      ann.category === 'EMERGENCY' ? "bg-red-50 text-red-600" : "bg-gray-50 text-gray-600"
                    )}>
                      {ann.category === 'EMERGENCY' ? <ShieldAlert className="w-5 h-5" /> : <Megaphone className="w-5 h-5" />}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-[10px] font-bold rounded-md uppercase tracking-wider">
                          {ann.category}
                        </span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {ann.time}
                        </span>
                      </div>
                      <h3 className="text-lg font-black text-gray-900">{ann.title}</h3>
                      <p className="text-sm text-gray-600 leading-relaxed">{ann.content}</p>
                    </div>
                  </div>
                  <button className="p-2 text-gray-400 hover:text-gray-900 rounded-xl hover:bg-gray-50 transition-all">
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </div>
                {ann.category === 'EMERGENCY' && (
                  <div className="absolute top-0 left-0 w-1 h-full bg-red-500" />
                )}
              </motion.div>
            ))
          ) : (
            announcements.map((ann) => (
               <motion.div 
                key={ann.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:border-primary-100 transition-all group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex gap-4">
                    <div className={cn(
                      "p-3 rounded-2xl",
                      ann.category === 'EMERGENCY' ? "bg-red-50 text-red-600" : "bg-gray-50 text-gray-600"
                    )}>
                      {ann.category === 'EMERGENCY' ? <ShieldAlert className="w-5 h-5" /> : <Megaphone className="w-5 h-5" />}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-[10px] font-bold rounded-md uppercase tracking-wider">
                          {ann.category}
                        </span>
                         <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {new Date(ann.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <h3 className="text-lg font-black text-gray-900">{ann.title}</h3>
                      <p className="text-sm text-gray-600 leading-relaxed">{ann.content}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* Sidebar Section - Activity & Stats */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="bg-gray-900 rounded-3xl p-6 text-white space-y-6 shadow-xl shadow-gray-200">
            <h4 className="text-sm font-black uppercase tracking-[0.2em] text-gray-400">Hub Analytics</h4>
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-2xl font-black">242</p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Recipients Reached</p>
                </div>
                <div className="text-right">
                  <p className="text-green-400 font-bold text-sm">+12%</p>
                </div>
              </div>
              <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full w-4/5 bg-primary-500" />
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="p-3 bg-gray-800 rounded-2xl border border-gray-700">
                  <p className="text-lg font-black">18</p>
                  <p className="text-[8px] font-bold text-gray-400 uppercase">Staff Alerts</p>
                </div>
                <div className="p-3 bg-gray-800 rounded-2xl border border-gray-700">
                  <p className="text-lg font-black">04</p>
                  <p className="text-[8px] font-bold text-gray-400 uppercase">Emergency</p>
                </div>
              </div>
            </div>
          </div>

          {/* Active Broadcasts Widget */}
          <div className="bg-white rounded-3xl border border-gray-100 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase tracking-widest text-gray-400">Live Notifications</h4>
              <Bell className="w-4 h-4 text-primary-500" />
            </div>
            <div className="space-y-4">
              {[
                { label: 'OPD Delay Notice', type: 'Delay', time: '12m' },
                { label: 'Lab Results Ready', type: 'Update', time: '45m' },
                { label: 'Nurse Handover', type: 'Task', time: '1h' },
              ].map((notif, i) => (
                <div key={i} className="flex items-center justify-between group cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 bg-primary-500 rounded-full group-hover:scale-150 transition-all" />
                    <div>
                      <p className="text-xs font-bold text-gray-900">{notif.label}</p>
                      <p className="text-[10px] text-gray-400 font-medium">{notif.type}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-gray-400">{notif.time}</span>
                </div>
              ))}
            </div>
            <button className="w-full py-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-primary-600 transition-colors">
              View All History
            </button>
          </div>
        </div>
      </div>

      {/* New Broadcast Modal (Overlay) */}
      <AnimatePresence>
        {showNewMsgModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowNewMsgModal(false)}
              className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-xl bg-white rounded-[32px] shadow-2xl overflow-hidden"
            >
              <div className="p-8 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h3 className="text-xl font-black text-gray-900">New Facility Broadcast</h3>
                    <p className="text-xs text-gray-500 font-medium">This message will be visible to all assigned personnel.</p>
                  </div>
                  <div className="p-3 bg-primary-50 rounded-2xl text-primary-600">
                    <Send className="w-6 h-6" />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Broadcast Title</label>
                    <input 
                      type="text" 
                      placeholder="e.g., Infrastructure Maintenance Notice"
                      className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-primary-500/20"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Category</label>
                      <select className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-primary-500/20">
                        <option>General Announcement</option>
                        <option>Staff Update</option>
                        <option>Emergency Broadcast</option>
                        <option>Patient Notice</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Target Audience</label>
                      <select className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-primary-500/20">
                        <option>All Hospital Staff</option>
                        <option>Doctors Only</option>
                        <option>Nurses Only</option>
                        <option>Patients Only</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Message Content</label>
                    <textarea 
                      rows={4}
                      placeholder="Write your message here..."
                      className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-primary-500/20 resize-none"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button 
                    onClick={() => setShowNewMsgModal(false)}
                    className="flex-1 px-6 py-3 border border-gray-200 rounded-2xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    Discard Draft
                  </button>
                  <button className="flex-2 px-12 py-3 bg-primary-600 text-white rounded-2xl text-sm font-bold hover:bg-primary-700 transition-all shadow-lg shadow-primary-500/20">
                    Send Broadcast Now
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
