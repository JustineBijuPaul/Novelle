import { useState } from 'react';
import { motion } from 'framer-motion';
import { Brain, Save, AlertTriangle, SmilePlus, Frown, Meh, Smile, Heart } from 'lucide-react';
import { mentalService } from '../services/endpoints';
import toast from 'react-hot-toast';
import { MOOD_EMOJIS, EMOTION_OPTIONS } from '../utils/helpers';

export default function MentalHealthPage() {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    mood_score: 5,
    stress_level: 5,
    anxiety_score: 0,
    depression_score: 0,
    sleep_quality: 3,
    social_support_score: 3,
    emotions: [] as string[],
    journal_text: '',
    self_care_activities: [] as string[],
  });

  const SELF_CARE = ['Exercise', 'Meditation', 'Reading', 'Walking', 'Yoga', 'Socializing', 'Music', 'Bath', 'Cooking', 'Journaling'];

  const toggleEmotion = (e: string) => {
    setForm(prev => ({
      ...prev,
      emotions: prev.emotions.includes(e) ? prev.emotions.filter(x => x !== e) : [...prev.emotions, e],
    }));
  };

  const toggleSelfCare = (s: string) => {
    setForm(prev => ({
      ...prev,
      self_care_activities: prev.self_care_activities.includes(s) 
        ? prev.self_care_activities.filter(x => x !== s) 
        : [...prev.self_care_activities, s],
    }));
  };

  const getMoodIcon = (score: number) => {
    if (score <= 3) return <Frown className="w-6 h-6 text-red-400" />;
    if (score <= 5) return <Meh className="w-6 h-6 text-yellow-400" />;
    if (score <= 7) return <Smile className="w-6 h-6 text-green-400" />;
    return <SmilePlus className="w-6 h-6 text-primary-500" />;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        emotions: form.emotions.length ? form.emotions : undefined,
        journal_text: form.journal_text || undefined,
        self_care_activities: form.self_care_activities.length ? form.self_care_activities : undefined,
      };
      await mentalService.submit(payload);
      toast.success('Mental health check-in saved!');
      setForm({
        mood_score: 5, stress_level: 5, anxiety_score: 0, depression_score: 0,
        sleep_quality: 3, social_support_score: 3, emotions: [], journal_text: '', self_care_activities: [],
      });
    } catch {
      toast.error('Failed to save assessment');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div className="disclaimer-banner">
        <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <span>This is a wellness check-in tool, not a clinical diagnosis. If you're in crisis, call emergency services immediately.</span>
      </div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card">
        <h2 className="text-xl font-display font-bold mb-6 flex items-center gap-2">
          <Brain className="w-5 h-5 text-lavender-500" />
          Mental Health Check-In
        </h2>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Mood Score */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700">How's your mood today?</h3>
              <div className="flex items-center gap-2">
                {getMoodIcon(form.mood_score)}
                <span className="text-2xl">{MOOD_EMOJIS[form.mood_score] || '😐'}</span>
              </div>
            </div>
            <input type="range" min="1" max="10" step="1" className="w-full accent-primary-500"
              value={form.mood_score}
              onChange={e => setForm(p => ({ ...p, mood_score: Number(e.target.value) }))}
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>Very Low</span>
              <span>Neutral</span>
              <span>Excellent</span>
            </div>
          </section>

          {/* Stress Level */}
          <section>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Stress Level</h3>
            <input type="range" min="1" max="10" step="1" className="w-full accent-orange-500"
              value={form.stress_level}
              onChange={e => setForm(p => ({ ...p, stress_level: Number(e.target.value) }))}
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>Relaxed</span>
              <span>Moderate</span>
              <span>Very Stressed</span>
            </div>
            <p className="text-center text-sm font-medium mt-2 text-gray-600">{form.stress_level}/10</p>
          </section>

          {/* Anxiety & Depression Quick Scores */}
          <section>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Quick Screening Scores</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Anxiety Score (0-21 GAD-7)</label>
                <input type="number" min="0" max="21" className="input-field" placeholder="0"
                  value={form.anxiety_score || ''}
                  onChange={e => setForm(p => ({ ...p, anxiety_score: Number(e.target.value) }))}
                />
                <p className="text-xs text-gray-400 mt-1">0-4 minimal, 5-9 mild, 10-14 moderate, 15+ severe</p>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Depression Score (0-27 PHQ-9)</label>
                <input type="number" min="0" max="27" className="input-field" placeholder="0"
                  value={form.depression_score || ''}
                  onChange={e => setForm(p => ({ ...p, depression_score: Number(e.target.value) }))}
                />
                <p className="text-xs text-gray-400 mt-1">0-4 minimal, 5-9 mild, 10-14 moderate, 15+ severe</p>
              </div>
            </div>
          </section>

          {/* Sleep Quality */}
          <section>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Sleep Quality</h3>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(q => (
                <button key={q} type="button"
                  className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all ${
                    form.sleep_quality === q
                      ? 'bg-indigo-500 text-white shadow-md scale-105'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  onClick={() => setForm(p => ({ ...p, sleep_quality: q }))}
                >
                  {['Poor', 'Fair', 'OK', 'Good', 'Great'][q - 1]}
                </button>
              ))}
            </div>
          </section>

          {/* Social Support */}
          <section>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Heart className="w-4 h-4 text-pink-400" /> Social Support
            </h3>
            <input type="range" min="1" max="5" step="1" className="w-full accent-pink-500"
              value={form.social_support_score}
              onChange={e => setForm(p => ({ ...p, social_support_score: Number(e.target.value) }))}
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>No support</span>
              <span>Some support</span>
              <span>Strong support</span>
            </div>
          </section>

          {/* Emotions */}
          <section>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">What emotions are you feeling?</h3>
            <div className="flex flex-wrap gap-2">
              {EMOTION_OPTIONS.map(e => (
                <button key={e} type="button"
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    form.emotions.includes(e)
                      ? 'bg-lavender-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  onClick={() => toggleEmotion(e)}
                >
                  {e}
                </button>
              ))}
            </div>
          </section>

          {/* Self-Care */}
          <section>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Self-care activities today</h3>
            <div className="flex flex-wrap gap-2">
              {SELF_CARE.map(s => (
                <button key={s} type="button"
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    form.self_care_activities.includes(s)
                      ? 'bg-accent-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  onClick={() => toggleSelfCare(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </section>

          {/* Journal */}
          <section>
            <label className="text-sm font-semibold text-gray-700 mb-2 block">How are you feeling? (optional)</label>
            <textarea className="input-field h-28 resize-none"
              placeholder="Write freely about your thoughts and feelings. This is a safe space..."
              value={form.journal_text}
              onChange={e => setForm(p => ({ ...p, journal_text: e.target.value }))}
            />
          </section>

          <button type="submit" disabled={saving} className="btn-primary w-full flex items-center justify-center gap-2">
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Submit Check-In'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
