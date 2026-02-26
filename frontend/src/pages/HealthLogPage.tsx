import { useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, Save, Droplets, Moon, Thermometer, Baby, Heart, AlertTriangle } from 'lucide-react';
import { healthService } from '../services/endpoints';
import toast from 'react-hot-toast';

const SYMPTOMS = [
  'Headache', 'Nausea', 'Vomiting', 'Swelling', 'Bleeding', 'Contractions',
  'Back Pain', 'Dizziness', 'Fatigue', 'Cramping', 'Blurred Vision',
  'Shortness of Breath', 'Chest Pain', 'Fever',
];

export default function HealthLogPage() {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    bp_systolic: '',
    bp_diastolic: '',
    blood_sugar_fasting: '',
    blood_sugar_post_meal: '',
    weight_kg: '',
    temperature: '',
    heart_rate: '',
    sleep_hours: '',
    sleep_quality: 3,
    water_intake_litres: '',
    fetal_movements: '',
    symptoms: [] as string[],
    notes: '',
  });

  const toggleSymptom = (s: string) => {
    setForm(prev => ({
      ...prev,
      symptoms: prev.symptoms.includes(s) ? prev.symptoms.filter(x => x !== s) : [...prev.symptoms, s],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {};
      if (form.bp_systolic) payload.bp_systolic = Number(form.bp_systolic);
      if (form.bp_diastolic) payload.bp_diastolic = Number(form.bp_diastolic);
      if (form.blood_sugar_fasting) payload.blood_sugar_fasting = Number(form.blood_sugar_fasting);
      if (form.blood_sugar_post_meal) payload.blood_sugar_post_meal = Number(form.blood_sugar_post_meal);
      if (form.weight_kg) payload.weight_kg = Number(form.weight_kg);
      if (form.temperature) payload.temperature = Number(form.temperature);
      if (form.heart_rate) payload.heart_rate = Number(form.heart_rate);
      if (form.sleep_hours) payload.sleep_hours = Number(form.sleep_hours);
      payload.sleep_quality = form.sleep_quality;
      if (form.water_intake_litres) payload.water_intake_litres = Number(form.water_intake_litres);
      if (form.fetal_movements) payload.fetal_movements = Number(form.fetal_movements);
      if (form.symptoms.length) payload.symptoms = form.symptoms;
      if (form.notes) payload.notes = form.notes;

      await healthService.create(payload);
      toast.success('Health log saved successfully!');
      // Reset form
      setForm({
        bp_systolic: '', bp_diastolic: '', blood_sugar_fasting: '', blood_sugar_post_meal: '',
        weight_kg: '', temperature: '', heart_rate: '', sleep_hours: '', sleep_quality: 3,
        water_intake_litres: '', fetal_movements: '', symptoms: [], notes: '',
      });
    } catch {
      toast.error('Failed to save health log');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div className="disclaimer-banner">
        <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <span>Log your daily vitals honestly. This data helps assess risk likelihood — it is not a diagnosis.</span>
      </div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card">
        <h2 className="text-xl font-display font-bold mb-6 flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary-500" />
          Daily Health Log
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Blood Pressure */}
          <section>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Heart className="w-4 h-4 text-red-400" /> Blood Pressure
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Systolic (mmHg)</label>
                <input type="number" className="input-field" placeholder="120"
                  value={form.bp_systolic}
                  onChange={e => setForm(p => ({ ...p, bp_systolic: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Diastolic (mmHg)</label>
                <input type="number" className="input-field" placeholder="80"
                  value={form.bp_diastolic}
                  onChange={e => setForm(p => ({ ...p, bp_diastolic: e.target.value }))}
                />
              </div>
            </div>
          </section>

          {/* Blood Sugar */}
          <section>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Droplets className="w-4 h-4 text-blue-400" /> Blood Sugar
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Fasting (mg/dL)</label>
                <input type="number" className="input-field" placeholder="90"
                  value={form.blood_sugar_fasting}
                  onChange={e => setForm(p => ({ ...p, blood_sugar_fasting: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Post-Meal (mg/dL)</label>
                <input type="number" className="input-field" placeholder="130"
                  value={form.blood_sugar_post_meal}
                  onChange={e => setForm(p => ({ ...p, blood_sugar_post_meal: e.target.value }))}
                />
              </div>
            </div>
          </section>

          {/* Vitals */}
          <section>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Thermometer className="w-4 h-4 text-orange-400" /> Vitals
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Weight (kg)</label>
                <input type="number" step="0.1" className="input-field" placeholder="65.0"
                  value={form.weight_kg}
                  onChange={e => setForm(p => ({ ...p, weight_kg: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Temp (°C)</label>
                <input type="number" step="0.1" className="input-field" placeholder="36.6"
                  value={form.temperature}
                  onChange={e => setForm(p => ({ ...p, temperature: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Heart Rate (bpm)</label>
                <input type="number" className="input-field" placeholder="80"
                  value={form.heart_rate}
                  onChange={e => setForm(p => ({ ...p, heart_rate: e.target.value }))}
                />
              </div>
            </div>
          </section>

          {/* Sleep */}
          <section>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Moon className="w-4 h-4 text-indigo-400" /> Sleep
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Hours Slept</label>
                <input type="number" step="0.5" className="input-field" placeholder="7"
                  value={form.sleep_hours}
                  onChange={e => setForm(p => ({ ...p, sleep_hours: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Sleep Quality (1-5)</label>
                <div className="flex gap-2 mt-1">
                  {[1, 2, 3, 4, 5].map(q => (
                    <button key={q} type="button"
                      className={`w-10 h-10 rounded-lg text-sm font-semibold transition-all ${
                        form.sleep_quality === q
                          ? 'bg-primary-500 text-white shadow-md'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                      onClick={() => setForm(p => ({ ...p, sleep_quality: q }))}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Other */}
          <section>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                  <Droplets className="w-3 h-3" /> Water Intake (litres)
                </label>
                <input type="number" step="0.1" className="input-field" placeholder="2.0"
                  value={form.water_intake_litres}
                  onChange={e => setForm(p => ({ ...p, water_intake_litres: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                  <Baby className="w-3 h-3" /> Fetal Movements (count)
                </label>
                <input type="number" className="input-field" placeholder="10"
                  value={form.fetal_movements}
                  onChange={e => setForm(p => ({ ...p, fetal_movements: e.target.value }))}
                />
              </div>
            </div>
          </section>

          {/* Symptoms */}
          <section>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Symptoms (select all that apply)</h3>
            <div className="flex flex-wrap gap-2">
              {SYMPTOMS.map(s => (
                <button key={s} type="button"
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    form.symptoms.includes(s)
                      ? 'bg-primary-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  onClick={() => toggleSymptom(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </section>

          {/* Notes */}
          <section>
            <label className="text-sm font-semibold text-gray-700 mb-2 block">Notes</label>
            <textarea className="input-field h-24 resize-none" placeholder="Any additional notes about how you're feeling today..."
              value={form.notes}
              onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
            />
          </section>

          <button type="submit" disabled={saving} className="btn-primary w-full flex items-center justify-center gap-2">
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Health Log'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
