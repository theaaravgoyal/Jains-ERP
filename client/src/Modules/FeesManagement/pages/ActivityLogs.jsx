import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { feesApi } from '../../../api/feesApi';
import SearchBar from '../components/SearchBar';
import FilterPanel from '../components/FilterPanel';
import Loader from '../components/Loader';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import { formatDate } from '../../../utils/dateUtils';

const ActivityLogs = () => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [adminFilter, setAdminFilter] = useState('All');

  const fetchActivities = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await feesApi.getDashboardRecentActivities();
      if (res.success) {
        setActivities(res.data || []);
      }
    } catch (err) {
      console.error('Error fetching activities:', err);
      setError(err.response?.data?.message || 'Failed to fetch audit timelines from server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, []);

  const formatActionName = (action) => {
    if (!action) return 'Unknown Action';
    return action
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const getActionColor = (action) => {
    if (!action) return 'bg-slate-50 text-slate-500 border-slate-100';
    if (action.includes('PAYMENT')) return 'bg-emerald-50 text-emerald-600 border-emerald-100';
    if (action.includes('PAID')) return 'bg-emerald-50 text-emerald-600 border-emerald-100';
    if (action.includes('ADDED')) return 'bg-blue-50 text-blue-600 border-blue-100';
    if (action.includes('CREATED')) return 'bg-blue-50 text-blue-600 border-blue-100';
    if (action.includes('UPDATED')) return 'bg-amber-50 text-amber-600 border-amber-100';
    if (action.includes('DELETED')) return 'bg-rose-50 text-rose-600 border-rose-100';
    return 'bg-slate-50 text-slate-500 border-slate-100';
  };

  // Filter logs
  const filteredActivities = activities.filter((log) => {
    const adminName = log.performedBy?.name || 'System';
    const actionName = formatActionName(log.action);
    const detailsText = log.description || '';

    const matchesAdmin = adminFilter === 'All' || adminName === adminFilter;
    const matchesSearch =
      actionName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      detailsText.toLowerCase().includes(searchQuery.toLowerCase()) ||
      adminName.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesAdmin && matchesSearch;
  });

  // Unique admins list for filtering
  const admins = ['All', ...new Set(activities.map(log => log.performedBy?.name).filter(Boolean))];

  if (loading && activities.length === 0) {
    return <Loader message="Syncing module audits..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 border border-[#EBEAE6] rounded-2xl shadow-sm">
        <div className="space-y-0.5">
          <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">Module Security Audits</h3>
          <p className="text-[10px] font-semibold text-slate-400">Timelines of administrative action triggers</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#FAF9F6]/50 p-4 border border-[#EBEAE6] rounded-2xl">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search action logs..."
        />

        <FilterPanel showIcon={true}>
          <select
            value={adminFilter}
            onChange={(e) => setAdminFilter(e.target.value)}
            className="bg-transparent border-none outline-none text-xs font-bold cursor-pointer text-slate-700"
          >
            {admins.map(adm => (
              <option key={adm} value={adm}>
                {adm === 'All' ? 'All Operators' : adm}
              </option>
            ))}
          </select>
        </FilterPanel>
      </div>

      {error && <ErrorState message={error} onRetry={fetchActivities} />}

      {/* Timeline Layout */}
      <div className="bg-white border border-[#EBEAE6] rounded-2xl p-6 shadow-sm">
        {filteredActivities.length === 0 ? (
          <EmptyState title="No Audit Logs" message="No audit logs matched your search filters." />
        ) : (
          <div className="relative border-l border-slate-100 ml-3 space-y-6">
            {filteredActivities.map((log, idx) => {
              const d = log.createdAt ? new Date(log.createdAt) : new Date();
              const dateStr = formatDate(d);
              const timeStr = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

              return (
                <div key={log._id || idx} className="relative pl-6 group">
                  
                  {/* Node icon indicators */}
                  <div className="absolute top-1.5 -left-1.5 w-3.5 h-3.5 rounded-full bg-white border-2 border-amber-500 group-hover:bg-amber-500 transition-colors duration-200" />

                  {/* Log box layout */}
                  <div className="bg-[#FAF9F6]/30 border border-[#EBEAE6] hover:border-slate-300 rounded-2xl p-4 transition-all duration-200 space-y-3.5">
                    
                    {/* Top line Action + Date */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full border text-[9px] font-extrabold uppercase tracking-wide ${getActionColor(log.action)}`}>
                          {formatActionName(log.action)}
                        </span>
                        <h4 className="text-xs font-extrabold text-slate-800">{log.description}</h4>
                      </div>

                      <div className="flex items-center gap-1 text-[10px] text-slate-400 font-semibold">
                        <Clock size={12} />
                        <span>{dateStr} &bull; {timeStr}</span>
                      </div>
                    </div>

                    {/* Footer details line */}
                    <div className="flex items-center gap-4 text-[10px] text-slate-455 border-t border-[#FAF9F6] pt-2">
                      <div>
                        <span className="font-bold text-slate-505">Operator: </span>
                        <span className="font-bold text-slate-700">{log.performedBy?.name || 'System'}</span>
                      </div>
                      <div>
                        <span className="font-bold text-slate-550">Clearance: </span>
                        <span className="font-bold text-emerald-650 bg-emerald-50 px-1.5 py-0.5 rounded uppercase border border-emerald-100">Verified</span>
                      </div>
                    </div>

                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};

export default ActivityLogs;
