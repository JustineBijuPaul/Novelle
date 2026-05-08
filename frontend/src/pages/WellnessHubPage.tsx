import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Wind, Sun, Moon, Utensils, Activity, Play, 
  Heart, Leaf, Sparkles, ChevronRight, Apple, 
  Clock, Star, ArrowRight, Music, Info, RefreshCw
} from 'lucide-react';
import { cn } from '../utils/helpers';
import { mentalService } from '../services/endpoints';

const MEDITATIONS = [
  { id: 1, title: 'Calm the First Trimester', duration: '10 min', type: 'Audio', category: 'Mindfulness', color: 'indigo' },
  { id: 2, title: 'Deep Sleep for Moms', duration: '20 min', type: 'Audio', category: 'Sleep', color: 'blue' },
  { id: 3, title: 'Anxiety Release', duration: '5 min', type: 'Breathwork', category: 'Stress', color: 'pink' },
];

const WORKOUTS = [
  { id: 1, title: 'Prenatal Yoga Flow', duration: '30 min', intensity: 'Low', icon: '🧘‍♀️' },
  { id: 2, title: 'Core Stability (Safe)', duration: '15 min', intensity: 'Medium', icon: '🤸‍♀️' },
  { id: 3, title: 'Pelvic Floor Strength', duration: '10 min', intensity: 'Low', icon: '✨' },
];

