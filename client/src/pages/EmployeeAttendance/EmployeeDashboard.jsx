import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  LogOut, 
  User, 
  CheckCircle, 
  Clock, 
  Calendar, 
  AlertCircle, 
  MapPin, 
  Bell, 
  Fingerprint, 
  Home, 
  Grid, 
  LogIn,
  ChevronLeft,
  Plus,
  FileText
} from 'lucide-react';
import { useEmployeeAuth } from '../../context/EmployeeAuthContext';
import { employeeApi } from '../../api/employeeApi';
import { ROUTES } from '../../constants/Routes';
import { formatDate } from '../../utils/dateUtils';
import DatePicker from '../../Modules/FeesManagement/components/DatePicker';

export default function EmployeeDashboard() {
  const navigate = useNavigate();
  const { employee, employeeToken, employeeLogout, setEmployee } = useEmployeeAuth();

  const [todayRecord, setTodayRecord] = useState(null);
  const [history, setHistory] = useState([]);
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(true);
  const [btnLoading, setBtnLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Navigation Tab State
  const [activeTab, setActiveTab] = useState('Home'); // Home, Calendar, Modules, Profile, Leaves

  // Calendar States
  const [selectedMonthOffset, setSelectedMonthOffset] = useState(0); 
  const [selectedDayDetails, setSelectedDayDetails] = useState(null);

  // Leave Request States
  const [leavesList, setLeavesList] = useState([]);
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [leaveType, setLeaveType] = useState('Casual');
  const [leaveStartDate, setLeaveStartDate] = useState('');
  const [leaveEndDate, setLeaveEndDate] = useState('');
  const [leaveReason, setLeaveReason] = useState('');
  const [leaveFormError, setLeaveFormError] = useState('');
  const [leaveFormSuccess, setLeaveFormSuccess] = useState('');

  // Profile Edit States
  const [editProfileMode, setEditProfileMode] = useState(false);
  const [editName, setEditName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editProfilePicture, setEditProfilePicture] = useState('');
  const [profileEditError, setProfileEditError] = useState('');
  const [profileEditSuccess, setProfileEditSuccess] = useState('');

  // Notifications States
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  // Clock effect
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await employeeApi.getTodayAttendance();
      if (res.success) {
        setTodayRecord(res.todayRecord);
        setHistory(res.history || []);
      }
    } catch (err) {
      console.error('Failed to load status:', err);
      setError('Failed to sync today\'s status.');
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaves = async () => {
    try {
      setLeaveLoading(true);
      const res = await employeeApi.getMyLeaves();
      if (res.success) {
        setLeavesList(res.leaves || []);
      }
    } catch (err) {
      console.error('Failed to load leaves:', err);
    } finally {
      setLeaveLoading(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await employeeApi.getNotifications();
      if (res.success) {
        setNotifications(res.notifications || []);
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
  };

  const handleMarkNotificationsRead = async () => {
    try {
      await employeeApi.markNotificationsRead();
      fetchNotifications();
    } catch (err) {
      console.error('Failed to mark notifications read:', err);
    }
  };

  useEffect(() => {
    if (!employeeToken) {
      navigate(ROUTES.EMPLOYEE_LOGIN);
      return;
    }
    fetchStatus();
    fetchLeaves();
    fetchNotifications();
  }, [employeeToken, navigate]);

  const handleCheckIn = async () => {
    setError('');
    setSuccessMsg('');
    setBtnLoading(true);
    try {
      const res = await employeeApi.checkIn(remarks);
      if (res.success) {
        setSuccessMsg(res.message || 'Checked in successfully.');
        setRemarks('');
        await fetchStatus();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Check-in request failed.');
    } finally {
      setBtnLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setError('');
    setSuccessMsg('');
    setBtnLoading(true);
    try {
      const res = await employeeApi.checkOut();
      if (res.success) {
        setSuccessMsg(res.message || 'Checked out successfully.');
        await fetchStatus();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Check-out request failed.');
    } finally {
      setBtnLoading(false);
    }
  };

  const handleApplyLeave = async (e) => {
    e.preventDefault();
    setLeaveFormError('');
    setLeaveFormSuccess('');
    
    if (!leaveStartDate || !leaveEndDate || !leaveReason) {
      setLeaveFormError('Please fill in all required fields.');
      return;
    }

    setBtnLoading(true);
    try {
      const res = await employeeApi.applyLeave({
        leaveType,
        startDate: leaveStartDate,
        endDate: leaveEndDate,
        reason: leaveReason
      });
      if (res.success) {
        setLeaveFormSuccess('Leave application submitted successfully!');
        setLeaveStartDate('');
        setLeaveEndDate('');
        setLeaveReason('');
        setShowLeaveForm(false);
        await fetchLeaves();
      }
    } catch (err) {
      setLeaveFormError(err.response?.data?.message || 'Failed to submit leave request.');
    } finally {
      setBtnLoading(false);
    }
  };

  const handleLogout = () => {
    employeeLogout();
    navigate(ROUTES.EMPLOYEE_LOGIN);
  };

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

  const handleMainPunchClick = () => {
    if (btnLoading) return;
    if (!todayRecord) {
      handleCheckIn();
    } else if (!todayRecord.checkOut) {
      handleCheckOut();
    }
  };

  // Calendar Helper Functions
  const getMonthOptions = () => {
    const options = [];
    const now = new Date();
    for (let i = 0; i < 3; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      options.push({
        label: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        month: d.getMonth(),
        year: d.getFullYear(),
        offset: i
      });
    }
    return options;
  };

  const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year, month) => {
    return new Date(year, month, 1).getDay(); // 0 = Sun, 1 = Mon ...
  };

  // Pre-process logs mapping for fast lookups
  const logsMap = {};
  history.forEach(record => {
    const d = new Date(record.date);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    logsMap[key] = record;
  });

  // Calculate calendar properties based on offset selection
  const monthOptions = getMonthOptions();
  const activeMonthOpt = monthOptions[selectedMonthOffset] || monthOptions[0];
  const { month: activeMonth, year: activeYear } = activeMonthOpt;

  const totalDays = getDaysInMonth(activeYear, activeMonth);
  const firstDayIndex = getFirstDayOfMonth(activeYear, activeMonth);

  // Build calendar grid array
  const gridCells = [];
  // Empty padding cells
  for (let i = 0; i < firstDayIndex; i++) {
    gridCells.push({ day: null, type: 'empty' });
  }
  // Actual day cells
  const now = new Date();
  const todayDateKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;

  for (let day = 1; day <= totalDays; day++) {
    const key = `${activeYear}-${activeMonth}-${day}`;
    const log = logsMap[key];
    const cellDate = new Date(activeYear, activeMonth, day);
    const dayOfWeek = cellDate.getDay();
    const isWeekend = dayOfWeek === 0; // Only Sunday is counted as Weekend / Weekly Off
    const isFuture = cellDate > now;
    const isToday = key === todayDateKey;

    let status = 'None';
    if (log) {
      status = log.status; // 'Present' or 'Late'
    } else if (isFuture) {
      status = 'Future';
    } else if (isWeekend) {
      status = 'Weekend';
    } else {
      status = 'Absent';
    }

    gridCells.push({
      day,
      type: 'day',
      dateKey: key,
      status,
      log,
      isToday,
      cellDate
    });
  }

  // Calculate stats for the selected month
  let presentsCount = 0;
  let latesCount = 0;
  let absentsCount = 0;

  gridCells.forEach(cell => {
    if (cell.type === 'day' && cell.cellDate <= now) {
      if (cell.status === 'Present') presentsCount++;
      else if (cell.status === 'Late') latesCount++;
      else if (cell.status === 'Absent') absentsCount++;
    }
  });

  // Set default details if not set
  useEffect(() => {
    if (selectedMonthOffset === 0) {
      const todayCell = gridCells.find(c => c.isToday);
      if (todayCell) {
        setSelectedDayDetails({
          day: todayCell.day,
          dateLabel: `${todayCell.cellDate.toLocaleDateString('en-GB', { weekday: 'short' })}, ${formatDate(todayCell.cellDate)}`,
          status: todayCell.status,
          log: todayCell.log
        });
      }
    } else {
      const firstCell = gridCells.find(c => c.type === 'day');
      if (firstCell) {
        setSelectedDayDetails({
          day: firstCell.day,
          dateLabel: `${firstCell.cellDate.toLocaleDateString('en-GB', { weekday: 'short' })}, ${formatDate(firstCell.cellDate)}`,
          status: firstCell.status,
          log: firstCell.log
        });
      }
    }
  }, [selectedMonthOffset]);

  const handleDayCellClick = (cell) => {
    if (cell.type !== 'day') return;
    setSelectedDayDetails({
      day: cell.day,
      dateLabel: `${cell.cellDate.toLocaleDateString('en-GB', { weekday: 'short' })}, ${formatDate(cell.cellDate)}`,
      status: cell.status,
      log: cell.log
    });
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 flex items-center justify-center font-sans animate-fade-in">
      <div className="w-full max-w-md min-h-screen sm:min-h-[85vh] sm:max-h-[90vh] sm:rounded-3xl sm:shadow-2xl bg-white flex flex-col p-4 sm:p-6 pb-24 sm:pb-6 relative overflow-hidden justify-between">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between pb-2 sm:pb-3 border-b border-slate-100 shrink-0 bg-white z-10">
          {/* Logo on the Left */}
          <div className="flex items-center">
            <img src="/jains.svg" alt="Logo" className="h-6 w-auto object-contain" />
          </div>
          
          {/* Notifications and Profile Picture on the Right */}
          <div className="flex items-center gap-3">
            {/* Notification Bell */}
            <div className="relative">
              <button 
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  if (!showNotifications) {
                    handleMarkNotificationsRead();
                  }
                }}
                className="p-2 text-slate-400 hover:text-slate-655 rounded-full hover:bg-slate-50 transition-colors bg-transparent border-0 flex items-center justify-center relative cursor-pointer outline-none"
              >
                <Bell size={18} />
                {notifications.some(n => !n.isRead) && (
                  <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-brand-red rounded-full animate-pulse" />
                )}
              </button>

              {/* Notification Dropdown Panel */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-64 bg-white border border-[#E8E6E1] rounded-2xl shadow-xl z-50 p-3.5 space-y-2.5 max-h-72 overflow-y-auto">
                  <div className="flex justify-between items-center pb-2 border-b border-[#FAF9F6]">
                    <span className="text-xs font-bold text-slate-800">Notifications</span>
                    {notifications.some(n => !n.isRead) && (
                      <button 
                        onClick={handleMarkNotificationsRead}
                        className="text-[10px] font-bold text-[#E31C1C] hover:underline cursor-pointer border-0 bg-transparent"
                      >
                        Clear All
                      </button>
                    )}
                  </div>
                  <div className="space-y-2">
                    {notifications.length === 0 ? (
                      <p className="text-[10px] text-slate-400 py-4 text-center font-bold">No notifications yet</p>
                    ) : (
                      notifications.map(n => (
                        <div key={n._id} className={`p-2.5 rounded-xl text-[10px] leading-tight ${n.isRead ? 'bg-[#FAF9F6] text-slate-600' : 'bg-rose-50/50 text-slate-850 font-bold border border-rose-100/30'}`}>
                          <div className="flex justify-between items-center mb-0.5">
                            <span className="text-brand-red font-black uppercase text-[8px] tracking-wide">{n.senderName}</span>
                            <span className="text-slate-400 text-[8px]">{formatDate(n.createdAt)}</span>
                          </div>
                          <p className="mt-0.5">{n.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Picture (DP) */}
            {employee?.profilePicture ? (
              <img 
                src={employee.profilePicture} 
                alt="Profile" 
                className="w-9 h-9 rounded-full object-cover border border-slate-200"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200">
                <User size={16} />
              </div>
            )}
          </div>
        </div>

        {/* Content Wrapper */}
        <div className="flex-1 overflow-y-auto py-2 sm:py-4 min-h-0">
          
          {/* Notification Alerts */}
          {error && (
            <div className="bg-rose-50 border border-rose-100 text-brand-red text-xs font-bold p-3 rounded-2xl animate-fade-in flex items-start gap-2 mb-3 shrink-0">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="bg-[#ecfdf5] border border-emerald-100 text-emerald-700 text-xs font-bold p-3 rounded-2xl animate-fade-in flex items-start gap-2 mb-3 shrink-0">
              <CheckCircle size={14} className="shrink-0 mt-0.5" style={{ color: '#10b981' }} />
              <span>{successMsg}</span>
            </div>
          )}

          {/* TAB 1: HOME ATTENDANCE VIEW */}
          {activeTab === 'Home' && (
            <div className="space-y-3.5 sm:space-y-6">
              
              {/* Realtime Clock Header */}
              <div className="text-center space-y-0.5 sm:space-y-1 mt-1 sm:mt-2">
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight leading-none text-slate-850 tabular-nums">
                  {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                </h2>
                <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-widest block">
                  {currentTime.toLocaleDateString('en-GB', { weekday: 'long' })}, {formatDate(currentTime)}
                </span>
              </div>

              {/* Big Circle Punch Button */}
              {loading ? (
                <div className="py-6 flex flex-col items-center justify-center gap-3">
                  <div className="w-10 h-10 rounded-full border-2 border-slate-200 border-t-brand-red animate-spin" />
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Syncing status...</span>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  {!todayRecord ? (
                    /* Day In - Solid Green */
                    <button
                      onClick={handleMainPunchClick}
                      disabled={btnLoading}
                      className="w-32 h-32 sm:w-40 sm:h-40 rounded-full bg-[#10B981] hover:bg-emerald-600 text-white flex flex-col items-center justify-center gap-1.5 sm:gap-2 cursor-pointer transition-all active:scale-95 shadow-lg border-0 shrink-0"
                    >
                      <Fingerprint className="text-white/95 animate-pulse w-7 h-7 sm:w-10 sm:h-10" />
                      <span className="text-xs sm:text-sm font-extrabold uppercase tracking-widest">Day In</span>
                    </button>
                  ) : !todayRecord.checkOut ? (
                    /* Day Out - Pink Circle with Red Border Ring */
                    <button
                      onClick={handleMainPunchClick}
                      disabled={btnLoading}
                      className="w-32 h-32 sm:w-40 sm:h-40 rounded-full bg-rose-50 border-4 border-rose-500 text-brand-red flex flex-col items-center justify-center gap-1.5 sm:gap-2 cursor-pointer transition-all active:scale-95 shadow-md shrink-0"
                    >
                      <Fingerprint className="text-brand-red animate-pulse w-7 h-7 sm:w-10 sm:h-10" />
                      <span className="text-xs sm:text-sm font-extrabold uppercase tracking-widest">Day Out</span>
                    </button>
                  ) : (
                    /* Completed - Disabled Grey */
                    <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full bg-slate-100 border-4 border-slate-250 text-slate-400 flex flex-col items-center justify-center gap-1.5 sm:gap-2 shadow-xs shrink-0">
                      <CheckCircle className="w-7 h-7 sm:w-10 sm:h-10" />
                      <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider">Completed</span>
                    </div>
                  )}

                  {/* Mock Location */}
                  <div className="flex items-center gap-1 text-slate-450 text-[9px] sm:text-[10px] font-black uppercase tracking-wider mt-2.5 sm:mt-4">
                    <MapPin size={10} className="text-slate-400" />
                    <span>Office, Jaipur</span>
                  </div>
                </div>
              )}

              {/* 2x2 Log & Operation Grid */}
              <div className="grid grid-cols-2 gap-2 sm:gap-3.5 pt-1 sm:pt-2">
                {/* 1. Day In Log */}
                <div className="bg-white border border-[#E8E6E1] p-3 sm:p-4 rounded-xl sm:rounded-2xl flex flex-col justify-between h-20 sm:h-24 shadow-xs">
                  <span className="text-[10px] sm:text-xs text-slate-400 font-black uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle size={12} className="text-emerald-500" /> Day In
                  </span>
                  <strong className="text-slate-800 text-base sm:text-lg font-black leading-none mt-1 sm:mt-2">
                    {todayRecord ? formatTime(todayRecord.checkIn) : '--:--'}
                  </strong>
                </div>

                {/* 2. Day Out Log */}
                <div className="bg-white border border-[#E8E6E1] p-3 sm:p-4 rounded-xl sm:rounded-2xl flex flex-col justify-between h-20 sm:h-24 shadow-xs">
                  <span className="text-[10px] sm:text-xs text-slate-400 font-black uppercase tracking-wider flex items-center gap-1.5">
                    <Clock size={12} className="text-rose-500" /> Day Out
                  </span>
                  <strong className="text-slate-800 text-base sm:text-lg font-black leading-none mt-1 sm:mt-2">
                    {todayRecord?.checkOut ? formatTime(todayRecord.checkOut) : '--:--'}
                  </strong>
                </div>

                {/* 3. Punch In Action Card */}
                <button
                  onClick={handleCheckIn}
                  disabled={btnLoading || !!todayRecord}
                  className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl flex items-center justify-between h-20 sm:h-24 shadow-xs border-0 text-left cursor-pointer transition-all active:scale-95 ${
                    !todayRecord 
                      ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700' 
                      : 'bg-slate-50 text-slate-400 opacity-60 cursor-not-allowed'
                  }`}
                >
                  <div className="flex flex-col">
                    <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider">Punch In</span>
                    <span className="text-[9px] sm:text-[10px] font-bold mt-1 sm:mt-1.5">Check In</span>
                  </div>
                  <LogIn className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>

                {/* 4. Punch Out Action Card */}
                <button
                  onClick={handleCheckOut}
                  disabled={btnLoading || !todayRecord || !!todayRecord?.checkOut}
                  className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl flex items-center justify-between h-20 sm:h-24 shadow-xs border-0 text-left cursor-pointer transition-all active:scale-95 ${
                    (todayRecord && !todayRecord.checkOut) 
                      ? 'bg-rose-50 hover:bg-rose-100 text-rose-700' 
                      : 'bg-slate-50 text-slate-400 opacity-60 cursor-not-allowed'
                  }`}
                >
                  <div className="flex flex-col">
                    <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider">Punch Out</span>
                    <span className="text-[9px] sm:text-[10px] font-bold mt-1 sm:mt-1.5">Check Out</span>
                  </div>
                  <LogOut className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: CALENDAR HISTORY GRID VIEW */}
          {activeTab === 'Calendar' && (
            <div className="space-y-4 animate-fade-in select-none">
              
              {/* Header with Month Selector Dropdown */}
              <div className="flex items-center justify-between mt-2">
                <div className="space-y-0.5">
                  <h3 className="text-sm font-extrabold text-slate-800">My Attendance Calendar</h3>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Visual monthly record</p>
                </div>
                
                <select
                  value={selectedMonthOffset}
                  onChange={(e) => setSelectedMonthOffset(parseInt(e.target.value))}
                  className="bg-[#FAF9F6] border border-[#DEDCD8] rounded-xl text-xs font-black text-slate-850 p-2 outline-none cursor-pointer focus:border-slate-450"
                >
                  {monthOptions.map(opt => (
                    <option key={opt.offset} value={opt.offset}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Monthly Summary Statistics */}
              <div className="grid grid-cols-3 gap-3 bg-slate-50/50 p-3 rounded-2xl border border-slate-100 text-center shadow-xs">
                <div className="flex flex-col items-center">
                  <span className="flex items-center gap-1 text-[9px] text-slate-400 font-black uppercase tracking-wider">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Presents
                  </span>
                  <strong className="text-slate-800 text-base font-black mt-1 leading-none">{presentsCount}</strong>
                </div>
                <div className="flex flex-col items-center border-x border-slate-200">
                  <span className="flex items-center gap-1 text-[9px] text-slate-400 font-black uppercase tracking-wider">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Lates
                  </span>
                  <strong className="text-slate-800 text-base font-black mt-1 leading-none">{latesCount}</strong>
                </div>
                <div className="flex flex-col items-center">
                  <span className="flex items-center gap-1 text-[9px] text-slate-400 font-black uppercase tracking-wider">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Absents
                  </span>
                  <strong className="text-slate-800 text-base font-black mt-1 leading-none">{absentsCount}</strong>
                </div>
              </div>

              {/* Attendance Calendar Grid */}
              <div className="bg-white border border-[#EBEAE6] p-3.5 rounded-3xl shadow-xs">
                {/* Weekday Labels Header */}
                <div className="grid grid-cols-7 gap-2 text-center text-[10px] font-black text-slate-400 uppercase tracking-wider pb-2 mb-2 border-b border-slate-100">
                  <span>Sun</span>
                  <span>Mon</span>
                  <span>Tue</span>
                  <span>Wed</span>
                  <span>Thu</span>
                  <span>Fri</span>
                  <span>Sat</span>
                </div>

                {/* Calendar Days Cells Grid */}
                <div className="grid grid-cols-7 gap-2 text-center">
                  {gridCells.map((cell, idx) => {
                    if (cell.type === 'empty') {
                      return <div key={`empty-${idx}`} />;
                    }

                    // Determine cell colors based on status (solid red/green)
                    let colorClass = 'bg-white border border-slate-100 hover:border-slate-350 text-slate-655';
                    if (cell.status === 'Present') {
                      colorClass = 'bg-green-500 text-white font-black shadow-xs border-0';
                    } else if (cell.status === 'Late') {
                      colorClass = 'bg-amber-400 text-white font-black shadow-xs border-0';
                    } else if (cell.status === 'Absent') {
                      colorClass = 'bg-red-500 text-white font-black shadow-xs border-0';
                    } else if (cell.status === 'Weekend') {
                      colorClass = 'bg-slate-50 text-slate-350 border border-slate-105';
                    } else if (cell.status === 'Future') {
                      colorClass = 'bg-white border border-dashed border-slate-200 text-slate-300';
                    }

                    const isSelected = selectedDayDetails?.day === cell.day;
                    const ringClass = isSelected ? 'ring-2 ring-brand-red ring-offset-1' : '';
                    const todayTextClass = cell.isToday ? 'font-black underline decoration-2' : 'font-extrabold';

                    return (
                      <button
                        key={`day-${cell.day}`}
                        onClick={() => handleDayCellClick(cell)}
                        disabled={cell.status === 'Future'}
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs select-none cursor-pointer transition-all active:scale-90 outline-none ${colorClass} ${ringClass} ${todayTextClass}`}
                      >
                        {cell.day}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Day Inspector Card Details */}
              {selectedDayDetails ? (
                <div className="bg-[#FAF9F6] border border-[#EBEAE6] p-3.5 rounded-2xl space-y-2.5 animate-fade-in shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-800 font-extrabold">
                      {selectedDayDetails.dateLabel}
                    </span>

                    {/* Status Badge */}
                    <span className={`text-[8px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider text-white ${
                      selectedDayDetails.status === 'Present'
                        ? 'bg-green-500'
                        : selectedDayDetails.status === 'Late'
                        ? 'bg-amber-400'
                        : selectedDayDetails.status === 'Absent'
                        ? 'bg-red-500'
                        : 'bg-slate-400'
                    }`}>
                      {selectedDayDetails.status}
                    </span>
                  </div>

                  {selectedDayDetails.log ? (
                    <div className="grid grid-cols-2 gap-4 text-xs pt-1">
                      <div>
                        <span className="text-[8px] text-slate-400 font-black uppercase tracking-wider block">Punch In</span>
                        <strong className="text-slate-800 text-sm font-extrabold mt-0.5 block">
                          {formatTime(selectedDayDetails.log.checkIn)}
                        </strong>
                      </div>
                      <div>
                        <span className="text-[8px] text-slate-400 font-black uppercase tracking-wider block">Punch Out</span>
                        <strong className="text-slate-800 text-sm font-extrabold mt-0.5 block">
                          {selectedDayDetails.log.checkOut ? formatTime(selectedDayDetails.log.checkOut) : '--:--'}
                        </strong>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[10px] text-slate-400 font-semibold py-1">
                      {selectedDayDetails.status === 'Weekend' ? 'Weekly Off / Weekend' : 'No attendance check-in logged for this day.'}
                    </p>
                  )}
                </div>
              ) : null}

            </div>
          )}

          {/* TAB 3: MODULES VIEW */}
          {activeTab === 'Modules' && (
            <div className="space-y-4 animate-fade-in">
              <div className="space-y-1 mt-2">
                <h3 className="text-sm font-extrabold text-slate-800">Company Modules</h3>
                <p className="text-[10px] text-slate-450 font-semibold">Select an available employee service below.</p>
              </div>
              
              <div className="grid grid-cols-2 gap-3.5">
                {/* 1. Leave Request Card (Interactive) */}
                <div 
                  onClick={() => setActiveTab('Leaves')}
                  className="p-4 bg-white border border-[#EBEAE6] rounded-2xl flex flex-col justify-between h-24 hover:border-slate-350 transition-all cursor-pointer shadow-xs"
                >
                  <div className="w-8 h-8 rounded-xl bg-brand-red/10 text-brand-red flex items-center justify-center">
                    <Calendar size={16} />
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-855 leading-tight">Leave Request</h4>
                    <span className="text-[8px] text-slate-400 font-bold uppercase mt-0.5 block">Apply & View Status</span>
                  </div>
                </div>

                {/* 2. My Profile Card */}
                <div 
                  onClick={() => setActiveTab('Profile')}
                  className="p-4 bg-white border border-[#EBEAE6] rounded-2xl flex flex-col justify-between h-24 hover:border-slate-350 transition-all cursor-pointer shadow-xs"
                >
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center">
                    <User size={16} />
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-855 leading-tight">My Profile</h4>
                    <span className="text-[8px] text-slate-400 font-bold uppercase mt-0.5 block">View Info</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: LEAVE REQUEST LIST & SUBMISSION VIEW */}
          {activeTab === 'Leaves' && (
            <div className="space-y-4 animate-fade-in relative min-h-full">
              
              {/* Back Header */}
              <div className="flex items-center justify-between mt-2 pb-2 border-b border-slate-100">
                <button 
                  onClick={() => {
                    setActiveTab('Modules');
                    setShowLeaveForm(false);
                  }}
                  className="flex items-center gap-1.5 bg-transparent border-0 text-slate-500 hover:text-slate-800 text-xs font-bold cursor-pointer outline-none"
                >
                  <ChevronLeft size={16} />
                  <span>Back to Modules</span>
                </button>

                {!showLeaveForm && (
                  <button
                    onClick={() => {
                      setShowLeaveForm(true);
                      setLeaveFormSuccess('');
                      setLeaveFormError('');
                    }}
                    className="flex items-center gap-1 bg-brand-red hover:bg-brand-red-hover text-white text-[9px] font-black uppercase tracking-wider py-1.5 px-3 rounded-lg border-0 shadow-xs cursor-pointer active:scale-95 transition-all"
                  >
                    <Plus size={10} />
                    <span>Apply Leave</span>
                  </button>
                )}
              </div>

              {showLeaveForm ? (
                /* Apply Leave Form Screen */
                <form onSubmit={handleApplyLeave} className="space-y-4 pt-1 animate-fade-in">
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">New Leave Application</h3>
                  
                  {leaveFormError && (
                    <div className="bg-rose-50 border border-rose-100 text-brand-red text-[11px] font-bold p-2.5 rounded-xl flex items-center gap-1.5">
                      <AlertCircle size={13} className="shrink-0" />
                      <span>{leaveFormError}</span>
                    </div>
                  )}

                  <div className="space-y-3.5">
                    {/* Leave Type */}
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-wide">Leave Type</label>
                      <select
                        value={leaveType}
                        onChange={(e) => setLeaveType(e.target.value)}
                        className="w-full bg-[#FAF9F6] border border-[#DEDCD8] rounded-xl p-2.5 text-xs font-semibold text-slate-850 outline-none focus:border-slate-450 focus:bg-white transition-all cursor-pointer"
                      >
                        <option value="Casual">Casual Leave</option>
                        <option value="Sick">Sick Leave</option>
                        <option value="Earned">Earned Leave</option>
                        <option value="Maternity">Maternity Leave</option>
                        <option value="Unpaid">Unpaid Leave</option>
                      </select>
                    </div>

                    {/* Date Inputs Grid */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <DatePicker
                          label="Start Date"
                          value={leaveStartDate}
                          onChange={(val) => setLeaveStartDate(val)}
                          required
                        />
                      </div>
                      <div>
                        <DatePicker
                          label="End Date"
                          value={leaveEndDate}
                          onChange={(val) => setLeaveEndDate(val)}
                          required
                        />
                      </div>
                    </div>

                    {/* Reason */}
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-wide">Reason</label>
                      <textarea
                        value={leaveReason}
                        onChange={(e) => setLeaveReason(e.target.value)}
                        placeholder="Please write the reason for leave request..."
                        className="w-full bg-[#FAF9F6] border border-[#DEDCD8] rounded-xl p-3 text-xs font-semibold text-slate-855 outline-none focus:border-slate-450 focus:bg-white transition-all placeholder:text-slate-350 resize-none"
                        rows={3}
                        required
                      />
                    </div>
                  </div>

                  {/* Form Action Buttons */}
                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowLeaveForm(false)}
                      className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-650 text-xs font-extrabold rounded-xl border-0 cursor-pointer transition-all active:scale-98"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={btnLoading}
                      className="flex-1 py-3 bg-brand-red hover:bg-brand-red-hover text-white text-xs font-extrabold rounded-xl border-0 shadow-md cursor-pointer transition-all active:scale-98 flex items-center justify-center gap-1.5"
                    >
                      {btnLoading ? (
                        <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                      ) : (
                        'Submit Request'
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                /* Leaves History List Screen */
                <div className="space-y-3.5">
                  <div className="space-y-0.5">
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Leave Applications</h3>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Status of applied leaves</p>
                  </div>

                  {leaveLoading ? (
                    <div className="py-12 text-center text-slate-400 space-y-2">
                      <div className="w-6 h-6 rounded-full border-2 border-slate-200 border-t-brand-red animate-spin mx-auto" />
                      <p className="text-[8px] font-black uppercase tracking-wider">Fetching applications...</p>
                    </div>
                  ) : leavesList.length === 0 ? (
                    <div className="py-10 text-center bg-[#FAF9F6] border border-[#EBEAE6] rounded-2xl text-slate-400 space-y-1">
                      <p className="text-xs font-bold">No leave requests found.</p>
                      <p className="text-[9px] text-slate-350">Tap "Apply Leave" above to submit a new request.</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1 pb-4">
                      {leavesList.map((item) => (
                        <div 
                          key={item._id}
                          className="bg-white border border-[#EBEAE6] p-3 rounded-2xl shadow-xs space-y-2.5 hover:border-slate-300 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-slate-800">
                              {item.leaveType} Leave
                            </span>

                            {/* Status Tag */}
                            <span className={`text-[8px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider text-white ${
                              item.status === 'Approved'
                                ? 'bg-green-500'
                                : item.status === 'Rejected'
                                ? 'bg-red-500'
                                : 'bg-amber-400'
                            }`}>
                              {item.status}
                            </span>
                          </div>

                          <div className="text-[10px] text-slate-450 space-y-1">
                            <div className="flex justify-between">
                              <span>Duration</span>
                              <strong className="text-slate-700">
                                {formatDate(item.startDate)} - {formatDate(item.endDate)}
                              </strong>
                            </div>
                            <div className="pt-1.5 border-t border-slate-50 flex flex-col gap-0.5">
                              <span className="text-[8px] text-slate-400 uppercase tracking-wide">Reason</span>
                              <p className="text-slate-650 leading-relaxed italic">{item.reason}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

            </div>
          )}

          {/* TAB 5: PROFILE DETAIL VIEW */}
          {activeTab === 'Profile' && (
            <div className="space-y-4 animate-fade-in pb-4">
              {!editProfileMode ? (
                <>
                  <div className="flex flex-col items-center gap-3 py-4 bg-[#FAF9F6] border border-[#EBEAE6] rounded-2xl p-4">
                    {employee?.profilePicture ? (
                      <img 
                        src={employee.profilePicture} 
                        alt="Profile" 
                        className="w-16 h-16 rounded-full object-cover border-2 border-brand-red shadow-sm"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200">
                        <User size={28} />
                      </div>
                    )}
                    <div className="text-center">
                      <h3 className="text-sm font-extrabold text-slate-800">{employee?.name} {employee?.lastName}</h3>
                      <span className="text-[10px] font-black text-brand-red uppercase tracking-wider mt-0.5 block">{employee?.department || 'Employee'}</span>
                    </div>
                  </div>

                  {profileEditSuccess && (
                    <div className="bg-emerald-50 border border-emerald-100 text-emerald-600 text-xs font-bold p-3 rounded-2xl animate-fade-in">
                      {profileEditSuccess}
                    </div>
                  )}

                  <div className="space-y-3 bg-white border border-[#EBEAE6] rounded-2xl p-4 shadow-xs">
                    <div className="flex justify-between items-center text-xs py-1.5 border-b border-slate-100">
                      <span className="text-slate-400 font-semibold">Email</span>
                      <span className="text-slate-800 font-bold">{employee?.email}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs py-1.5 border-b border-slate-100">
                      <span className="text-slate-400 font-semibold">Phone</span>
                      <span className="text-slate-800 font-bold">{employee?.phone || 'Not provided'}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs py-1.5 border-b border-slate-100">
                      <span className="text-slate-400 font-semibold">Designation</span>
                      <span className="text-slate-800 font-bold">{employee?.designation || 'Employee'}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs py-1.5">
                      <span className="text-slate-400 font-semibold">Status</span>
                      <span className="text-emerald-600 font-extrabold uppercase text-[9px] tracking-wider bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                        {employee?.status}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2.5">
                    <button
                      onClick={() => {
                        setEditProfileMode(true);
                        setEditName(employee?.name || '');
                        setEditLastName(employee?.lastName || '');
                        setEditEmail(employee?.email || '');
                        setEditPhone(employee?.phone || '');
                        setEditProfilePicture(employee?.profilePicture || '');
                        setEditPassword('');
                        setProfileEditError('');
                        setProfileEditSuccess('');
                      }}
                      className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl shadow-xs border border-slate-200 flex items-center justify-center gap-2 cursor-pointer transition-colors active:scale-98"
                    >
                      Edit Profile
                    </button>
                    <button
                      onClick={handleLogout}
                      className="flex-1 py-3 bg-rose-50 hover:bg-rose-100 text-brand-red text-xs font-extrabold rounded-xl shadow-sm border border-rose-100 flex items-center justify-center gap-2 cursor-pointer transition-colors active:scale-98"
                    >
                      <LogOut size={14} />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </>
              ) : (
                /* Edit Profile Form Mode */
                <form 
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setProfileEditError('');
                    setProfileEditSuccess('');
                    setBtnLoading(true);
                    try {
                      const res = await employeeApi.updateProfile({
                        name: editName,
                        lastName: editLastName,
                        email: editEmail,
                        phone: editPhone,
                        profilePicture: editProfilePicture,
                        password: editPassword || undefined
                      });
                      if (res.success) {
                        setEmployee(res.employee);
                        localStorage.setItem('employee', JSON.stringify(res.employee));
                        setProfileEditSuccess('Profile updated successfully!');
                        setEditProfileMode(false);
                      }
                    } catch (err) {
                      setProfileEditError(err.response?.data?.message || 'Failed to update profile.');
                    } finally {
                      setBtnLoading(false);
                    }
                  }}
                  className="space-y-3.5 bg-white border border-[#EBEAE6] rounded-2xl p-5 shadow-xs"
                >
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Edit Profile Details</h3>
                  
                  {profileEditError && (
                    <div className="bg-rose-50 border border-rose-100 text-brand-red text-[11px] font-bold p-2.5 rounded-xl">
                      {profileEditError}
                    </div>
                  )}

                  {/* Profile Picture Upload */}
                  <div className="flex flex-col items-center gap-2 pb-2">
                    {editProfilePicture ? (
                      <img 
                        src={editProfilePicture} 
                        alt="Preview" 
                        className="w-16 h-16 rounded-full object-cover border-2 border-brand-red shadow-sm"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200">
                        <User size={28} />
                      </div>
                    )}
                    <label className="text-[10px] font-extrabold text-[#E31C1C] cursor-pointer hover:underline">
                      Upload Picture
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setEditProfilePicture(reader.result);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="hidden" 
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-455 uppercase tracking-wide">First Name</label>
                      <input 
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full bg-[#FAF9F6] border border-[#DEDCD8] rounded-xl p-2.5 text-xs font-semibold text-slate-850 outline-none focus:border-slate-400 focus:bg-white"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-455 uppercase tracking-wide">Last Name</label>
                      <input 
                        type="text"
                        value={editLastName}
                        onChange={(e) => setEditLastName(e.target.value)}
                        className="w-full bg-[#FAF9F6] border border-[#DEDCD8] rounded-xl p-2.5 text-xs font-semibold text-slate-850 outline-none focus:border-slate-400 focus:bg-white"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-455 uppercase tracking-wide">Email Address</label>
                    <input 
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      className="w-full bg-[#FAF9F6] border border-[#DEDCD8] rounded-xl p-2.5 text-xs font-semibold text-slate-850 outline-none focus:border-slate-400 focus:bg-white"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-455 uppercase tracking-wide">Phone Number</label>
                    <input 
                      type="text"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      className="w-full bg-[#FAF9F6] border border-[#DEDCD8] rounded-xl p-2.5 text-xs font-semibold text-slate-850 outline-none focus:border-slate-400 focus:bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-455 uppercase tracking-wide">Password (Leave blank to keep current)</label>
                    <input 
                      type="password"
                      value={editPassword}
                      onChange={(e) => setEditPassword(e.target.value)}
                      placeholder="New password"
                      className="w-full bg-[#FAF9F6] border border-[#DEDCD8] rounded-xl p-2.5 text-xs font-semibold text-slate-850 outline-none focus:border-slate-400 focus:bg-white"
                    />
                  </div>

                  <div className="flex gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => setEditProfileMode(false)}
                      className="flex-1 py-2.5 bg-white border border-[#DEDCD8] text-slate-500 rounded-xl text-xs font-bold cursor-pointer"
                      disabled={btnLoading}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2.5 bg-[#E31C1C] hover:bg-[#b81414] text-white rounded-xl text-xs font-bold cursor-pointer border-0"
                      disabled={btnLoading}
                    >
                      {btnLoading ? 'Saving...' : 'Save Profile'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

        </div>

        {/* Footer Navigation Bar */}
        <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-slate-100 flex justify-around items-center pt-3 pb-5 px-4 z-30 sm:absolute sm:bottom-0 sm:left-0 sm:right-0 sm:pb-3 sm:px-6 sm:rounded-b-3xl">
          <button 
            onClick={() => {
              setActiveTab('Home');
              setShowLeaveForm(false);
            }}
            className={`flex flex-col items-center gap-1 bg-transparent border-0 cursor-pointer transition-colors ${
              activeTab === 'Home' ? 'text-brand-red' : 'text-slate-400 hover:text-slate-650'
            }`}
          >
            <Home size={18} />
            <span className="text-[9px] font-extrabold uppercase tracking-wide">Home</span>
          </button>

          <button 
            onClick={() => {
              setActiveTab('Calendar');
              setShowLeaveForm(false);
            }}
            className={`flex flex-col items-center gap-1 bg-transparent border-0 cursor-pointer transition-colors ${
              activeTab === 'Calendar' ? 'text-brand-red' : 'text-slate-400 hover:text-slate-650'
            }`}
          >
            <Calendar size={18} />
            <span className="text-[9px] font-extrabold uppercase tracking-wide">Calendar</span>
          </button>

          <button 
            onClick={() => {
              setActiveTab('Modules');
              setShowLeaveForm(false);
            }}
            className={`flex flex-col items-center gap-1 bg-transparent border-0 cursor-pointer transition-colors ${
              activeTab === 'Modules' || activeTab === 'Leaves' ? 'text-brand-red' : 'text-slate-400 hover:text-slate-650'
            }`}
          >
            <Grid size={18} />
            <span className="text-[9px] font-extrabold uppercase tracking-wide">Modules</span>
          </button>

          <button 
            onClick={() => {
              setActiveTab('Profile');
              setShowLeaveForm(false);
            }}
            className={`flex flex-col items-center gap-1 bg-transparent border-0 cursor-pointer transition-colors ${
              activeTab === 'Profile' ? 'text-brand-red' : 'text-slate-400 hover:text-slate-650'
            }`}
          >
            <User size={18} />
            <span className="text-[9px] font-extrabold uppercase tracking-wide">Profile</span>
          </button>
        </div>

      </div>
    </div>
  );
}
