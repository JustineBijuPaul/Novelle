import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Baby, ChevronLeft, ChevronRight, AlertTriangle, Ruler, Weight, Eye, Heart } from 'lucide-react';
import { useAppStore } from '../stores/appStore';
import { FETAL_MILESTONES, getMilestoneForWeek } from '../utils/fetalData';

export default function BabyGrowthPage() {
  const { profile } = useAppStore();
  const currentWeek = profile?.pregnancy_week || 12;
  const [selectedWeek, setSelectedWeek] = useState(currentWeek);
  const [availableVideos, setAvailableVideos] = useState<number[]>([]);

  useEffect(() => {
    fetch('/api/videos/list')
      .then(res => res.json())
      .then(data => setAvailableVideos(data))
      .catch(() => setAvailableVideos([]));
  }, []);

  const milestone = getMilestoneForWeek(selectedWeek);

  const prevWeek = () => setSelectedWeek(w => Math.max(4, w - 1));
  const nextWeek = () => setSelectedWeek(w => Math.min(40, w + 1));

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="disclaimer-banner">
        <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <span>Fetal development information is educational. Every pregnancy is unique — consult your provider for personalized guidance.</span>
      </div>

      {/* Week Selector */}
      <div className="flex items-center justify-center gap-4">
        <button onClick={prevWeek} disabled={selectedWeek <= 4}
          className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 disabled:opacity-30 transition-all">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <p className="text-sm text-gray-500">Week</p>
          <p className="text-4xl font-display font-bold text-primary-500">{selectedWeek}</p>
          {selectedWeek === currentWeek && (
            <span className="text-xs bg-primary-100 text-primary-600 px-2 py-0.5 rounded-full">Current</span>
          )}
        </div>
        <button onClick={nextWeek} disabled={selectedWeek >= 40}
          className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 disabled:opacity-30 transition-all">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {milestone ? (
        <>
          {/* Size Comparison Card */}
          <motion.div key={selectedWeek}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-br from-primary-50 to-lavender-50 rounded-2xl p-8 text-center"
          >
            <div className="text-6xl mb-4 animate-float">
              <Baby className="w-16 h-16 mx-auto text-primary-400" />
            </div>
            <h2 className="text-2xl font-display font-bold text-gray-900 mb-2">
              Your baby is the size of a {milestone.size}!
            </h2>
            <div className="flex justify-center gap-6 mt-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Ruler className="w-4 h-4 text-primary-400" />
                <span><strong>{milestone.length}</strong> cm long</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Weight className="w-4 h-4 text-lavender-400" />
                <span><strong>{milestone.weight}</strong> grams</span>
              </div>
            </div>
          </motion.div>
          
          {/* Fetal Development Video */}
          {availableVideos.includes(selectedWeek) && (
            <motion.div key={`video-${selectedWeek}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="card overflow-hidden p-0 border-none shadow-lg ring-1 ring-black/5"
            >
              <div className="bg-black aspect-video flex items-center justify-center relative">
                <video 
                  key={`vid-${selectedWeek}`}
                  controls 
                  className="w-full h-full"
                >
                  <source src={`/api/videos/week${selectedWeek}.mp4`} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              </div>
              <div className="p-4 bg-white">
                <h3 className="font-semibold text-gray-800 text-sm flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary-500 animate-pulse" />
                  Development Visualization: Week {selectedWeek}
                </h3>
                <p className="text-[11px] text-gray-500 mt-1">
                  Experience the incredible transformation happening inside you this week.
                </p>
              </div>
            </motion.div>
          )}

          {/* Developments */}
          <motion.div key={`dev-${selectedWeek}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="card"
          >
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Eye className="w-4 h-4 text-accent-500" />
              Key Developments This Week
            </h3>
            <ul className="space-y-3">
              {milestone.developments.map((dev, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-accent-100 flex items-center justify-center text-xs font-bold text-accent-600 flex-shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <span className="text-sm text-gray-700">{dev}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Tips */}
          <motion.div key={`tips-${selectedWeek}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="card bg-warm-50"
          >
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Heart className="w-4 h-4 text-primary-500" />
              Tips for This Week
            </h3>
            <ul className="space-y-3">
              {milestone.tips.map((tip, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="text-primary-400 text-sm mt-0.5">💡</span>
                  <span className="text-sm text-gray-700">{tip}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        </>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-400">No milestone data for week {selectedWeek}</p>
        </div>
      )}

      {/* Week Timeline */}
      <div className="card">
        <h3 className="font-semibold mb-4">Pregnancy Timeline</h3>
        <div className="flex flex-wrap gap-1.5">
          {Array.from({ length: 37 }, (_, i) => i + 4).map(week => {
            const trimester = week <= 12 ? 1 : week <= 27 ? 2 : 3;
            const colors = {
              1: 'bg-accent-100 text-accent-600 hover:bg-accent-200',
              2: 'bg-primary-100 text-primary-600 hover:bg-primary-200',
              3: 'bg-lavender-100 text-lavender-600 hover:bg-lavender-200',
            };
            return (
              <button key={week}
                className={`w-9 h-9 rounded-lg text-xs font-medium transition-all ${
                  week === selectedWeek
                    ? 'bg-primary-500 text-white shadow-md scale-110'
                    : week === currentWeek
                    ? 'ring-2 ring-primary-400 ' + colors[trimester]
                    : colors[trimester]
                }`}
                onClick={() => setSelectedWeek(week)}
              >
                {week}
              </button>
            );
          })}
        </div>
        <div className="flex gap-6 mt-4 text-xs text-gray-500">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-accent-200" /> 1st Trimester</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-primary-200" /> 2nd Trimester</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-lavender-200" /> 3rd Trimester</span>
        </div>
      </div>
    </div>
  );
}
