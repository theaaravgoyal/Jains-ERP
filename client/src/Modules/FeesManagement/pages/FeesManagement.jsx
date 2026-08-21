import React, { useState, lazy, Suspense } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  LayoutDashboard, Users, User, UserPlus, CreditCard, 
  History, FileText, Receipt, BarChart3, Activity, 
  Settings as SettingsIcon, ArrowLeft, Menu, X, DollarSign 
} from 'lucide-react';

const Dashboard = lazy(() => import('./Dashboard'));
const Students = lazy(() => import('./Students'));
const StudentProfile = lazy(() => import('./StudentProfile'));
const ManualEnrollment = lazy(() => import('./ManualEnrollment'));
const Payments = lazy(() => import('./Payments'));
const PaymentHistory = lazy(() => import('./PaymentHistory'));
const Invoices = lazy(() => import('./Invoices'));
const Receipts = lazy(() => import('./Receipts'));
const Reports = lazy(() => import('./Reports'));
const ActivityLogs = lazy(() => import('./ActivityLogs'));
const Settings = lazy(() => import('./Settings'));
import { SettingsProvider } from '../context/SettingsContext';

const FeesManagement = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Navigation state driven by URL search params
  const activeTab = searchParams.get('tab') || 'dashboard';
  const selectedStudentId = searchParams.get('studentId');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Custom navigator wrapper
  const handleNavigate = (path) => {
    const params = new URLSearchParams(searchParams);
    if (path.includes('?')) {
      const [tab, query] = path.split('?');
      params.set('tab', tab);
      const queryParams = new URLSearchParams(query);
      for (const [key, value] of queryParams.entries()) {
        params.set(key, value);
      }
    } else {
      params.set('tab', path);
      if (path !== 'student-profile') {
        params.delete('studentId');
        params.delete('collect');
      }
    }
    setSearchParams(params);
  };

  const setSelectedStudentId = (id) => {
    const params = new URLSearchParams(searchParams);
    params.set('studentId', id);
    setSearchParams(params);
  };

  // Map subpages to their components
  const renderSubpage = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard onNavigate={handleNavigate} />;
      case 'students':
        return <Students onNavigate={handleNavigate} setSelectedStudentId={setSelectedStudentId} />;
      case 'student-profile':
        return <StudentProfile studentId={selectedStudentId} onNavigate={handleNavigate} />;
      case 'enrollment':
        return <ManualEnrollment onNavigate={handleNavigate} />;
      case 'collect-payment':
        return <Payments studentId={selectedStudentId} onNavigate={handleNavigate} />;
      case 'payments-history':
        return <PaymentHistory />;
      case 'invoices':
        return <Invoices />;
      case 'receipts':
        return <Receipts />;
      case 'reports':
        return <Reports />;
      case 'activity-logs':
        return <ActivityLogs />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard onNavigate={setActiveTab} />;
    }
  };

  // Nav Items config
  const navItems = [
    { id: 'dashboard', name: 'Dashboard', Icon: LayoutDashboard },
    { id: 'students', name: 'Students', Icon: Users },
    { id: 'student-profile', name: 'Student Profile', Icon: User },
    { id: 'enrollment', name: 'Manual Enrollment', Icon: UserPlus },
    { id: 'collect-payment', name: 'Payments', Icon: CreditCard },
    { id: 'payments-history', name: 'Payment History', Icon: History },
    { id: 'invoices', name: 'Invoices', Icon: FileText },
    { id: 'receipts', name: 'Receipts', Icon: Receipt },
    { id: 'reports', name: 'Reports', Icon: BarChart3 },
    { id: 'activity-logs', name: 'Activity Logs', Icon: Activity },
    { id: 'settings', name: 'Settings', Icon: SettingsIcon },
  ];

  return (
    <SettingsProvider>
      <div className="flex flex-col lg:flex-row min-h-[75vh] p-4 md:p-8 gap-6 text-slate-800 font-sans">
        
        {/* Mobile Drawer Trigger Bar */}
        <div className="lg:hidden flex items-center justify-between p-3.5 bg-white border border-[#EBEAE6] rounded-2xl shadow-xs w-full">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center">
              <DollarSign size={16} />
            </div>
            <span className="font-extrabold text-xs uppercase tracking-wider text-slate-800">Fees Module</span>
          </div>
          <button 
            onClick={() => setMobileMenuOpen(true)}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 bg-[#FAF9F6] transition-all cursor-pointer"
          >
            <Menu size={18} />
          </button>
        </div>

        {/* LEFT MODULE SIDEBAR (Desktop) */}
        <aside className="hidden lg:flex flex-col gap-1 w-64 bg-white border border-[#EBEAE6] rounded-2xl p-3 shadow-xs shrink-0 self-start">
          
          {/* Module title header */}
          <div className="flex items-center gap-2.5 px-3 py-3 border-b border-[#FAF9F6] mb-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center shadow-md shadow-orange-500/10">
              <DollarSign size={18} />
            </div>
            <div>
              <h2 className="text-xs font-extrabold text-slate-800 tracking-wide uppercase">Fees Accounts</h2>
              <p className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">JCMS ERP Portal</p>
            </div>
          </div>

          {/* Subpages links list */}
          <nav className="flex flex-col gap-1 flex-1">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    handleNavigate(item.id);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[11px] font-bold transition-all border outline-none cursor-pointer ${
                    isActive
                      ? 'bg-amber-500 border-amber-500 text-white shadow-sm shadow-amber-500/10'
                      : 'text-slate-500 hover:text-slate-700 bg-transparent border-transparent hover:bg-slate-50/70 hover:border-slate-200/60'
                  }`}
                >
                  <item.Icon size={15} />
                  <span>{item.name}</span>
                </button>
              );
            })}
          </nav>

          {/* Divider & back link */}
          <div className="border-t border-[#FAF9F6] pt-3 mt-3">
            <button
              onClick={() => navigate('/modules')}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[11px] font-bold text-slate-500 hover:text-brand-red bg-transparent border border-transparent hover:border-rose-100 hover:bg-rose-50/30 transition-all cursor-pointer"
            >
              <ArrowLeft size={15} />
              <span>Modules Dashboard</span>
            </button>
          </div>
        </aside>

        {/* MOBILE DRAWER OVERLAY */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex lg:hidden bg-slate-900/40 backdrop-blur-xs">
            <div className="relative w-64 bg-white h-full flex flex-col p-4 shadow-2xl animate-fade-in-left">
              {/* Close Button */}
              <button 
                onClick={() => setMobileMenuOpen(false)}
                className="absolute top-4 right-4 p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={16} />
              </button>

              {/* Title */}
              <div className="flex items-center gap-2.5 pb-4 border-b border-[#FAF9F6] mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center shadow-md shadow-orange-500/10">
                  <DollarSign size={16} />
                </div>
                <span className="font-extrabold text-xs uppercase tracking-wider text-slate-800">Fees Module</span>
              </div>

              {/* Menu List */}
              <nav className="flex flex-col gap-1 flex-1 overflow-y-auto pr-1">
                {navItems.map((item) => {
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        handleNavigate(item.id);
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[11px] font-bold transition-all border outline-none cursor-pointer ${
                        isActive
                          ? 'bg-amber-500 border-amber-500 text-white'
                          : 'text-slate-500 hover:text-slate-700 bg-transparent border-transparent hover:bg-[#FAF9F6]'
                      }`}
                    >
                      <item.Icon size={14} />
                      <span>{item.name}</span>
                    </button>
                  );
                })}
              </nav>

              {/* Back to Modules */}
              <div className="border-t border-[#FAF9F6] pt-3 mt-auto">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    navigate('/modules');
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[11px] font-bold text-slate-500 hover:text-brand-red bg-transparent border border-transparent hover:border-rose-100 hover:bg-rose-50/30 transition-all cursor-pointer"
                >
                  <ArrowLeft size={14} />
                  <span>Modules Dashboard</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* RIGHT DISPLAY WINDOW: Renders the active subpage component */}
        <main className="flex-1 min-w-0 bg-transparent">
          <Suspense fallback={
            <div className="flex items-center justify-center p-12 bg-white border border-[#EBEAE6] rounded-2xl animate-pulse">
              <div className="h-4 bg-slate-100 rounded w-1/4" />
            </div>
          }>
            {renderSubpage()}
          </Suspense>
        </main>

      </div>
    </SettingsProvider>
  );
};

export default FeesManagement;
