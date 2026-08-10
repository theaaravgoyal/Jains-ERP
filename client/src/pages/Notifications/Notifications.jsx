import React, { useState, useEffect } from 'react';
import { 
  Bell, CheckCheck, Trash2, Calendar, SlidersHorizontal, 
  Search, RefreshCw, AlertCircle, Eye, ArrowRight, Inbox 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { feesApi } from '../../api/feesApi';

const Notifications = () => {
  const navigate = useNavigate();
  
  // State variables
  const [notifications, setNotifications] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  
  // Filter variables
  const [activeTab, setActiveTab] = useState('all'); // all, unread, read
  const [moduleFilter, setModuleFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('All'); // All, today, week, month
  
  // UI states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchNotifications = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page,
        limit: 15,
        module: moduleFilter === 'All' ? undefined : moduleFilter,
        priority: priorityFilter === 'All' ? undefined : priorityFilter,
        isRead: activeTab === 'all' ? undefined : (activeTab === 'read' ? 'true' : 'false'),
        dateFilter: dateFilter === 'All' ? undefined : dateFilter
      };

      const [listRes, countRes] = await Promise.all([
        feesApi.getNotifications(params),
        feesApi.getUnreadCount()
      ]);

      if (listRes.success) {
        setNotifications(listRes.data.notifications || []);
        setTotalCount(listRes.data.total || 0);
        setTotalPages(listRes.data.pages || 1);
      }
      if (countRes.success) {
        setUnreadCount(countRes.data.count || 0);
      }
    } catch (err) {
      console.error('Error fetching notifications center:', err);
      setError('Failed to load notifications feed from system services.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [page, activeTab, moduleFilter, priorityFilter, dateFilter]);

  const handleMarkRead = async (id) => {
    try {
      await feesApi.markNotificationRead(id);
      showToast('Notification marked as read');
      fetchNotifications();
    } catch (err) {
      console.error(err);
      showToast('Action failed.', 'error');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await feesApi.markAllNotificationsRead();
      showToast('All notifications marked as read');
      fetchNotifications();
    } catch (err) {
      console.error(err);
      showToast('Action failed.', 'error');
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation(); // Avoid triggering row click navigate
    if (window.confirm('Delete this notification alert?')) {
      try {
        await feesApi.deleteNotification(id);
        showToast('Notification deleted');
        fetchNotifications();
      } catch (err) {
        console.error(err);
        showToast('Failed to delete notification', 'error');
      }
    }
  };

  const handleRowClick = async (n) => {
    try {
      if (!n.isRead) {
        await feesApi.markNotificationRead(n._id);
      }
      if (n.actionUrl) {
        navigate(n.actionUrl);
      } else {
        fetchNotifications();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // UI styling helpers
  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'CRITICAL':
        return 'bg-rose-50 text-rose-600 border-rose-100 font-extrabold';
      case 'HIGH':
        return 'bg-orange-50 text-orange-600 border-orange-100 font-bold';
      case 'MEDIUM':
        return 'bg-amber-50 text-amber-600 border-amber-100 font-semibold';
      default:
        return 'bg-slate-50 text-slate-500 border-slate-100 font-semibold';
    }
  };

  const getTypeStyle = (type) => {
    switch (type) {
      case 'SUCCESS': return 'border-l-4 border-emerald-500';
      case 'WARNING': return 'border-l-4 border-amber-500';
      case 'ERROR': return 'border-l-4 border-rose-500';
      default: return 'border-l-4 border-blue-500';
    }
  };

  const getModuleStyle = (module) => {
    switch (module) {
      case 'Attendance': return 'bg-blue-50 text-blue-600';
      case 'Lead Management': return 'bg-violet-50 text-violet-600';
      case 'Certificate Management': return 'bg-teal-50 text-teal-600';
      case 'Fees Management': return 'bg-amber-50 text-amber-600';
      default: return 'bg-slate-50 text-slate-500';
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${day}/${month}/${year} ${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
  };

  return (
    <div className="space-y-6">
      
      {/* Toast popup */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-2xl shadow-xl text-xs font-bold border flex items-center gap-2 animate-fade-in ${
          toast.type === 'error' 
            ? 'bg-rose-50 border-rose-100 text-rose-600' 
            : 'bg-emerald-50 border-emerald-100 text-emerald-600'
        }`}>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-5 border border-[#EBEAE6] rounded-2xl shadow-sm">
        <div className="space-y-0.5">
          <div className="text-[10px] text-slate-450 uppercase font-extrabold flex items-center gap-1">
            <span>ERP Portal</span>
            <ArrowRight size={10} />
            <span>Notification Center</span>
          </div>
          <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">Global Notification Center</h3>
          <p className="text-[10px] font-semibold text-slate-400">Live school alerts log aggregated across all modules</p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="w-full sm:w-auto py-2 px-3.5 bg-emerald-50 hover:bg-emerald-100/80 text-emerald-600 border border-emerald-100 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
            >
              <CheckCheck size={14} />
              <span>Mark all read</span>
            </button>
          )}
          <button
            onClick={fetchNotifications}
            className="p-2 border border-[#DEDCD8] bg-white text-slate-500 rounded-xl hover:bg-slate-50 transition-all cursor-pointer"
            title="Reload notification feed"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Tabs and Filters Panel */}
      <div className="bg-white border border-[#EBEAE6] rounded-2xl shadow-sm p-4 space-y-4">
        
        {/* Tab Row (All, Unread, Read) */}
        <div className="flex border-b border-slate-100 pb-2 gap-2">
          {['all', 'unread', 'read'].map(tab => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setPage(1);
              }}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === tab
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              <span className="capitalize">{tab} Alerts</span>
              {tab === 'unread' && unreadCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[8px] font-black">{unreadCount}</span>
              )}
            </button>
          ))}
        </div>

        {/* Filters Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-bold text-slate-650">
          
          <div className="space-y-1">
            <span className="text-[10px] text-slate-450 uppercase block font-extrabold">Filter by Module</span>
            <select
              value={moduleFilter}
              onChange={(e) => { setModuleFilter(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 border border-[#DEDCD8] bg-white rounded-xl text-xs font-bold outline-none"
            >
              <option value="All">All Modules</option>
              <option value="Attendance">Attendance</option>
              <option value="Lead Management">Lead Management</option>
              <option value="Certificate Management">Certificate Management</option>
              <option value="Fees Management">Fees Management</option>
              <option value="System">System / Configuration</option>
            </select>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] text-slate-450 uppercase block font-extrabold">Filter by Priority</span>
            <select
              value={priorityFilter}
              onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 border border-[#DEDCD8] bg-white rounded-xl text-xs font-bold outline-none"
            >
              <option value="All">All Priorities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] text-slate-450 uppercase block font-extrabold">Date Threshold</span>
            <select
              value={dateFilter}
              onChange={(e) => { setDateFilter(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 border border-[#DEDCD8] bg-white rounded-xl text-xs font-bold outline-none"
            >
              <option value="All">All Dates</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
          </div>

        </div>

      </div>

      {/* Main Alert List Feed */}
      <div className="bg-white border border-[#EBEAE6] rounded-2xl p-5 shadow-sm min-h-[300px]">
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse bg-slate-50 border border-slate-100 rounded-2xl h-20 w-full" />
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-12 text-rose-500 space-y-2">
            <AlertCircle size={28} className="mx-auto" />
            <p className="text-xs font-bold">{error}</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-16 text-slate-400 space-y-3">
            <div className="w-12 h-12 bg-slate-50 border border-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
              <Inbox size={20} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider">No notifications discovered</p>
              <p className="text-[10px] text-slate-400 mt-1">Try relaxing filters or check back later.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            
            {notifications.map(n => (
              <div 
                key={n._id}
                onClick={() => handleRowClick(n)}
                className={`p-4 bg-white hover:bg-slate-50/50 border rounded-2xl transition-all cursor-pointer flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${getTypeStyle(n.type)} ${
                  n.isRead ? 'border-[#EBEAE6]' : 'border-amber-200 shadow-xs'
                }`}
              >
                
                {/* Left side details */}
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[8px] font-extrabold uppercase ${getModuleStyle(n.module)}`}>
                      {n.module}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded border text-[8px] font-bold uppercase ${getPriorityBadge(n.priority)}`}>
                      {n.priority}
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold">{formatDate(n.createdAt)}</span>
                  </div>
                  
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                      {!n.isRead && (
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block shrink-0" />
                      )}
                      <span>{n.title}</span>
                    </h4>
                    <p className="text-[11px] text-slate-500 font-medium leading-normal mt-0.5 max-w-2xl">{n.message}</p>
                  </div>
                </div>

                {/* Right side actions */}
                <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
                  {!n.isRead && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleMarkRead(n._id); }}
                      className="p-2 rounded-lg border border-[#DEDCD8] bg-white text-emerald-600 hover:bg-emerald-50 transition-all cursor-pointer"
                      title="Mark as read"
                    >
                      <CheckCheck size={13} />
                    </button>
                  )}
                  <button
                    onClick={(e) => handleDelete(n._id, e)}
                    className="p-2 rounded-lg border border-slate-200 bg-white text-rose-500 hover:bg-rose-50 transition-all cursor-pointer"
                    title="Delete alert"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>

              </div>
            ))}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="pt-4 flex justify-between items-center border-t border-slate-100 shrink-0 text-xs font-bold text-slate-500">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                  className="px-3.5 py-1.5 border border-[#DEDCD8] rounded-xl hover:bg-slate-50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span>Page {page} of {totalPages}</span>
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage(page + 1)}
                  className="px-3.5 py-1.5 border border-[#DEDCD8] rounded-xl hover:bg-slate-50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}

          </div>
        )}
      </div>

    </div>
  );
};

export default Notifications;
