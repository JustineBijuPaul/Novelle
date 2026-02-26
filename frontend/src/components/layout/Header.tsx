import { Menu, Bell } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { useAuthStore } from '../../stores/authStore';
import { getWeekDescription } from '../../utils/helpers';

export default function Header() {
  const { toggleSidebar, profile } = useAppStore();
  const { user } = useAuthStore();

  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="flex items-center justify-between px-4 lg:px-8 py-3">
        <div className="flex items-center gap-4">
          <button
            onClick={toggleSidebar}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-500"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-sm font-medium text-gray-500">
              {profile ? getWeekDescription(profile.pregnancy_week) : 'Welcome'}
            </h2>
            <h1 className="text-lg font-display font-bold text-gray-900">
              Hello, {user?.full_name?.split(' ')[0] || 'there'} 👋
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="relative p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-primary-500 rounded-full" />
          </button>
        </div>
      </div>
    </header>
  );
}