export default function WellnessHubPage() {
  const [isBreathing, setIsBreathing] = useState(false);
  const [breathePhase, setBreathePhase] = useState<'Inhale' | 'Hold' | 'Exhale'>('Inhale');
  const [activeTab, setActiveTab] = useState<'all' | 'meditation' | 'fitness' | 'nutrition'>('all');

  // Breathing Loop
  useEffect(() => {
    let interval: any;
    if (isBreathing) {
      setBreathePhase('Inhale');
      interval = setInterval(() => {
        setBreathePhase(prev => {
          if (prev === 'Inhale') return 'Hold';
          if (prev === 'Hold') return 'Exhale';
          return 'Inhale';
        });
      }, 4000);
    } else {
      setBreathePhase('Inhale');
    }
    return () => clearInterval(interval);
  }, [isBreathing]);

  return (
    <div className="max-w-[1400px] mx-auto pb-20 space-y-10 animate-fade-in">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-display font-bold text-gray-900 tracking-tight flex items-center gap-4">
            Wellness & Harmony <Leaf className="w-8 h-8 text-emerald-500" />
          </h1>
          <p className="text-gray-500 text-lg font-medium mt-2">
            Nurture your mind and body with clinical-grade prenatal wellness protocols.
          </p>
        </div>
        <div className="flex items-center gap-3">
           <button className="p-3 bg-white border border-gray-100 rounded-2xl text-gray-400 hover:text-primary-500 transition-all shadow-sm">
              <Music className="w-5 h-5" />
           </button>
           <div className="px-4 py-2 bg-emerald-50 text-emerald-700 rounded-2xl border border-emerald-100 flex items-center gap-2">
              <Heart className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">Wellness Score: 88</span>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        
        {/* Main Content (8 cols) */}
        <div className="xl:col-span-8 space-y-10">
          
          {/* Active Breathing Tool */}
          <section className="card p-10 bg-gradient-to-br from-gray-900 to-indigo-950 text-white border-none shadow-2xl shadow-gray-200 relative overflow-hidden flex flex-col items-center text-center">
             <div className="relative z-10 space-y-6">
                <div>
                   <h2 className="text-2xl font-display font-bold mb-2">Deep Breathing Ritual</h2>
                   <p className="text-sm text-gray-400 max-w-sm mx-auto">Reduce cortisol and improve fetal oxygenation in just 2 minutes.</p>
                </div>

                <div className="py-12 flex flex-col items-center justify-center">
                   <div className="relative">
                      <motion.div 
                        animate={isBreathing ? { 
                          scale: breathePhase === 'Inhale' ? 1.5 : breathePhase === 'Hold' ? 1.5 : 1,
                          opacity: breathePhase === 'Exhale' ? 0.4 : 1
                        } : { scale: 1 }}
                        transition={{ duration: 4, ease: "easeInOut" }}
                        className="w-32 h-32 rounded-full bg-primary-500/20 border-4 border-primary-500/40 flex items-center justify-center"
                      >
                         <Wind className="w-10 h-10 text-primary-400" />
                      </motion.div>
                      {isBreathing && (
                        <motion.div 
                          key={breathePhase}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="absolute -bottom-10 left-1/2 -translate-x-1/2 text-sm font-bold uppercase tracking-[0.3em] text-primary-400"
                        >
                          {breathePhase}
                        </motion.div>
                      )}
                   </div>
                </div>

                <button 
                  onClick={() => setIsBreathing(!isBreathing)}
                  className={cn(
                    "px-10 py-4 rounded-2xl font-bold text-sm transition-all shadow-xl",
                    isBreathing ? "bg-white/10 text-white border border-white/20" : "bg-primary-600 text-white shadow-primary-500/20"
                  )}
                >
                   {isBreathing ? "Stop Practice" : "Begin Breathing Session"}
                </button>
             </div>
             <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-primary-500/10 rounded-full blur-[100px]" />
             <div className="absolute top-10 left-10 w-32 h-32 bg-indigo-500/10 rounded-full blur-[60px]" />
          </section>

          {/* Tab Selection */}
          <div className="flex gap-2 p-1 bg-gray-50 rounded-2xl border border-gray-100 w-fit">
             {['all', 'meditation', 'fitness', 'nutrition'].map(tab => (
               <button 
                 key={tab}
                 onClick={() => setActiveTab(tab as any)}
                 className={cn(
                   "px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all",
                   activeTab === tab ? "bg-white text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-600"
                 )}
               >
                 {tab}
               </button>
             ))}
          </div>

          {/* Content Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             
             {/* Meditation Track */}
             {(activeTab === 'all' || activeTab === 'meditation') && (
               <section className="space-y-6">
                  <h3 className="text-xl font-display font-bold text-gray-900 flex items-center gap-2">
                    <Sun className="w-5 h-5 text-indigo-500" />
                    Guided Mindfulness
                  </h3>
                  <div className="space-y-4">
                     {MEDITATIONS.map(m => (
                       <div key={m.id} className="card p-4 group hover:border-primary-200 transition-all flex items-center justify-between">
                          <div className="flex items-center gap-4">
                             <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-primary-50 group-hover:text-primary-500 transition-all">
                                <Play className="w-4 h-4 fill-current" />
                             </div>
                             <div>
                                <p className="text-sm font-bold text-gray-900">{m.title}</p>
                                <p className="text-[10px] text-gray-400 font-medium uppercase tracking-widest">{m.duration} • {m.category}</p>
                             </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-primary-500" />
                       </div>
                     ))}
                  </div>
               </section>
             )}

             {/* Workout Track */}
             {(activeTab === 'all' || activeTab === 'fitness') && (
               <section className="space-y-6">
                  <h3 className="text-xl font-display font-bold text-gray-900 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-emerald-500" />
                    Active Pregnancy
                  </h3>
                  <div className="space-y-4">
                     {WORKOUTS.map(w => (
                       <div key={w.id} className="card p-4 group hover:border-emerald-200 transition-all flex items-center justify-between border-l-4 border-l-emerald-500">
                          <div className="flex items-center gap-4">
                             <div className="text-2xl">{w.icon}</div>
                             <div>
                                <p className="text-sm font-bold text-gray-900">{w.title}</p>
                                <p className="text-[10px] text-gray-400 font-medium uppercase tracking-widest">{w.duration} • {w.intensity} Intensity</p>
                             </div>
                          </div>
                          <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                             <Play className="w-3 h-3 fill-current" />
                          </div>
                       </div>
                     ))}
                  </div>
               </section>
             )}
          </div>
        </div>

        {/* Sidebar: Nutrition & Routine (4 cols) */}
        <div className="xl:col-span-4 space-y-8">
           
           {/* Nutrition Plan */}
           <div className="card p-8 bg-emerald-900 text-white border-none shadow-2xl shadow-emerald-50 overflow-hidden relative">
              <div className="relative z-10">
                 <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-emerald-400">
                       <Apple className="w-6 h-6" />
                    </div>
                    <h3 className="font-display font-bold text-xl">Nurture Nutrition</h3>
                 </div>
                 <p className="text-xs text-emerald-100/60 leading-relaxed mb-8">
                    Your trimester-specific dietary plan focused on fetal neurodevelopment and maternal energy.
                 </p>
                 <div className="space-y-4 mb-8">
                    <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                       <span className="text-[10px] font-bold uppercase tracking-widest">Today's Focus</span>
                       <span className="text-[10px] font-black text-emerald-300 uppercase">Folic Acid + Iron</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                       <span className="text-[10px] font-bold uppercase tracking-widest">Recommended</span>
                       <span className="text-[10px] font-black text-emerald-300 uppercase">Leafy Greens, Salmon</span>
                    </div>
                 </div>
                 <button className="w-full py-4 bg-white text-emerald-900 rounded-2xl text-xs font-bold hover:bg-emerald-50 transition-all flex items-center justify-center gap-2 shadow-xl shadow-emerald-900/20">
                    View Nutrition Plan <ArrowRight className="w-4 h-4" />
                 </button>
              </div>
              <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/5 rounded-full blur-3xl" />
           </div>

           {/* Daily Wellness Routine */}
           <div className="card p-6">
              <h3 className="font-display font-bold text-gray-900 mb-6 flex items-center gap-2">
                 <Star className="w-5 h-5 text-amber-500" />
                 Wellness Routine
              </h3>
              <div className="space-y-4">
                 <RoutineTask label="10 Min Morning Meditation" status="completed" />
                 <RoutineTask label="Hydration Goal: 2.5L" status="pending" />
                 <RoutineTask label="Prenatal Vitamin Intake" status="pending" />
                 <RoutineTask label="Evening Breathing Ritual" status="pending" />
              </div>
           </div>

           {/* Quick Tip */}
           <div className="card p-6 border-l-4 border-l-primary-500 bg-primary-50/30">
              <div className="flex items-center gap-3 mb-4">
                 <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center text-primary-600">
                    <Sparkles className="w-5 h-5" />
                 </div>
                 <h3 className="font-display font-bold text-gray-900">Did you know?</h3>
              </div>
              <p className="text-[11px] text-gray-500 leading-relaxed">
                 Controlled deep breathing for just 5 minutes can lower your systolic blood pressure by up to 10mmHg and significantly reduce stress hormones in the bloodstream.
              </p>
           </div>

        </div>
      </div>
    </div>
  );
}

// Sub-components
function RoutineTask({ label, status }: { label: string; status: 'completed' | 'pending' }) {
  return (
    <div className={cn(
      "flex items-center justify-between p-3 rounded-xl border transition-all",
      status === 'completed' ? "bg-gray-50 border-gray-100 opacity-60" : "bg-white border-gray-100"
    )}>
       <div className="flex items-center gap-3">
          <div className={cn(
            "w-5 h-5 rounded-lg flex items-center justify-center",
            status === 'completed' ? "bg-primary-500 text-white" : "bg-gray-100 text-gray-400"
          )}>
             <CheckCircle2 className="w-3.5 h-3.5" />
          </div>
          <span className={cn("text-[11px] font-bold", status === 'completed' ? "line-through text-gray-400" : "text-gray-700")}>{label}</span>
       </div>
    </div>
  );
}

function CheckCircle2({ className }: { className?: string }) {
   return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
         <polyline points="20 6 9 17 4 12" />
      </svg>
   );
}
