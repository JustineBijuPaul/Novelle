import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, FileSpreadsheet, Download, Filter, 
  Calendar, Clock, CheckCircle2, ChevronRight, 
  Settings, AlertCircle, Search, MoreVertical,
  BarChart3, PieChart, TrendingUp, Users, ShieldCheck,
  Printer, Share2, Mail, Trash2, Activity
} from 'lucide-react';
import { cn } from '../utils/helpers';
import { hospitalAdminService } from '../services/endpoints';
import { toast } from 'react-hot-toast';

export default function HospitalAdminReports() {
  const [activeTab, setActiveTab] = React.useState('Patient Reports');
  const [reports, setReports] = React.useState<any[]>([]);
  const [summary, setSummary] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [isGenerating, setIsGenerating] = React.useState(false);

  const fetchReportsData = async () => {
    setLoading(true);
    try {
      const [reportsList, summaryData] = await Promise.all([
        hospitalAdminService.listReports(),
        hospitalAdminService.getOperationalSummary()
      ]);
      setReports(reportsList.data);
      setSummary(summaryData.data);
    } catch (error) {
      console.error("Failed to fetch reports", error);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchReportsData();
  }, []);

  const handleGenerate = async (category: string, format: string) => {
    setIsGenerating(true);
    try {
      const res = await hospitalAdminService.generateReport({ category, format });
      toast.success(res.data.message);
    } catch (error) {
      toast.error("Failed to queue report generation");
    } finally {
      setIsGenerating(false);
    }
  };

  const tabs = [
    "Patient Reports", "Escalation Reports", "Financial Reports", 
    "Department Reports", "Monthly Analytics", "Exports"
  ];

  const reportCategories = [
    { title: "Maternal Health Audit", desc: "Detailed breakdown of patient risks, trimesters, and delivery types.", icon: Users, color: "bg-pink-50 text-pink-600" },
    { title: "Risk & Escalation Analysis", desc: "SLA compliance, resolution times, and emergency volume trends.", icon: TrendingUp, color: "bg-purple-50 text-purple-600" },
    { title: "Facility Resource Ledger", desc: "Bed occupancy, NICU availability, and equipment utilization.", icon: BarChart3, color: "bg-blue-50 text-blue-600" },
    { title: "Staff Performance Review", desc: "Consultation volume, response efficiency, and patient feedback.", icon: ShieldCheck, color: "bg-green-50 text-green-600" },
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 font-bold animate-pulse">Compiling operational documents...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-gray-900">Administrative Reports</h1>
          <p className="text-sm text-gray-500">Generate, schedule, and export comprehensive facility audits</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            <Settings className="w-4 h-4" /> Schedule Settings
          </button>
          <button 
            disabled={isGenerating}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 transition-colors shadow-lg shadow-primary-500/20 disabled:opacity-50"
          >
            {isGenerating ? <Clock className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />} 
            Bulk Export
          </button>
        </div>
      </div>

      {/* Operational Summary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: "Active Patients", value: summary?.total_active_patients, sub: "Facility Load", icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Monthly Escalations", value: summary?.monthly_escalations, sub: "Emergency Volume", icon: AlertCircle, color: "text-red-600", bg: "bg-red-50" },
          { label: "Compliance Rate", value: summary?.facility_compliance, sub: "SLA Adherence", icon: ShieldCheck, color: "text-green-600", bg: "bg-green-50" },
          { label: "Staff Ratio", value: summary?.staff_to_patient_ratio, sub: "Average Allocation", icon: Activity, color: "text-purple-600", bg: "bg-purple-50" }
        ].map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-6 rounded-[24px] border border-gray-100 shadow-sm space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className={cn("p-2.5 rounded-xl", stat.bg, stat.color)}>
                <stat.icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{stat.sub}</span>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-500">{stat.label}</p>
              <p className="text-2xl font-black text-gray-900">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Report Generation Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Templates */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-lg font-black text-gray-900">Report Templates</h3>
            <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
              {tabs.slice(0, 3).map(tab => (
                <button 
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-tight transition-all",
                    activeTab === tab ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                  )}
                >
                  {tab.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {reportCategories.map((template, i) => (
              <motion.div 
                key={i}
                whileHover={{ scale: 1.02 }}
                className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm hover:border-primary-200 transition-all group"
              >
                <div className="space-y-4">
                   <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", template.color)}>
                      <template.icon className="w-6 h-6" />
                   </div>
                   <div className="space-y-1">
                      <h4 className="text-lg font-black text-gray-900 group-hover:text-primary-600 transition-colors">{template.title}</h4>
                      <p className="text-xs text-gray-500 leading-relaxed font-medium">{template.desc}</p>
                   </div>
                   <div className="flex items-center gap-3 pt-2">
                      <button 
                        onClick={() => handleGenerate(template.title, 'PDF')}
                        className="flex-1 py-2.5 bg-gray-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
                      >
                        <FileText className="w-3 h-3" /> PDF
                      </button>
                      <button 
                        onClick={() => handleGenerate(template.title, 'Excel')}
                        className="flex-1 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                      >
                        <FileSpreadsheet className="w-3 h-3" /> Excel
                      </button>
                   </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Recent Exports */}
        <div className="space-y-6">
           <div className="flex items-center justify-between px-2">
              <h3 className="text-lg font-black text-gray-900">Recent Archives</h3>
              <button className="text-[10px] font-black uppercase tracking-widest text-primary-600 hover:text-primary-700">Clear All</button>
           </div>
           
           <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
              <div className="divide-y divide-gray-50">
                 {reports.map((report) => (
                   <div key={report.id} className="p-5 hover:bg-gray-50 transition-colors group">
                      <div className="flex items-start justify-between gap-4">
                         <div className="flex gap-4">
                            <div className={cn(
                              "p-3 rounded-xl",
                              report.format === 'PDF' ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"
                            )}>
                               {report.format === 'PDF' ? <FileText className="w-5 h-5" /> : <FileSpreadsheet className="w-5 h-5" />}
                            </div>
                            <div className="space-y-1">
                               <p className="text-sm font-black text-gray-900 leading-tight">{report.name}</p>
                               <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                                  <span>{report.date}</span>
                                  <span>•</span>
                                  <span>{report.size}</span>
                               </div>
                            </div>
                         </div>
                         <button className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-900 hover:text-white transition-all">
                            <Download className="w-4 h-4" />
                         </button>
                      </div>
                   </div>
                 ))}
              </div>
              <button className="w-full py-4 bg-gray-50 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-all border-t border-gray-100">
                 View All Records
              </button>
           </div>

           {/* Scheduled Reports Card */}
           <div className="bg-primary-900 rounded-[32px] p-6 text-white space-y-4 relative overflow-hidden shadow-xl shadow-primary-200">
              <div className="relative z-10 space-y-4">
                 <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary-400" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-primary-400">Next Scheduled Report</span>
                 </div>
                 <div>
                    <h5 className="text-xl font-black">Monthly Clinical Summary</h5>
                    <p className="text-xs text-primary-200 font-medium opacity-80">Auto-generating in 4 days (May 12, 2026)</p>
                 </div>
                 <button className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white hover:text-primary-300 transition-colors">
                    Edit Schedule <ChevronRight className="w-3 h-3" />
                 </button>
              </div>
              <Clock className="absolute top-0 right-0 w-32 h-32 text-white/5 -mr-8 -mt-8" />
           </div>
        </div>

      </div>
    </div>
  );
}
