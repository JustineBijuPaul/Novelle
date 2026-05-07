import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, MapPin, Users, Activity, 
  ChevronRight, ArrowRight, ShieldCheck, 
  Settings, CreditCard, Globe, BarChart3,
  Plus, Search, MoreVertical, ExternalLink,
  Zap, Database, Server, RefreshCw
} from 'lucide-react';
import { cn } from '../utils/helpers';
import { hospitalAdminService } from '../services/endpoints';

export default function HospitalAdminMultiHospital() {
  const [activeTab, setActiveTab] = React.useState('Hospital List');
  const [branches, setBranches] = React.useState<any[]>([]);
  const [subscription, setSubscription] = React.useState<any>(null);
  const [regionalData, setRegionalData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  const fetchOrgData = async () => {
    setLoading(true);
    try {
      const [branchList, subInfo, regional] = await Promise.all([
        hospitalAdminService.listBranches(),
        hospitalAdminService.getSubscription(),
        hospitalAdminService.getRegionalAnalytics()
      ]);
      setBranches(branchList.data);
      setSubscription(subInfo.data);
      setRegionalData(regional.data);
    } catch (error) {
      console.error("Failed to fetch organization data", error);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchOrgData();
  }, []);

  const tabs = [
    "Hospital List", "Branches", "Organization Settings", 
    "Subscriptions", "Regional Analytics"
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 font-bold animate-pulse">Loading multi-branch infrastructure...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Building2 className="w-6 h-6 text-primary-600" />
            <h1 className="text-2xl font-bold text-gray-900">Organization Command Center</h1>
          </div>
          <p className="text-sm text-gray-500">Manage multi-branch operations, regional analytics, and SaaS subscriptions</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">
            <RefreshCw className="w-4 h-4" /> Switch Organization
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 transition-colors shadow-lg shadow-primary-500/20">
            <Plus className="w-4 h-4" /> Add New Branch
          </button>
        </div>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Branch List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">Active Branches</h3>
            <div className="flex items-center gap-2">
               <div className="relative">
                 <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                 <input 
                   type="text" 
                   placeholder="Search branches..." 
                   className="pl-9 pr-4 py-2 bg-white border border-gray-100 rounded-xl text-xs focus:ring-2 focus:ring-primary-500"
                 />
               </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             {branches.map((branch) => (
               <motion.div 
                 key={branch.id}
                 whileHover={{ y: -4 }}
                 className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm hover:border-primary-100 transition-all space-y-4"
               >
                 <div className="flex items-center justify-between">
                    <div className={cn(
                      "px-2 py-0.5 text-[8px] font-black rounded-md uppercase tracking-widest",
                      branch.type === 'HQ' ? "bg-primary-100 text-primary-700" : "bg-gray-100 text-gray-700"
                    )}>
                      {branch.type}
                    </div>
                    <div className="flex items-center gap-1.5">
                       <div className="w-2 h-2 rounded-full bg-green-500" />
                       <span className="text-[10px] font-bold text-gray-400 uppercase">{branch.status}</span>
                    </div>
                 </div>
                 
                 <div className="space-y-1">
                    <h4 className="font-black text-gray-900 text-lg leading-tight">{branch.name}</h4>
                    <div className="flex items-center gap-1.5 text-gray-400">
                       <MapPin className="w-3.5 h-3.5" />
                       <span className="text-xs font-medium">{branch.location}</span>
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100">
                       <p className="text-[10px] font-black text-gray-400 uppercase">Patients</p>
                       <p className="text-lg font-black text-gray-900">{branch.patients}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100">
                       <p className="text-[10px] font-black text-gray-400 uppercase">Doctors</p>
                       <p className="text-lg font-black text-gray-900">12</p>
                    </div>
                 </div>

                 <button className="w-full py-2.5 bg-gray-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-800 transition-colors flex items-center justify-center gap-2">
                    Access Branch Portal <ExternalLink className="w-3 h-3" />
                 </button>
               </motion.div>
             ))}
          </div>
        </div>

        {/* Sidebar: Subscription & Regional Stats */}
        <div className="space-y-8">
           
           {/* Subscription Card */}
           <div className="bg-gray-900 rounded-[32px] p-8 text-white space-y-6 relative overflow-hidden shadow-2xl shadow-gray-200">
              <div className="relative z-10 space-y-4">
                 <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                       <Zap className="w-5 h-5 text-primary-400" />
                       <span className="text-[10px] font-black uppercase tracking-widest text-primary-400">SaaS Plan</span>
                    </div>
                    <span className="px-2 py-1 bg-white/10 rounded-lg text-[10px] font-black">{subscription?.tier}</span>
                 </div>
                 
                 <div className="space-y-1">
                    <p className="text-sm text-gray-400 font-medium tracking-tight leading-relaxed">
                       Your organization is currently on the <span className="text-white font-bold">Enterprise Elite</span> plan.
                    </p>
                 </div>

                 <div className="space-y-3 py-2">
                    <div>
                       <div className="flex justify-between text-[10px] font-black uppercase tracking-tighter mb-1.5 text-gray-400">
                          <span>Patient Slots</span>
                          <span className="text-white">{subscription?.usage.patients_active} / {subscription?.usage.patients_limit}</span>
                       </div>
                       <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full bg-primary-500" style={{ width: `${(subscription?.usage.patients_active / subscription?.usage.patients_limit) * 100}%` }} />
                       </div>
                    </div>
                    <div>
                       <div className="flex justify-between text-[10px] font-black uppercase tracking-tighter mb-1.5 text-gray-400">
                          <span>Cloud Storage</span>
                          <span className="text-white">{subscription?.usage.storage_gb}GB / {subscription?.usage.storage_limit}GB</span>
                       </div>
                       <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-400" style={{ width: `${(subscription?.usage.storage_gb / subscription?.usage.storage_limit) * 100}%` }} />
                       </div>
                    </div>
                 </div>

                 <button className="w-full py-3 bg-white text-gray-900 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-100 transition-colors shadow-lg">
                    Manage Subscription
                 </button>
              </div>
              <Server className="absolute top-0 right-0 w-48 h-48 text-white/5 -mr-12 -mt-12" />
           </div>

           {/* Regional Analytics Mini */}
           <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                 <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest">Regional Pulse</h4>
                 <Globe className="w-5 h-5 text-blue-500" />
              </div>

              <div className="space-y-4">
                 {regionalData?.branch_performance.map((branch: any, i: number) => (
                    <div key={i} className="space-y-2">
                       <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-gray-700">{branch.name} Branch</span>
                          <span className="text-[10px] font-black text-gray-900">{branch.rating} ★</span>
                       </div>
                       <div className="flex items-center gap-3">
                          <div className="flex-1 h-1.5 bg-gray-50 rounded-full overflow-hidden">
                             <div className="h-full bg-gray-900" style={{ width: `${branch.efficiency}%` }} />
                          </div>
                          <span className="text-[10px] font-black text-gray-500">{branch.efficiency}%</span>
                       </div>
                    </div>
                 ))}
              </div>

              <div className="pt-4 border-t border-gray-50">
                 <div className="flex items-center justify-between p-4 bg-primary-50 rounded-2xl border border-primary-100">
                    <div className="space-y-0.5">
                       <p className="text-[10px] font-black text-primary-700 uppercase">Avg Risk</p>
                       <p className="text-xl font-black text-primary-900">{regionalData?.regional_risk_avg}</p>
                    </div>
                    <div className="p-2 bg-white rounded-xl shadow-sm">
                       <Activity className="w-4 h-4 text-primary-600" />
                    </div>
                 </div>
              </div>
           </div>

        </div>

      </div>
    </div>
  );
}
