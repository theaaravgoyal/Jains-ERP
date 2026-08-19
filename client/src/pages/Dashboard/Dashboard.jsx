import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  CheckCircle, 
  Clock, 
  Award,
  ArrowRight,
  User,
  UserX
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer
} from 'recharts';
import { useLeads } from '../../Modules/LeadManagement/hooks/useLeads';
import { ROUTES } from '../../constants/Routes';
import { adminAttendanceApi } from '../../api/adminAttendanceApi';

export default function Dashboard() {
  const navigate = useNavigate();
  const { leads, loading } = useLeads();

  // Fetch real attendance summary from the database
  const [attendanceSummary, setAttendanceSummary] = useState([]);
  const [summaryLoading, setSummaryLoading] = useState(false);

  const fetchAttendanceSummary = async () => {
    try {
      setSummaryLoading(true);
      const res = await adminAttendanceApi.getDailySummary();
      if (res.success) {
        setAttendanceSummary(res.summary || []);
      }
    } catch (err) {
      console.error('Failed to fetch daily summary:', err);
    } finally {
      setSummaryLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendanceSummary();
  }, []);

  const toggleAttendance = (id) => {
    setAttendanceSummary(prev =>
      prev.map(item => {
        if (item.id === id) {
          const newStatus = (item.status === 'Present' || item.status === 'Late') ? 'Absent' : 'Present';
          return { ...item, status: newStatus };
        }
        return item;
      })
    );
  };

  // Compute stats dynamically from real leads
  const totalInquiries = leads.length;
  const activeCount = leads.filter(l => {
    const status = (l.status || 'New').toLowerCase();
    return status === 'new' || status === 'connected' || status === 'contacted' || status === 'follow-up' || status === 'followup' || status === 'pending';
  }).length;

  const admissionsCompleted = leads.filter(l => (l.status || '').toLowerCase() === 'converted').length;
  const scheduledFollowUps = leads.filter(l => {
    const status = (l.status || '').toLowerCase();
    return status === 'follow-up' || status === 'followup';
  }).length;

  const successRate = totalInquiries > 0 ? Math.round((admissionsCompleted / totalInquiries) * 100) : 0;

  // Generate last 8 days including today dynamically
  const chartData = useMemo(() => {
    const data = [];
    const now = new Date();
    for (let i = 7; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dayStr = date.getDate().toString().padStart(2, '0');
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthStr = monthNames[date.getMonth()];
      const label = `${dayStr} ${monthStr}`;

      // Count leads created on this day (local date comparison)
      const count = leads.filter(l => {
        if (!l.createdAt) return false;
        const createdDate = new Date(l.createdAt);
        return createdDate.getDate() === date.getDate() &&
               createdDate.getMonth() === date.getMonth() &&
               createdDate.getFullYear() === date.getFullYear();
      }).length;

      // Use 0.00001 as minimum height so recharts renders empty bars nicely
      data.push({ name: label, value: count || 0.00001 });
    }
    return data;
  }, [leads]);

  // Compute dynamic YAxis domain based on the max lead count per day
  const maxVal = Math.max(...chartData.map(d => Math.floor(d.value))) || 2;
  const yDomain = [0, maxVal < 2 ? 2 : maxVal];
  const yTicks = maxVal <= 2 ? [0, 1, 2] : undefined;

  // Retrieve top 3 most recent leads
  const recentLeads = useMemo(() => {
    return leads.slice(0, 3);
  }, [leads]);

  // Define status pill colors mapping
  const getStatusClass = (status) => {
    const norm = (status || 'new').toLowerCase();
    if (norm === 'new' || norm === 'pending') {
      return 'bg-cyan-50 text-cyan-600 border border-cyan-100';
    }
    if (norm === 'connected' || norm === 'contacted') {
      return 'bg-blue-50 text-blue-600 border border-blue-100';
    }
    if (norm === 'follow-up' || norm === 'followup') {
      return 'bg-amber-50 text-amber-600 border border-amber-100';
    }
    if (norm === 'converted') {
      return 'bg-emerald-50 text-emerald-600 border border-emerald-100';
    }
    return 'bg-rose-50 text-rose-600 border border-rose-100';
  };

  const presentEmployees = attendanceSummary.filter(emp => emp.status === 'Present' || emp.status === 'Late');
  const absentEmployees = attendanceSummary.filter(emp => emp.status === 'Absent' || emp.status === 'Leave');

  const presentCount = presentEmployees.length;
  const absentCount = absentEmployees.length;

  return (
    <div className="bg-white text-slate-800 font-sans flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            Welcome Back, Aadish! <span className="text-2xl">👋</span>
          </h1>
          <p className="text-slate-500 font-medium mt-1 text-sm">
            Real-time student lead metrics and staff operations.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-[#f4f4f5] px-4 py-2 rounded-full border border-slate-200 shadow-sm">
          <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></div>
          <span className="text-xs font-bold text-slate-600">Live Monitoring Mode</span>
        </div>
      </div>

      {/* Top Stats Cards */}
      <div className="flex flex-wrap gap-6 mb-6">
        {/* Card 1 */}
        <div className="flex-1 min-w-[200px] bg-[#e31b23] rounded-2xl px-5 py-5 shadow-lg relative overflow-hidden flex flex-col justify-between h-fit">
          <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
          <div className="flex justify-between items-start z-10">
            <h3 className="text-white font-bold text-xs tracking-wider">TOTAL INQUIRIES</h3>
            <div className="bg-white/20 p-2 rounded-xl">
              <Users size={18} className="text-white" />
            </div>
          </div>
          <div className="flex items-end gap-3 z-10 mt-auto">
            <span className="text-5xl font-black text-white leading-none">
              {loading ? '...' : totalInquiries}
            </span>
            <div className="bg-white/90 px-3 py-1 rounded-full mb-1">
              <span className="text-[#e31b23] text-[10px] font-bold">
                {loading ? '...' : `+${activeCount} Active`}
              </span>
            </div>
          </div>
        </div>

        {/* Card 2 */}
        <div className="flex-1 min-w-[200px] bg-white rounded-2xl px-5 py-5 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-slate-200 flex flex-col justify-between h-fit">
          <div className="flex justify-between items-start">
            <h3 className="text-slate-500 font-bold text-xs tracking-wider">ADMISSIONS COMPLETED</h3>
            <div className="bg-emerald-50 p-2 rounded-xl border border-emerald-100">
              <CheckCircle size={18} className="text-emerald-500" />
            </div>
          </div>
          <div className="flex items-end gap-3 mt-auto">
            <span className="text-5xl font-black text-slate-800 leading-none">
              {loading ? '...' : admissionsCompleted}
            </span>
            <div className="bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100 mb-1">
              <span className="text-emerald-600 text-[10px] font-bold">Enrolled</span>
            </div>
          </div>
        </div>

        {/* Card 3 */}
        <div className="flex-1 min-w-[200px] bg-white rounded-2xl px-5 py-5 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-slate-200 flex flex-col justify-between h-fit">
          <div className="flex justify-between items-start">
            <h3 className="text-slate-500 font-bold text-xs tracking-wider">SCHEDULED FOLLOW-UPS</h3>
            <div className="bg-amber-50 p-2 rounded-xl border border-amber-100">
              <Clock size={18} className="text-amber-500" />
            </div>
          </div>
          <div className="flex items-end gap-3 mt-auto">
            <span className="text-5xl font-black text-slate-800 leading-none">
              {loading ? '...' : scheduledFollowUps}
            </span>
            <div className="bg-amber-50 px-3 py-1 rounded-full border border-amber-100 mb-1">
              <span className="text-amber-600 text-[10px] font-bold">Callbacks</span>
            </div>
          </div>
        </div>

        {/* Card 4 */}
        <div className="flex-1 min-w-[200px] bg-white rounded-2xl px-5 py-5 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-slate-200 flex flex-col justify-between h-fit">
          <div className="flex justify-between items-start">
            <h3 className="text-slate-500 font-bold text-xs tracking-wider">SUCCESS RATE</h3>
            <div className="bg-indigo-50 p-2 rounded-xl border border-indigo-100">
              <Award size={18} className="text-indigo-500" />
            </div>
          </div>
          <div className="flex items-end gap-3 mt-auto">
            <span className="text-5xl font-black text-slate-800 leading-none">
              {loading ? '...' : `${successRate}%`}
            </span>
            <div className="bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100 mb-1">
              <span className="text-indigo-600 text-[10px] font-bold">Admissions</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="flex flex-col xl:flex-row gap-6 flex-1 min-h-0">
        
        {/* Left Column - Chart */}
        <div className="xl:flex-[2] min-w-0 bg-white rounded-2xl p-6 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-slate-200 flex flex-col overflow-hidden">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-wide">INQUIRY VOLUME OVERVIEW</h2>
              <p className="text-slate-500 text-xs font-medium mt-1">Chronological student registrations over last 8 days</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 bg-[#e31b23] rounded-sm"></div>
              <span className="text-xs font-bold text-slate-800">Student Inquiries (Leads)</span>
            </div>
          </div>
          
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                barSize={44}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fontWeight: 'bold', fill: '#64748b' }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fontWeight: 'bold', fill: '#64748b' }}
                  domain={yDomain}
                  ticks={yTicks}
                />
                <Bar 
                  dataKey="value" 
                  fill="#e31b23" 
                  radius={[8, 8, 8, 8]}
                  background={{ fill: '#f4f4f5', radius: [8, 8, 8, 8] }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Column */}
        <div className="xl:flex-1 min-w-0 flex flex-col gap-6 overflow-hidden">
          
          {/* Recent Leads */}
          <div className="bg-white rounded-2xl p-6 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-slate-200 flex-1 overflow-hidden max-h-[30vh] flex flex-col">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-sm font-black text-slate-800 uppercase tracking-wide">RECENT LEADS OVERVIEW</h2>
              </div>
              <button 
                onClick={() => navigate(ROUTES.LEAD_MANAGEMENT)}
                className="text-[#e31b23] text-xs font-bold flex items-center gap-1 hover:underline cursor-pointer border-0 bg-transparent"
              >
                View All <ArrowRight size={14} />
              </button>
            </div>
            
            <div className="space-y-3 overflow-y-auto flex-1 min-h-0">
              {loading ? (
                <div className="text-center text-slate-500 text-sm py-4">Loading leads...</div>
              ) : recentLeads.length === 0 ? (
                <div className="text-center text-slate-500 text-xs py-4">No leads found. Use Lead Management to simulate or create leads!</div>
              ) : (
                recentLeads.map((lead) => {
                  const leadId = lead._id || lead.id || '';
                  const shortId = leadId ? `L-${leadId.slice(-4)}` : 'L-New';
                  return (
                    <div 
                      key={leadId} 
                      onClick={() => navigate(ROUTES.LEAD_MANAGEMENT)}
                      className="bg-[#f8f9fa] border border-slate-200 rounded-xl p-4 flex justify-between items-center relative overflow-hidden group cursor-pointer hover:border-slate-350 hover:shadow-sm transition-all"
                    >
                      <div className="absolute right-0 top-0 bottom-0 w-1.5 bg-slate-200 rounded-r-xl"></div>
                      <div className="min-w-0 flex-1 pr-3">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-bold text-slate-800 text-sm truncate">{lead.name}</h4>
                          <span className="text-[10px] text-slate-400 font-bold shrink-0">{shortId}</span>
                        </div>
                        <p className="text-xs text-slate-500 font-medium truncate">{lead.course}</p>
                      </div>
                      <div className={`px-2.5 py-1 rounded-lg shrink-0 ${getStatusClass(lead.status)}`}>
                        <span className="text-[9px] font-black uppercase tracking-wider">{lead.status || 'New'}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Staff Attendance */}
          <div className="bg-white rounded-2xl max-h-[30vh] p-6 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-slate-200 overflow-hidden flex flex-col">
            <div className="flex justify-between items-start mb-5 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-sm font-black text-slate-800 uppercase tracking-wide">STAFF ATTENDANCE OVERVIEW</h2>
                <p className="text-slate-500 text-xs font-medium mt-1">Tap names to toggle status for today</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-emerald-50 text-emerald-600 text-[10px] font-black px-2 py-1 rounded-md border border-emerald-100">{presentCount} Present</span>
                <span className="bg-rose-50 text-rose-600 text-[10px] font-black px-2 py-1 rounded-md border border-rose-100">{absentCount} Absent</span>
              </div>
            </div>

            <div className="overflow-y-auto flex-1 flex-wrap min-h-0">
              {/* Present Staff */}
              <div className="mb-5">
                <div className="flex items-center gap-2 text-emerald-600 mb-3">
                  <User size={14} className="stroke-[2.5]" />
                  <span className="text-xs font-black tracking-wide">PRESENT STAFF ({presentCount})</span>
                </div>
                <div className="flex flex-wrap gap-2.5">
                  {presentEmployees.map((emp) => (
                    <div 
                      key={emp.id}
                      onClick={() => toggleAttendance(emp.id)}
                      className="flex min-w-[140px] w-fit bg-emerald-50/50 hover:bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2 flex items-center gap-2 cursor-pointer transition-colors"
                    >
                      <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                      <span className="text-xs text-nowrap font-bold text-slate-700">
                        {emp.lastName ? `${emp.name} ${emp.lastName}` : emp.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Absent Staff */}
              <div>
                <div className="flex items-center gap-2 text-rose-500 mb-3">
                  <UserX size={14} className="stroke-[2.5]" />
                  <span className="text-xs font-black tracking-wide">ABSENT STAFF ({absentCount})</span>
                </div>
                <div className="flex flex-wrap gap-2.5">
                  {absentEmployees.map((emp) => (
                    <div 
                      key={emp.id}
                      onClick={() => toggleAttendance(emp.id)}
                      className="flex-1 min-w-[140px] bg-rose-50/50 hover:bg-rose-50 border border-rose-100 rounded-lg px-3 py-2 flex items-center gap-2 cursor-pointer transition-colors"
                    >
                      <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                      <span className="text-xs font-bold text-slate-700 truncate">
                        {emp.lastName ? `${emp.name} ${emp.lastName}` : emp.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

