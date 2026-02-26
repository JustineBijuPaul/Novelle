import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <div className="lg:ml-64">
        <Header />
        <main className="p-4 lg:p-8 max-w-7xl mx-auto">
          <Outlet />
        </main>
        <footer className="px-4 lg:px-8 py-4 text-center text-xs text-gray-400 border-t border-gray-100 mt-8">
          <p>⚠️ Novelle does not replace professional medical advice. All outputs are risk likelihood estimates — not diagnoses.</p>
          <p className="mt-1">© 2026 Novelle. Your caring companion through every step of motherhood.</p>
        </footer>
      </div>
    </div>
  );
}
