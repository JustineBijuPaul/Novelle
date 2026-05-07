import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Phone, Clock, Star, Navigation, AlertTriangle, Search, Building2 } from 'lucide-react';
import { hospitalService } from '../services/endpoints';
import type { Hospital } from '../types';

export default function HospitalsPage() {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number, lng: number } | null>(null);
  const [radius, setRadius] = useState('50');

  const fetchHospitals = async (lat?: number, lng?: number) => {
    setLoading(true);
    try {
      const res = await hospitalService.findNearby(lat, lng, Number(radius));
      setHospitals(res.data);
    } catch (err) {
      console.error('Failed to fetch hospitals', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch of all hospitals
    fetchHospitals();

    // Try to get location automatically
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserLocation(loc);
          fetchHospitals(loc.lat, loc.lng);
        },
        () => {
          console.log('Location permission denied or unavailable');
        }
      );
    }
  }, []);

  const handleManualLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserLocation(loc);
          fetchHospitals(loc.lat, loc.lng);
        },
        () => {
          alert('Unable to get your location. Please check your browser permissions.');
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

      {/* Search & Status */}
      <div className="card">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${userLocation ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
              <Navigation className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">
                {userLocation ? 'Location Active' : 'Location Not Set'}
              </p>
              <p className="text-xs text-gray-500">
                {userLocation 
                  ? `Showing hospitals within ${radius}km of you` 
                  : 'Showing all available hospitals'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="flex-1 md:w-32">
              <label className="text-[10px] uppercase tracking-wider text-gray-400 mb-1 block font-bold">Radius (km)</label>
              <select 
                className="input-field py-2"
                value={radius}
                onChange={e => {
                  setRadius(e.target.value);
                  fetchHospitals(userLocation?.lat, userLocation?.lng);
                }}
              >
                <option value="10">10 km</option>
                <option value="20">20 km</option>
                <option value="50">50 km</option>
                <option value="100">100 km</option>
                <option value="5000">Worldwide</option>
              </select>
            </div>
            <button 
              onClick={handleManualLocation}
              className="btn-primary flex items-center gap-2 mt-5 whitespace-nowrap"
            >
              <Navigation className="w-4 h-4" /> 
              {userLocation ? 'Update Location' : 'Get My Location'}
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
      ) : (
        <div className="text-center py-16">
          <Building2 className="w-12 h-12 text-gray-200 mx-auto mb-4" />
          <p className="text-gray-500">No hospitals found in this area</p>
          <p className="text-sm text-gray-400 mt-1">Try increasing the search radius</p>
        </div>
      )}
    </div>
  );
}
