import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, Plus, Trash2, Clock, Calendar, AlertTriangle, Check, X } from 'lucide-react';
import { reminderService } from '../services/endpoints';
import type { Reminder } from '../types';
import { formatDate, formatTime } from '../utils/helpers';
import toast from 'react-hot-toast';

export default function RemindersPage() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    reminder_type: 'medication',
    scheduled_at: '',
    recurring: false,
    recurrence_pattern: '',
  });

  useEffect(() => {
    loadReminders();
  }, []);

  const loadReminders = async () => {
    try {
      const res = await reminderService.list();
      setReminders(res.data);
    } catch {
      // handled
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.scheduled_at) {
      toast.error('Please fill in title and date/time');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        description: form.description || undefined,
        reminder_type: form.reminder_type,
        scheduled_at: form.scheduled_at,
        recurring: form.recurring,
        recurrence_pattern: form.recurring ? form.recurrence_pattern : undefined,
      };
      await reminderService.create(payload);
      toast.success('Reminder created!');
      setShowForm(false);
      setForm({ title: '', description: '', reminder_type: 'medication', scheduled_at: '', recurring: false, recurrence_pattern: '' });
      loadReminders();
    } catch {
      toast.error('Failed to create reminder');
    } finally {
      setSaving(false);
    }
  };

  const deleteReminder = async (id: string) => {
    try {
      await reminderService.delete(id);
      toast.success('Reminder deleted');
      setReminders(prev => prev.filter(r => r.id !== id));
    } catch {
      toast.error('Failed to delete reminder');
    }
  };

  const TYPES = [
    { value: 'medication', label: '💊 Medication' },
    { value: 'appointment', label: '🏥 Appointment' },
    { value: 'exercise', label: '🏃 Exercise' },
    { value: 'hydration', label: '💧 Hydration' },
    { value: 'rest', label: '😴 Rest' },
    { value: 'other', label: '📌 Other' },
  ];

  const getTypeEmoji = (type: string) => {
    const t = TYPES.find(x => x.value === type);
    return t ? t.label.split(' ')[0] : '📌';
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="disclaimer-banner">
        <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <span>Reminders are for your convenience. Always follow your healthcare provider's instructions regarding medications and appointments.</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-display font-bold flex items-center gap-2">
          <Bell className="w-5 h-5 text-primary-500" />
          Smart Reminders
        </h2>
        <button onClick={() => setShowForm(!showForm)}
          className="btn-primary text-sm flex items-center gap-2">
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? 'Cancel' : 'New Reminder'}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="card">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Title</label>
              <input type="text" className="input-field" placeholder="Take prenatal vitamins"
                value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Description (optional)</label>
              <input type="text" className="input-field" placeholder="After breakfast with water"
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Type</label>
                <select className="input-field" value={form.reminder_type}
                  onChange={e => setForm(p => ({ ...p, reminder_type: e.target.value }))}>
                  {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Date & Time</label>
                <input type="datetime-local" className="input-field"
                  value={form.scheduled_at}
                  onChange={e => setForm(p => ({ ...p, scheduled_at: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded accent-primary-500"
                  checked={form.recurring}
                  onChange={e => setForm(p => ({ ...p, recurring: e.target.checked }))}
                />
                Recurring
              </label>
              {form.recurring && (
                <select className="input-field flex-1" value={form.recurrence_pattern}
                  onChange={e => setForm(p => ({ ...p, recurrence_pattern: e.target.value }))}>
                  <option value="">Select pattern</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Bi-weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              )}
            </div>
            <button type="submit" disabled={saving} className="btn-primary w-full">
              {saving ? 'Creating...' : 'Create Reminder'}
            </button>
          </form>
        </motion.div>
      )}

      {/* Reminders List */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading reminders...</div>
      ) : reminders.length === 0 ? (
        <div className="text-center py-16">
          <Bell className="w-12 h-12 text-gray-200 mx-auto mb-4" />
          <p className="text-gray-500">No reminders set</p>
          <p className="text-sm text-gray-400 mt-1">Create reminders for medications, appointments, and more</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reminders.map((r, i) => (
            <motion.div key={r.id || i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className="card flex items-center gap-4"
            >
              <span className="text-2xl">{getTypeEmoji(r.reminder_type)}</span>
              <div className="flex-1">
                <h4 className="font-medium text-gray-900">{r.title}</h4>
                {r.description && <p className="text-xs text-gray-500 mt-0.5">{r.description}</p>}
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> {formatDate(r.scheduled_at)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {formatTime(r.scheduled_at)}
                  </span>
                  {r.recurring && (
                    <span className="bg-primary-100 text-primary-600 px-2 py-0.5 rounded-full">{r.recurrence_pattern}</span>
                  )}
                </div>
              </div>
              <button onClick={() => r.id && deleteReminder(r.id)}
                className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
