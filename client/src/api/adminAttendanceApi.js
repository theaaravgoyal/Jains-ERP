import axiosInstance from './axios';

export const adminAttendanceApi = {
  getPendingApprovals: async () => {
    const { data } = await axiosInstance.get('/admin/employees/pending');
    return data;
  },

  approveEmployee: async (id) => {
    const { data } = await axiosInstance.post(`/admin/employees/${id}/approve`);
    return data;
  },

  rejectEmployee: async (id) => {
    const { data } = await axiosInstance.post(`/admin/employees/${id}/reject`);
    return data;
  },

  getDailySummary: async () => {
    const { data } = await axiosInstance.get('/attendance/summary');
    return data;
  },

  getAttendanceStats: async () => {
    const { data } = await axiosInstance.get('/attendance/stats');
    return data;
  },

  createEmployee: async (employeeData) => {
    const { data } = await axiosInstance.post('/admin/employees/create', employeeData);
    return data;
  },

  updateEmployeeStatus: async (id, status) => {
    const { data } = await axiosInstance.put(`/admin/employees/${id}/status`, { status });
    return data;
  },

  getActiveEmployees: async () => {
    const { data } = await axiosInstance.get('/admin/employees');
    return data;
  },

  getAllLeaves: async () => {
    const { data } = await axiosInstance.get('/admin/leaves');
    return data;
  },

  updateLeaveStatus: async (id, status, remarks = '') => {
    const { data } = await axiosInstance.put(`/admin/leaves/${id}/status`, { status, remarks });
    return data;
  },

  updateLeaveDetails: async (id, leaveData) => {
    const { data } = await axiosInstance.put(`/admin/leaves/${id}`, leaveData);
    return data;
  },

  updateEmployee: async (id, employeeData) => {
    const { data } = await axiosInstance.put(`/admin/employees/${id}`, employeeData);
    return data;
  },

  updateEmployeeTiming: async (id, timingData) => {
    const { data } = await axiosInstance.put(`/admin/employees/${id}/attendance-timing`, timingData);
    return data;
  },

  getNotifications: async () => {
    const { data } = await axiosInstance.get('/admin/notifications');
    return data;
  },

  markNotificationsRead: async () => {
    const { data } = await axiosInstance.put('/admin/notifications/read');
    return data;
  },

  getMonthlyReport: async (employeeId, year, month) => {
    const { data } = await axiosInstance.get('/admin/attendance/report', {
      params: { employeeId, year, month }
    });
    return data;
  },

  getAttendanceSettings: async () => {
    const { data } = await axiosInstance.get('/admin/attendance/settings');
    return data;
  },

  updateAttendanceSettings: async (settingsData) => {
    const { data } = await axiosInstance.put('/admin/attendance/settings', settingsData);
    return data;
  },

  markHoliday: async (holidayData) => {
    const { data } = await axiosInstance.post('/admin/attendance/holiday', holidayData);
    return data;
  },

  getHolidays: async () => {
    const { data } = await axiosInstance.get('/admin/holidays');
    return data;
  },

  updateHoliday: async (id, holidayData) => {
    const { data } = await axiosInstance.put(`/admin/attendance/holiday/${id}`, holidayData);
    return data;
  },

  deleteHoliday: async (id) => {
    const { data } = await axiosInstance.delete(`/admin/attendance/holiday/${id}`);
    return data;
  }
};
