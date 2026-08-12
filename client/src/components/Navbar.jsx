import React, { useState, useRef, useEffect } from 'react';
import { Bell, LogOut, CheckCheck, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { ROUTES } from '../constants/Routes';
import { feesApi } from '../api/feesApi';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  
  const dropdownRef = useRef(null);
  const notificationRef = useRef(null);

  const handleLogout = async () => {
    await logout();
    navigate(ROUTES.LOGIN);
  };

  const isFetchingNotifRef = useRef(false);

  const fetchNotifications = async (silent = false) => {
    if (isFetchingNotifRef.current && silent) return;
    isFetchingNotifRef.current = true;
    if (!silent) setLoadingNotifications(true);
    try {
      const [listRes, countRes] = await Promise.all([
        feesApi.getNotifications({ limit: 10 }),
        feesApi.getUnreadCount()
      ]);
      
      if (listRes.success) {
        setNotifications(listRes.data.notifications || []);
      }
      if (countRes.success) {
        setUnreadCount(countRes.data.count || 0);
      }
    } catch (err) {
      if (!silent) console.error('Failed to fetch notifications center alerts:', err);
    } finally {
      if (!silent) setLoadingNotifications(false);
      isFetchingNotifRef.current = false;
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await feesApi.markAllNotificationsRead();
      fetchNotifications(true);
    } catch (err) {
      console.error('Failed to mark all notifications read:', err);
    }
  };

  const handleNotificationClick = async (n) => {
    try {
      if (!n.isRead) {
        await feesApi.markNotificationRead(n._id);
      }
      setShowNotifications(false);
      fetchNotifications(true);
      
      if (n.actionUrl) {
        navigate(n.actionUrl);
      }
    } catch (err) {
      console.error('Error on notification click:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Poll notifications every 20 seconds only when tab is active
    const interval = setInterval(() => {
      if (!document.hidden) {
        fetchNotifications(true);
      }
    }, 20000);

    const onVisibilityChange = () => {
      if (!document.hidden) {
        fetchNotifications(true);
      }
    };
    window.addEventListener('focus', onVisibilityChange);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onVisibilityChange);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getPriorityStyle = (priority) => {
    switch (priority) {
      case 'CRITICAL': return 'text-rose-600 bg-rose-50 border-rose-100';
      case 'HIGH': return 'text-orange-600 bg-orange-50 border-orange-100';
      case 'MEDIUM': return 'text-amber-600 bg-amber-50 border-amber-100';
      default: return 'text-slate-500 bg-slate-50 border-slate-100';
    }
  };

  const getModuleBadgeColor = (module) => {
    switch (module) {
      case 'Attendance': return 'text-blue-600 bg-blue-50';
      case 'Lead Management': return 'text-violet-600 bg-violet-50';
      case 'Certificate Management': return 'text-teal-600 bg-teal-50';
      case 'Fees Management': return 'text-amber-600 bg-amber-50';
      default: return 'text-slate-500 bg-slate-50';
    }
  };

  const formatRelativeTime = (dateStr) => {
    const d = new Date(dateStr);
    const diffMs = new Date() - d;
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  };

  return (
    <header className="bg-white/90 backdrop-blur-md sticky top-0 z-40 border-b border-slate-200 px-6 py-4 flex items-center justify-between gap-4 h-[8vh] shrink-0 shadow-sm shadow-slate-100/40">
      {/* Brand */}
      <div className="flex items-center gap-3">
        <Link to={ROUTES.DASHBOARD} className="flex items-center gap-2 hover:opacity-90 transition-opacity">
          <img 
            src="/jains.svg" 
            alt="Jains Computers" 
            className="h-9 md:h-10 w-auto object-contain"
            onError={(e) => {
              e.target.onerror = null;
            }}
          />
        </Link>
      </div>

      <div className="flex items-center gap-4">
        {/* Notifications */}
        <div className="relative" ref={notificationRef}>
          <button 
            onClick={() => {
              setShowNotifications(!showNotifications);
            }}
            className="p-2 text-slate-450 hover:text-amber-500 rounded-lg hover:bg-slate-50 transition-colors relative border-0 bg-transparent cursor-pointer outline-none flex items-center justify-center"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 px-1.5 py-0.5 rounded-full bg-rose-500 text-white font-extrabold text-[8px] leading-none min-w-[14px] text-center shadow-xs">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Global ERP Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-3 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl p-3.5 space-y-2.5 max-h-[420px] overflow-y-auto z-50 animate-fade-in flex flex-col">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100 shrink-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">ERP Alert Inbox</span>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-600 text-[8px] font-extrabold">{unreadCount} new</span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button 
                    onClick={handleMarkAllRead}
                    className="text-[9px] font-bold text-emerald-600 hover:text-emerald-700 border-0 bg-transparent cursor-pointer flex items-center gap-0.5"
                  >
                    <CheckCheck size={10} />
                    <span>Mark all read</span>
                  </button>
                )}
              </div>
              
              <div className="space-y-1.5 flex-1 overflow-y-auto pr-0.5 min-h-[120px]">
                {loadingNotifications && notifications.length === 0 ? (
                  <div className="flex justify-center items-center py-8">
                    <RefreshCw size={16} className="animate-spin text-slate-400" />
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <p className="text-[10px] font-bold uppercase tracking-wider mb-1">Inboxes Cleared</p>
                    <p className="text-[9px]">No pending alerts discovered.</p>
                  </div>
                ) : (
                  notifications.map(n => (
                    <div 
                      key={n._id} 
                      onClick={() => handleNotificationClick(n)}
                      className={`p-2.5 rounded-xl text-xs leading-snug border transition-all cursor-pointer select-none hover:bg-slate-50 ${
                        n.isRead 
                          ? 'bg-white text-slate-500 border-slate-100' 
                          : 'bg-[#FAF9F6] text-slate-800 font-semibold border-amber-100/50 shadow-xs'
                      }`}
                    >
                      <div className="flex justify-between items-center mb-1 text-[8px]">
                        <span className={`px-1.5 py-0.5 rounded font-extrabold uppercase ${getModuleBadgeColor(n.module)}`}>
                          {n.module}
                        </span>
                        <span className="text-slate-400 font-medium">
                          {formatRelativeTime(n.createdAt)}
                        </span>
                      </div>
                      
                      <h4 className="text-[11px] font-extrabold text-slate-800 leading-tight mb-0.5">{n.title}</h4>
                      <p className="text-[10px] text-slate-500 font-medium line-clamp-2 leading-normal">{n.message}</p>
                      
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <span className={`px-1 rounded border text-[7px] font-bold uppercase ${getPriorityStyle(n.priority)}`}>
                          {n.priority}
                        </span>
                        {!n.isRead && (
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 ml-auto" />
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="pt-2 border-t border-slate-100 shrink-0">
                <button
                  onClick={() => {
                    setShowNotifications(false);
                    navigate(ROUTES.NOTIFICATIONS);
                  }}
                  className="w-full py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-650 hover:text-slate-900 border-0 text-[10px] font-bold rounded-xl transition-all cursor-pointer text-center"
                >
                  View All Notifications
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User profile with dropdown */}
        <div className="relative" ref={dropdownRef}>
          <div 
            className="flex items-center gap-3 border-l border-slate-200 pl-4 select-none cursor-pointer group"
            onClick={() => setDropdownOpen(!dropdownOpen)}
          >
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-slate-700 leading-tight group-hover:text-brand-red transition-colors">{user?.name}</p>
              <p className="text-[10px] text-slate-400 font-medium tracking-wide uppercase mt-0.5">{user?.role}</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-brand-red font-bold text-sm transition-transform duration-200 group-hover:scale-105 shadow-sm">
              {user?.name ? user.name[0].toUpperCase() : 'U'}
            </div>
          </div>

          {/* Dropdown Menu */}
          <div 
            className={`absolute right-0 mt-3 w-48 bg-white border border-slate-200 rounded-xl shadow-lg shadow-slate-100/50 py-2 transition-all duration-300 origin-top-right z-50
              ${dropdownOpen ? 'transform opacity-100 scale-100 translate-y-0' : 'transform opacity-0 scale-95 -translate-y-2 pointer-events-none'}
            `}
          >
            <div className="px-4 py-2 border-b border-slate-100 mb-1 sm:hidden">
              <p className="text-sm font-semibold text-slate-700 truncate">{user?.name}</p>
              <p className="text-[10px] text-slate-400 font-medium tracking-wide uppercase mt-0.5">{user?.role}</p>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-600 hover:text-brand-red hover:bg-slate-50 transition-colors border-0 bg-transparent cursor-pointer text-left"
            >
              <LogOut size={16} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
    
