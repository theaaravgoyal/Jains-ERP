import React from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import { ROUTES } from '../constants/Routes';

const ProtectedLayout = ({ children }) => {
  const location = useLocation();

  // Define routes that should render full-screen without global navigation shell
  const moduleRoutes = [
    ROUTES.FEES_MANAGEMENT,
    ROUTES.ATTENDANCE,
    ROUTES.CERTIFICATE_MANAGEMENT
  ];

  const isModulePage = moduleRoutes.some(
    (route) => location.pathname === route || location.pathname.startsWith(route + '/')
  );

  if (isModulePage) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] text-slate-700 font-sans w-full">
        <main className="w-full min-h-screen p-6 md:p-8">
          {children}
        </main>
      </div>
    );
  }

  return (
    // Full-screen container with clean white background
    <div className="min-h-screen bg-white text-slate-700 font-sans">

      {/* Full-width column — pl offsets content from behind the sidebar.
          The background continues edge-to-edge so there is no hard cut. */}
      <div className="flex flex-col min-h-screen">
        <Navbar />

        <main className="flex-1 flex flex-col justify-between overflow-y-auto pl-[5.5rem]">
          <Sidebar />
          <div className="p-6 md:p-10 w-full">
            {children}
          </div>

          {/* Shared Enterprise Footer */}
          <footer className="py-3 px-8 bg-slate-50 border-t w-full border-slate-200 text-center text-xs text-slate-400 mt-auto">
            <p>&copy; {new Date().getFullYear()} ERP Portal. All rights reserved. Scalable Enterprise Edition.</p>
          </footer>
        </main>
      </div>
    </div>
  );
};

export default ProtectedLayout;
