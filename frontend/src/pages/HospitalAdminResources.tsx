import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bed, ShieldAlert, Cpu, Home, Activity, Search, 
  Filter, MoreVertical, Plus, Minus, CheckCircle2,
  AlertTriangle, RefreshCcw, Box, Zap
} from 'lucide-react';
import { cn } from '../utils/helpers';
import { hospitalAdminService } from '../services/endpoints';

export default function HospitalAdminResources() {
  const [activeTab, setActiveTab] = React.useState('Bed Management');
  const [resources, setResources] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  const fetchResources = async () => {
    setLoading(true);
    try {
      const res = await hospitalAdminService.listResources();
      setResources(res.data);
    } catch (error) {
      console.error("Failed to fetch resources", error);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchResources();
  }, []);

  const handleUpdateQuantity = async (id: number, current: number, delta: number) => {
    try {
      await hospitalAdminService.updateResource(id, { available_quantity: Math.max(0, current + delta) });
      fetchResources();
    } catch (error) {
      console.error("Failed to update resource", error);
    }
  };

  const tabs = [
    "Bed Management", "ICU/NICU", "Medical Equipment", 
    "Room Allocation", "Emergency Resources"
  ];

  const getStatusColor = (avail: number, total: number) => {
    const ratio = avail / total;
    if (ratio <= 0.1) return "text-red-600 bg-red-50 border-red-100";
    if (ratio <= 0.3) return "text-orange-600 bg-orange-50 border-orange-100";
    return "text-green-600 bg-green-50 border-green-100";
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-gray-900">Hospital Inventory & Resources</h1>
          <p className="text-sm text-gray-500">Track bed occupancy, NICU availability, and medical equipment status</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            <RefreshCcw className="w-4 h-4" /> Audit Inventory
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 transition-colors shadow-sm">
            <Zap className="w-4 h-4" /> Request Supplies
          </button>
        </div>
      </div>

      {/* Critical Status */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Beds', value: '124', sub: '88% Occupied', icon: Bed, color: 'text-primary-600', bg: 'bg-primary-50' },
          { label: 'NICU Units', value: '12', sub: '2 Available', icon: Activity, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Ventilators', value: '08', sub: '3 Available', icon: Cpu, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Blood Supply', value: 'Critical', sub: 'O- Negative Low', icon: ShieldAlert, color: 'text-red-600', bg: 'bg-red-50' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center gap-4">
            <div className={cn("p-3 rounded-xl", stat.bg)}>
              <stat.icon className={cn("w-5 h-5", stat.color)} />
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{stat.label}</p>
              <p className="text-lg font-black text-gray-900">{stat.value}</p>
              <p className="text-[10px] font-bold text-gray-500 uppercase">{stat.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="bg-white p-1 rounded-2xl border border-gray-100 flex overflow-x-auto no-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-6 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap",
              activeTab === tab 
                ? "bg-gray-900 text-white shadow-lg" 
                : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Resources List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-12 text-center text-gray-500 font-bold">Retrieving resource registry...</div>
        ) : resources.length === 0 ? (
          // Mock data for demo if DB is empty
          [
            { id: 1, name: 'Maternity Ward A', category: 'BEDS', total: 40, available: 4, unit: 'Beds' },
            { id: 2, name: 'Labor & Delivery Room', category: 'BEDS', total: 10, available: 2, unit: 'Rooms' },
            { id: 3, name: 'Neonatal ICU (NICU)', category: 'ICU/NICU', total: 12, available: 1, unit: 'Cots' },
            { id: 4, name: 'Ventilator G-Series', category: 'EQUIPMENT', total: 8, available: 3, unit: 'Units' },
            { id: 5, name: 'Patient Monitor Pro', category: 'EQUIPMENT', total: 25, available: 18, unit: 'Units' },
            { id: 6, name: 'Emergency Oxygen Tank', category: 'EMERGENCY', total: 50, available: 12, unit: 'Tanks' },
          ].map((res) => (
            <motion.div 
              key={res.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4 hover:border-primary-100 transition-all group"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="px-2 py-0.5 bg-gray-100 text-gray-500 text-[10px] font-bold rounded-md inline-block uppercase tracking-wider">
                    {res.category}
                  </div>
                  <h3 className="text-lg font-black text-gray-900">{res.name}</h3>
                </div>
                <div className={cn("px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest border", getStatusColor(res.available, res.total))}>
                  {res.available === 0 ? 'Exhausted' : `${res.available} Available`}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold text-gray-500 uppercase tracking-widest">
                  <span>Occupancy</span>
                  <span>{Math.round(((res.total - res.available) / res.total) * 100)}%</span>
                </div>
                <div className="w-full h-2 bg-gray-50 rounded-full overflow-hidden border border-gray-100">
                  <div 
                    className={cn(
                      "h-full transition-all duration-500",
                      ((res.total - res.available) / res.total) > 0.8 ? "bg-red-500" : "bg-primary-500"
                    )}
                    style={{ width: `${((res.total - res.available) / res.total) * 100}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-4">
                <div className="text-center">
                  <p className="text-[10px] font-black text-gray-400 uppercase">Total</p>
                  <p className="text-lg font-black text-gray-900">{res.total}</p>
                </div>
                <div className="flex items-center gap-4 bg-gray-50 p-2 rounded-2xl border border-gray-100">
                  <button 
                    onClick={() => handleUpdateQuantity(res.id, res.available, -1)}
                    className="p-2 bg-white text-gray-400 hover:text-red-600 rounded-xl shadow-sm transition-all border border-gray-100 disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  <div className="text-center min-w-[3rem]">
                    <p className="text-[10px] font-black text-gray-400 uppercase">Avail</p>
                    <p className="text-sm font-black text-gray-900">{res.available}</p>
                  </div>
                  <button 
                    onClick={() => handleUpdateQuantity(res.id, res.available, 1)}
                    className="p-2 bg-white text-gray-400 hover:text-green-600 rounded-xl shadow-sm transition-all border border-gray-100"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))
        ) : (
          resources.map((res) => (
             <motion.div 
              key={res.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4 hover:border-primary-100 transition-all group"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="px-2 py-0.5 bg-gray-100 text-gray-500 text-[10px] font-bold rounded-md inline-block uppercase tracking-wider">
                    {res.category}
                  </div>
                  <h3 className="text-lg font-black text-gray-900">{res.name}</h3>
                </div>
                <div className={cn("px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest border", getStatusColor(res.available_quantity, res.total_quantity))}>
                  {res.available_quantity === 0 ? 'Exhausted' : `${res.available_quantity} Available`}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold text-gray-500 uppercase tracking-widest">
                  <span>Occupancy</span>
                  <span>{Math.round(((res.total_quantity - res.available_quantity) / res.total_quantity) * 100)}%</span>
                </div>
                <div className="w-full h-2 bg-gray-50 rounded-full overflow-hidden border border-gray-100">
                  <div 
                    className={cn(
                      "h-full transition-all duration-500",
                      ((res.total_quantity - res.available_quantity) / res.total_quantity) > 0.8 ? "bg-red-500" : "bg-primary-500"
                    )}
                    style={{ width: `${((res.total_quantity - res.available_quantity) / res.total_quantity) * 100}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-4">
                <div className="text-center">
                  <p className="text-[10px] font-black text-gray-400 uppercase">Total</p>
                  <p className="text-lg font-black text-gray-900">{res.total_quantity}</p>
                </div>
                <div className="flex items-center gap-4 bg-gray-50 p-2 rounded-2xl border border-gray-100">
                  <button 
                    onClick={() => handleUpdateQuantity(res.id, res.available_quantity, -1)}
                    className="p-2 bg-white text-gray-400 hover:text-red-600 rounded-xl shadow-sm transition-all border border-gray-100"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  <div className="text-center min-w-[3rem]">
                    <p className="text-[10px] font-black text-gray-400 uppercase">Avail</p>
                    <p className="text-sm font-black text-gray-900">{res.available_quantity}</p>
                  </div>
                  <button 
                    onClick={() => handleUpdateQuantity(res.id, res.available_quantity, 1)}
                    className="p-2 bg-white text-gray-400 hover:text-green-600 rounded-xl shadow-sm transition-all border border-gray-100"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Emergency Alert Widget */}
      <div className="bg-red-600 rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative shadow-xl shadow-red-500/20">
        <div className="relative z-10 space-y-1">
          <div className="flex items-center gap-2 text-white/80 text-[10px] font-black uppercase tracking-[0.2em]">
            <AlertTriangle className="w-4 h-4" /> Emergency Mode Active
          </div>
          <h2 className="text-2xl font-black text-white">Low Blood Inventory Alert</h2>
          <p className="text-red-100 text-sm font-medium">Facility is currently running low on O-Negative and B+ blood types. Local blood bank notified.</p>
        </div>
        <button className="relative z-10 px-8 py-3 bg-white text-red-600 rounded-2xl font-black text-sm hover:bg-red-50 transition-colors shadow-lg shadow-black/10">
          Open Supply Chain
        </button>
        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
      </div>
    </div>
  );
}
