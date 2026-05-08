import { Menu, Bell, Search, Plus, Sparkles, ShieldAlert, User } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { useAuthStore } from '../../stores/authStore';
import { getWeekDescription } from '../../utils/helpers';
import { cn } from '../../utils/helpers';

export default function Header() {
  const { toggleSidebar, profile } = useAppStore();
  const { user } = useAuthStore();

  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="flex items-center justify-between px-4 lg:px-8 py-3 gap-4">
        {/* Left Section: Menu & Branding/Greeting */}
        <div className="flex items-center gap-4 min-w-0">
          <button
            onClick={toggleSidebar}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-500"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="hidden sm:block min-w-0">
            <h2 className="text-[10px] font-black text-primary-600 uppercase tracking-widest leading-none mb-1">
              {profile ? getWeekDescription(profile.pregnancy_week) : 'Welcome'}
            </h2>
            <h1 className="text-sm font-display font-bold text-gray-900 truncate">
              Hello, {user?.full_name?.split(' ')[0] || 'there'} 👋
            </h1>
          </div>
        </div>

        {/* Center Section: Search */}
        <div className="hidden md:flex flex-1 max-w-md relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
          <input 
            type="text" 
            placeholder="Search clinical data, insights, or support..." 
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
          />
        </div>

        {/* Right Section: Actions */}
        <div className="flex items-center gap-2 lg:gap-3">
          {/* Quick Health Log */}
          <button className="hidden lg:flex items-center gap-2 px-3 py-2 bg-primary-50 text-primary-700 rounded-xl font-bold text-xs hover:bg-primary-100 transition-all">
            <Plus className="w-4 h-4" />
            Log Health
          </button>

          {/* AI Assistant */}
          <button className="p-2 rounded-xl bg-gray-900 text-white hover:bg-gray-800 transition-all shadow-md">
            <Sparkles className="w-4 h-4" />
          </button>

          {/* Notifications */}
          <button className="relative p-2 rounded-xl hover:bg-gray-50 text-gray-500 border border-transparent hover:border-gray-200 transition-all">
            <Bell className="w-5 h-5" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-primary-500 rounded-full border-2 border-white" />
          </button>

          {/* Emergency SOS */}
          <button className="p-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 border border-red-100 transition-all">
            <ShieldAlert className="w-5 h-5" />
          </button>

          {/* User Profile */}
          <div className="flex items-center gap-2 pl-2 border-l border-gray-100">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center border border-gray-100">
              <User className="w-4 h-4 text-gray-500" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
