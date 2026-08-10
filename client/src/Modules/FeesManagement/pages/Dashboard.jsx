import React, { useState } from 'react';
import { 
  Users, DollarSign, ArrowUpRight, Clock, 
  TrendingUp, Calendar, AlertCircle, RefreshCw,
  Search, Eye, Filter, ArrowRight, UserPlus, FileText
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, 
  PieChart, Pie, Cell, Legend
} from 'recharts';
import StatsCard from '../components/StatsCard';
import StatusBadge from '../components/StatusBadge';
import Loader from '../components/Loader';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import DatePicker from '../components/DatePicker';
import { useSystemSettings } from '../context/SettingsContext';
import { useDashboard } from '../hooks/useDashboard';

const Dashboard = ({ onNavigate }) => {
  const { settings } = useSystemSettings();
  
  // Date filter states
  const [filterType, setFilterType] = useState('month'); // today, week, month, year, custom
  const [customRange, setCustomRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [isApplyingCustom, setIsApplyingCustom] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Custom hook for metrics
  const {
    summary,
    charts,
    recentPayments,
    upcomingDues,
    overdueList,
    recentStudents,
    timelineActivities,
    loading,
    error,
    refetch
  } = useDashboard(filterType, customRange, isApplyingCustom);

  // Format currency
  const formatINR = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  // Helper date formatters
  const formatDate = (dateStr) => {
    if (!dateStr || dateStr === '-') return '-';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Recharts parameters & helpers
  const CHART_COLORS = ['#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#EF4444'];

  const getMonthlyChartData = () => {
    if (!charts?.monthlyCollections) return [];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return charts.monthlyCollections.map(item => ({
      name: `${months[item.month - 1]} ${String(item.year).slice(-2)}`,
      amount: item.amount
    }));
  };

  const getModeChartData = () => {
    if (!charts?.modeDistribution) return [];
    return charts.modeDistribution.map(item => ({
      name: item.mode || 'Cash',
      value: item.amount
    }));
  };

  const getPlanChartData = () => {
    if (!charts?.planDistribution) return [];
    return charts.planDistribution.map(item => ({
      name: item.plan === 'FULL_PAYMENT' ? 'Full Payment' : 'Installment',
      value: item.count
    }));
  };

  const getStatusChartData = () => {
    if (!charts?.statusDistribution) return [];
    return charts.statusDistribution.map(item => ({
      name: item.status,
      value: item.count
    }));
  };

  // Generic lists search filter
  const filterListBySearch = (list) => {
    if (!searchQuery) return list;
    const query = searchQuery.toLowerCase();
    return list.filter(item => {
      const studentName = item.studentId?.fullName || item.fullName || '';
      const studentIdStr = item.studentId?.studentId || item.studentId || '';
      const courseName = item.studentId?.course || item.course || '';
      
      return (
        studentName.toLowerCase().includes(query) ||
        studentIdStr.toLowerCase().includes(query) ||
        courseName.toLowerCase().includes(query)
      );
    });
  };

  return (
    <div className="space-y-6">
      
      {/* Top filter header panel */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 border border-[#EBEAE6] rounded-2xl shadow-sm">
        <div className="space-y-0.5">
          <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">
            {settings?.institute?.name ? `${settings.institute.name} Overview Dashboard` : 'Fees Overview Dashboard'}
          </h3>
          <p className="text-[10px] font-semibold text-slate-400">Live school account balances and transaction schedules</p>
        </div>
        
        {/* Filters and Date ranges */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Global Search */}
          <div className="relative flex-1 sm:flex-initial min-w-[200px]">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search size={14} />
            </span>
            <input
              type="text"
              placeholder="Search Student, ID, Course..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-1.5 border border-[#DEDCD8] bg-[#FAF9F6]/40 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-amber-400 transition-all"
            />
          </div>

          {/* Range Dropdown Selector */}
          <div className="flex items-center gap-2 bg-white border border-[#DEDCD8] px-3 py-1.5 rounded-xl shadow-xs text-xs font-bold text-slate-655">
            <Filter size={12} className="text-slate-400" />
            <select
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value);
                if (e.target.value !== 'custom') {
                  setIsApplyingCustom(false);
                }
              }}
              className="bg-transparent border-none outline-none cursor-pointer text-slate-700"
            >
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="year">This Year</option>
              <option value="custom">Custom Date Range</option>
            </select>
          </div>

          <button 
            onClick={refetch}
            className="p-2 border border-[#DEDCD8] bg-white text-slate-500 rounded-xl hover:bg-[#FAF9F6] transition-all cursor-pointer active:scale-95 shadow-xs shrink-0"
            title="Refresh statistics"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Custom Range picker dialog row */}
      {filterType === 'custom' && (
        <div className="bg-[#FAF9F6] border border-[#EBEAE6] p-4 rounded-2xl flex flex-wrap items-end gap-3.5 text-xs font-bold text-slate-655 animate-fade-in shadow-xs">
          <DatePicker
            label="Start Date"
            value={customRange.startDate}
            onChange={(val) => setCustomRange({ ...customRange, startDate: val })}
          />
          <DatePicker
            label="End Date"
            value={customRange.endDate}
            onChange={(val) => setCustomRange({ ...customRange, endDate: val })}
          />
          <button
            onClick={() => setIsApplyingCustom(!isApplyingCustom)}
            className="py-2 px-4 bg-amber-500 hover:bg-amber-600 text-white border-0 text-xs font-extrabold rounded-xl transition-all cursor-pointer shadow-sm active:scale-98"
          >
            Apply Date Range Filter
          </button>
        </div>
      )}

      {/* Error State Banner */}
      {error && <ErrorState message={error} onRetry={refetch} />}

      {/* Loading Skeleton / Dashboard Summary stats grid */}
      {loading && !summary ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, idx) => (
            <div key={idx} className="bg-white border border-[#EBEAE6] rounded-2xl p-4.5 shadow-sm animate-pulse space-y-2.5">
              <div className="h-2 bg-slate-100 rounded w-1/2" />
              <div className="h-6 bg-slate-100 rounded w-3/4" />
            </div>
          ))}
        </div>
      ) : (
        summary && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            <StatsCard title="Total Students" value={summary.totalStudents} icon={Users} trend="Active + Inactive" trendType="neutral" accentColor="from-blue-500 to-sky-500" />
            <StatsCard title="Active Students" value={summary.activeStudents} icon={Users} trend="Current Enrolled" trendType="up" accentColor="from-emerald-500 to-teal-500" />
            <StatsCard title="Inactive Students" value={summary.inactiveStudents} icon={Users} trend="Soft Deleted / Terminated" trendType="down" accentColor="from-slate-500 to-slate-700" />
            <StatsCard title="Total Fees" value={formatINR(summary.totalFees)} icon={DollarSign} trend="Gross Ledger" trendType="neutral" accentColor="from-indigo-500 to-purple-500" />
            <StatsCard title="Collected Fees" value={formatINR(summary.collectedFees)} icon={TrendingUp} trend="Paid Collections" trendType="up" accentColor="from-emerald-600 to-teal-600" />
            <StatsCard title="Remaining Fees" value={formatINR(summary.remainingAmount)} icon={AlertCircle} trend="Outstanding Balances" trendType="down" accentColor="from-rose-500 to-orange-500" />
            <StatsCard title="Today's Collection" value={formatINR(summary.todayCollection)} icon={RefreshCw} trend="Daily Voucher totals" trendType="up" accentColor="from-amber-500 to-yellow-500" />
            <StatsCard title="This Month Collection" value={formatINR(summary.thisMonthCollection)} icon={TrendingUp} trend="Cumulative Monthly" trendType="up" accentColor="from-violet-500 to-fuchsia-500" />
            <StatsCard title="Pending Installments" value={summary.pendingInstallments} icon={Clock} trend="Scheduled rows left" trendType="neutral" accentColor="from-amber-400 to-orange-400" />
            <StatsCard title="Overdue Installments" value={summary.overdueInstallments} icon={AlertCircle} trend="Overdue Alert logs" trendType="down" accentColor="from-rose-600 to-red-655" />
            <StatsCard title="Upcoming Due (7 Days)" value={summary.upcomingDue7Days} icon={Calendar} trend="Upcoming commitments" trendType="neutral" accentColor="from-sky-500 to-indigo-500" />
            <StatsCard title="Total Receipts" value={summary.totalReceipts} icon={FileText} trend="Generated RCP indexes" trendType="up" accentColor="from-teal-400 to-emerald-500" />
          </div>
        )
      )}

      {/* Graphic charts section (Grid 2/3 and 1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Monthly Collection Trend Bar Chart (Spans 2/3) */}
        <div className="lg:col-span-2 bg-white border border-[#EBEAE6] rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#FAF9F6] pb-2">
            <div className="space-y-0.5">
              <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Monthly Collections</h3>
              <p className="text-[10px] text-slate-400 font-semibold font-sans">Payment collections comparison for past 12 months</p>
            </div>
            <span className="text-[9px] font-bold uppercase bg-amber-500/10 border border-amber-500/20 text-amber-500 px-2 py-0.5 rounded-lg">Last 12 Months</span>
          </div>

          <div className="h-64 w-full text-xs">
            {loading && !charts ? (
              <Loader inline message="Loading collections chart..." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={getMonthlyChartData()} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="#94A3B8" fontSize={9} fontStyle="bold" tickLine={false} />
                  <YAxis stroke="#94A3B8" fontSize={9} fontStyle="bold" tickLine={false} tickFormatter={(v) => `₹${v/1000}k`} />
                  <Tooltip formatter={(value) => [formatINR(value), 'Collected Amount']} contentStyle={{ fontSize: '11px', borderRadius: '12px', border: '1px solid #E2E8F0' }} />
                  <Bar dataKey="amount" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Payment Mode Pie Chart Distribution (Spans 1/3) */}
        <div className="bg-white border border-[#EBEAE6] rounded-2xl p-5 shadow-sm space-y-4">
          <div className="space-y-0.5 border-b border-[#FAF9F6] pb-2">
            <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Payment Mode Share</h3>
            <p className="text-[10px] text-slate-400 font-semibold font-sans">Gross receipts distributed by billing mode</p>
          </div>

          <div className="h-48 w-full text-xs relative">
            {loading && !charts ? (
              <Loader inline message="Loading mode chart..." />
            ) : getModeChartData().length === 0 ? (
              <EmptyState title="No shares recorded" message="No receipts have been processed for the modes chart." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={getModeChartData()}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {getModeChartData().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => formatINR(v)} />
                  <Legend verticalAlign="bottom" height={36} iconSize={8} iconType="circle" wrapperStyle={{ fontSize: '9px', fontWeight: 'bold' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Payment Plan splits Doughnut Chart (1/3) */}
        <div className="bg-white border border-[#EBEAE6] rounded-2xl p-5 shadow-sm space-y-4">
          <div className="space-y-0.5 border-b border-[#FAF9F6] pb-2">
            <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Payment Plan Splits</h3>
            <p className="text-[10px] text-slate-400 font-semibold">Active student payment plan distribution</p>
          </div>

          <div className="h-48 w-full text-xs">
            {loading && !charts ? (
              <Loader inline message="Loading plan chart..." />
            ) : getPlanChartData().length === 0 ? (
              <EmptyState title="No plan shares" message="Plan data details unavailable." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={getPlanChartData()}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={65}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    <Cell fill="#10B981" />
                    <Cell fill="#3B82F6" />
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" iconSize={8} wrapperStyle={{ fontSize: '9px', fontWeight: 'bold' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Fees Status Distribution Chart (1/3) */}
        <div className="bg-white border border-[#EBEAE6] rounded-2xl p-5 shadow-sm space-y-4">
          <div className="space-y-0.5 border-b border-[#FAF9F6] pb-2">
            <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Overall Fee Status</h3>
            <p className="text-[10px] text-slate-400 font-semibold">Classification of all active student fee plans</p>
          </div>

          <div className="h-48 w-full text-xs">
            {loading && !charts ? (
              <Loader inline message="Loading status chart..." />
            ) : getStatusChartData().length === 0 ? (
              <EmptyState title="No status splits" message="Status breakdown unavailable." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={getStatusChartData()}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={65}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {getStatusChartData().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[(index + 2) % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" iconSize={8} wrapperStyle={{ fontSize: '9px', fontWeight: 'bold' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

      </div>

      {/* Lists & timelines grids */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Left Column tables list (Spans 2/3) */}
        <div className="xl:col-span-2 space-y-6">
          
          {/* Overdue Students Table */}
          <div className="bg-white border border-[#EBEAE6] rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-[#FAF9F6] pb-2">
              <div className="space-y-0.5">
                <h4 className="text-xs font-extrabold text-red-500 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertCircle size={14} />
                  <span>Overdue Accounts Register</span>
                </h4>
                <p className="text-[10px] text-slate-400 font-semibold font-sans">Active student accounts with past-due billing structures</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs font-semibold text-slate-655">
                <thead>
                  <tr className="border-b border-[#EBEAE6] text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                    <th className="pb-3">Student Name</th>
                    <th className="pb-3">Course</th>
                    <th className="pb-3">Installment No</th>
                    <th className="pb-3">Due Date</th>
                    <th className="pb-3 text-right">Overdue Amount</th>
                    <th className="pb-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#FAF9F6]">
                  {filterListBySearch(overdueList).map((over) => (
                    <tr key={over._id} className="hover:bg-rose-50/20 transition-colors">
                      <td className="py-3 font-bold text-slate-800">
                        {over.studentId?.fullName} <span className="font-mono text-[9px] text-slate-400 block">{over.studentId?.studentId}</span>
                      </td>
                      <td className="py-3 text-slate-650">{over.studentId?.course}</td>
                      <td className="py-3">
                        <span className="px-1.5 py-0.5 rounded-md bg-rose-50 border border-rose-100 text-[10px] text-brand-red font-bold">Inst #{over.installmentNo}</span>
                      </td>
                      <td className="py-3 text-slate-500">{formatDate(over.dueDate)}</td>
                      <td className="py-3 text-brand-red font-extrabold text-right">{formatINR(over.remainingAmount)}</td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => onNavigate(`student-profile?studentId=${over.studentId?._id || over.studentId}`)}
                          className="p-1.5 border border-[#DEDCD8] bg-white hover:bg-[#FAF9F6] text-slate-650 rounded-lg transition-all cursor-pointer shadow-xs active:scale-95 inline-flex"
                          title="View Profile Details"
                        >
                          <Eye size={12} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {overdueList.length === 0 && (
                    <tr>
                      <td colSpan="6" className="py-8 text-center text-slate-400 font-bold text-[11px]">No overdue accounts found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Upcoming Due List */}
          <div className="bg-white border border-[#EBEAE6] rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-[#FAF9F6] pb-2">
              <div className="space-y-0.5">
                <h4 className="text-xs font-extrabold text-amber-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar size={14} />
                  <span>Upcoming Due Collections (7 Days)</span>
                </h4>
                <p className="text-[10px] text-slate-400 font-semibold font-sans">Payment collections expected within next 7 days</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs font-semibold text-slate-655">
                <thead>
                  <tr className="border-b border-[#EBEAE6] text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                    <th className="pb-3">Student Name</th>
                    <th className="pb-3">Course</th>
                    <th className="pb-3">Installment No</th>
                    <th className="pb-3">Due Date</th>
                    <th className="pb-3 text-right">Expected Amount</th>
                    <th className="pb-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#FAF9F6]">
                  {filterListBySearch(upcomingDues).map((upc) => (
                    <tr key={upc._id} className="hover:bg-amber-50/20 transition-colors">
                      <td className="py-3 font-bold text-slate-800">
                        {upc.studentId?.fullName} <span className="font-mono text-[9px] text-slate-400 block">{upc.studentId?.studentId}</span>
                      </td>
                      <td className="py-3 text-slate-650">{upc.studentId?.course}</td>
                      <td className="py-3">
                        <span className="px-1.5 py-0.5 rounded-md bg-amber-50 border border-amber-100 text-[10px] text-amber-600 font-bold">Inst #{upc.installmentNo}</span>
                      </td>
                      <td className="py-3 text-slate-500">{formatDate(upc.dueDate)}</td>
                      <td className="py-3 text-slate-800 font-extrabold text-right">{formatINR(upc.remainingAmount)}</td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => onNavigate(`student-profile?studentId=${upc.studentId?._id || upc.studentId}`)}
                          className="p-1.5 border border-[#DEDCD8] bg-white hover:bg-[#FAF9F6] text-slate-650 rounded-lg transition-all cursor-pointer shadow-xs active:scale-95 inline-flex"
                          title="View Profile Details"
                        >
                          <Eye size={12} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {upcomingDues.length === 0 && (
                    <tr>
                      <td colSpan="6" className="py-8 text-center text-slate-400 font-bold text-[11px]">No upcoming due fees found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Payments Received Table */}
          <div className="bg-white border border-[#EBEAE6] rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-[#FAF9F6] pb-2">
              <div className="space-y-0.5">
                <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingUp size={14} className="text-emerald-500" />
                  <span>Recent Payments Collected Registry</span>
                </h4>
                <p className="text-[10px] text-slate-400 font-semibold font-sans">Latest fee collections synced across all course divisions</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs font-semibold text-slate-655">
                <thead>
                  <tr className="border-b border-[#EBEAE6] text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                    <th className="pb-3">Student Name</th>
                    <th className="pb-3">Course</th>
                    <th className="pb-3">Payment Date</th>
                    <th className="pb-3">Type</th>
                    <th className="pb-3">Mode</th>
                    <th className="pb-3 text-right">Amount Paid</th>
                    <th className="pb-3 text-right">Status</th>
                    <th className="pb-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#FAF9F6]">
                  {filterListBySearch(recentPayments).map((pay) => (
                    <tr key={pay._id} className="hover:bg-[#FAF9F6]/20 transition-colors">
                      <td className="py-3 font-bold text-slate-800">
                        {pay.studentId?.fullName} <span className="font-mono text-[9px] text-slate-400 block">{pay.studentId?.studentId}</span>
                      </td>
                      <td className="py-3 text-slate-650">{pay.studentId?.course}</td>
                      <td className="py-3 text-slate-500">{formatDate(pay.paymentDate)}</td>
                      <td className="py-3">
                        <span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{pay.paymentType}</span>
                      </td>
                      <td className="py-3 text-slate-600 font-bold">{pay.paymentMode}</td>
                      <td className="py-3 text-emerald-650 font-extrabold text-right">{formatINR(pay.amount)}</td>
                      <td className="py-3 text-right">
                        <StatusBadge status="PAID" />
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => onNavigate(`student-profile?studentId=${pay.studentId?._id || pay.studentId}`)}
                          className="p-1.5 border border-[#DEDCD8] bg-white hover:bg-[#FAF9F6] text-slate-600 rounded-lg transition-all cursor-pointer shadow-xs active:scale-95 inline-flex"
                          title="View Ledger Profile"
                        >
                          <Eye size={12} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {recentPayments.length === 0 && (
                    <tr>
                      <td colSpan="8" className="py-8 text-center text-slate-400 font-bold text-[11px]">No transactions collected yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Enrolled Students (Latest 10 Admissions) */}
          <div className="bg-white border border-[#EBEAE6] rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-[#FAF9F6] pb-2">
              <div className="space-y-0.5">
                <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <UserPlus size={14} className="text-sky-500" />
                  <span>Recent Enrolled Student Registry</span>
                </h4>
                <p className="text-[10px] text-slate-400 font-semibold font-sans">Latest 10 admissions registered in Fees database</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs font-semibold text-slate-655">
                <thead>
                  <tr className="border-b border-[#EBEAE6] text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                    <th className="pb-3">Student Name</th>
                    <th className="pb-3">Course</th>
                    <th className="pb-3">Contact info</th>
                    <th className="pb-3">Admission Date</th>
                    <th className="pb-3 text-right">Remaining Balance</th>
                    <th className="pb-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#FAF9F6]">
                  {filterListBySearch(recentStudents).map((stu) => (
                    <tr key={stu._id} className="hover:bg-[#FAF9F6]/20 transition-colors">
                      <td className="py-3 font-bold text-slate-800">
                        {stu.fullName} <span className="font-mono text-[9px] text-slate-450 block">{stu.studentId}</span>
                      </td>
                      <td className="py-3 text-slate-650">{stu.course}</td>
                      <td className="py-3 text-slate-500">
                        <div>{stu.mobile}</div>
                        <div className="text-[9px] text-slate-400 font-medium">{stu.email}</div>
                      </td>
                      <td className="py-3 text-slate-500">{formatDate(stu.createdAt)}</td>
                      <td className="py-3 text-rose-600 font-extrabold text-right">{formatINR(stu.feePlan?.remainingAmount)}</td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => onNavigate(`student-profile?studentId=${stu._id}`)}
                          className="p-1.5 border border-[#DEDCD8] bg-white hover:bg-[#FAF9F6] text-slate-650 rounded-lg transition-all cursor-pointer shadow-xs active:scale-95 inline-flex"
                          title="View Ledger Profile"
                        >
                          <Eye size={12} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {recentStudents.length === 0 && (
                    <tr>
                      <td colSpan="6" className="py-8 text-center text-slate-400 font-bold text-[11px]">No students enrolled yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Right Column: Timeline activities (Spans 1/3) */}
        <div className="space-y-6 lg:col-span-1">
          
          <div className="bg-white border border-[#EBEAE6] rounded-2xl p-5 shadow-sm space-y-5">
            <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider pb-2 border-b border-[#FAF9F6] flex items-center gap-1.5">
              <Clock size={14} className="text-slate-450" />
              <span>ERP Audited Activities Timeline</span>
            </h4>
            
            <div className="relative pl-6 border-l border-slate-100 space-y-6 max-h-[700px] overflow-y-auto pr-1">
              {timelineActivities.map((log, idx) => {
                let badgeColor = 'bg-slate-50 text-slate-600 border-slate-200';
                if (log.action.includes('PAYMENT') || log.action.includes('PAID')) {
                  badgeColor = 'bg-emerald-50 text-emerald-600 border-emerald-100';
                } else if (log.action.includes('ADDED') || log.action.includes('CREATE')) {
                  badgeColor = 'bg-blue-50 text-blue-600 border-blue-100';
                } else if (log.action.includes('UPDATE')) {
                  badgeColor = 'bg-amber-50 text-amber-600 border-amber-100';
                }

                return (
                  <div key={log._id || idx} className="relative">
                    {/* Bullet */}
                    <div className="absolute -left-[30px] top-1.5 w-2 h-2 rounded-full bg-slate-300 border-2 border-white ring-4 ring-slate-100" />
                    
                    <div className="space-y-1 text-xs">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={`px-2 py-0.5 rounded text-[8px] font-extrabold tracking-wide uppercase border ${badgeColor}`}>
                          {log.action}
                        </span>
                        <span className="text-[9px] text-slate-400 font-semibold font-mono">
                          {formatDate(log.createdAt)}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-700 font-semibold leading-normal">{log.description}</p>
                      
                      {log.studentId && (
                        <button
                          onClick={() => onNavigate(`student-profile?studentId=${log.studentId?._id || log.studentId}`)}
                          className="text-[9px] font-bold text-amber-600 hover:text-amber-700 flex items-center gap-0.5 cursor-pointer bg-transparent border-0 outline-none hover:underline"
                        >
                          <span>{log.studentId?.fullName} ({log.studentId?.studentId})</span>
                          <ArrowRight size={8} />
                        </button>
                      )}
                      
                      <p className="text-[9px] text-slate-400 font-medium">Operator: <span className="font-bold text-slate-500">{log.performedBy?.name || 'System Routine'}</span></p>
                    </div>
                  </div>
                );
              })}

              {timelineActivities.length === 0 && (
                <div className="text-center py-10 text-slate-400 font-bold text-[11px]">No activity timeline tracked.</div>
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};

export default Dashboard;
