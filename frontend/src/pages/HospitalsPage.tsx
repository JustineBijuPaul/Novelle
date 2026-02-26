import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Phone, Clock, Star, Navigation, AlertTriangle, Search, Building2 } from 'lucide-react';
import { hospitalService } from '../services/endpoints';
import type { Hospital } from '../types';

export default function HospitalsPage() {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [form, setForm] = useState({ lat: '', lng: '', radius: '20' });

  const searchHospitals = async () => {
    if (!form.lat || !form.lng) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await hospitalService.findNearby(Number(form.lat), Number(form.lng), Number(form.radius));
      setHospitals(res.data);
    } catch {
      // handled
    } finally {
      setLoading(false);
    }
  };

  const useMyLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          setForm(p => ({
            ...p,
            lat: pos.coords.latitude.toFixed(6),
            lng: pos.coords.longitude.toFixed(6),
          }));
        },
        () => {
          alert('Unable to get your location. Please enter coordinates manually.');
        }
      );
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="disclaimer-banner">
        <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <span>Hospital listings are for informational purposes. Always verify availability and call ahead in emergencies.</span>
      </div>

      <h2 className="text-xl font-display font-bold flex items-center gap-2">
        <Building2 className="w-5 h-5 text-primary-500" />
        Nearby Hospitals & Clinics
      </h2>

      {/* Search */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Latitude</label>
            <input type="number" step="any" className="input-field" placeholder="28.6139"
              value={form.lat}
              onChange={e => setForm(p => ({ ...p, lat: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Longitude</label>
            <input type="number" step="any" className="input-field" placeholder="77.2090"
              value={form.lng}
              onChange={e => setForm(p => ({ ...p, lng: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Radius (km)</label>
            <input type="number" className="input-field" placeholder="20"
              value={form.radius}
              onChange={e => setForm(p => ({ ...p, radius: e.target.value }))}
            />
          </div>
          <div className="flex items-end gap-2">
            <button onClick={searchHospitals} className="btn-primary flex items-center gap-2 flex-1">
              <Search className="w-4 h-4" /> Search
            </button>
            <button onClick={useMyLocation} className="btn-secondary p-3" title="Use my location">
              <Navigation className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Searching hospitals...</div>
      ) : hospitals.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {hospitals.map((h, i) => (
            <motion.div key={h.id || i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="card hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-gray-900">{h.name}</h3>
                {h.distance_km != null && (
                  <span className="text-xs bg-primary-100 text-primary-600 px-2 py-0.5 rounded-full whitespace-nowrap">
                    {h.distance_km.toFixed(1)} km
                  </span>
                )}
              </div>

              <div className="space-y-2 text-sm text-gray-600">
                <p className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  {h.address}
                </p>
                {h.phone && (
                  <p className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <a href={`tel:${h.phone}`} className="text-primary-500 hover:underline">{h.phone}</a>
                  </p>
                )}
                {h.specialties && h.specialties.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {h.specialties.map(s => (
                      <span key={s} className="text-xs px-2 py-0.5 rounded-full bg-accent-50 text-accent-600">{s}</span>
                    ))}
                  </div>
                )}
                {h.emergency_available && (
                  <p className="flex items-center gap-1 text-xs text-green-600 font-medium mt-1">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    Emergency services available
                  </p>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      ) : searched ? (
        <div className="text-center py-16">
          <Building2 className="w-12 h-12 text-gray-200 mx-auto mb-4" />
          <p className="text-gray-500">No hospitals found in this area</p>
          <p className="text-sm text-gray-400 mt-1">Try increasing the search radius</p>
        </div>
      ) : (
        <div className="text-center py-16">
          <MapPin className="w-12 h-12 text-gray-200 mx-auto mb-4" />
          <p className="text-gray-500">Enter your location to find nearby hospitals</p>
          <p className="text-sm text-gray-400 mt-1">Use the GPS button for automatic detection</p>
        </div>
      )}
    </div>
  );
}
