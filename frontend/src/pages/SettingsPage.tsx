import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Settings, User, Bell, Shield, Phone,
  Loader2, AlertCircle, Save, CheckCircle2,
  Mail, MapPin, Globe, Palette, Clock,
  UserPlus
} from 'lucide-react';
import { patientService } from '../services/endpoints';

interface UserData {
  id: number;
  email: string;
  full_name: string;
  phone: string;
  city: string;
  state: string;
  country: string;
  avatar_url: string;
}

interface Preferences {
  notifications_enabled: boolean;
  reminder_time: string;
  language: string;
  theme: string;
  share_data_with_doctor: boolean;
  emergency_contact_name: string;
  emergency_contact_phone: string;
}

interface SettingsData {
  user: UserData;
  preferences: Preferences;
}

export default function SettingsPage() {
  const [data, setData] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [formUser, setFormUser] = useState<Partial<UserData>>({});
  const [formPrefs, setFormPrefs] = useState<Partial<Preferences>>({});

  const fetchSettings = useCallback(async () => {
    try {
      setError(null);
      const res = await patientService.getSettings();
      setData(res.data);
      setFormUser(res.data.user);
      setFormPrefs(res.data.preferences);
    } catch {
      setError('Failed to load settings. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);
    try {
      await patientService.updateSettings({
        user: formUser,
        preferences: formPrefs,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch {
      setError('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const updateUser = (field: keyof UserData, value: string) => {
    setFormUser(prev => ({ ...prev, [field]: value }));
  };

  const updatePrefs = (field: keyof Preferences, value: string | boolean) => {
    setFormPrefs(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
          <p className="text-sm text-gray-500 font-medium">Loading settings...</p>
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
            onClick={() => { setLoading(true); fetchSettings(); }}
            className="px-6 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 transition-colors"
          >
            Retry
          </button>
        </motion.div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-3xl mx-auto pb-20 space-y-8"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Settings className="w-8 h-8 text-primary-500" />
            Settings
          </h1>
          <p className="text-gray-500 mt-1">Manage your profile and preferences</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 transition-colors disabled:opacity-50 shadow-sm"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : saveSuccess ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {saving ? 'Saving...' : saveSuccess ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      {/* Success Banner */}
      {saveSuccess && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl"
        >
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          <span className="text-sm font-medium text-emerald-700">Settings saved successfully!</span>
        </motion.div>
      )}

      {/* Profile Section */}
      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <User className="w-4.5 h-4.5 text-gray-400" />
            Profile Information
          </h2>
        </div>
        <div className="p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <InputField
              label="Full Name"
              icon={User}
              value={formUser.full_name || ''}
              onChange={(v) => updateUser('full_name', v)}
            />
            <InputField
              label="Email"
              icon={Mail}
              value={formUser.email || ''}
              onChange={(v) => updateUser('email', v)}
              type="email"
            />
            <InputField
              label="Phone"
              icon={Phone}
              value={formUser.phone || ''}
              onChange={(v) => updateUser('phone', v)}
              type="tel"
            />
            <InputField
              label="City"
              icon={MapPin}
              value={formUser.city || ''}
              onChange={(v) => updateUser('city', v)}
            />
          </div>
        </div>
      </section>

      {/* Preferences Section */}
      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Bell className="w-4.5 h-4.5 text-gray-400" />
            Preferences
          </h2>
        </div>
        <div className="p-6 space-y-5">
          {/* Notifications Toggle */}
          <ToggleRow
            label="Notifications"
            description="Enable push notifications and reminders"
            enabled={formPrefs.notifications_enabled ?? false}
            onChange={(v) => updatePrefs('notifications_enabled', v)}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <InputField
              label="Reminder Time"
              icon={Clock}
              value={formPrefs.reminder_time || ''}
              onChange={(v) => updatePrefs('reminder_time', v)}
              type="time"
            />
            <SelectField
              label="Language"
              icon={Globe}
              value={formPrefs.language || 'en'}
              onChange={(v) => updatePrefs('language', v)}
              options={[
                { value: 'en', label: 'English' },
                { value: 'es', label: 'Spanish' },
                { value: 'fr', label: 'French' },
                { value: 'hi', label: 'Hindi' },
                { value: 'pt', label: 'Portuguese' },
              ]}
            />
            <SelectField
              label="Theme"
              icon={Palette}
              value={formPrefs.theme || 'light'}
              onChange={(v) => updatePrefs('theme', v)}
              options={[
                { value: 'light', label: 'Light' },
                { value: 'dark', label: 'Dark' },
                { value: 'system', label: 'System' },
              ]}
            />
          </div>
        </div>
      </section>

      {/* Emergency Contact Section */}
      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <UserPlus className="w-4.5 h-4.5 text-gray-400" />
            Emergency Contact
          </h2>
        </div>
        <div className="p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <InputField
              label="Contact Name"
              icon={User}
              value={formPrefs.emergency_contact_name || ''}
              onChange={(v) => updatePrefs('emergency_contact_name', v)}
              placeholder="e.g. David Smith"
            />
            <InputField
              label="Contact Phone"
              icon={Phone}
              value={formPrefs.emergency_contact_phone || ''}
              onChange={(v) => updatePrefs('emergency_contact_phone', v)}
              type="tel"
              placeholder="e.g. +1 555 012 3456"
            />
          </div>
        </div>
      </section>

      {/* Data Sharing Section */}
      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Shield className="w-4.5 h-4.5 text-gray-400" />
            Data & Privacy
          </h2>
        </div>
        <div className="p-6">
          <ToggleRow
            label="Share Data with Doctor"
            description="Allow your assigned doctor to access your health logs, symptoms, and daily goals"
            enabled={formPrefs.share_data_with_doctor ?? true}
            onChange={(v) => updatePrefs('share_data_with_doctor', v)}
          />
        </div>
      </section>

      {/* Bottom Save */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-8 py-3 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 transition-colors disabled:opacity-50 shadow-sm"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Saving...' : 'Save All Changes'}
        </button>
      </div>
    </motion.div>
  );
}

function InputField({
  label, icon: Icon, value, onChange, type = 'text', placeholder
}: {
  label: string;
  icon: typeof User;
  value: string;
  onChange: (val: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</label>
      <div className="relative">
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
          <Icon className="w-4 h-4" />
        </div>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-sm font-medium text-gray-800 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300 outline-none transition-all placeholder:text-gray-400"
        />
      </div>
    </div>
  );
}

function SelectField({
  label, icon: Icon, value, onChange, options
}: {
  label: string;
  icon: typeof User;
  value: string;
  onChange: (val: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</label>
      <div className="relative">
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
          <Icon className="w-4 h-4" />
        </div>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-sm font-medium text-gray-800 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300 outline-none transition-all appearance-none"
        >
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

function ToggleRow({
  label, description, enabled, onChange
}: {
  label: string;
  description: string;
  enabled: boolean;
  onChange: (val: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-gray-50/50 border border-gray-100">
      <div>
        <p className="text-sm font-semibold text-gray-800">{label}</p>
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
      </div>
      <button
        onClick={() => onChange(!enabled)}
        className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
          enabled ? 'bg-primary-600' : 'bg-gray-300'
        }`}
      >
        <motion.div
          animate={{ x: enabled ? 20 : 2 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm"
        />
      </button>
    </div>
  );
}
