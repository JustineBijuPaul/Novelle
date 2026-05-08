import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronRight, ChevronLeft, Heart, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { profileService } from '../services/endpoints';
import { useAppStore } from '../stores/appStore';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
const HISTORY_OPTIONS = ['Normal delivery', 'C-section', 'Miscarriage', 'Stillbirth', 'Ectopic pregnancy'];
const LIFESTYLE_OPTIONS = ['Vegetarian', 'Non-vegetarian', 'Active', 'Sedentary', 'Smoker', 'Alcohol use'];
const COMPLICATION_OPTIONS = ['Preeclampsia', 'Gestational diabetes', 'PROM', 'Placenta previa', 'Preterm labor', 'Anemia'];

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { setProfile } = useAppStore();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    age: 25,
    height_cm: 160,
    weight_kg: 60,
    pregnancy_week: 12,
    blood_group: '',
    previous_pregnancies: 0,
    pregnancy_history: [] as string[],
    lifestyle_indicators: [] as string[],
    hemoglobin_level: undefined as number | undefined,
    gestational_diabetes: false,
    thyroid_disorder: 'none',
    past_complications: [] as string[],
    chronic_hypertension: false,
    current_medications: '',
    known_allergies: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
  });

  const update = (field: string, value: any) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const toggleArray = (field: 'pregnancy_history' | 'lifestyle_indicators' | 'past_complications', value: string) => {
    setForm((prev) => {
      const arr = prev[field];
      return { ...prev, [field]: arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value] };
    });
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const { data } = await profileService.create(form);
      setProfile(data);
      toast.success('Profile created! Your journey begins 🌟');
      navigate('/patient');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to create profile');
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    // Step 0 - Basic Info
    <motion.div key={0} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
      <h2 className="text-xl font-display font-bold">Tell us about yourself</h2>
      <p className="text-sm text-gray-500">This helps us personalize your experience and make better health assessments.</p>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Age</label>
          <input type="number" value={form.age} onChange={(e) => update('age', +e.target.value)} className="input-field" min={13} max={55} />
        </div>
        <div>
          <label className="label">Pregnancy Week</label>
          <input type="number" value={form.pregnancy_week} onChange={(e) => update('pregnancy_week', +e.target.value)} className="input-field" min={1} max={42} />
        </div>
        <div>
          <label className="label">Height (cm)</label>
          <input type="number" value={form.height_cm} onChange={(e) => update('height_cm', +e.target.value)} className="input-field" />
        </div>
        <div>
          <label className="label">Weight (kg)</label>
          <input type="number" value={form.weight_kg} onChange={(e) => update('weight_kg', +e.target.value)} className="input-field" />
        </div>
      </div>
      <div>
        <label className="label">Blood Group</label>
        <div className="flex flex-wrap gap-2">
          {BLOOD_GROUPS.map((bg) => (
            <button key={bg} onClick={() => update('blood_group', bg)}
              className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${form.blood_group === bg ? 'bg-primary-500 text-white border-primary-500' : 'bg-white border-gray-200 text-gray-700 hover:border-primary-300'}`}>
              {bg}
            </button>
          ))}
        </div>
      </div>
    </motion.div>,

    // Step 1 - Medical History
    <motion.div key={1} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
      <h2 className="text-xl font-display font-bold">Medical History</h2>
      <p className="text-sm text-gray-500">This information helps our AI provide better risk assessments.</p>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Previous Pregnancies</label>
          <input type="number" value={form.previous_pregnancies} onChange={(e) => update('previous_pregnancies', +e.target.value)} className="input-field" min={0} />
        </div>
        <div>
          <label className="label">Hemoglobin (mg/dL)</label>
          <input type="number" value={form.hemoglobin_level || ''} onChange={(e) => update('hemoglobin_level', +e.target.value || undefined)} className="input-field" step="0.1" />
        </div>
      </div>
      <div>
        <label className="label">Pregnancy History</label>
        <div className="flex flex-wrap gap-2">
          {HISTORY_OPTIONS.map((opt) => (
            <button key={opt} onClick={() => toggleArray('pregnancy_history', opt)}
              className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${form.pregnancy_history.includes(opt) ? 'bg-primary-100 border-primary-300 text-primary-700' : 'bg-white border-gray-200 text-gray-600'}`}>
              {form.pregnancy_history.includes(opt) && <Check className="w-3 h-3 inline mr-1" />}
              {opt}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.gestational_diabetes} onChange={(e) => update('gestational_diabetes', e.target.checked)}
            className="w-4 h-4 rounded text-primary-500 focus:ring-primary-300" />
          <span className="text-sm">Gestational Diabetes</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.chronic_hypertension} onChange={(e) => update('chronic_hypertension', e.target.checked)}
            className="w-4 h-4 rounded text-primary-500 focus:ring-primary-300" />
          <span className="text-sm">Chronic Hypertension</span>
        </label>
      </div>
    </motion.div>,

    // Step 2 - Lifestyle
    <motion.div key={2} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
      <h2 className="text-xl font-display font-bold">Lifestyle & Emergency</h2>
      <div>
        <label className="label">Lifestyle</label>
        <div className="flex flex-wrap gap-2">
          {LIFESTYLE_OPTIONS.map((opt) => (
            <button key={opt} onClick={() => toggleArray('lifestyle_indicators', opt)}
              className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${form.lifestyle_indicators.includes(opt) ? 'bg-accent-100 border-accent-300 text-accent-700' : 'bg-white border-gray-200 text-gray-600'}`}>
              {opt}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="label">Past Complications</label>
        <div className="flex flex-wrap gap-2">
          {COMPLICATION_OPTIONS.map((opt) => (
            <button key={opt} onClick={() => toggleArray('past_complications', opt)}
              className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${form.past_complications.includes(opt) ? 'bg-red-100 border-red-300 text-red-700' : 'bg-white border-gray-200 text-gray-600'}`}>
              {opt}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="label">Current Medications</label>
        <input value={form.current_medications} onChange={(e) => update('current_medications', e.target.value)} className="input-field" placeholder="e.g., Folic acid, Iron supplements" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Emergency Contact Name</label>
          <input value={form.emergency_contact_name} onChange={(e) => update('emergency_contact_name', e.target.value)} className="input-field" />
        </div>
        <div>
          <label className="label">Emergency Contact Phone</label>
          <input value={form.emergency_contact_phone} onChange={(e) => update('emergency_contact_phone', e.target.value)} className="input-field" />
        </div>
      </div>
    </motion.div>,
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary-100 mb-3">
            <Heart className="w-6 h-6 text-primary-500" />
          </div>
          <h1 className="text-2xl font-display font-bold">Set Up Your Profile</h1>
          <p className="text-sm text-gray-500 mt-1">Step {step + 1} of {steps.length}</p>
          <div className="w-full bg-gray-200 rounded-full h-1.5 mt-3">
            <div className="bg-primary-500 h-1.5 rounded-full transition-all" style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
          </div>
        </div>

        <div className="card">
          {steps[step]}
          <div className="flex justify-between mt-8">
            {step > 0 ? (
              <button onClick={() => setStep(step - 1)} className="btn-secondary flex items-center gap-1">
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
            ) : <div />}
            {step < steps.length - 1 ? (
              <button onClick={() => setStep(step + 1)} className="btn-primary flex items-center gap-1">
                Next <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={loading} className="btn-primary">
                {loading ? 'Saving...' : 'Complete Setup 🌟'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
