import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Check, X, ShieldAlert, Sparkles, 
  Calendar, Users, Clock, Search, Plus, User, AlertCircle, Edit2, FileSpreadsheet, Trash2
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { adminAttendanceApi } from '../../../api/adminAttendanceApi';
import Card from '../../../components/Card';
import Button from '../../../components/Button';
import { formatDate } from '../../../utils/dateUtils';
import DatePicker from '../../FeesManagement/components/DatePicker';

export default function Attendance() {
  const navigate = useNavigate();
  
  // Dashboard Core Data
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [dailySummary, setDailySummary] = useState([]);
  const [activeEmployees, setActiveEmployees] = useState([]);
  const [chartStats, setChartStats] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' or 'all_employees'
  
  // UI States
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Right Sidebar Filter Tab: 'logged_in' (all present/late), 'on_time', 'late'
  const [sidebarTab, setSidebarTab] = useState('logged_in');
  const [searchQuery, setSearchQuery] = useState('');

  // Add Profile Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [formName, setFormName] = useState('');
  const [formLastName, setFormLastName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formDepartment, setFormDepartment] = useState('');
  const [formDesignation, setFormDesignation] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formError, setFormError] = useState('');

  // Edit Profile Modal States
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEmployeeId, setEditingEmployeeId] = useState('');
  const [editFormName, setEditFormName] = useState('');
  const [editFormLastName, setEditFormLastName] = useState('');
  const [editFormEmail, setEditFormEmail] = useState('');
  const [editFormPhone, setEditFormPhone] = useState('');
  const [editFormDepartment, setEditFormDepartment] = useState('');
  const [editFormDesignation, setEditFormDesignation] = useState('');
  const [editFormPassword, setEditFormPassword] = useState('');
  const [editFormProfilePicture, setEditFormProfilePicture] = useState('');
  const [editFormError, setEditFormError] = useState('');

  const fetchData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError('');
      
      const [pendingRes, summaryRes, activeRes, statsRes, leavesRes] = await Promise.all([
        adminAttendanceApi.getPendingApprovals(),
        adminAttendanceApi.getDailySummary(),
        adminAttendanceApi.getActiveEmployees(),
        adminAttendanceApi.getAttendanceStats(),
        adminAttendanceApi.getAllLeaves()
      ]);
      
      if (pendingRes.success) setPendingApprovals(pendingRes.pending || []);
      if (summaryRes.success) setDailySummary(summaryRes.summary || []);
      if (activeRes.success) setActiveEmployees(activeRes.employees || []);
      if (statsRes.success) setChartStats(statsRes.stats || []);
      if (leavesRes && leavesRes.success) setLeaveRequests(leavesRes.leaves || []);
    } catch (err) {
      if (!silent) {
        console.error('Failed to fetch attendance dashboard data:', err);
        const errMsg = err.response?.data?.message || err.message || 'Failed to sync attendance logbooks with server.';
        setError(`Failed to sync attendance logbooks: ${errMsg}`);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Auto-refresh in background every 8 seconds for real-time live updates without manual reload
    const interval = setInterval(() => {
      fetchData(true);
    }, 8000);

    const onFocus = () => {
      fetchData(true);
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, []);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        setSuccess('');
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const handleApprove = async (id) => {
    setActionLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await adminAttendanceApi.approveEmployee(id);
      if (res.success) {
        setSuccess('Employee registration approved.');
        await fetchData();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to approve employee.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (id) => {
    if (!window.confirm('Are you sure you want to remove this employee profile?')) return;
    setActionLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await adminAttendanceApi.rejectEmployee(id);
      if (res.success) {
        setSuccess('Employee profile removed successfully.');
        await fetchData();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to remove employee.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStatusChange = async (id, status) => {
    setActionLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await adminAttendanceApi.updateEmployeeStatus(id, status);
      if (res.success) {
        setSuccess(`Employee status updated to ${status}.`);
        await fetchData();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update employee status.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApproveLeave = async (id) => {
    setActionLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await adminAttendanceApi.updateLeaveStatus(id, 'Approved');
      if (res.success) {
        setSuccess('Leave request approved successfully.');
        await fetchData();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to approve leave request.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectLeave = async (id) => {
    if (!window.confirm('Are you sure you want to reject this leave request?')) return;
    setActionLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await adminAttendanceApi.updateLeaveStatus(id, 'Rejected');
      if (res.success) {
        setSuccess('Leave request rejected successfully.');
        await fetchData();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reject leave request.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateEmployee = async (e) => {
    e.preventDefault();
    setFormError('');
    setActionLoading(true);
    try {
      const res = await adminAttendanceApi.createEmployee({
        name: formName,
        lastName: formLastName,
        email: formEmail,
        phone: formPhone,
        department: formDepartment,
        designation: formDesignation,
        password: formPassword
      });
      if (res.success) {
        setSuccess('New employee profile added successfully.');
        setShowAddModal(false);
        // Clear form
        setFormName('');
        setFormLastName('');
        setFormEmail('');
        setFormPhone('');
        setFormDepartment('');
        setFormDesignation('');
        setFormPassword('');
        await fetchData();
      }
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to create employee profile.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenEditModal = (emp) => {
    setEditingEmployeeId(emp._id || emp.id);
    setEditFormName(emp.name || '');
    setEditFormLastName(emp.lastName || '');
    setEditFormEmail(emp.email || '');
    setEditFormPhone(emp.phone || '');
    setEditFormDepartment(emp.department || '');
    setEditFormDesignation(emp.designation || '');
    setEditFormProfilePicture(emp.profilePicture || '');
    setEditFormPassword('');
    setEditFormError('');
    setShowEditModal(true);
  };

  const handleUpdateEmployee = async (e) => {
    e.preventDefault();
    setEditFormError('');
    setActionLoading(true);
    try {
      const res = await adminAttendanceApi.updateEmployee(editingEmployeeId, {
        name: editFormName,
        lastName: editFormLastName,
        email: editFormEmail,
        phone: editFormPhone,
        department: editFormDepartment,
        designation: editFormDesignation,
        profilePicture: editFormProfilePicture,
        password: editFormPassword || undefined
      });
      if (res.success) {
        setSuccess('Employee profile updated successfully.');
        setShowEditModal(false);
        await fetchData();
      }
    } catch (err) {
      setEditFormError(err.response?.data?.message || 'Failed to update employee profile.');
    } finally {
      setActionLoading(false);
    }
  };

  // Monthly Reports States
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportEmployeeId, setReportEmployeeId] = useState('');
  const [selectedReportMonthKey, setSelectedReportMonthKey] = useState('');
  const [reportData, setReportData] = useState([]);
  const [reportEmployeeInfo, setReportEmployeeInfo] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState('');

  // Dynamically compute the last 3 months list, going back only to dateOfJoining
  const reportMonthsList = useMemo(() => {
    const list = [];
    const today = new Date();
    
    // Determine joining date limit
    const joiningDate = reportEmployeeInfo?.dateOfJoining ? new Date(reportEmployeeInfo.dateOfJoining) : new Date();
    // Normalize joiningDate to the 1st of its month to allow selecting that entire month
    const joiningMonthStart = new Date(joiningDate.getFullYear(), joiningDate.getMonth(), 1);

    for (let i = 0; i < 3; i++) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      
      // Stop adding past months if we go earlier than the joining month
      if (d < joiningMonthStart) {
        break;
      }

      const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      list.push({
        label,
        year: d.getFullYear(),
        month: d.getMonth() + 1, // 1-indexed
        key: `${d.getFullYear()}-${d.getMonth() + 1}`
      });
    }
    return list;
  }, [reportEmployeeInfo?.dateOfJoining]);

  // Fetch monthly report
  const fetchMonthlyReport = async () => {
    if (!reportEmployeeId || !selectedReportMonthKey) return;
    const selected = reportMonthsList.find(m => m.key === selectedReportMonthKey);
    if (!selected) return;

    try {
      setReportLoading(true);
      setReportError('');
      const res = await adminAttendanceApi.getMonthlyReport(reportEmployeeId, selected.year, selected.month);
      if (res.success) {
        setReportData(res.report || []);
        setReportEmployeeInfo(prev => ({ ...prev, ...res.employee }));
      }
    } catch (err) {
      console.error('Failed to load monthly report:', err);
      setReportError('Failed to fetch monthly report.');
    } finally {
      setReportLoading(false);
    }
  };

  const handleOpenReportModal = (emp) => {
    const empId = emp._id || emp.id;
    if (empId) {
      setReportEmployeeId(empId);
      // Auto-set profile info locally for immediate fallback rendering before server call finishes
      setReportEmployeeInfo({
        name: emp.name,
        lastName: emp.lastName,
        department: emp.department,
        designation: emp.designation,
        profilePicture: emp.profilePicture,
        dateOfJoining: emp.dateOfJoining || emp.createdAt || new Date()
      });
      setShowReportModal(true);
    }
  };

  // Holiday Declaration States
  const [showHolidayModal, setShowHolidayModal] = useState(false);
  const [holidayDate, setHolidayDate] = useState(new Date().toISOString().split('T')[0]);
  const [holidayReason, setHolidayReason] = useState('');
  const [holidayLoading, setHolidayLoading] = useState(false);
  const [holidayError, setHolidayError] = useState('');
  const [holidaySuccess, setHolidaySuccess] = useState('');

  const [holidaysList, setHolidaysList] = useState([]);
  const [holidayActiveTab, setHolidayActiveTab] = useState('declare');
  const [editingHolidayId, setEditingHolidayId] = useState(null);
  const [editingDate, setEditingDate] = useState('');
  const [editingReason, setEditingReason] = useState('');

  const fetchHolidaysList = async () => {
    try {
      const res = await adminAttendanceApi.getHolidays();
      if (res.success) {
        setHolidaysList(res.holidays || []);
      }
    } catch (err) {
      console.error('Failed to fetch holidays:', err);
    }
  };

  const handleUpdateHoliday = async (id) => {
    if (!editingDate || !editingReason) return;
    try {
      setHolidayLoading(true);
      setHolidayError('');
      setHolidaySuccess('');
      const res = await adminAttendanceApi.updateHoliday(id, {
        date: editingDate,
        reason: editingReason
      });
      if (res.success) {
        setHolidaySuccess('Holiday details updated successfully.');
        setEditingHolidayId(null);
        fetchHolidaysList();
        if (typeof fetchData === 'function') {
          fetchData();
        }
      }
    } catch (err) {
      console.error('Failed to update holiday:', err);
      setHolidayError(err.response?.data?.message || 'Failed to update holiday.');
    } finally {
      setHolidayLoading(false);
    }
  };

  const handleDeleteHoliday = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this holiday? All corresponding holiday attendance records will be removed.')) return;
    try {
      setHolidayLoading(true);
      setHolidayError('');
      setHolidaySuccess('');
      const res = await adminAttendanceApi.deleteHoliday(id);
      if (res.success) {
        setHolidaySuccess('Holiday successfully deleted.');
        fetchHolidaysList();
        if (typeof fetchData === 'function') {
          fetchData();
        }
      }
    } catch (err) {
      console.error('Failed to delete holiday:', err);
      setHolidayError(err.response?.data?.message || 'Failed to delete holiday.');
    } finally {
      setHolidayLoading(false);
    }
  };

  const handleSaveHoliday = async (e) => {
    e.preventDefault();
    if (!holidayDate) return;
    try {
      setHolidayLoading(true);
      setHolidayError('');
      setHolidaySuccess('');
      const res = await adminAttendanceApi.markHoliday({
        date: holidayDate,
        reason: holidayReason
      });
      if (res.success) {
        setHolidaySuccess(res.message);
        setHolidayReason('');
        fetchHolidaysList();
        
        // Refresh daily lists on current page to reflect new holiday records
        if (typeof fetchData === 'function') {
          fetchData();
        } else {
          window.location.reload();
        }

        setTimeout(() => {
          setShowHolidayModal(false);
          setHolidaySuccess('');
        }, 1500);
      }
    } catch (err) {
      console.error('Failed to mark holiday:', err);
      setHolidayError(err.response?.data?.message || 'Failed to mark holiday.');
    } finally {
      setHolidayLoading(false);
    }
  };

  // Auto-select initial month key
  useEffect(() => {
    if (reportMonthsList.length > 0 && !selectedReportMonthKey) {
      setSelectedReportMonthKey(reportMonthsList[0].key);
    }
  }, [reportMonthsList, selectedReportMonthKey]);

  // Trigger report fetch when modal opens or configurations change
  useEffect(() => {
    if (showReportModal && reportEmployeeId && selectedReportMonthKey) {
      fetchMonthlyReport();
    }
  }, [showReportModal, reportEmployeeId, selectedReportMonthKey]);

  // Compute statistics from report data
  const reportStats = useMemo(() => {
    let presents = 0;
    let lates = 0;
    let absents = 0;
    let leaves = 0;
    let weekends = 0;
    let holidays = 0;
    let halfDays = 0;

    reportData.forEach(day => {
      if (day.status === 'Present') presents++;
      else if (day.status === 'Late') lates++;
      else if (day.status === 'Absent') absents++;
      else if (day.status === 'Leave') leaves++;
      else if (day.status === 'Weekend') weekends++;
      else if (day.status === 'Holiday') holidays++;
      else if (day.status === 'Half Day') halfDays++;
    });

    return { presents, lates, absents, leaves, weekends, holidays, halfDays };
  }, [reportData]);

  // Export to Excel
  const handleExportExcel = () => {
    if (reportData.length === 0 || !reportEmployeeInfo) return;
    const selected = reportMonthsList.find(m => m.key === selectedReportMonthKey);
    const monthLabel = selected ? selected.label : 'Report';

    // Format data rows
    const dataRows = reportData.map(day => ({
      'Date': formatDate(day.date),
      'Day': day.dayOfWeek,
      'Status': day.status,
      'Check-In': day.checkIn,
      'Check-Out': day.checkOut,
      'Remarks': day.remarks
    }));

    // Generate Sheet
    const worksheet = XLSX.utils.json_to_sheet(dataRows);

    // Set auto widths
    const max_len = [15, 12, 10, 10, 10, 25];
    worksheet['!cols'] = max_len.map(w => ({ wch: w }));

    // Create Book
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance Report');

    // Download
    const fileName = `${reportEmployeeInfo.name}_${reportEmployeeInfo.lastName}_Attendance_${monthLabel.replace(' ', '_')}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  // Filter right sidebar scrollable log
  const filteredSidebarLogs = useMemo(() => {
    return dailySummary.filter(log => {
      // 1. Status Filter
      if (sidebarTab === 'on_time' && log.status !== 'Present') return false;
      if (sidebarTab === 'late' && log.status !== 'Late') return false;
      if (sidebarTab === 'logged_in' && log.status !== 'Present' && log.status !== 'Late' && log.status !== 'Half Day') return false;
      
      // 2. Search Query
      const query = searchQuery.toLowerCase().trim();
      if (query) {
        const lastNameVal = log.lastName || '';
        const matchName = `${log.name} ${lastNameVal}`.toLowerCase().includes(query);
        const matchDept = log.department.toLowerCase().includes(query);
        return matchName || matchDept;
      }
      return true;
    });
  }, [dailySummary, sidebarTab, searchQuery]);

  // Sidebar counters
  const counters = useMemo(() => {
    const totalActive = activeEmployees.length;
    const loggedInCount = dailySummary.filter(d => d.status === 'Present' || d.status === 'Late' || d.status === 'Half Day').length;
    const onTimeCount = dailySummary.filter(d => d.status === 'Present').length;
    const lateCount = dailySummary.filter(d => d.status === 'Late').length;
    
    return {
      active: totalActive,
      loggedIn: loggedInCount,
      onTime: onTimeCount,
      late: lateCount
    };
  }, [activeEmployees, dailySummary]);

  // Maximum value for bar chart heights scaling
  const chartMaxScale = useMemo(() => {
    if (chartStats.length === 0) return 120;
    const maxVal = Math.max(...chartStats.map(s => Math.max(s.onTime, s.late)));
    return maxVal > 0 ? maxVal * 1.2 : 120;
  }, [chartStats]);

  const formatTime = (timeStr) => {
    if (!timeStr || timeStr === '-') return '-';
    if (timeStr.includes(':')) {
      const [h, m] = timeStr.split(':');
      const hours = parseInt(h);
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      return `${displayHours.toString().padStart(2, '0')}:${m} ${ampm}`;
    }
    return timeStr;
  };

  return (
    <div className="space-y-8 animate-fade-in text-slate-800 font-sans pb-10">
      
      {/* Premium Sub-Header exactly like the mockup */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-5 border-b border-[#E3E1DC]">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/dashboard')} 
            className="p-2.5 rounded-full hover:bg-slate-100 transition-colors text-slate-650 hover:text-slate-850 border border-slate-200 cursor-pointer shadow-sm flex items-center justify-center bg-white"
            title="Back"
          >
            <ArrowLeft size={18} />
          </button>
          
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Attendance</h1>
              <div className="flex items-center gap-1.5 text-xs text-slate-600 font-bold bg-[#FAF9F6] border border-[#E8E6E1] py-1.5 px-3 rounded-lg shadow-sm cursor-pointer hover:bg-slate-50 transition-colors">
                <Calendar size={14} className="text-slate-400" />
                <span>{formatDate(new Date())}</span>
              </div>
            </div>
            <p className="text-xs text-slate-500 font-bold tracking-wide uppercase">Corporate Attendance Control Panel</p>
          </div>
        </div>

        {/* Shift timing display */}
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end hidden sm:flex bg-[#FAF9F6] border border-[#E8E6E1] py-2 px-4 rounded-xl shadow-xs">
            <span className="text-[10px] text-slate-500 font-bold tracking-wider uppercase">Office Timings</span>
            <span className="text-sm font-extrabold text-slate-800 mt-0.5">10:00 AM to 06:00 PM</span>
          </div>
          <button
            onClick={() => {
              setShowHolidayModal(true);
              fetchHolidaysList();
            }}
            className="py-2.5 px-4 bg-[#E31C1C] hover:bg-[#b81414] text-white rounded-xl text-xs font-bold transition-all cursor-pointer border-0 active:scale-95 shadow-sm flex items-center gap-1.5"
            title="Declare Holiday"
          >
            <Calendar size={14} />
            <span>Mark Holiday</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-100 text-brand-red text-xs font-bold p-3.5 rounded-2xl animate-fade-in flex items-center gap-2">
          <ShieldAlert size={15} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-emerald-50 border border-emerald-100 text-emerald-600 text-xs font-bold p-3.5 rounded-2xl animate-fade-in flex items-center gap-2">
          <Check size={15} style={{ color: '#10b981' }} />
          <span>{success}</span>
        </div>
      )}

      {loading ? (
        <Card className="py-32 text-center text-slate-450 bg-white border border-[#E8E6E1] rounded-3xl">
          <div className="w-8 h-8 rounded-full border-2 border-slate-200 border-t-[#E31C1C] animate-spin mx-auto mb-3" />
          <p className="text-xs font-semibold">Synchronizing Dashboard Modules...</p>
        </Card>
      ) : (
        /* Main Layout Grid matching the screenshot */
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          
          {/* LEFT 3 COLUMNS: Chart, Approvals, Profile Quick Card */}
          <div className="lg:col-span-3 space-y-6">
            
            {/* 1. Bar Chart Card */}
            <Card className="bg-white border border-[#E8E6E1] rounded-3xl p-6 shadow-xs">
              <div className="flex items-center justify-between pb-4 border-b border-[#FAF9F6]">
                <div className="space-y-1">
                  <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide">Attendance Status</h3>
                  <p className="text-xs text-slate-500 font-semibold">Past 10 days present ratios</p>
                </div>

                <div className="flex items-center gap-2">
                  <select className="text-xs font-bold text-slate-600 border border-[#DEDCD8] bg-white rounded-lg px-2.5 py-1.5 outline-none cursor-pointer hover:border-slate-400 transition-colors">
                    <option>All Departments</option>
                  </select>
                  <select className="text-xs font-bold text-slate-600 border border-[#DEDCD8] bg-white rounded-lg px-2.5 py-1.5 outline-none cursor-pointer hover:border-slate-400 transition-colors">
                    <option>Current Month</option>
                  </select>
                  <select className="text-xs font-bold text-slate-600 border border-[#DEDCD8] bg-white rounded-lg px-2.5 py-1.5 outline-none cursor-pointer hover:border-slate-400 transition-colors">
                    <option>2026</option>
                  </select>
                </div>
              </div>

              {/* Chart Legend */}
              <div className="flex justify-end gap-4 py-3 text-xs font-bold">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-brand-red inline-block" />
                  <span className="text-slate-600">On-time</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-[#fca5a5] inline-block" />
                  <span className="text-slate-600">Late</span>
                </div>
              </div>

              {/* Chart Plot Area */}
              <div className="relative pt-6 pb-2 h-68 flex">
                
                {/* Y-Axis Labels */}
                <div className="w-10 flex flex-col justify-between text-xs font-bold text-slate-500 pr-2.5 pb-6 text-right select-none h-full">
                  <span>100</span>
                  <span>75</span>
                  <span>50</span>
                  <span>25</span>
                  <span>0</span>
                </div>

                {/* Bars Plot */}
                <div className="flex-1 border-b border-l border-slate-100 relative h-full flex justify-between items-end px-4 pb-6">
                  {/* Grid Lines */}
                  <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-6">
                    <div className="w-full border-t border-slate-100" />
                    <div className="w-full border-t border-slate-100" />
                    <div className="w-full border-t border-slate-100" />
                    <div className="w-full border-t border-slate-100" />
                    <div className="w-full" />
                  </div>

                  {chartStats.map((item, idx) => {
                    const onTimeHeight = `${Math.min(100, (item.onTime / chartMaxScale) * 100)}%`;
                    const lateHeight = `${Math.min(100, (item.late / chartMaxScale) * 100)}%`;

                    return (
                      <div key={idx} className="flex flex-col items-center gap-2 group relative z-10 w-8">
                        {/* Rod Group */}
                        <div className="flex items-end gap-1.5 h-44 w-full justify-center">
                          {/* On-Time Rod */}
                          <div 
                            style={{ height: onTimeHeight }}
                            className="w-2.5 bg-brand-red rounded-t-sm transition-all duration-500 group-hover:brightness-95 relative"
                            title={`On-time: ${item.onTime}`}
                          />
                          {/* Late Rod */}
                          <div 
                            style={{ height: lateHeight }}
                            className="w-2.5 bg-[#fca5a5] rounded-t-sm transition-all duration-500 group-hover:brightness-95 relative"
                            title={`Late: ${item.late}`}
                          />
                        </div>
                        {/* Day Label */}
                        <span className="text-[10px] font-bold text-slate-500 uppercase select-none mt-1 truncate w-full text-center">
                          {item.label}
                        </span>

                        {/* Interactive Tooltip on Hover */}
                        <div className="absolute -top-12 bg-slate-900 text-white text-[10px] font-semibold rounded-lg p-2.5 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-30 flex flex-col gap-0.5 min-w-[80px]">
                          <span className="text-slate-400 uppercase tracking-widest text-[9px]">{item.label}</span>
                          <span className="text-white">On-time: {item.onTime}</span>
                          <span className="text-slate-300">Late: {item.late}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Card>

            {/* 2. Side-By-Side Bottom Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Table Card (Spans 2/3) */}
              <Card className="md:col-span-2 bg-white border border-[#E8E6E1] rounded-3xl p-6 shadow-xs flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-[#FAF9F6]">
                    <div className="flex gap-5">
                      <button
                        onClick={() => setActiveTab('pending')}
                        className={`text-sm font-extrabold uppercase tracking-wide pb-2 border-b-2 transition-all cursor-pointer bg-transparent border-0 outline-none ${
                          activeTab === 'pending'
                            ? 'text-brand-red border-brand-red'
                            : 'text-slate-400 border-transparent hover:text-slate-600'
                        }`}
                      >
                        Pending Registrations ({pendingApprovals.length})
                      </button>
                      <button
                        onClick={() => setActiveTab('all_employees')}
                        className={`text-sm font-extrabold uppercase tracking-wide pb-2 border-b-2 transition-all cursor-pointer bg-transparent border-0 outline-none ${
                          activeTab === 'all_employees'
                            ? 'text-brand-red border-brand-red'
                            : 'text-slate-400 border-transparent hover:text-slate-600'
                        }`}
                      >
                        All Employees ({activeEmployees.length})
                      </button>
                      <button
                        onClick={() => setActiveTab('leaves')}
                        className={`text-sm font-extrabold uppercase tracking-wide pb-2 border-b-2 transition-all cursor-pointer bg-transparent border-0 outline-none ${
                          activeTab === 'leaves'
                            ? 'text-brand-red border-brand-red'
                            : 'text-slate-400 border-transparent hover:text-slate-600'
                        }`}
                      >
                        Leave Requests ({leaveRequests.length})
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto min-h-[220px]">
                    {activeTab === 'pending' ? (
                      <table className="w-full text-left border-collapse text-xs font-semibold text-slate-600">
                        <thead>
                          <tr className="border-b border-[#E8E6E1] text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                            <th className="pb-3">Name</th>
                            <th className="pb-3">Department</th>
                            <th className="pb-3">Requested On</th>
                            <th className="pb-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#EBEAE6]">
                          {pendingApprovals.length === 0 ? (
                            <tr>
                              <td colSpan="4" className="py-12 text-center text-slate-500 font-bold text-xs">
                                🎉 No pending approvals left!
                              </td>
                            </tr>
                          ) : (
                            pendingApprovals.slice(0, 6).map((emp) => (
                              <tr key={emp._id} className="hover:bg-[#FAF9F6]/40 transition-colors">
                                <td className="py-3 flex items-center gap-2.5">
                                  {emp.profilePicture ? (
                                    <img 
                                      src={emp.profilePicture} 
                                      alt="User" 
                                      className="w-7 h-7 rounded-full object-cover border border-slate-200"
                                    />
                                  ) : (
                                    <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 border border-slate-200 text-xs">
                                      {emp.name[0]}
                                    </div>
                                  )}
                                  <button
                                    onClick={() => handleOpenReportModal(emp)}
                                    className="font-bold text-slate-800 text-sm hover:text-brand-red cursor-pointer transition-colors text-left border-0 bg-transparent p-0 outline-none"
                                    title="View Attendance Report"
                                  >
                                    {emp.lastName ? `${emp.name} ${emp.lastName}` : emp.name}
                                  </button>
                                </td>
                                <td className="py-3 text-xs text-slate-600">{emp.department || '-'}</td>
                                <td className="py-3 font-mono text-xs text-slate-500">
                                  {formatDate(emp.createdAt)}
                                </td>
                                <td className="py-3 text-right">
                                  <div className="inline-flex gap-2">
                                    <button
                                      onClick={() => handleOpenEditModal(emp)}
                                      disabled={actionLoading}
                                      className="w-7 h-7 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-600 flex items-center justify-center cursor-pointer border border-blue-200 active:scale-90 transition-all border-0 outline-none"
                                      title="Edit Details"
                                    >
                                      <Edit2 size={11} />
                                    </button>
                                    <button
                                      onClick={() => handleApprove(emp._id)}
                                      disabled={actionLoading}
                                      className="w-7 h-7 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-600 flex items-center justify-center cursor-pointer border border-emerald-200 active:scale-90 transition-all border-0 outline-none"
                                      title="Approve"
                                    >
                                      <Check size={13} />
                                    </button>
                                    <button
                                      onClick={() => handleReject(emp._id)}
                                      disabled={actionLoading}
                                      className="w-7 h-7 rounded-full bg-rose-50 hover:bg-rose-100 text-brand-red flex items-center justify-center cursor-pointer border border-rose-200 active:scale-90 transition-all border-0 outline-none"
                                      title="Reject"
                                    >
                                      <X size={13} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    ) : activeTab === 'all_employees' ? (
                      <table className="w-full text-left border-collapse text-xs font-semibold text-slate-600">
                        <thead>
                          <tr className="border-b border-[#E8E6E1] text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                            <th className="pb-3">Name</th>
                            <th className="pb-3">Department</th>
                            <th className="pb-3">Designation</th>
                            <th className="pb-3">Status</th>
                            <th className="pb-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#EBEAE6]">
                          {activeEmployees.length === 0 ? (
                            <tr>
                              <td colSpan="5" className="py-12 text-center text-slate-500 font-bold text-xs">
                                No registered employees yet.
                              </td>
                            </tr>
                          ) : (
                            activeEmployees.map((emp) => (
                              <tr key={emp._id} className="hover:bg-[#FAF9F6]/40 transition-colors">
                                <td className="py-3 flex items-center gap-2.5">
                                  {emp.profilePicture ? (
                                    <img 
                                      src={emp.profilePicture} 
                                      alt="User" 
                                      className="w-7 h-7 rounded-full object-cover border border-slate-200"
                                    />
                                  ) : (
                                    <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 border border-slate-200 text-xs">
                                      {emp.name[0]}
                                    </div>
                                  )}
                                  <button
                                    onClick={() => handleOpenReportModal(emp)}
                                    className="font-bold text-slate-800 text-sm hover:text-brand-red cursor-pointer transition-colors text-left border-0 bg-transparent p-0 outline-none"
                                    title="View Attendance Report"
                                  >
                                    {emp.lastName ? `${emp.name} ${emp.lastName}` : emp.name}
                                  </button>
                                </td>
                                <td className="py-3 text-xs text-slate-600">{emp.department || '-'}</td>
                                <td className="py-3 text-xs text-slate-600">{emp.designation || '-'}</td>
                                <td className="py-3">
                                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                    emp.status === 'active' || emp.status === 'approved'
                                      ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                      : 'bg-rose-50 text-brand-red border border-rose-100'
                                  }`}>
                                    {emp.status}
                                  </span>
                                </td>
                                <td className="py-3 text-right">
                                  <div className="inline-flex gap-1.5">
                                    <button
                                      onClick={() => handleOpenEditModal(emp)}
                                      disabled={actionLoading}
                                      className="px-2.5 py-1 text-xs font-bold rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 cursor-pointer active:scale-95 transition-all outline-none"
                                      title="Edit Details"
                                    >
                                      Edit
                                    </button>
                                    {emp.status !== 'suspended' ? (
                                      <button
                                        onClick={() => handleStatusChange(emp._id, 'suspended')}
                                        disabled={actionLoading}
                                        className="px-2.5 py-1 text-xs font-bold rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-600 border border-amber-200 cursor-pointer active:scale-95 transition-all outline-none"
                                        title="Suspend Login Access"
                                      >
                                        Block
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() => handleStatusChange(emp._id, 'active')}
                                        disabled={actionLoading}
                                        className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-200 cursor-pointer active:scale-95 transition-all outline-none"
                                        title="Restore Login Access"
                                      >
                                        Unblock
                                      </button>
                                    )}
                                    <button
                                      onClick={() => handleReject(emp._id)}
                                      disabled={actionLoading}
                                      className="px-2.5 py-1 text-xs font-bold rounded-lg bg-rose-50 hover:bg-rose-100 text-brand-red border border-rose-200 cursor-pointer active:scale-95 transition-all outline-none"
                                      title="Remove"
                                    >
                                      Remove
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    ) : activeTab === 'leaves' ? (
                      <table className="w-full text-left border-collapse text-xs font-semibold text-slate-600">
                        <thead>
                          <tr className="border-b border-[#E8E6E1] text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                            <th className="pb-3">Employee</th>
                            <th className="pb-3">Type</th>
                            <th className="pb-3">Duration</th>
                            <th className="pb-3">Reason</th>
                            <th className="pb-3">Status</th>
                            <th className="pb-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#EBEAE6]">
                          {leaveRequests.length === 0 ? (
                            <tr>
                              <td colSpan="6" className="py-12 text-center text-slate-500 font-bold text-xs">
                                No leave applications found.
                              </td>
                            </tr>
                          ) : (
                            leaveRequests.map((item) => (
                              <tr key={item._id} className="hover:bg-[#FAF9F6]/40 transition-colors">
                                <td className="py-3 flex items-center gap-2.5">
                                  {item.employee ? (
                                    <>
                                      {item.employee.profilePicture ? (
                                        <img 
                                          src={item.employee.profilePicture} 
                                          alt="User" 
                                          className="w-7 h-7 rounded-full object-cover border border-slate-200"
                                        />
                                      ) : (
                                        <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 border border-slate-200 text-xs">
                                          {item.employee.name ? item.employee.name[0] : 'E'}
                                        </div>
                                      )}
                                      <span className="font-bold text-slate-800 text-sm">
                                        {item.employee.lastName ? `${item.employee.name} ${item.employee.lastName}` : item.employee.name}
                                      </span>
                                    </>
                                  ) : (
                                    <span className="font-bold text-slate-400">Unknown Employee</span>
                                  )}
                                </td>
                                <td className="py-3 font-bold text-slate-800 text-xs">{item.leaveType}</td>
                                <td className="py-3 text-slate-550 text-xs font-semibold">
                                  {formatDate(item.startDate)} - {formatDate(item.endDate)}
                                </td>
                                <td className="py-3 italic text-slate-550 max-w-[120px] truncate text-xs" title={item.reason}>{item.reason}</td>
                                <td className="py-3">
                                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase text-white ${
                                    item.status === 'Approved'
                                      ? 'bg-green-500'
                                      : item.status === 'Rejected'
                                      ? 'bg-red-500'
                                      : 'bg-amber-400'
                                  }`}>
                                    {item.status}
                                  </span>
                                </td>
                                <td className="py-3 text-right">
                                  {item.status === 'Pending' ? (
                                    <div className="inline-flex gap-2">
                                      <button
                                        onClick={() => handleApproveLeave(item._id)}
                                        disabled={actionLoading}
                                        className="w-7 h-7 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-600 flex items-center justify-center cursor-pointer border border-emerald-200 active:scale-90 transition-all border-0 outline-none"
                                        title="Approve Leave"
                                      >
                                        <Check size={13} />
                                      </button>
                                      <button
                                        onClick={() => handleRejectLeave(item._id)}
                                        disabled={actionLoading}
                                        className="w-7 h-7 rounded-full bg-rose-50 hover:bg-rose-100 text-brand-red flex items-center justify-center cursor-pointer border border-rose-200 active:scale-90 transition-all border-0 outline-none"
                                        title="Reject Leave"
                                      >
                                        <X size={13} />
                                      </button>
                                    </div>
                                  ) : (
                                    <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Closed</span>
                                  )}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    ) : null}
                  </div>
                </div>
              </Card>

              {/* Add New Profile Illustration Card (Spans 1/3) */}
              <Card className="bg-white border border-[#E8E6E1] rounded-3xl p-6 shadow-xs flex flex-col items-center justify-center text-center space-y-4 self-start">
                <div className="space-y-2">
                  <svg className="w-28 h-28 mx-auto text-slate-200" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                    {/* Visual representation card graphic */}
                    <rect x="40" y="70" width="120" height="90" rx="12" fill="#FAF9F6" stroke="#E3E1DC" strokeWidth="2" />
                    <circle cx="100" cy="100" r="16" fill="#fce8ee" />
                    <path d="M75 145 C 75 125, 125 125, 125 145" fill="#fce8ee" />
                    <rect x="60" y="80" width="30" height="4" rx="2" fill="#E3E1DC" />
                    <rect x="60" y="88" width="20" height="4" rx="2" fill="#E3E1DC" />
                    <circle cx="150" cy="140" r="14" fill="#E31C1C" />
                    <path d="M144 140 H 156 M150 134 V 146" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                  
                  <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Add New Profile</h4>
                  <p className="text-xs text-slate-500 leading-relaxed max-w-[160px] mx-auto">
                    Create a new employee profile directly into the active database.
                  </p>
                </div>

                <button
                  onClick={() => setShowAddModal(true)}
                  className="w-12 h-12 rounded-full bg-brand-red hover:bg-brand-red-hover text-white flex items-center justify-center cursor-pointer shadow-md transition-all active:scale-90 border-0"
                  title="Add Profile"
                >
                  <Plus size={24} />
                </button>
              </Card>

            </div>
          </div>
          {/* RIGHT SIDEBAR COLUMN: Checked-in logs */}
          <div className="lg:col-span-1 bg-white border border-[#E8E6E1] rounded-3xl p-5 shadow-xs space-y-4">
            
            {/* Sidebar Tabs */}
            <div className="flex bg-[#FAF9F6] border border-[#E8E6E1] p-1 rounded-xl text-[10px] font-bold text-slate-500 select-none">
              <button 
                onClick={() => setSidebarTab('logged_in')}
                className={`flex-1 py-2 rounded-lg text-center cursor-pointer transition-all ${
                  sidebarTab === 'logged_in' 
                    ? 'bg-white text-slate-800 shadow-xs font-extrabold' 
                    : 'hover:text-slate-700'
                }`}
              >
                LOGGED IN ({counters.loggedIn})
              </button>
              <button 
                onClick={() => setSidebarTab('on_time')}
                className={`flex-1 py-2 rounded-lg text-center cursor-pointer transition-all ${
                  sidebarTab === 'on_time' 
                    ? 'bg-white text-slate-800 shadow-xs font-extrabold' 
                    : 'hover:text-slate-700'
                }`}
              >
                ON TIME ({counters.onTime})
              </button>
              <button 
                onClick={() => setSidebarTab('late')}
                className={`flex-1 py-2 rounded-lg text-center cursor-pointer transition-all ${
                  sidebarTab === 'late' 
                    ? 'bg-white text-slate-800 shadow-xs font-extrabold' 
                    : 'hover:text-slate-700'
                }`}
              >
                LATE ({counters.late})
              </button>
            </div>

            {/* Search Input Box */}
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search employees"
                className="w-full bg-[#FAF9F6] border border-[#DEDCD8] rounded-xl py-2.5 pl-10 pr-3 text-xs font-semibold text-slate-800 outline-none focus:border-slate-500 focus:bg-white transition-all placeholder:text-slate-400"
              />
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            </div>

            {/* Scrollable Logs Stack */}
            <div className="space-y-4 max-h-[480px] overflow-y-auto pr-1">
              {filteredSidebarLogs.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs font-bold">
                  No matching employee records.
                </div>
              ) : (
                filteredSidebarLogs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between group border-b border-[#EBEAE6]/40 pb-3.5 last:border-b-0">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {log.profilePicture ? (
                        <img 
                          src={log.profilePicture} 
                          alt="User" 
                          className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 border border-slate-200 text-xs shrink-0 uppercase">
                          {log.name[0]}
                        </div>
                      )}
                      <div className="flex flex-col min-w-0 text-xs">
                        <button
                          onClick={() => handleOpenReportModal({ _id: log.id, name: log.name, lastName: log.lastName, department: log.department, designation: log.designation, profilePicture: log.profilePicture })}
                          className="text-slate-800 font-extrabold leading-tight truncate hover:text-brand-red cursor-pointer transition-colors text-left border-0 bg-transparent p-0 outline-none block"
                          title="View Attendance Report"
                        >
                          {log.lastName ? `${log.name} ${log.lastName}` : log.name}
                        </button>
                        <span className="text-slate-500 text-[10px] font-semibold truncate leading-none mt-1">
                          {log.designation || 'Staff'} | {log.department}
                        </span>
                        <span className="text-slate-400 text-[10px] font-medium leading-none mt-1">
                          In: {formatTime(log.checkIn)} | Out: {formatTime(log.checkOut)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex flex-col items-end gap-1">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full inline-block ${
                            log.status === 'Present' ? 'bg-brand-red animate-pulse' : 'bg-[#fca5a5]'
                          }`} />
                          <span className="text-[10px] font-bold text-slate-500 uppercase select-none">
                            {log.status === 'Present' ? 'On-time' : 'Late'}
                          </span>
                        </div>
                        <button
                          onClick={() => handleOpenEditModal(log)}
                          className="text-[9px] font-bold text-slate-400 hover:text-blue-500 flex items-center gap-0.5 cursor-pointer bg-transparent border-0 outline-none"
                          title="Quick Edit Employee"
                        >
                          <Edit2 size={10} />
                          <span>Edit</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer quick link */}
            <div className="pt-3 text-center border-t border-slate-150">
              <span className="text-xs font-bold text-brand-red hover:text-brand-red-hover hover:underline cursor-pointer uppercase tracking-wider block py-1">
                View all employees ({counters.active})
              </span>
            </div>

          </div>

        </div>
      )}

      {/* POPUP MODAL: Add New Profile */}
      {showAddModal && (
        <div className="fixed inset-0 bg-[#0b0a09]/50 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border border-[#E8E6E1] rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-[#EBEAE6] bg-[#FAF9F6]">
              <div className="space-y-0.5">
                <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide">
                  Create Employee Profile
                </h3>
                <p className="text-xs text-slate-500 font-semibold">Add profile details directly to the active directory</p>
              </div>
              <button 
                onClick={() => setShowAddModal(false)} 
                className="text-slate-400 hover:text-slate-700 transition-colors cursor-pointer bg-transparent border-0 flex items-center justify-center"
              >
                <X size={16} />
              </button>
            </div>

            {/* Form Scroll Area */}
            <form onSubmit={handleCreateEmployee} className="p-6 overflow-y-auto space-y-4">
              
              {formError && (
                <div className="bg-rose-50 border border-rose-100 text-brand-red text-xs font-bold p-3 rounded-2xl animate-fade-in flex items-start gap-1.5">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5 flex flex-col">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">First Name</label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="First Name"
                    className="w-full bg-[#FAF9F6] border border-[#DEDCD8] rounded-xl p-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-slate-500 focus:bg-white transition-all"
                    required
                  />
                </div>
                
                <div className="space-y-1.5 flex flex-col">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Last Name</label>
                  <input
                    type="text"
                    value={formLastName}
                    onChange={(e) => setFormLastName(e.target.value)}
                    placeholder="Last Name"
                    className="w-full bg-[#FAF9F6] border border-[#DEDCD8] rounded-xl p-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-slate-500 focus:bg-white transition-all"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5 flex flex-col">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Department</label>
                  <input
                    type="text"
                    value={formDepartment}
                    onChange={(e) => setFormDepartment(e.target.value)}
                    placeholder="e.g. Sales"
                    className="w-full bg-[#FAF9F6] border border-[#DEDCD8] rounded-xl p-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-slate-500 focus:bg-white transition-all"
                    required
                  />
                </div>

                <div className="space-y-1.5 flex flex-col">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Designation</label>
                  <input
                    type="text"
                    value={formDesignation}
                    onChange={(e) => setFormDesignation(e.target.value)}
                    placeholder="e.g. Designer"
                    className="w-full bg-[#FAF9F6] border border-[#DEDCD8] rounded-xl p-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-slate-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5 flex flex-col">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Phone Number</label>
                <input
                  type="tel"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="Phone"
                  className="w-full bg-[#FAF9F6] border border-[#DEDCD8] rounded-xl p-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-slate-500 focus:bg-white transition-all"
                />
              </div>

              <div className="space-y-1.5 flex flex-col">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Email</label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="Email Address"
                  className="w-full bg-[#FAF9F6] border border-[#DEDCD8] rounded-xl p-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-slate-500 focus:bg-white transition-all"
                  required
                />
              </div>

              <div className="space-y-1.5 flex flex-col">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Password</label>
                <input
                  type="password"
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  placeholder="Min 6 chars"
                  className="w-full bg-[#FAF9F6] border border-[#DEDCD8] rounded-xl p-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-slate-500 focus:bg-white transition-all"
                  required
                />
              </div>

              <div className="flex gap-2.5 pt-4 border-t border-[#EBEAE6]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 bg-white hover:bg-slate-50 border border-[#DEDCD8] text-slate-500 rounded-xl text-xs font-bold py-2.5 cursor-pointer shadow-sm transition-all"
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-[#E31C1C] hover:bg-[#b81414] text-white rounded-xl text-xs font-bold py-2.5 cursor-pointer shadow-sm border-0 transition-all flex items-center justify-center gap-1.5"
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                  ) : (
                    'Add Profile'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POPUP MODAL: Edit Employee Profile */}
      {showEditModal && (
        <div className="fixed inset-0 bg-[#0b0a09]/50 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border border-[#E8E6E1] rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-[#EBEAE6] bg-[#FAF9F6]">
              <div className="space-y-0.5">
                <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide">
                  Edit Employee Profile
                </h3>
                <p className="text-xs text-slate-500 font-semibold">Modify database records for this employee</p>
              </div>
              <button 
                onClick={() => setShowEditModal(false)} 
                className="text-slate-400 hover:text-slate-700 transition-colors cursor-pointer bg-transparent border-0 flex items-center justify-center"
              >
                <X size={16} />
              </button>
            </div>

            {/* Form Scroll Area */}
            <form onSubmit={handleUpdateEmployee} className="p-6 overflow-y-auto space-y-4">
              
              {editFormError && (
                <div className="bg-rose-50 border border-rose-100 text-brand-red text-xs font-bold p-3 rounded-2xl animate-fade-in flex items-start gap-1.5">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <span>{editFormError}</span>
                </div>
              )}

              {/* Profile Image upload/selection */}
              <div className="flex flex-col items-center gap-2 pb-2">
                {editFormProfilePicture ? (
                  <img 
                    src={editFormProfilePicture} 
                    alt="Preview" 
                    className="w-16 h-16 rounded-full object-cover border-2 border-brand-red shadow-sm"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200">
                    <User size={28} />
                  </div>
                )}
                <label className="text-[10px] font-extrabold text-[#E31C1C] cursor-pointer hover:underline">
                  Change Picture
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setEditFormProfilePicture(reader.result);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="hidden" 
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5 flex flex-col">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">First Name</label>
                  <input
                    type="text"
                    value={editFormName}
                    onChange={(e) => setEditFormName(e.target.value)}
                    placeholder="First Name"
                    className="w-full bg-[#FAF9F6] border border-[#DEDCD8] rounded-xl p-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-slate-500 focus:bg-white transition-all"
                    required
                  />
                </div>
                
                <div className="space-y-1.5 flex flex-col">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Last Name</label>
                  <input
                    type="text"
                    value={editFormLastName}
                    onChange={(e) => setEditFormLastName(e.target.value)}
                    placeholder="Last Name"
                    className="w-full bg-[#FAF9F6] border border-[#DEDCD8] rounded-xl p-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-slate-500 focus:bg-white transition-all"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5 flex flex-col">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Department</label>
                  <input
                    type="text"
                    value={editFormDepartment}
                    onChange={(e) => setEditFormDepartment(e.target.value)}
                    placeholder="e.g. Sales"
                    className="w-full bg-[#FAF9F6] border border-[#DEDCD8] rounded-xl p-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-slate-500 focus:bg-white transition-all"
                    required
                  />
                </div>

                <div className="space-y-1.5 flex flex-col">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Designation</label>
                  <input
                    type="text"
                    value={editFormDesignation}
                    onChange={(e) => setEditFormDesignation(e.target.value)}
                    placeholder="e.g. Designer"
                    className="w-full bg-[#FAF9F6] border border-[#DEDCD8] rounded-xl p-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-slate-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5 flex flex-col">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Phone Number</label>
                <input
                  type="tel"
                  value={editFormPhone}
                  onChange={(e) => setEditFormPhone(e.target.value)}
                  placeholder="Phone"
                  className="w-full bg-[#FAF9F6] border border-[#DEDCD8] rounded-xl p-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-slate-500 focus:bg-white transition-all"
                />
              </div>

              <div className="space-y-1.5 flex flex-col">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Email</label>
                <input
                  type="email"
                  value={editFormEmail}
                  onChange={(e) => setEditFormEmail(e.target.value)}
                  placeholder="Email Address"
                  className="w-full bg-[#FAF9F6] border border-[#DEDCD8] rounded-xl p-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-slate-500 focus:bg-white transition-all"
                  required
                />
              </div>

              <div className="space-y-1.5 flex flex-col">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Password (Leave blank to keep current)</label>
                <input
                  type="password"
                  value={editFormPassword}
                  onChange={(e) => setEditFormPassword(e.target.value)}
                  placeholder="Min 6 chars"
                  className="w-full bg-[#FAF9F6] border border-[#DEDCD8] rounded-xl p-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-slate-500 focus:bg-white transition-all"
                />
              </div>

              <div className="flex gap-2.5 pt-4 border-t border-[#EBEAE6]">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 bg-white hover:bg-slate-50 border border-[#DEDCD8] text-slate-500 rounded-xl text-xs font-bold py-2.5 cursor-pointer shadow-sm transition-all"
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-[#E31C1C] hover:bg-[#b81414] text-white rounded-xl text-xs font-bold py-2.5 cursor-pointer shadow-sm border-0 transition-all flex items-center justify-center gap-1.5"
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* FULLSCREEN OVERLAY MODAL: Monthly Attendance Report */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 sm:p-6 z-50 animate-fade-in">
          <div className="bg-white border border-[#E8E6E1] rounded-3xl w-full max-w-5xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-[#EBEAE6] bg-[#FAF9F6]">
              <div className="flex items-center gap-3">
                {reportEmployeeInfo?.profilePicture ? (
                  <img 
                    src={reportEmployeeInfo.profilePicture} 
                    alt="Employee" 
                    className="w-11 h-11 rounded-full object-cover border border-slate-200"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200 font-bold text-sm">
                    {reportEmployeeInfo?.name ? reportEmployeeInfo.name[0] : 'E'}
                  </div>
                )}
                <div>
                  <h3 className="text-base font-extrabold text-slate-800 uppercase tracking-wide">
                    {reportEmployeeInfo?.name} {reportEmployeeInfo?.lastName} — Attendance Report
                  </h3>
                  <p className="text-xs text-slate-500 font-semibold mt-0.5">
                    {reportEmployeeInfo?.designation || 'Staff'} | {reportEmployeeInfo?.department || 'Unassigned'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowReportModal(false)}
                className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-2.5 rounded-full transition-colors cursor-pointer bg-transparent border-0 flex items-center justify-center outline-none"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Controls (Month Select & Export) */}
              <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 bg-[#FAF9F6] border border-[#EBEAE6] p-4.5 rounded-2xl">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <div className="flex flex-col gap-1 min-w-[200px]">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-wide">Select Report Month</span>
                    <select
                      value={selectedReportMonthKey}
                      onChange={(e) => setSelectedReportMonthKey(e.target.value)}
                      className="bg-white border border-[#DEDCD8] rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none cursor-pointer"
                    >
                      {reportMonthsList.map(month => (
                        <option key={month.key} value={month.key}>
                          {month.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleExportExcel}
                  disabled={reportData.length === 0}
                  className="py-2.5 px-6 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer border-0 flex items-center justify-center gap-2 shadow-sm disabled:bg-slate-200 disabled:text-slate-450 disabled:cursor-not-allowed active:scale-98"
                >
                  <FileSpreadsheet size={16} />
                  <span>Export to Excel Sheet</span>
                </button>
              </div>

              {reportLoading ? (
                <div className="py-28 flex flex-col justify-center items-center gap-3">
                  <div className="w-9 h-9 rounded-full border-3 border-brand-red/20 border-t-brand-red animate-spin" />
                  <span className="text-xs text-slate-450 font-bold">Generating report logs...</span>
                </div>
              ) : reportError ? (
                <div className="p-4 bg-rose-50 border border-rose-100 text-brand-red rounded-xl text-xs font-bold text-center">
                  {reportError}
                </div>
              ) : (
                <>
                  {/* Stats Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-7 gap-3">
                    <div className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-2xl text-center">
                      <span className="text-[9px] font-black text-emerald-600 uppercase tracking-wider block">Presents</span>
                      <strong className="text-emerald-700 text-base font-black mt-1.5 block">{reportStats.presents}</strong>
                    </div>
                    <div className="p-3 bg-amber-50/50 border border-amber-100 rounded-2xl text-center">
                      <span className="text-[9px] font-black text-amber-600 uppercase tracking-wider block">Lates</span>
                      <strong className="text-amber-700 text-base font-black mt-1.5 block">{reportStats.lates}</strong>
                    </div>
                    <div className="p-3 bg-cyan-50/50 border border-cyan-100 rounded-2xl text-center">
                      <span className="text-[9px] font-black text-cyan-600 uppercase tracking-wider block">Half Days</span>
                      <strong className="text-cyan-700 text-base font-black mt-1.5 block">{reportStats.halfDays}</strong>
                    </div>
                    <div className="p-3 bg-rose-50/40 border border-rose-100/60 rounded-2xl text-center">
                      <span className="text-[9px] font-black text-brand-red uppercase tracking-wider block">Absents</span>
                      <strong className="text-brand-red text-base font-black mt-1.5 block">{reportStats.absents}</strong>
                    </div>
                    <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-2xl text-center">
                      <span className="text-[9px] font-black text-blue-600 uppercase tracking-wider block">Leaves</span>
                      <strong className="text-blue-700 text-base font-black mt-1.5 block">{reportStats.leaves}</strong>
                    </div>
                    <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-2xl text-center">
                      <span className="text-[9px] font-black text-indigo-650 uppercase tracking-wider block">Holidays</span>
                      <strong className="text-indigo-700 text-base font-black mt-1.5 block">{reportStats.holidays}</strong>
                    </div>
                    <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl text-center col-span-2 sm:col-span-1">
                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider block">Weekends</span>
                      <strong className="text-slate-655 text-base font-black mt-1.5 block">{reportStats.weekends}</strong>
                    </div>
                  </div>

                  {/* Daily Report Log Table */}
                  <div className="overflow-x-auto bg-white border border-[#EBEAE6] rounded-2xl shadow-xs">
                    <table className="w-full text-left border-collapse text-xs font-semibold text-slate-600">
                      <thead>
                        <tr className="border-b border-[#E8E6E1] text-[10px] font-extrabold text-slate-500 uppercase tracking-wider bg-[#FAF9F6]">
                          <th className="p-4">Date</th>
                          <th className="p-4">Day of Week</th>
                          <th className="p-4">Attendance Status</th>
                          <th className="p-4">Punch-In Time</th>
                          <th className="p-4">Punch-Out Time</th>
                          <th className="p-4">Remarks</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#EBEAE6]">
                        {reportData.map((day, idx) => (
                          <tr key={idx} className="hover:bg-[#FAF9F6]/40 transition-colors">
                            <td className="p-4 font-bold text-slate-800">
                              {formatDate(day.date)}
                            </td>
                            <td className="p-4 text-slate-500 font-semibold">{day.dayOfWeek}</td>
                            <td className="p-4">
                              <span className={`px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
                                day.status === 'Present'
                                  ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                  : day.status === 'Late'
                                  ? 'bg-amber-50 text-amber-600 border border-amber-100'
                                  : day.status === 'Half Day'
                                  ? 'bg-cyan-50 text-cyan-600 border border-cyan-100'
                                  : day.status === 'Holiday'
                                  ? 'bg-indigo-50 text-indigo-600 border border-indigo-100'
                                  : day.status === 'Leave'
                                  ? 'bg-blue-50 text-blue-600 border border-blue-100'
                                  : day.status === 'Weekend'
                                  ? 'bg-slate-100 text-slate-500 border border-slate-200'
                                  : 'bg-rose-50 text-brand-red border border-rose-100'
                              }`}>
                                {day.status}
                              </span>
                            </td>
                            <td className="p-4 font-mono text-slate-700 font-bold">{day.checkIn}</td>
                            <td className="p-4 font-mono text-slate-700 font-bold">{day.checkOut}</td>
                            <td className="p-4 text-slate-500 italic max-w-sm truncate" title={day.remarks}>
                              {day.remarks}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      {/* DECLARE HOLIDAY MODAL */}
      {showHolidayModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 sm:p-6 z-50 animate-fade-in">
          <div className="bg-white border border-[#E8E6E1] rounded-3xl w-full max-w-xl shadow-2xl p-6 relative flex flex-col max-h-[85vh] overflow-hidden">
            <button 
              onClick={() => setShowHolidayModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-100 transition-colors cursor-pointer bg-transparent border-0 flex items-center justify-center outline-none"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
              <Calendar className="text-[#E31C1C]" size={20} />
              <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide">Manage System Holidays</h3>
            </div>

            {/* Sub Tabs inside Modal */}
            <div className="flex gap-4 border-b border-[#FAF9F6] pb-3 mb-4">
              <button
                onClick={() => setHolidayActiveTab('declare')}
                className={`text-xs font-black uppercase tracking-wide pb-1 border-b-2 bg-transparent border-0 outline-none cursor-pointer transition-all ${
                  holidayActiveTab === 'declare'
                    ? 'text-[#E31C1C] border-[#E31C1C]'
                    : 'text-slate-400 border-transparent hover:text-slate-655'
                }`}
              >
                Mark New Holiday
              </button>
              <button
                onClick={() => {
                  setHolidayActiveTab('history');
                  fetchHolidaysList();
                }}
                className={`text-xs font-black uppercase tracking-wide pb-1 border-b-2 bg-transparent border-0 outline-none cursor-pointer transition-all ${
                  holidayActiveTab === 'history'
                    ? 'text-[#E31C1C] border-[#E31C1C]'
                    : 'text-slate-400 border-transparent hover:text-slate-655'
                }`}
              >
                Holiday History ({holidaysList.length})
              </button>
            </div>

            {holidayError && (
              <div className="mb-4 bg-rose-50 border border-rose-100 text-brand-red text-xs font-bold p-3 rounded-xl animate-fade-in">
                {holidayError}
              </div>
            )}

            {holidaySuccess && (
              <div className="mb-4 bg-emerald-50 border border-emerald-100 text-emerald-600 text-xs font-bold p-3 rounded-xl animate-fade-in">
                {holidaySuccess}
              </div>
            )}

            <div className="overflow-y-auto flex-1 pr-1">
              {holidayActiveTab === 'declare' ? (
                <form onSubmit={handleSaveHoliday} className="space-y-4">
                  <div>
                    <DatePicker
                      label="Select Date"
                      value={holidayDate}
                      onChange={(val) => setHolidayDate(val)}
                      required
                    />
                  </div>

                  <div className="space-y-1.5 flex flex-col">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wide block">Holiday Occasion / Reason</label>
                    <input
                      type="text"
                      value={holidayReason}
                      onChange={(e) => setHolidayReason(e.target.value)}
                      placeholder="e.g. Independence Day, Diwali Office Closure"
                      className="w-full bg-[#FAF9F6] border border-[#DEDCD8] rounded-xl p-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-slate-500 focus:bg-white transition-all"
                      required
                    />
                  </div>

                  <div className="flex gap-2.5 pt-3 border-t border-[#EBEAE6]">
                    <button
                      type="button"
                      onClick={() => setShowHolidayModal(false)}
                      className="flex-1 bg-white hover:bg-slate-50 border border-[#DEDCD8] text-slate-500 rounded-xl text-xs font-bold py-2.5 cursor-pointer shadow-sm transition-all"
                      disabled={holidayLoading}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 bg-[#E31C1C] hover:bg-[#b81414] text-white rounded-xl text-xs font-bold py-2.5 cursor-pointer shadow-sm border-0 transition-all flex items-center justify-center gap-1.5"
                      disabled={holidayLoading}
                    >
                      {holidayLoading ? (
                        <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                      ) : (
                        'Declare Holiday'
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-3.5">
                  {holidaysList.length === 0 ? (
                    <div className="py-12 text-center text-slate-450 text-xs font-bold bg-[#FAF9F6] rounded-2xl border border-dashed border-slate-200">
                      No holidays declared yet.
                    </div>
                  ) : (
                    <div className="overflow-x-auto border border-[#EBEAE6] rounded-2xl">
                      <table className="w-full text-left border-collapse text-xs font-semibold text-slate-600">
                        <thead>
                          <tr className="border-b border-[#E8E6E1] text-[10px] font-extrabold text-slate-500 uppercase tracking-wider bg-[#FAF9F6]">
                            <th className="p-3">Date</th>
                            <th className="p-3">Occasion</th>
                            <th className="p-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#EBEAE6]">
                          {holidaysList.map((holiday) => (
                            <tr key={holiday._id} className="hover:bg-[#FAF9F6]/40 transition-colors">
                              {editingHolidayId === holiday._id ? (
                                <>
                                  <td className="p-3">
                                    <input
                                      type="date"
                                      value={editingDate}
                                      onChange={(e) => setEditingDate(e.target.value)}
                                      className="bg-white border border-[#DEDCD8] rounded-lg p-1 text-[11px] font-semibold text-slate-800 outline-none w-28"
                                    />
                                  </td>
                                  <td className="p-3">
                                    <input
                                      type="text"
                                      value={editingReason}
                                      onChange={(e) => setEditingReason(e.target.value)}
                                      className="bg-white border border-[#DEDCD8] rounded-lg p-1 text-[11px] font-semibold text-slate-800 outline-none w-full"
                                    />
                                  </td>
                                  <td className="p-3 text-right">
                                    <div className="inline-flex gap-1.5">
                                      <button
                                        onClick={() => handleUpdateHoliday(holiday._id)}
                                        className="px-2 py-1 text-[10px] font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer border-0 active:scale-95 transition-all outline-none"
                                      >
                                        Save
                                      </button>
                                      <button
                                        onClick={() => setEditingHolidayId(null)}
                                        className="px-2 py-1 text-[10px] font-bold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-655 cursor-pointer border border-slate-200 active:scale-95 transition-all outline-none"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </td>
                                </>
                              ) : (
                                <>
                                  <td className="p-3 font-bold text-slate-800">
                                    {formatDate(holiday.date)}
                                  </td>
                                  <td className="p-3 text-slate-500 font-bold">{holiday.reason}</td>
                                  <td className="p-3 text-right">
                                    <div className="inline-flex gap-1.5">
                                      <button
                                        onClick={() => {
                                          setEditingHolidayId(holiday._id);
                                          setEditingDate(holiday.date.split('T')[0]);
                                          setEditingReason(holiday.reason);
                                        }}
                                        className="w-7 h-7 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-600 flex items-center justify-center cursor-pointer border border-blue-200 active:scale-90 transition-all border-0 outline-none"
                                        title="Edit Holiday"
                                      >
                                        <Edit2 size={12} />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteHoliday(holiday._id)}
                                        className="w-7 h-7 rounded-full bg-rose-50 hover:bg-rose-100 text-brand-red flex items-center justify-center cursor-pointer border border-rose-200 active:scale-90 transition-all border-0 outline-none"
                                        title="Cancel/Delete Holiday"
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    </div>
                                  </td>
                                </>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
