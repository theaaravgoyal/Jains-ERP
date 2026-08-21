import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Check, X, ShieldAlert, Sparkles, 
  Calendar, Users, Clock, Search, Plus, User, AlertCircle, Edit2, FileSpreadsheet, Trash2, Eye,
  Bell, CheckCheck, RefreshCw, MapPin, Info
} from 'lucide-react';
import { adminAttendanceApi } from '../../../api/adminAttendanceApi';
import { feesApi } from '../../../api/feesApi';
import Card from '../../../components/Card';
import Button from '../../../components/Button';
import { formatDate } from '../../../utils/dateUtils';
import DatePicker from '../../FeesManagement/components/DatePicker';

const compressImage = (base64Str, maxWidth = 150, maxHeight = 150) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.75));
    };
    img.onerror = () => {
      resolve(base64Str);
    };
  });
};

export default function Attendance() {
  const navigate = useNavigate();
  
  // Dashboard Core Data
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [dailySummary, setDailySummary] = useState([]);
  const [activeEmployees, setActiveEmployees] = useState([]);
  const [chartStats, setChartStats] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' or 'all_employees'
  const [employeePage, setEmployeePage] = useState(1);
  const [leavePage, setLeavePage] = useState(1);
  const [selectedLeave, setSelectedLeave] = useState(null);
  
  // UI States
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Right Sidebar Filter Tab: 'logged_in' (all present/late), 'on_time', 'late'
  const [sidebarTab, setSidebarTab] = useState('logged_in');
  const [searchQuery, setSearchQuery] = useState('');

  // Attendance Notifications States
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const dropdownRef = useRef(null);

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

  // Employee Specific Timing Modal States
  const [showEmployeeTimingModal, setShowEmployeeTimingModal] = useState(false);
  const [timingEmployeeId, setTimingEmployeeId] = useState('');
  const [timingEmployeeName, setTimingEmployeeName] = useState('');
  const [timingEnabled, setTimingEnabled] = useState(false);
  const [timingStartTime, setTimingStartTime] = useState('');
  const [timingEndTime, setTimingEndTime] = useState('');
  const [timingLateAfter, setTimingLateAfter] = useState('');
  const [timingHalfDayHours, setTimingHalfDayHours] = useState(4);

  // Admin Edit Leave Modal States
  const [showEditLeaveModal, setShowEditLeaveModal] = useState(false);
  const [editingLeaveId, setEditingLeaveId] = useState(null);
  const [editLeaveEmployeeName, setEditLeaveEmployeeName] = useState('');
  const [editLeaveStartDate, setEditLeaveStartDate] = useState('');
  const [editLeaveEndDate, setEditLeaveEndDate] = useState('');
  const [editLeaveType, setEditLeaveType] = useState('Casual');
  const [editLeaveStatus, setEditLeaveStatus] = useState('Approved');
  const [editLeaveRemarks, setEditLeaveRemarks] = useState('');
  const [editLeaveLoading, setEditLeaveLoading] = useState(false);
  const [editLeaveError, setEditLeaveError] = useState('');

  // Shift & Office Timings State
  const [attendanceSettings, setAttendanceSettings] = useState({
    officeStartTime: '10:00',
    officeEndTime: '18:00',
    lateThresholdTime: '10:15',
    halfDayThresholdHours: 4.0,
    fullDayThresholdHours: 8.0,
    monthlyPaidLeavesQuota: 2
  });
  const [showTimingModal, setShowTimingModal] = useState(false);
  const [timingFormData, setTimingFormData] = useState({
    officeStartTime: '10:00',
    officeEndTime: '18:00',
    lateThresholdTime: '10:15',
    halfDayThresholdHours: 4.0,
    fullDayThresholdHours: 8.0,
    monthlyPaidLeavesQuota: 2
  });
  const [timingLoading, setTimingLoading] = useState(false);
  const [timingError, setTimingError] = useState('');

  const isFetchingRef = useRef(false);

  const fetchData = async (silent = false) => {
    if (isFetchingRef.current && silent) return;
    isFetchingRef.current = true;
    try {
      if (!silent) setLoading(true);
      setError('');
      
      const [pendingRes, summaryRes, activeRes, statsRes, leavesRes, settingsRes] = await Promise.all([
        adminAttendanceApi.getPendingApprovals(),
        adminAttendanceApi.getDailySummary(),
        adminAttendanceApi.getActiveEmployees(),
        adminAttendanceApi.getAttendanceStats(),
        adminAttendanceApi.getAllLeaves(),
        adminAttendanceApi.getAttendanceSettings().catch(() => null)
      ]);
      
      if (pendingRes?.success) setPendingApprovals(pendingRes.pending || []);
      if (summaryRes?.success) setDailySummary(summaryRes.summary || []);
      if (activeRes?.success) setActiveEmployees(activeRes.employees || []);
      if (statsRes?.success) setChartStats(statsRes.stats || []);
      if (leavesRes?.success) setLeaveRequests(leavesRes.leaves || []);
      if (settingsRes?.success && settingsRes.settings) {
        setAttendanceSettings(settingsRes.settings);
        setTimingFormData(settingsRes.settings);
      }
    } catch (err) {
      if (!silent) {
        console.error('Failed to fetch attendance dashboard data:', err);
        const errMsg = err.userMessage || err.response?.data?.message || err.message || 'Failed to sync attendance logbooks with server.';
        setError(`Failed to sync attendance logbooks: ${errMsg}`);
      }
    } finally {
      if (!silent) setLoading(false);
      isFetchingRef.current = false;
    }
  };

  const fetchAttendanceNotifications = async (silent = false) => {
    try {
      if (!silent) setLoadingNotifications(true);
      const [listRes, countRes] = await Promise.all([
        feesApi.getNotifications({ module: 'Attendance', limit: 10 }),
        feesApi.getUnreadCount({ module: 'Attendance' })
      ]);
      
      if (listRes.success) {
        setNotifications(listRes.data.notifications || []);
      }
      if (countRes.success) {
        setUnreadCount(countRes.data.count || 0);
      }
    } catch (err) {
      if (!silent) console.error('Failed to fetch attendance notifications:', err);
    } finally {
      if (!silent) setLoadingNotifications(false);
    }
  };

  const handleNotificationClick = async (n) => {
    try {
      if (!n.isRead) {
        await feesApi.markNotificationRead(n._id);
      }
      setShowNotifications(false);
      fetchAttendanceNotifications(true);
      
      // Auto-tab navigation based on notification type/message content
      if (n.type === 'leave_request' || n.title.includes('Leave') || n.message.includes('leave')) {
        setActiveTab('leaves');
      } else if (n.title.includes('Approval') || n.title.includes('Registration') || n.message.includes('approve') || n.message.includes('register')) {
        setActiveTab('pending');
      }
    } catch (err) {
      console.error('Error on notification click:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await feesApi.markAllNotificationsRead();
      fetchAttendanceNotifications(true);
    } catch (err) {
      console.error('Failed to mark all notifications read:', err);
    }
  };

  useEffect(() => {
    fetchData();
    fetchAttendanceNotifications(true);
    // Auto-refresh in background every 15 seconds only when tab is active
    const interval = setInterval(() => {
      if (!document.hidden) {
        fetchData(true);
        fetchAttendanceNotifications(true);
      }
    }, 15000);

    const onVisibilityChange = () => {
      if (!document.hidden) {
        fetchData(true);
        fetchAttendanceNotifications(true);
      }
    };
    window.addEventListener('focus', onVisibilityChange);
    document.addEventListener('visibilitychange', onVisibilityChange);

    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onVisibilityChange);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      document.removeEventListener('mousedown', handleClickOutside);
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

  const handleSaveAttendanceSettings = async (e) => {
    e.preventDefault();
    setTimingError('');
    setTimingLoading(true);

    const payload = {
      ...timingFormData,
      officeLatitude: timingFormData.officeLatitude !== '' && timingFormData.officeLatitude !== undefined && timingFormData.officeLatitude !== null ? Number(timingFormData.officeLatitude) : 26.9405,
      officeLongitude: timingFormData.officeLongitude !== '' && timingFormData.officeLongitude !== undefined && timingFormData.officeLongitude !== null ? Number(timingFormData.officeLongitude) : 75.7145,
      allowedRadius: timingFormData.allowedRadius !== '' && timingFormData.allowedRadius !== undefined && timingFormData.allowedRadius !== null ? Number(timingFormData.allowedRadius) : 100
    };

    try {
      const res = await adminAttendanceApi.updateAttendanceSettings(payload);
      if (res.success) {
        setAttendanceSettings(res.settings);
        setShowTimingModal(false);
        setSuccess('Shift and Attendance timings updated successfully.');
        await fetchData(true);
      }
    } catch (err) {
      setTimingError(err.response?.data?.message || 'Failed to update attendance timings.');
    } finally {
      setTimingLoading(false);
    }
  };

  const handleApproveLeave = async (id, remarks = '') => {
    setActionLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await adminAttendanceApi.updateLeaveStatus(id, 'Approved', remarks);
      if (res.success) {
        setSuccess(res.message || 'Leave request approved successfully.');
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

  const handleOpenEditLeaveModal = (leave) => {
    setEditingLeaveId(leave._id);
    setEditLeaveEmployeeName(leave.employee ? `${leave.employee.name} ${leave.employee.lastName || ''}` : 'Employee');
    setEditLeaveStartDate(leave.startDate ? new Date(leave.startDate).toISOString().split('T')[0] : '');
    setEditLeaveEndDate(leave.endDate ? new Date(leave.endDate).toISOString().split('T')[0] : '');
    setEditLeaveType(leave.leaveType || 'Casual');
    setEditLeaveStatus(leave.status || 'Approved');
    setEditLeaveRemarks(leave.adminRemarks || '');
    setEditLeaveError('');
    setShowEditLeaveModal(true);
  };

  const handleSaveLeaveEdit = async (e) => {
    e.preventDefault();
    if (!editingLeaveId) return;
    setEditLeaveLoading(true);
    setEditLeaveError('');
    try {
      const res = await adminAttendanceApi.updateLeaveDetails(editingLeaveId, {
        startDate: editLeaveStartDate,
        endDate: editLeaveEndDate,
        leaveType: editLeaveType,
        status: editLeaveStatus,
        adminRemarks: editLeaveRemarks
      });
      if (res.success) {
        setSuccess(res.message || 'Leave details and attendance schedule updated successfully.');
        setShowEditLeaveModal(false);
        if (selectedLeave && selectedLeave._id === editingLeaveId) {
          setSelectedLeave(null);
        }
        await fetchData();
      }
    } catch (err) {
      setEditLeaveError(err.response?.data?.message || 'Failed to update leave details.');
    } finally {
      setEditLeaveLoading(false);
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

  const handleOpenEmployeeTimingModal = (emp) => {
    setTimingEmployeeId(emp._id || emp.id);
    setTimingEmployeeName(emp.name ? `${emp.name} ${emp.lastName || ''}` : '');
    
    // Check if employee has a schedule
    const schedule = emp.attendanceSchedule || {};
    setTimingEnabled(schedule.enabled || false);
    
    // Set to schedule values or fallback to global values (for UI display)
    setTimingStartTime(schedule.startTime || attendanceSettings.officeStartTime || '');
    setTimingEndTime(schedule.endTime || attendanceSettings.officeEndTime || '');
    setTimingLateAfter(schedule.lateAfter || attendanceSettings.lateThresholdTime || '');
    setTimingHalfDayHours(schedule.halfDayHours || attendanceSettings.halfDayThresholdHours || 4);
    
    setShowEmployeeTimingModal(true);
  };

  const handleUpdateEmployeeTiming = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await adminAttendanceApi.updateEmployeeTiming(timingEmployeeId, {
        enabled: timingEnabled,
        startTime: timingStartTime,
        endTime: timingEndTime,
        lateAfter: timingLateAfter,
        halfDayHours: timingHalfDayHours
      });
      fetchData(true); // silent refresh
      setShowEmployeeTimingModal(false);
    } catch (err) {
      console.error('Failed to update employee timing:', err);
      alert('Failed to update employee timing. Check console for details.');
    } finally {
      setActionLoading(false);
    }
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
    let paidLeaves = 0;
    let unpaidLeaves = 0;
    let weekends = 0;
    let holidays = 0;
    let halfDays = 0;

    reportData.forEach(day => {
      if (day.status === 'Present') presents++;
      else if (day.status === 'Late') lates++;
      else if (day.status === 'Absent') absents++;
      else if (day.status === 'Paid Leave' || day.status === 'Leave') paidLeaves++;
      else if (day.status === 'Unpaid Leave') unpaidLeaves++;
      else if (day.status === 'Weekend') weekends++;
      else if (day.status === 'Holiday') holidays++;
      else if (day.status === 'Half Day') halfDays++;
    });

    return { presents, lates, absents, paidLeaves, unpaidLeaves, weekends, holidays, halfDays };
  }, [reportData]);

  // Export to Excel
  const handleExportExcel = async () => {
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

    const XLSX = await import('xlsx');

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
      if (sidebarTab === 'leave_absent' && log.status !== 'Paid Leave' && log.status !== 'Unpaid Leave' && log.status !== 'Leave' && log.status !== 'Absent') return false;
      
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
    const leaveAbsentCount = dailySummary.filter(d => ['Paid Leave', 'Unpaid Leave', 'Leave', 'Absent'].includes(d.status)).length;
    
    return {
      active: totalActive,
      loggedIn: loggedInCount,
      onTime: onTimeCount,
      late: lateCount,
      leaveAbsent: leaveAbsentCount
    };
  }, [activeEmployees, dailySummary]);

  // Maximum value for bar chart heights scaling
  const chartMaxScale = useMemo(() => {
    if (chartStats.length === 0) return 120;
    const maxVal = Math.max(...chartStats.map(s => Math.max(s.onTime, s.late)));
    return maxVal > 0 ? maxVal * 1.2 : 120;
  }, [chartStats]);

  const leaveSummaryThisMonth = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    const leavesThisMonth = leaveRequests.filter(l => {
      if (!l.startDate) return false;
      const startDate = new Date(l.startDate);
      return startDate.getFullYear() === currentYear && startDate.getMonth() === currentMonth;
    });

    const total = leavesThisMonth.length;
    const approved = leavesThisMonth.filter(l => l.status === 'Approved').length;
    const rejected = leavesThisMonth.filter(l => l.status === 'Rejected').length;
    const pending = leavesThisMonth.filter(l => l.status === 'Pending').length;

    return { total, approved, rejected, pending };
  }, [leaveRequests]);

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

  // Prevent body scroll when any modal is open
  useEffect(() => {
    if (showTimingModal || showAddModal || showEditModal || showEditLeaveModal || showHolidayModal || showReportModal || showEmployeeTimingModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showTimingModal, showAddModal, showEditModal, showEditLeaveModal, showHolidayModal, showReportModal, showEmployeeTimingModal]);

  // Paginated Lists for All Employees & Leave Requests (5 items per page)
  const totalEmployeePages = Math.ceil(activeEmployees.length / 5) || 1;
  const safeEmployeePage = Math.min(employeePage, totalEmployeePages) || 1;
  const paginatedEmployees = activeEmployees.slice((safeEmployeePage - 1) * 5, safeEmployeePage * 5);

  const totalLeavePages = Math.ceil(leaveRequests.length / 5) || 1;
  const safeLeavePage = Math.min(leavePage, totalLeavePages) || 1;
  const paginatedLeaves = leaveRequests.slice((safeLeavePage - 1) * 5, safeLeavePage * 5);

  const renderPagination = (currentPage, totalPages, onPageChange) => {
    if (totalPages <= 1) return null;
    const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
    return (
      <div className="flex items-center justify-between pt-5 border-t border-[#E8E6E1] mt-4 flex-wrap gap-3">
        <span className="text-[11px] font-bold text-slate-500">
          Showing Page {currentPage} of {totalPages}
        </span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
            className="w-7 h-7 rounded-lg border border-[#E8E6E1] flex items-center justify-center text-slate-650 hover:bg-slate-50 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold bg-white active:scale-95 transition-all outline-none"
            title="First Page"
          >
            &laquo;
          </button>
          <button
            type="button"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="w-7 h-7 rounded-lg border border-[#E8E6E1] flex items-center justify-center text-slate-650 hover:bg-slate-50 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold bg-white active:scale-95 transition-all outline-none"
            title="Previous Page"
          >
            &lsaquo;
          </button>
          {pages.map(p => (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-extrabold transition-all active:scale-95 cursor-pointer outline-none ${
                currentPage === p
                  ? 'bg-[#E31C1C] text-white border-0 shadow-xs'
                  : 'border border-[#E8E6E1] text-slate-650 hover:bg-slate-50 bg-white'
              }`}
            >
              {p}
            </button>
          ))}
          <button
            type="button"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="w-7 h-7 rounded-lg border border-[#E8E6E1] flex items-center justify-center text-slate-650 hover:bg-slate-50 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold bg-white active:scale-95 transition-all outline-none"
            title="Next Page"
          >
            &rsaquo;
          </button>
          <button
            type="button"
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
            className="w-7 h-7 rounded-lg border border-[#E8E6E1] flex items-center justify-center text-slate-650 hover:bg-slate-50 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold bg-white active:scale-95 transition-all outline-none"
            title="Last Page"
          >
            &raquo;
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 p-4 md:p-8 text-slate-800 font-sans">
      
      {/* Premium Sub-Header exactly like the mockup */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-5 border-b border-[#E3E1DC]">
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
        <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
          
          {/* Attendance Notifications Bell */}
          <div className="relative flex items-center justify-center mr-1" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2.5 text-slate-500 hover:text-amber-500 hover:bg-slate-100 border border-slate-200 bg-white rounded-full transition-all cursor-pointer relative flex items-center justify-center outline-none shadow-sm"
              title="Attendance Notifications"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full bg-rose-500 text-white font-extrabold text-[8px] leading-none min-w-[14px] text-center shadow-sm">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-3 top-10 w-80 max-w-[calc(100vw-32px)] bg-white border border-slate-200 rounded-2xl shadow-xl p-3.5 space-y-2.5 max-h-[400px] overflow-y-auto z-50 flex flex-col">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100 shrink-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-extrabold text-slate-800 uppercase tracking-wider">Attendance Alerts</span>
                    {unreadCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-600 text-[8px] font-extrabold">{unreadCount} new</span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={handleMarkAllRead}
                      className="text-[9px] font-bold text-emerald-600 hover:text-emerald-700 border-0 bg-transparent cursor-pointer flex items-center gap-0.5"
                    >
                      <CheckCheck size={10} />
                      <span>Mark all read</span>
                    </button>
                  )}
                </div>

                <div className="space-y-1.5 flex-1 overflow-y-auto pr-0.5 min-h-[100px]">
                  {loadingNotifications && notifications.length === 0 ? (
                    <div className="flex justify-center items-center py-6">
                      <RefreshCw size={16} className="animate-spin text-slate-400" />
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="text-center py-6 text-slate-400">
                      <p className="text-[9px] font-bold uppercase tracking-wider mb-0.5">Inbox Clear</p>
                      <p className="text-[8px]">No attendance alerts.</p>
                    </div>
                  ) : (
                    notifications.map(n => (
                      <div
                        key={n._id}
                        onClick={() => handleNotificationClick(n)}
                        className={`p-2.5 rounded-xl text-xs leading-snug border transition-all cursor-pointer select-none hover:bg-slate-50 ${
                          n.isRead
                            ? 'bg-white text-slate-500 border-slate-100'
                            : 'bg-amber-50/10 text-slate-800 font-semibold border-amber-100/50 shadow-sm'
                        }`}
                      >
                        <div className="flex justify-between items-center mb-0.5 text-[8px]">
                          <span className="px-1.5 py-0.5 rounded font-extrabold uppercase text-blue-600 bg-blue-50">
                            {n.module}
                          </span>
                          <span className="text-slate-400 font-medium">
                            {new Date(n.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', timeZone: 'Asia/Kolkata' })}
                          </span>
                        </div>
                        <h4 className="text-[10px] font-extrabold text-slate-800 leading-tight mb-0.5">{n.title}</h4>
                        <p className="text-[9px] text-slate-500 font-medium leading-normal">{n.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div 
            onClick={() => {
              setTimingFormData({ ...attendanceSettings });
              setShowTimingModal(true);
            }}
            className="flex flex-col items-end hidden sm:flex bg-[#FAF9F6] hover:bg-slate-50 border border-[#E8E6E1] py-1.5 px-3.5 rounded-xl shadow-xs cursor-pointer transition-all group"
            title="Click to edit shift timings & leave quota"
          >
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-slate-500 font-bold tracking-wider uppercase">Office Shift</span>
              <span className="text-[9px] text-brand-red font-bold group-hover:underline flex items-center gap-0.5">
                • Edit
              </span>
            </div>
            <span className="text-xs font-extrabold text-slate-800 mt-0.5">
              {formatTime(attendanceSettings.officeStartTime)} to {formatTime(attendanceSettings.officeEndTime)}
              <span className="text-[10px] text-slate-400 font-semibold ml-1.5">(Half-Day &lt;{attendanceSettings.halfDayThresholdHours}h)</span>
            </span>
          </div>

          <button
            onClick={() => {
              setTimingFormData({ ...attendanceSettings });
              setShowTimingModal(true);
            }}
            className="py-2 px-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-xs flex items-center gap-1.5 sm:hidden"
            title="Configure Timings"
          >
            <Clock size={13} className="text-slate-500" />
            <span>Timings</span>
          </button>

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
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2.2fr)_minmax(330px,1fr)] gap-6 items-start">
          
          {/* LEFT COLUMN: Chart, Approvals, Profile Quick Card */}
          <div className="space-y-6 w-full min-w-0">
            
            {/* 1. Bar Chart Card */}
            <Card className="bg-white border border-[#E8E6E1] rounded-3xl p-6 shadow-xs">
              <div className="flex items-center justify-between pb-4 border-b border-[#FAF9F6]">
                <div className="space-y-1">
                  <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide">Attendance Status</h3>
                  <p className="text-xs text-slate-500 font-semibold">Past 10 days present ratios</p>
                </div>


              </div>

              {/* Chart Legend */}
              <div className="flex justify-end gap-4 py-3 text-xs font-bold">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
                  <span className="text-slate-600">On-time</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-red-300 inline-block" />
                  <span className="text-slate-600">Late</span>
                </div>
              </div>

              {/* Chart Plot Area */}
              <div className="overflow-x-auto scrollbar-thin">
                <div className="relative pt-6 pb-2 h-68 flex min-w-[500px]">
                
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
                            className="w-2.5 bg-emerald-500 rounded-t-sm transition-all duration-500 group-hover:brightness-95 relative"
                            title={`On-time: ${item.onTime}`}
                          />
                          {/* Late Rod */}
                          <div 
                            style={{ height: lateHeight }}
                            className="w-2.5 bg-red-300 rounded-t-sm transition-all duration-500 group-hover:brightness-95 relative"
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
            </div>
            </Card>

            {/* 2. Side-By-Side Bottom Section */}
            <div className="flex flex-col md:flex-row gap-6">
              
              {/* Table Card (Spans 3/3, extended because Add New Profile is removed) */}
              <Card className="md:col-span-3 bg-white border border-[#E8E6E1] rounded-3xl p-6 shadow-xs flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-[#FAF9F6]">
                    <div className="flex gap-5 overflow-x-auto whitespace-nowrap scrollbar-none w-full">
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
                          {paginatedEmployees.length === 0 ? (
                            <tr>
                              <td colSpan="5" className="py-12 text-center text-slate-500 font-bold text-xs">
                                No registered employees yet.
                              </td>
                            </tr>
                          ) : (
                            paginatedEmployees.map((emp) => (
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
                                      className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-bold hover:bg-blue-100 transition-colors border-0 cursor-pointer outline-none"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      onClick={() => handleOpenEmployeeTimingModal(emp)}
                                      className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-bold hover:bg-indigo-100 transition-colors border-0 cursor-pointer outline-none flex items-center gap-1"
                                      title="Attendance Timing"
                                    >
                                      <Clock size={12} />
                                      Timing
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
                            <th className="pb-3">Leave Allocation</th>
                            <th className="pb-3">Reason</th>
                            <th className="pb-3">Status</th>
                            <th className="pb-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#EBEAE6]">
                          {paginatedLeaves.length === 0 ? (
                            <tr>
                              <td colSpan="7" className="py-12 text-center text-slate-500 font-bold text-xs">
                                No leave applications found.
                              </td>
                            </tr>
                          ) : (
                            paginatedLeaves.map((item) => (
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
                                      <div className="flex flex-col">
                                        <span className="font-bold text-slate-800 text-sm">
                                          {item.employee.lastName ? `${item.employee.name} ${item.employee.lastName}` : item.employee.name}
                                        </span>
                                        <span className="text-[10px] text-slate-400 font-semibold">
                                          Quota: {item.paidUsedInMonth || 0}/{item.monthlyQuota || 2} Paid Used
                                        </span>
                                      </div>
                                    </>
                                  ) : (
                                    <span className="font-bold text-slate-400">Unknown Employee</span>
                                  )}
                                </td>
                                <td className="py-3 font-bold text-slate-800 text-xs">{item.leaveType}</td>
                                <td className="py-3 text-slate-550 text-xs font-semibold">
                                  {formatDate(item.startDate)} - {formatDate(item.endDate)}
                                </td>
                                <td className="py-3">
                                  {item.status === 'Approved' ? (
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                        {item.paidDaysCount ?? 0} Paid Day(s)
                                      </span>
                                      {(item.unpaidDaysCount || 0) > 0 && (
                                        <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200">
                                          +{item.unpaidDaysCount} Unpaid (LOP)
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-[10px] text-slate-500 italic">
                                      Pending Approval
                                    </span>
                                  )}
                                </td>
                                <td className="py-3">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedLeave(item)}
                                    className="text-left group flex items-center gap-1.5 max-w-[180px] hover:bg-slate-100/80 px-2 py-1 -mx-2 rounded-lg transition-all cursor-pointer border-0 bg-transparent"
                                    title="Click to read full message"
                                  >
                                    <span className="italic text-slate-600 truncate text-xs group-hover:text-slate-900 group-hover:underline font-medium">
                                      {item.reason}
                                    </span>
                                    <Eye size={12} className="text-slate-400 group-hover:text-brand-red shrink-0" />
                                  </button>
                                </td>
                                <td className="py-3">
                                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase text-white ${
                                    item.status === 'Approved'
                                      ? 'bg-green-500'
                                      : item.status === 'Rejected'
                                      ? 'bg-red-500'
                                      : item.status === 'Cancelled'
                                      ? 'bg-slate-500'
                                      : 'bg-amber-400'
                                  }`}>
                                    {item.status}
                                  </span>
                                </td>
                                <td className="py-3 text-right">
                                  <div className="inline-flex items-center gap-1.5 justify-end">
                                    {item.status === 'Pending' && (
                                      <>
                                        <button
                                          onClick={() => handleApproveLeave(item._id)}
                                          disabled={actionLoading}
                                          className="px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs flex items-center gap-1 cursor-pointer border border-emerald-200 active:scale-95 transition-all outline-none"
                                          title="Approve Leave (Auto-allocates up to 2 Paid Leaves, rest Unpaid)"
                                        >
                                          <Check size={12} />
                                          <span>Approve</span>
                                        </button>
                                        <button
                                          onClick={() => handleRejectLeave(item._id)}
                                          disabled={actionLoading}
                                          className="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-brand-red font-bold text-xs flex items-center gap-1 cursor-pointer border border-rose-200 active:scale-95 transition-all outline-none"
                                          title="Reject Leave"
                                        >
                                          <X size={12} />
                                          <span>Reject</span>
                                        </button>
                                      </>
                                    )}
                                    {/* Edit Button for Admin on ALL leave records */}
                                    <button
                                      onClick={() => handleOpenEditLeaveModal(item)}
                                      disabled={actionLoading}
                                      className="px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center gap-1 cursor-pointer border border-slate-200 active:scale-95 transition-all outline-none"
                                      title="Edit Leave Dates, Type, Status or Remarks"
                                    >
                                      <Edit2 size={12} />
                                      <span>Edit</span>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    ) : null}
                  </div>

                  {activeTab === 'all_employees' && renderPagination(safeEmployeePage, totalEmployeePages, setEmployeePage)}
                  {activeTab === 'leaves' && renderPagination(safeLeavePage, totalLeavePages, setLeavePage)}
                </div>
              </Card>



            </div>
          </div>

          {/* RIGHT SIDEBAR COLUMN: Checked-in logs & Leave Summary */}
          <div className="space-y-6 w-full min-w-0">
            
            {/* Checked-in Logs Card */}
            <div className="bg-white border border-[#E8E6E1] rounded-3xl p-5 shadow-xs space-y-4">
              {/* Sidebar Tabs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 bg-[#FAF9F6] border border-[#E8E6E1] p-1 rounded-xl text-[9px] xl:text-[10px] font-bold text-slate-500 select-none gap-1">
                <button 
                  onClick={() => setSidebarTab('logged_in')}
                  className={`py-2 rounded-lg text-center cursor-pointer transition-all truncate px-0.5 ${
                    sidebarTab === 'logged_in' 
                      ? 'bg-white text-slate-800 shadow-xs font-extrabold' 
                      : 'hover:text-slate-700'
                  }`}
                >
                  LOGGED IN ({counters.loggedIn})
                </button>
                <button 
                  onClick={() => setSidebarTab('on_time')}
                  className={`py-2 rounded-lg text-center cursor-pointer transition-all truncate px-0.5 ${
                    sidebarTab === 'on_time' 
                      ? 'bg-white text-slate-800 shadow-xs font-extrabold' 
                      : 'hover:text-slate-700'
                  }`}
                >
                  ON TIME ({counters.onTime})
                </button>
                <button 
                  onClick={() => setSidebarTab('late')}
                  className={`py-2 rounded-lg text-center cursor-pointer transition-all truncate px-0.5 ${
                    sidebarTab === 'late' 
                      ? 'bg-white text-slate-800 shadow-xs font-extrabold' 
                      : 'hover:text-slate-700'
                  }`}
                >
                  LATE ({counters.late})
                </button>
                <button 
                  onClick={() => setSidebarTab('leave_absent')}
                  className={`py-2 rounded-lg text-center cursor-pointer transition-all truncate px-0.5 ${
                    sidebarTab === 'leave_absent' 
                      ? 'bg-white text-slate-800 shadow-xs font-extrabold' 
                      : 'hover:text-slate-700'
                  }`}
                >
                  LEAVE/ABSENT ({counters.leaveAbsent})
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
              <div className="space-y-4 max-h-[215px] overflow-y-auto pr-1 custom-scrollbar">
                {filteredSidebarLogs.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs font-bold">
                    No matching employee records.
                  </div>
                ) : (
                  filteredSidebarLogs.map((log) => (
                    <div key={log.id} className="flex items-center justify-between group border-b border-[#EBEAE6]/40 pb-3.5 last:border-b-0 gap-2">
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
                        <div className="flex flex-col min-w-0 text-xs w-full">
                          <button
                            onClick={() => handleOpenReportModal({ _id: log.id, name: log.name, lastName: log.lastName, department: log.department, designation: log.designation, profilePicture: log.profilePicture })}
                            className="text-slate-800 font-extrabold leading-tight truncate hover:text-brand-red cursor-pointer transition-colors text-left border-0 bg-transparent p-0 outline-none block w-full"
                            title="View Attendance Report"
                          >
                            {log.lastName ? `${log.name} ${log.lastName}` : log.name}
                          </button>
                          <span className="text-slate-500 text-[10px] font-semibold truncate leading-none mt-1 w-full">
                            {log.designation || 'Staff'} | {log.department}
                          </span>
                          <span className="text-slate-400 text-[10px] font-medium leading-none mt-1 truncate w-full">
                            In: {formatTime(log.checkIn)} | Out: {formatTime(log.checkOut)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex flex-col items-end gap-1">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full inline-block ${
                              log.status === 'Present' ? 'bg-emerald-500 animate-pulse' :
                              log.status === 'Late' ? 'bg-red-300' :
                              ['Paid Leave', 'Unpaid Leave', 'Leave'].includes(log.status) ? 'bg-blue-400' :
                              'bg-rose-450'
                            }`} />
                            <span className="text-[10px] font-bold text-slate-500 uppercase select-none">
                              {log.status === 'Present' ? 'On-time' :
                               log.status === 'Late' ? 'Late' :
                               ['Paid Leave', 'Unpaid Leave', 'Leave'].includes(log.status) ? 'Leave' :
                               'Absent'}
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
            </div>

            {/* Leave Summary (This Month) Card */}
            <div className="bg-white border border-[#E8E6E1] rounded-3xl p-5 shadow-xs space-y-4">
              <div className="space-y-0.5">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wide">
                  Leave Summary (This Month)
                </h3>
              </div>
              
              <div className="grid grid-cols-2 gap-3.5">
                {/* Total Requests */}
                <div className="p-3.5 bg-slate-50/50 border border-[#E8E6E1] rounded-2xl">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider block">Total Requests</span>
                  <strong className="text-slate-800 text-lg font-black mt-1.5 block">{leaveSummaryThisMonth.total}</strong>
                </div>
                {/* Approved */}
                <div className="p-3.5 bg-emerald-50/60 border border-emerald-100 rounded-2xl">
                  <span className="text-[9px] font-black text-emerald-600 uppercase tracking-wider block">Approved</span>
                  <strong className="text-emerald-700 text-lg font-black mt-1.5 block">{leaveSummaryThisMonth.approved}</strong>
                </div>
                {/* Rejected */}
                <div className="p-3.5 bg-rose-50/50 border border-rose-100 rounded-2xl">
                  <span className="text-[9px] font-black text-brand-red uppercase tracking-wider block">Rejected</span>
                  <strong className="text-brand-red text-lg font-black mt-1.5 block">{leaveSummaryThisMonth.rejected}</strong>
                </div>
                {/* Pending */}
                <div className="p-3.5 bg-amber-50/60 border border-amber-100 rounded-2xl">
                  <span className="text-[9px] font-black text-amber-600 uppercase tracking-wider block">Pending</span>
                  <strong className="text-amber-700 text-lg font-black mt-1.5 block">{leaveSummaryThisMonth.pending}</strong>
                </div>
              </div>
            </div>

          </div>

        </div>
      )}



      {/* POPUP MODAL: Edit Employee Profile */}
      {showEditModal && (
        <div className="fixed inset-0 bg-[#0b0a09]/50 flex items-center justify-center p-4 z-50 animate-fade-in">
          <form onSubmit={handleUpdateEmployee} className="bg-white border border-[#E8E6E1] rounded-3xl w-[calc(100%-32px)] sm:w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh] min-h-0">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-[#EBEAE6] bg-[#FAF9F6] shrink-0">
              <div className="space-y-0.5">
                <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide">
                  Edit Employee Profile
                </h3>
                <p className="text-xs text-slate-500 font-semibold">Modify database records for this employee</p>
              </div>
              <button 
                type="button"
                onClick={() => setShowEditModal(false)} 
                className="text-slate-400 hover:text-slate-700 transition-colors cursor-pointer bg-transparent border-0 flex items-center justify-center"
              >
                <X size={16} />
              </button>
            </div>

            {/* Form Scroll Area */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              
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
                        reader.onloadend = async () => {
                          const compressed = await compressImage(reader.result);
                          setEditFormProfilePicture(compressed);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="hidden" 
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
            </div>

            {/* Footer */}
            <div className="flex gap-2.5 p-5 border-t border-[#EBEAE6] bg-[#FAF9F6] shrink-0">
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
      )}
      {/* FULLSCREEN OVERLAY MODAL: Monthly Attendance Report */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 sm:p-6 z-50 animate-fade-in">
          <div className="bg-white border border-[#E8E6E1] rounded-3xl w-[calc(100%-32px)] sm:w-full max-w-5xl shadow-2xl flex flex-col max-h-[80vh] min-h-0 overflow-hidden">
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
            <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
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
                  <div className="flex flex-wrap gap-2.5">
                    <div className="p-3 bg-emerald-50/60 border border-emerald-100 rounded-2xl text-center">
                      <span className="text-[9px] font-black text-emerald-600 uppercase tracking-wider block">Presents</span>
                      <strong className="text-emerald-700 text-base font-black mt-1 block">{reportStats.presents}</strong>
                    </div>
                    <div className="p-3 bg-amber-50/60 border border-amber-100 rounded-2xl text-center">
                      <span className="text-[9px] font-black text-amber-600 uppercase tracking-wider block">Lates</span>
                      <strong className="text-amber-700 text-base font-black mt-1 block">{reportStats.lates}</strong>
                    </div>
                    <div className="p-3 bg-cyan-50/60 border border-cyan-100 rounded-2xl text-center">
                      <span className="text-[9px] font-black text-cyan-600 uppercase tracking-wider block">Half Days</span>
                      <strong className="text-cyan-700 text-base font-black mt-1 block">{reportStats.halfDays}</strong>
                    </div>
                    <div className="p-3 bg-teal-50/60 border border-teal-100 rounded-2xl text-center">
                      <span className="text-[9px] font-black text-teal-600 uppercase tracking-wider block">Paid Leaves</span>
                      <strong className="text-teal-700 text-base font-black mt-1 block">{reportStats.paidLeaves}</strong>
                    </div>
                    <div className="p-3 bg-orange-50/60 border border-orange-100 rounded-2xl text-center">
                      <span className="text-[9px] font-black text-orange-600 uppercase tracking-wider block">Unpaid (LOP)</span>
                      <strong className="text-orange-700 text-base font-black mt-1 block">{reportStats.unpaidLeaves}</strong>
                    </div>
                    <div className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-2xl text-center">
                      <span className="text-[9px] font-black text-indigo-650 uppercase tracking-wider block">Holidays</span>
                      <strong className="text-indigo-700 text-base font-black mt-1 block">{reportStats.holidays}</strong>
                    </div>
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-center">
                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider block">Weekends</span>
                      <strong className="text-slate-655 text-base font-black mt-1 block">{reportStats.weekends}</strong>
                    </div>
                    <div className="p-3 bg-rose-50/50 border border-rose-100/80 rounded-2xl text-center">
                      <span className="text-[9px] font-black text-brand-red uppercase tracking-wider block">Absents</span>
                      <strong className="text-brand-red text-base font-black mt-1 block">{reportStats.absents}</strong>
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
                                  ? 'bg-red-50 text-red-500 border border-red-100'
                                  : day.status === 'Absent'
                                  ? 'bg-red-100 text-red-700 border border-red-200'
                                  : day.status === 'Half Day'
                                  ? 'bg-cyan-50 text-cyan-700 border border-cyan-200'
                                  : day.status === 'Paid Leave'
                                  ? 'bg-teal-50 text-teal-700 border border-teal-200'
                                  : day.status === 'Unpaid Leave'
                                  ? 'bg-orange-50 text-orange-700 border border-orange-200'
                                  : day.status === 'Holiday'
                                  ? 'bg-indigo-50 text-indigo-600 border border-indigo-100'
                                  : day.status === 'Leave'
                                  ? 'bg-blue-50 text-blue-600 border border-blue-100'
                                  : day.status === 'Weekend'
                                  ? 'bg-slate-100 text-slate-500 border border-slate-200'
                                  : 'bg-rose-50 text-brand-red border border-rose-100'
                              }`}>
                                {day.status === 'Paid Leave' ? 'Paid Leave' : day.status === 'Unpaid Leave' ? 'Unpaid (LOP)' : day.status}
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
          <div className="bg-white border border-[#E8E6E1] rounded-3xl w-[calc(100%-32px)] sm:w-full max-w-xl shadow-2xl p-5 sm:p-6 relative flex flex-col max-h-[90vh] min-h-0 overflow-hidden">
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

      {/* LEAVE DETAILS FULL MESSAGE MODAL */}
      {selectedLeave && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border border-[#E8E6E1] rounded-3xl w-[calc(100%-32px)] sm:w-full max-w-md shadow-2xl p-5 sm:p-6 relative flex flex-col max-h-[90vh] min-h-0 overflow-hidden">
            
            {/* Close button */}
            <button 
              onClick={() => setSelectedLeave(null)}
              className="absolute top-4 right-4 p-1.5 rounded-xl border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-all cursor-pointer outline-none"
            >
              <X size={16} />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100 shrink-0">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-100 text-brand-red flex items-center justify-center font-bold text-sm">
                {selectedLeave.employee?.name ? selectedLeave.employee.name[0] : 'L'}
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-800">
                  {selectedLeave.employee ? (selectedLeave.employee.lastName ? `${selectedLeave.employee.name} ${selectedLeave.employee.lastName}` : selectedLeave.employee.name) : 'Employee'}
                </h3>
                <span className="text-[10px] text-slate-450 font-bold uppercase tracking-wider">
                  {selectedLeave.leaveType} Leave Application
                </span>
              </div>
            </div>

            {/* Scrollable Body Content */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 py-1">
              {/* Duration & Status Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#FAF9F6] p-3.5 rounded-2xl border border-[#E8E6E1] text-xs">
                <div>
                  <span className="text-[9px] uppercase tracking-wider text-slate-400 font-extrabold block">Duration</span>
                  <span className="font-bold text-slate-800 text-[11px]">
                    {formatDate(selectedLeave.startDate)} &mdash; {formatDate(selectedLeave.endDate)}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] uppercase tracking-wider text-slate-400 font-extrabold block">Status</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase inline-block mt-0.5 text-white ${
                    selectedLeave.status === 'Approved'
                      ? 'bg-green-500'
                      : selectedLeave.status === 'Rejected'
                      ? 'bg-red-500'
                      : 'bg-amber-400'
                  }`}>
                    {selectedLeave.status}
                  </span>
                </div>
              </div>

              {/* Full Message Body */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                  Complete Leave Reason Message:
                </label>
                <div className="bg-[#FAF9F6] border border-[#DEDCD8] rounded-2xl p-4 text-xs font-semibold text-slate-750 whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
                  {selectedLeave.reason || 'No detailed message provided.'}
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2.5 pt-4 border-t border-slate-100 shrink-0">
              {selectedLeave.status === 'Pending' ? (
                <>
                  <button
                    onClick={async () => {
                      await handleApproveLeave(selectedLeave._id);
                      setSelectedLeave(null);
                    }}
                    disabled={actionLoading}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-all cursor-pointer shadow-sm border-0 flex items-center justify-center gap-1.5 active:scale-95"
                  >
                    <Check size={14} />
                    <span>Approve</span>
                  </button>
                  <button
                    onClick={async () => {
                      await handleRejectLeave(selectedLeave._id);
                      setSelectedLeave(null);
                    }}
                    disabled={actionLoading}
                    className="flex-1 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold transition-all cursor-pointer shadow-sm border-0 flex items-center justify-center gap-1.5 active:scale-95"
                  >
                    <X size={14} />
                    <span>Reject</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    const l = selectedLeave;
                    setSelectedLeave(null);
                    handleOpenEditLeaveModal(l);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition-all cursor-pointer shadow-sm border-0 flex items-center justify-center gap-1.5 active:scale-95"
                >
                  <Edit2 size={14} />
                  <span>Edit Dates / Status</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelectedLeave(null)}
                className="py-2.5 px-4 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 text-xs font-bold transition-all cursor-pointer"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* SHIFT & OFFICE TIMINGS CONFIGURATION MODAL */}
      {showTimingModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <form onSubmit={handleSaveAttendanceSettings} className="bg-white border border-[#E8E6E1] rounded-3xl w-[calc(100%-32px)] sm:w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh] min-h-0">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-[#EBEAE6] bg-[#FAF9F6] shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-red-50 text-brand-red flex items-center justify-center border border-red-100">
                  <Clock size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide">
                    Shift & Attendance Rules
                  </h3>
                  <p className="text-[11px] text-slate-400 font-semibold">
                    Configure office timings, half-day duration limit & paid leave quota
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setShowTimingModal(false)}
                className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-2 rounded-full transition-colors cursor-pointer bg-transparent border-0 flex items-center justify-center outline-none"
              >
                <X size={18} />
              </button>
            </div>
              {/* Scrollable Fields */}
              <div className="p-5 sm:p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1 min-h-0">
                {timingError && (
                  <div className="bg-rose-50 border border-rose-100 text-brand-red text-xs font-bold p-3 rounded-xl flex items-center gap-2">
                    <AlertCircle size={14} className="shrink-0" />
                    <span>{timingError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Office Start Time */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                      Office Start Time (24h)
                    </label>
                    <input
                      type="time"
                      required
                      value={timingFormData.officeStartTime || '10:00'}
                      onChange={(e) => setTimingFormData({ ...timingFormData, officeStartTime: e.target.value })}
                      className="w-full bg-[#FAF9F6] border border-[#DEDCD8] rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-brand-red focus:bg-white transition-all"
                    />
                    <span className="text-[9px] text-slate-400 font-semibold block">Official shift commencement</span>
                  </div>

                  {/* Office End Time */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                      Office End Time (24h)
                    </label>
                    <input
                      type="time"
                      required
                      value={timingFormData.officeEndTime || '18:00'}
                      onChange={(e) => setTimingFormData({ ...timingFormData, officeEndTime: e.target.value })}
                      className="w-full bg-[#FAF9F6] border border-[#DEDCD8] rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-brand-red focus:bg-white transition-all"
                    />
                    <span className="text-[9px] text-slate-400 font-semibold block">Official shift punch-out</span>
                  </div>

                  {/* Late Check-in Threshold */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                      Late Grace Time (24h)
                    </label>
                    <input
                      type="time"
                      required
                      value={timingFormData.lateThresholdTime || '10:15'}
                      onChange={(e) => setTimingFormData({ ...timingFormData, lateThresholdTime: e.target.value })}
                      className="w-full bg-[#FAF9F6] border border-[#DEDCD8] rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-brand-red focus:bg-white transition-all"
                    />
                    <span className="text-[9px] text-slate-400 font-semibold block">Check-ins after this time mark Late</span>
                  </div>

                  {/* Half-Day Threshold (Hours) */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                      Half-Day Hours Limit
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="1"
                      max="12"
                      required
                      value={timingFormData.halfDayThresholdHours ?? 4.0}
                      onChange={(e) => setTimingFormData({ ...timingFormData, halfDayThresholdHours: Number(e.target.value) })}
                      className="w-full bg-[#FAF9F6] border border-[#DEDCD8] rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-brand-red focus:bg-white transition-all"
                    />
                    <span className="text-[9px] text-slate-400 font-semibold block">Working &lt; this marks Half-Day (e.g. 4 hrs)</span>
                  </div>

                  {/* Monthly Paid Leaves Quota */}
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                      Monthly Paid Leaves Quota (per employee)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="31"
                      required
                      value={timingFormData.monthlyPaidLeavesQuota ?? 2}
                      onChange={(e) => setTimingFormData({ ...timingFormData, monthlyPaidLeavesQuota: Number(e.target.value) })}
                      className="w-full bg-[#FAF9F6] border border-[#DEDCD8] rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-brand-red focus:bg-white transition-all"
                    />
                    <span className="text-[9px] text-slate-400 font-semibold block">
                      Leaves approved up to this count in a calendar month are Paid (No salary deduction). Extra leaves become Unpaid / Loss of Pay.
                    </span>
                  </div>

                  {/* Geofencing Config */}
                  <div className="space-y-1 sm:col-span-2 pt-2.5 border-t border-[#EBEAE6]">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="geofencingEnabled"
                        checked={timingFormData.geofencingEnabled || false}
                        onChange={(e) => setTimingFormData({ ...timingFormData, geofencingEnabled: e.target.checked })}
                        className="w-4 h-4 text-brand-red border-[#DEDCD8] rounded focus:ring-brand-red cursor-pointer accent-[#E31C1C]"
                      />
                      <label htmlFor="geofencingEnabled" className="text-xs font-extrabold text-slate-700 cursor-pointer select-none">
                        Enable Location Geofencing
                      </label>
                    </div>
                    <span className="text-[9px] text-slate-400 font-semibold block">
                      Force employees to punch in/out only when they are within the office boundary area.
                    </span>
                  </div>

                  {timingFormData.geofencingEnabled && (
                    <>
                      <div className="sm:col-span-2 flex justify-end">
                        <button
                          type="button"
                          onClick={async () => {
                            if (!navigator.geolocation) {
                              alert("Geolocation is not supported by your browser.");
                              return;
                            }
                            navigator.geolocation.getCurrentPosition(
                              (position) => {
                                setTimingFormData({
                                  ...timingFormData,
                                  officeLatitude: position.coords.latitude.toFixed(6),
                                  officeLongitude: position.coords.longitude.toFixed(6)
                                });
                              },
                              (error) => {
                                alert("Failed to fetch location: " + error.message);
                              },
                              { enableHighAccuracy: true }
                            );
                          }}
                          className="py-1.5 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-[10px] font-bold text-slate-700 transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
                        >
                          <MapPin size={12} className="text-amber-500" />
                          <span>Detect My Location</span>
                        </button>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                          Office Latitude
                        </label>
                        <input
                          type="text"
                          required
                          value={timingFormData.officeLatitude ?? ''}
                          onChange={(e) => setTimingFormData({ ...timingFormData, officeLatitude: e.target.value })}
                          className="w-full bg-[#FAF9F6] border border-[#DEDCD8] rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-brand-red focus:bg-white transition-all"
                          placeholder="e.g. 26.9405"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                          Office Longitude
                        </label>
                        <input
                          type="text"
                          required
                          value={timingFormData.officeLongitude ?? ''}
                          onChange={(e) => setTimingFormData({ ...timingFormData, officeLongitude: e.target.value })}
                          className="w-full bg-[#FAF9F6] border border-[#DEDCD8] rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-brand-red focus:bg-white transition-all"
                          placeholder="e.g. 75.7145"
                        />
                      </div>

                      <div className="space-y-1 sm:col-span-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                          Allowed Radius (meters)
                        </label>
                        <input
                          type="number"
                          min="5"
                          max="5000"
                          required
                          value={timingFormData.allowedRadius ?? ''}
                          onChange={(e) => setTimingFormData({ ...timingFormData, allowedRadius: e.target.value })}
                          className="w-full bg-[#FAF9F6] border border-[#DEDCD8] rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-brand-red focus:bg-white transition-all"
                          placeholder="e.g. 100"
                        />
                        <span className="text-[9px] text-slate-400 font-semibold block">
                          Allowed distance radius from the coordinates (in meters) to log attendance.
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>

            {/* Action Buttons */}
            <div className="flex gap-3 p-5 bg-[#FAF9F6] border-t border-[#EBEAE6] shrink-0">
              <button
                type="button"
                onClick={() => setShowTimingModal(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer border-0"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={timingLoading}
                className="flex-1 py-2.5 bg-[#E31C1C] hover:bg-[#b81414] text-white rounded-xl text-xs font-bold transition-colors cursor-pointer border-0 shadow-sm disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {timingLoading ? (
                  <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                ) : (
                  <>
                    <Check size={14} />
                    <span>Save Shift Settings</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ADMIN EDIT LEAVE MODAL */}
      {showEditLeaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-[calc(100%-32px)] sm:w-full shadow-2xl border border-[#E8E6E1] flex flex-col max-h-[90vh] min-h-0 overflow-hidden">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#EBEAE6] p-5 sm:p-6 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-brand-red/10 text-brand-red">
                  <Edit2 size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-800 tracking-tight">Edit Leave Request</h3>
                  <p className="text-[11px] text-slate-400 font-medium">Employee: <strong className="text-slate-750">{editLeaveEmployeeName}</strong></p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setShowEditLeaveModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer transition-colors border-0"
              >
                <X size={16} />
              </button>
            </div>

            {editLeaveError && (
              <div className="mx-5 mt-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2 font-medium shrink-0">
                <AlertCircle size={14} className="shrink-0" />
                <span>{editLeaveError}</span>
              </div>
            )}

            <form onSubmit={handleSaveLeaveEdit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              {/* Scrollable Fields */}
              <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  
                  {/* Start Date */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                      Leave Start Date
                    </label>
                    <input
                      type="date"
                      required
                      value={editLeaveStartDate}
                      onChange={(e) => setEditLeaveStartDate(e.target.value)}
                      className="w-full bg-[#FAF9F6] border border-[#DEDCD8] rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-brand-red focus:bg-white transition-all"
                    />
                  </div>

                  {/* End Date */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                      Leave End Date
                    </label>
                    <input
                      type="date"
                      required
                      value={editLeaveEndDate}
                      onChange={(e) => setEditLeaveEndDate(e.target.value)}
                      className="w-full bg-[#FAF9F6] border border-[#DEDCD8] rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-brand-red focus:bg-white transition-all"
                    />
                  </div>

                  {/* Leave Type */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                      Leave Category / Type
                    </label>
                    <select
                      value={editLeaveType}
                      onChange={(e) => setEditLeaveType(e.target.value)}
                      className="w-full bg-[#FAF9F6] border border-[#DEDCD8] rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-brand-red focus:bg-white transition-all"
                    >
                      <option value="Casual">Casual Leave</option>
                      <option value="Sick">Sick Leave</option>
                      <option value="Earned">Earned Leave</option>
                      <option value="Maternity">Maternity Leave</option>
                      <option value="Unpaid">Unpaid Leave (LOP)</option>
                    </select>
                  </div>

                  {/* Status */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                      Approval Status
                    </label>
                    <select
                      value={editLeaveStatus}
                      onChange={(e) => setEditLeaveStatus(e.target.value)}
                      className="w-full bg-[#FAF9F6] border border-[#DEDCD8] rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-brand-red focus:bg-white transition-all"
                    >
                      <option value="Approved">Approved (Auto-reconciles Attendance)</option>
                      <option value="Pending">Pending Review</option>
                      <option value="Rejected">Rejected</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>

                  {/* Admin Remarks */}
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                      Admin Note / Instructions (Visible to Employee)
                    </label>
                    <textarea
                      rows={2}
                      value={editLeaveRemarks}
                      onChange={(e) => setEditLeaveRemarks(e.target.value)}
                      placeholder="e.g. Dates adjusted per discussion..."
                      className="w-full bg-[#FAF9F6] border border-[#DEDCD8] rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-brand-red focus:bg-white transition-all resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons Footer */}
              <div className="flex gap-3 p-5 sm:p-6 bg-[#FAF9F6] border-t border-[#EBEAE6] shrink-0">
                <button
                  type="button"
                  onClick={() => setShowEditLeaveModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer border-0"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLeaveLoading}
                  className="flex-1 py-2.5 bg-[#E31C1C] hover:bg-[#b81414] text-white rounded-xl text-xs font-bold transition-colors cursor-pointer border-0 shadow-sm disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {editLeaveLoading ? (
                    <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                  ) : (
                    <>
                      <Check size={14} />
                      <span>Save & Sync Leave</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EMPLOYEE TIMING MODAL */}
      {showEmployeeTimingModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 sm:p-6 z-50 animate-fade-in">
          <div className="bg-white border border-[#E8E6E1] rounded-3xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 sm:p-6 border-b border-[#EBEAE6] bg-[#FAF9F6]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                  <Clock size={20} />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold text-slate-800 tracking-tight uppercase">
                    Attendance Timing
                  </h3>
                  <p className="text-[10px] sm:text-xs text-slate-500 font-semibold mt-0.5">
                    {timingEmployeeName}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowEmployeeTimingModal(false)}
                className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-2 rounded-full transition-colors cursor-pointer bg-transparent border-0 flex items-center justify-center outline-none"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleUpdateEmployeeTiming} className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
              <div className="p-5 sm:p-6 space-y-6 flex-1">
                
                {/* Global vs Custom Toggle */}
                <div className="flex items-center justify-between p-4 bg-[#FAF9F6] border border-[#EBEAE6] rounded-2xl">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Enable Individual Timing</h4>
                    <p className="text-[10px] font-semibold text-slate-500 mt-0.5">Override global shift settings</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={timingEnabled}
                      onChange={(e) => setTimingEnabled(e.target.checked)}
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-500"></div>
                  </label>
                </div>

                {!timingEnabled && (
                  <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-[10px] font-bold text-amber-600 flex items-start gap-2">
                    <Info size={14} className="shrink-0 mt-0.5" />
                    <p>Individual timing is disabled. The employee is currently using the global/default attendance timing.</p>
                  </div>
                )}

                <div className={`space-y-5 ${!timingEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {/* Start Time */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Office Start Time</label>
                      <input
                        type="time"
                        required={timingEnabled}
                        value={timingStartTime}
                        onChange={(e) => setTimingStartTime(e.target.value)}
                        className="w-full bg-[#FAF9F6] border border-[#DEDCD8] rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 focus:bg-white transition-all cursor-pointer"
                      />
                    </div>
                    {/* End Time */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Office End Time</label>
                      <input
                        type="time"
                        required={timingEnabled}
                        value={timingEndTime}
                        onChange={(e) => setTimingEndTime(e.target.value)}
                        className="w-full bg-[#FAF9F6] border border-[#DEDCD8] rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 focus:bg-white transition-all cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {/* Late Grace Time */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block flex items-center gap-1">
                        Late Grace Time <Info size={10} className="text-slate-400" />
                      </label>
                      <input
                        type="time"
                        required={timingEnabled}
                        value={timingLateAfter}
                        onChange={(e) => setTimingLateAfter(e.target.value)}
                        className="w-full bg-[#FAF9F6] border border-[#DEDCD8] rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 focus:bg-white transition-all cursor-pointer"
                      />
                      <p className="text-[9px] text-slate-400 font-semibold px-1">Check-in after this = Late</p>
                    </div>
                    {/* Half Day Hours */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block flex items-center gap-1">
                        Half-Day Hours
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="24"
                        step="0.5"
                        required={timingEnabled}
                        value={timingHalfDayHours}
                        onChange={(e) => setTimingHalfDayHours(Number(e.target.value))}
                        className="w-full bg-[#FAF9F6] border border-[#DEDCD8] rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 focus:bg-white transition-all"
                      />
                      <p className="text-[9px] text-slate-400 font-semibold px-1">Work less than this = Half Day</p>
                    </div>
                  </div>
                </div>

              </div>
              
              {/* Action Buttons Footer */}
              <div className="flex gap-3 p-5 sm:p-6 bg-[#FAF9F6] border-t border-[#EBEAE6] shrink-0">
                <button
                  type="button"
                  onClick={() => setShowEmployeeTimingModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer border-0"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer border-0 shadow-sm disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {actionLoading ? (
                    <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                  ) : (
                    <>
                      <Check size={14} />
                      <span>Save Timing</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
