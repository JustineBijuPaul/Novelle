import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heart, Eye, EyeOff, ChevronRight, ChevronLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { authService } from '../services/endpoints';
import { useAuthStore } from '../stores/authStore';

const STEPS = ['Account', 'Personal', 'Review'];

export default function RegisterPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [step, setStep] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    email: '',
    password: '',
    full_name: '',
    phone: '',
    role: 'pregnant_user',
    city: '',
    state: '',
  });

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleRegister = async () => {
    setLoading(true);
    try {
      const { data } = await authService.register(form);
      setAuth(data);
      toast.success('Welcome to Novelle! 🌸');
      navigate('/onboarding');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-400 to-primary-600 mb-4 shadow-lg">
            <Heart className="w-8 h-8 text-white" fill="white" />
          </div>
          <h1 className="text-3xl font-display font-bold text-gray-900">Join Novelle</h1>
          <p className="text-gray-500 mt-1">Begin your supported pregnancy journey</p>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${i <= step ? 'bg-primary-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                {i + 1}
              </div>
              <span className={`text-xs font-medium ${i <= step ? 'text-primary-600' : 'text-gray-400'}`}>{s}</span>
              {i < STEPS.length - 1 && <div className={`w-8 h-0.5 ${i < step ? 'bg-primary-400' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>

        <div className="card">
          {/* Step 1: Account */}
          {step === 0 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
              <h2 className="text-xl font-semibold mb-4">Create your account</h2>
              <div>
                <label className="label">Full Name</label>
                <input value={form.full_name} onChange={(e) => update('full_name', e.target.value)} className="input-field" placeholder="Your name" required />
              </div>
              <div>
                <label className="label">Email</label>
                <input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} className="input-field" placeholder="your@email.com" required />
              </div>
              <div>
                <label className="label">Password</label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} value={form.password} onChange={(e) => update('password', e.target.value)} className="input-field pr-10" placeholder="Min 8 characters" required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="label">I am a...</label>
                <select value={form.role} onChange={(e) => update('role', e.target.value)} className="input-field">
                  <option value="pregnant_user">Pregnant / Expecting</option>
                  <option value="postpartum_user">Postpartum / New Mother</option>
                  <option value="doctor">Healthcare Professional</option>
                </select>
              </div>
            </motion.div>
          )}

          {/* Step 2: Personal */}
          {step === 1 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
              <h2 className="text-xl font-semibold mb-4">A bit more about you</h2>
              <div>
                <label className="label">Phone (optional)</label>
                <input value={form.phone} onChange={(e) => update('phone', e.target.value)} className="input-field" placeholder="+91 98765 43210" />
              </div>
              <div>
                <label className="label">City</label>
                <input value={form.city} onChange={(e) => update('city', e.target.value)} className="input-field" placeholder="Mumbai" />
              </div>
              <div>
                <label className="label">State</label>
                <input value={form.state} onChange={(e) => update('state', e.target.value)} className="input-field" placeholder="Maharashtra" />
              </div>
            </motion.div>
          )}

          {/* Step 3: Review */}
          {step === 2 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
              <h2 className="text-xl font-semibold mb-4">Review & Create</h2>
              <div className="space-y-3 bg-gray-50 rounded-xl p-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Name</span>
                  <span className="font-medium">{form.full_name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Email</span>
                  <span className="font-medium">{form.email}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Role</span>
                  <span className="font-medium capitalize">{form.role.replace('_', ' ')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Location</span>
                  <span className="font-medium">{form.city}{form.state ? `, ${form.state}` : ''}</span>
                </div>
              </div>
              <div className="disclaimer-banner">
                ⚠️ Novelle does not replace professional medical advice. All AI outputs are risk likelihood estimates only.
              </div>
            </motion.div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-6">
            {step > 0 ? (
              <button onClick={() => setStep(step - 1)} className="btn-secondary flex items-center gap-1">
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
            ) : (
              <div />
            )}
            {step < STEPS.length - 1 ? (
              <button onClick={() => setStep(step + 1)} className="btn-primary flex items-center gap-1"
                disabled={step === 0 && (!form.full_name || !form.email || form.password.length < 8)}>
                Next <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button onClick={handleRegister} disabled={loading} className="btn-primary">
                {loading ? 'Creating...' : 'Create Account 🌸'}
              </button>
            )}
          </div>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-600 font-medium hover:text-primary-700">Sign in</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
