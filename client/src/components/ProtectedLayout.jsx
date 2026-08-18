import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { LayoutDashboard, LayoutGrid, Settings } from 'lucide-react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import { ROUTES } from '../constants/Routes';

const ProtectedLayout = ({ children }) => {
  const location = useLocation();

  // Define routes that should render full-screen without global navigation shell
  const moduleRoutes = [
    ROUTES.FEES_MANAGEMENT,
    ROUTES.ATTENDANCE,
    ROUTES.CERTIFICATE_MANAGEMENT,
    ROUTES.LEAD_MANAGEMENT
  ];

  const isModulePage = moduleRoutes.some(
    (route) => location.pathname === route || location.pathname.startsWith(route + '/')
  );

  if (isModulePage) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] text-slate-700 font-sans w-full">
        <main className="w-full min-h-screen p-4 md:p-8">
          {children}
        </main>
      </div>
    );
  }

  const mobileNavItems = [
    { name: 'Dashboard', path: ROUTES.DASHBOARD, Icon: LayoutDashboard },
    { name: 'Modules',   path: ROUTES.MODULES,   Icon: LayoutGrid },
    { name: 'Settings',  path: ROUTES.SETTINGS,  Icon: Settings },
  ];

  return (
    // Full-screen container with clean white background
    <div className="min-h-screen bg-white text-slate-700 font-sans relative flex flex-col">
      
      {/* Floating sidebar — hidden on mobile, fixed left on desktop */}
      <Sidebar />

      {/* Main Container — pl offsets content on desktop to clear the sidebar */}
      <div className="flex flex-col min-h-screen md:pl-[84px] w-full transition-all duration-300">
        <Navbar />

        <main className="flex-1 flex flex-col justify-between overflow-y-auto">
          {/* pb-24 on mobile prevents bottom navigation bar from overlapping the content */}
          <div className="p-6 md:p-10 w-full max-w-7xl mx-auto pb-24 md:pb-10">
            {children}
          </div>

          {/* Shared Enterprise Footer */}
          <footer className="py-3 px-8 bg-slate-50 border-t w-full border-slate-200 text-center text-xs text-slate-400 mt-auto">
            <p>&copy; {new Date().getFullYear()} ERP Portal. All rights reserved. Scalable Enterprise Edition.</p>
          </footer>
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-white/90 backdrop-blur-md border border-slate-200/80 rounded-2xl shadow-xl shadow-slate-200/40 py-2.5 px-6 flex items-center justify-around gap-6 w-[90%] max-w-sm">
        {mobileNavItems.map(({ name, path, Icon }) => {
          const isActive = location.pathname === path;
          return (
            <Link
              key={path}
              to={path}
              className={`flex flex-col items-center justify-center gap-1 text-[10px] font-bold transition-all px-3 py-1 rounded-xl ${
                isActive
                  ? 'text-brand-red scale-105'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Icon size={19} className={isActive ? 'stroke-[2.5px]' : 'stroke-[2px]'} />
              <span>{name}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
};

export default ProtectedLayout;
