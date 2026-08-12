import employeeAxios from './employeeAxios';

export const employeeApi = {
  register: async (employeeData) => {
    const { data } = await employeeAxios.post('/employee/register', employeeData);
    return data;
  },

  login: async (email, password) => {
    const { data } = await employeeAxios.post('/employee/login', { email, password });
    return data;
  },

  getMe: async () => {
    const { data } = await employeeAxios.get('/employee/me');
    return data;
  },

  getTodayAttendance: async () => {
    const { data } = await employeeAxios.get('/attendance/today');
    return data;
  },

  checkIn: async (remarks) => {
    const { data } = await employeeAxios.post('/attendance/checkin', { remarks });
    return data;
  },

  checkOut: async () => {
    const { data } = await employeeAxios.post('/attendance/checkout');
    return data;
  },

  getDepartments: async () => {
    const { data } = await employeeAxios.get('/admin/departments');
    return data;
  },

  applyLeave: async (leaveData) => {
    const { data } = await employeeAxios.post('/employee/leaves', leaveData);
    return data;
  },

  getMyLeaves: async () => {
    const { data } = await employeeAxios.get('/employee/leaves');
    return data;
  },

  cancelLeave: async (id) => {
    const { data } = await employeeAxios.put(`/employee/leaves/${id}/cancel`);
    return data;
  },

  updateProfile: async (profileData) => {
    const { data } = await employeeAxios.put('/employee/me', profileData);
    return data;
  },

  getNotifications: async () => {
    const { data } = await employeeAxios.get('/employee/notifications');
    return data;
  },

  markNotificationsRead: async () => {
    const { data } = await employeeAxios.put('/employee/notifications/read');
    return data;
  }
};
