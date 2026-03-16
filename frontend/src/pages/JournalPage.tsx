import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Plus, Save, X, Calendar, Hash, Smile, AlertTriangle, Heart, Mail, Trash2 } from 'lucide-react';
import { journalService, letterService } from '../services/endpoints';
import { EMOTION_OPTIONS, formatDate } from '../utils/helpers';
import type { JournalEntry } from '../types';
import toast from 'react-hot-toast';

type Tab = 'journal' | 'letters';

interface BabyLetter {
  id: string;
  user_id: number;
  title: string;
  content: string;
  mood?: string;
  entry_date: string;
  created_at: string;
}

export default function JournalPage() {
  const [activeTab, setActiveTab] = useState<Tab>('journal');

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="disclaimer-banner">
        <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <span>Your journal is private and encrypted. Express yourself freely — this is your safe space.</span>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-display font-bold flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary-500" />
          My Journal
        </h2>
        <div className="flex gap-2">
          <button onClick={() => setActiveTab('journal')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-1.5 ${
              activeTab === 'journal' ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}>
            <BookOpen className="w-4 h-4" /> Journal
          </button>
          <button onClick={() => setActiveTab('letters')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-1.5 ${
              activeTab === 'letters' ? 'bg-pink-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}>
            <Mail className="w-4 h-4" /> Letter to Baby
          </button>
        </div>
      </div>

      {activeTab === 'journal' ? <JournalTab /> : <LettersToBabyTab />}
    </div>
  );
}


function JournalTab() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: '',
    content: '',
    mood: '',
    emotions: [] as string[],
    tags: '',
  });

  useEffect(() => { loadEntries(); }, []);

  const loadEntries = async () => {
    try {
      const res = await journalService.list(0, 50);
      setEntries(res.data);
    } catch {
      // handled
    } finally {
      setLoading(false);
    }
  };

  const toggleEmotion = (e: string) => {
    setForm(prev => ({
      ...prev,
      emotions: prev.emotions.includes(e) ? prev.emotions.filter(x => x !== e) : [...prev.emotions, e],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.content.trim()) {
      toast.error('Please write something in your journal entry');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: form.title || undefined,
        content: form.content,
        mood: form.mood || undefined,
        emotions: form.emotions.length ? form.emotions : undefined,
        tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : undefined,
      };
      await journalService.create(payload);
      toast.success('Journal entry saved!');
      setShowForm(false);
      setForm({ title: '', content: '', mood: '', emotions: [], tags: '' });
      loadEntries();
    } catch {
      toast.error('Failed to save entry');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="flex justify-end">
        <button onClick={() => setShowForm(!showForm)}
          className="btn-primary text-sm flex items-center gap-2">
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? 'Cancel' : 'New Entry'}
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="card overflow-hidden">
            <form onSubmit={handleSubmit} className="space-y-4">
              <input type="text" className="input-field" placeholder="Entry title (optional)"
                value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              />
              <textarea className="input-field h-40 resize-none" placeholder="Write about your day, your feelings, your hopes..."
                value={form.content}
                onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
              />

              <div>
                <label className="text-xs font-medium text-gray-600 mb-2 flex items-center gap-1">
                  <Smile className="w-3 h-3" /> Current Mood
                </label>
                <div className="flex gap-2">
                  {['😢', '😔', '😐', '🙂', '😊', '😄', '🥰'].map((emoji, i) => (
                    <button key={i} type="button"
                      className={`text-2xl p-2 rounded-xl transition-all ${
                        form.mood === emoji ? 'bg-primary-100 scale-110 ring-2 ring-primary-400' : 'hover:bg-gray-100'
                      }`}
                      onClick={() => setForm(p => ({ ...p, mood: emoji }))}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 mb-2 block">Emotions</label>
                <div className="flex flex-wrap gap-2">
                  {EMOTION_OPTIONS.map(e => (
                    <button key={e} type="button"
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
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
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 flex items-center gap-1">
                  <Hash className="w-3 h-3" /> Tags (comma-separated)
                </label>
                <input type="text" className="input-field" placeholder="pregnancy, mood, baby names..."
                  value={form.tags}
                  onChange={e => setForm(p => ({ ...p, tags: e.target.value }))}
                />
              </div>

              <button type="submit" disabled={saving} className="btn-primary w-full flex items-center justify-center gap-2">
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Entry'}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading entries...</div>
      ) : entries.length === 0 ? (
        <div className="text-center py-16">
          <BookOpen className="w-12 h-12 text-gray-200 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">No journal entries yet</p>
          <p className="text-sm text-gray-400 mt-1">Start writing about your pregnancy journey</p>
        </div>
      ) : (
        <div className="space-y-4">
          {entries.map((entry, i) => (
            <motion.div key={entry.id || i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="card hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  {entry.title && <h3 className="font-semibold text-gray-900">{entry.title}</h3>}
                  <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                    <Calendar className="w-3 h-3" />
                    {formatDate(entry.created_at)}
                    {entry.mood && <span className="ml-2 text-lg">{entry.mood}</span>}
                  </p>
                </div>
                {entry.sentiment_label && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                    {entry.sentiment_label}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap line-clamp-4">
                {entry.content}
              </p>
              {entry.emotions && entry.emotions.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {entry.emotions.map(e => (
                    <span key={e} className="text-xs px-2 py-0.5 rounded-full bg-lavender-100 text-lavender-600">{e}</span>
                  ))}
                </div>
              )}
              {entry.tags && entry.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {entry.tags.map(t => (
                    <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">#{t}</span>
                  ))}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </>
  );
}


function LettersToBabyTab() {
  const [letters, setLetters] = useState<BabyLetter[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', mood: '' });

  useEffect(() => { loadLetters(); }, []);

  const loadLetters = async () => {
    try {
      const res = await letterService.list(0, 50);
      setLetters(res.data);
    } catch {
      // handled
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.content.trim()) {
      toast.error('Please write your letter before saving');
      return;
    }
    setSaving(true);
    try {
      await letterService.create({
        title: form.title || 'Letter to My Baby',
        content: form.content,
        mood: form.mood || undefined,
      });
      toast.success('Letter saved with love!');
      setShowForm(false);
      setForm({ title: '', content: '', mood: '' });
      loadLetters();
    } catch {
      toast.error('Failed to save letter');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this letter?')) return;
    try {
      await letterService.delete(id);
      toast.success('Letter deleted');
      setLetters(prev => prev.filter(l => l.id !== id));
    } catch {
      toast.error('Failed to delete');
    }
  };

  const moodEmojis = ['🥰', '💕', '✨', '🌟', '🎀', '🌸', '💝', '🧸'];

  return (
    <>
      <div className="card bg-gradient-to-r from-pink-50 to-purple-50 border-pink-200">
        <div className="flex items-start gap-3">
          <Heart className="w-5 h-5 text-pink-500 mt-0.5 flex-shrink-0" fill="currentColor" />
          <div>
            <h3 className="font-semibold text-pink-800 text-sm">Letters to Your Baby</h3>
            <p className="text-xs text-pink-600 mt-1 leading-relaxed">
              Write heartfelt letters to your future baby. Share your hopes, dreams, and the love you already feel.
              These precious words will be a beautiful keepsake for years to come.
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={() => setShowForm(!showForm)}
          className={`text-sm flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
            showForm ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-pink-500 text-white hover:bg-pink-600 shadow-sm'
          }`}>
          {showForm ? <X className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
          {showForm ? 'Cancel' : 'Write a Letter'}
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden">
            <div className="card border-pink-200 bg-gradient-to-b from-pink-50/30 to-white">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-pink-700 mb-1 block">Letter Title</label>
                  <input type="text" className="input-field" placeholder="Dear Baby... / My Little Star / To My Future Love..."
                    value={form.title}
                    onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-pink-700 mb-1 block">Your Letter</label>
                  <textarea className="input-field h-48 resize-none" placeholder="Dear Baby,&#10;&#10;I can't wait to meet you. Today I felt you move for the first time and my heart was so full..."
                    value={form.content}
                    onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-pink-700 mb-2 block">How are you feeling?</label>
                  <div className="flex gap-2">
                    {moodEmojis.map((emoji, i) => (
                      <button key={i} type="button"
                        className={`text-2xl p-2 rounded-xl transition-all ${
                          form.mood === emoji ? 'bg-pink-100 scale-110 ring-2 ring-pink-400' : 'hover:bg-gray-100'
                        }`}
                        onClick={() => setForm(p => ({ ...p, mood: emoji }))}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                <button type="submit" disabled={saving}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium text-white bg-pink-500 hover:bg-pink-600 transition-colors disabled:opacity-50">
                  <Heart className="w-4 h-4" fill="currentColor" />
                  {saving ? 'Saving with love...' : 'Save Letter'}
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading letters...</div>
      ) : letters.length === 0 ? (
        <div className="text-center py-16">
          <Mail className="w-12 h-12 text-pink-200 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">No letters yet</p>
          <p className="text-sm text-gray-400 mt-1">Write your first letter to your baby</p>
        </div>
      ) : (
        <div className="space-y-4">
          {letters.map((letter, i) => (
            <motion.div key={letter.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="card border-pink-100 hover:shadow-md transition-shadow relative group"
            >
              <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => handleDelete(letter.id)}
                  className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Heart className="w-4 h-4 text-pink-500" fill="currentColor" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900">{letter.title}</h3>
                  <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                    <Calendar className="w-3 h-3" />
                    {formatDate(letter.created_at)}
                    {letter.mood && <span className="ml-2 text-lg">{letter.mood}</span>}
                  </p>
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap mt-3">
                    {letter.content}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </>
  );
}
