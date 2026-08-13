import axiosInstance from './axios';

/**
 * Fees API - Client wrapper for interacting with all student financial services on the backend.
 */
export const feesApi = {
  // --- Student profiles ---
  getStudents: async () => {
    const response = await axiosInstance.get('/students');
    return response.data;
  },

  getStudentById: async (id) => {
    const response = await axiosInstance.get(`/students/${id}`);
    return response.data;
  },

  createStudent: async (studentData) => {
    const response = await axiosInstance.post('/students', studentData);
    return response.data;
  },

  updateStudent: async (id, studentData) => {
    const response = await axiosInstance.put(`/students/${id}`, studentData);
    return response.data;
  },

  deleteStudent: async (id) => {
    const response = await axiosInstance.delete(`/students/${id}`);
    return response.data;
  },

  getDashboardSummary: async (params = {}) => {
    const response = await axiosInstance.get('/fees-dashboard/summary', { params });
    return response.data;
  },

  // --- Student Fee Plans ---
  getFeePlan: async (studentId) => {
    const response = await axiosInstance.get(`/fee-plan/${studentId}`);
    return response.data;
  },

  createFeePlan: async (planData) => {
    const response = await axiosInstance.post('/fee-plan', planData);
    return response.data;
  },

  updateFeePlan: async (studentId, planData) => {
    const response = await axiosInstance.put(`/fee-plan/${studentId}`, planData);
    return response.data;
  },

  deleteFeePlan: async (studentId) => {
    const response = await axiosInstance.delete(`/fee-plan/${studentId}`);
    return response.data;
  },

  // --- Student Installments ---
  getInstallmentsByStudent: async (studentId) => {
    const response = await axiosInstance.get(`/installments/${studentId}`);
    return response.data; // contains { student, feePlan, totalInstallments, installmentList }
  },

  getInstallmentDetails: async (studentId, installmentNo) => {
    const response = await axiosInstance.get(`/installments/${studentId}/${installmentNo}`);
    return response.data;
  },

  updateInstallment: async (id, updateData) => {
    const response = await axiosInstance.put(`/installments/${id}`, updateData);
    return response.data;
  },

  deleteInstallment: async (id) => {
    const response = await axiosInstance.delete(`/installments/${id}`);
    return response.data;
  },

  // --- Manual Payment Collection ---
  collectPayment: async (paymentData) => {
    const response = await axiosInstance.post('/payments', paymentData);
    return response.data;
  },

  getPayments: async () => {
    const response = await axiosInstance.get('/payments');
    return response.data;
  },

  getPaymentById: async (id) => {
    const response = await axiosInstance.get(`/payments/${id}`);
    return response.data;
  },

  getPaymentsByStudent: async (studentId) => {
    const response = await axiosInstance.get(`/payments/student/${studentId}`);
    return response.data;
  },

  getStudentActivityLogs: async (studentId) => {
    const response = await axiosInstance.get(`/payments/logs/student/${studentId}`);
    return response.data;
  },

  // --- Fees Dashboard ---
  getDashboardCharts: async (params = {}) => {
    const response = await axiosInstance.get('/fees-dashboard/charts', { params });
    return response.data;
  },

  getDashboardRecentPayments: async () => {
    const response = await axiosInstance.get('/fees-dashboard/recent-payments');
    return response.data;
  },

  getDashboardUpcomingDue: async () => {
    const response = await axiosInstance.get('/fees-dashboard/upcoming-due');
    return response.data;
  },

  getDashboardOverdue: async () => {
    const response = await axiosInstance.get('/fees-dashboard/overdue');
    return response.data;
  },

  getDashboardRecentStudents: async () => {
    const response = await axiosInstance.get('/fees-dashboard/recent-students');
    return response.data;
  },

  getDashboardRecentActivities: async () => {
    const response = await axiosInstance.get('/fees-dashboard/recent-activities');
    return response.data;
  },

  // --- Reports Module ---
  getReportsSummary: async () => {
    const response = await axiosInstance.get('/reports/summary');
    return response.data;
  },

  getDailyReport: async (params = {}) => {
    const response = await axiosInstance.get('/reports/daily', { params });
    return response.data;
  },

  getWeeklyReport: async (params = {}) => {
    const response = await axiosInstance.get('/reports/weekly', { params });
    return response.data;
  },

  getMonthlyReport: async (params = {}) => {
    const response = await axiosInstance.get('/reports/monthly', { params });
    return response.data;
  },

  getCustomRangeReport: async (params = {}) => {
    const response = await axiosInstance.get('/reports/custom', { params });
    return response.data;
  },

  getCourseWiseReport: async () => {
    const response = await axiosInstance.get('/reports/course-wise');
    return response.data;
  },

  getStudentLedgerReport: async (studentId) => {
    const response = await axiosInstance.get(`/reports/student-ledger/${studentId}`);
    return response.data;
  },

  getPendingReport: async (params = {}) => {
    const response = await axiosInstance.get('/reports/pending', { params });
    return response.data;
  },

  getOverdueReport: async (params = {}) => {
    const response = await axiosInstance.get('/reports/overdue', { params });
    return response.data;
  },

  // --- Invoices Module ---
  getInvoices: async (params = {}) => {
    const response = await axiosInstance.get('/invoices', { params });
    return response.data;
  },

  getInvoiceById: async (id) => {
    const response = await axiosInstance.get(`/invoices/${id}`);
    return response.data;
  },

  downloadInvoice: async (id) => {
    const response = await axiosInstance.get(`/invoices/download/${id}`);
    return response.data;
  },

  // --- Receipts Module ---
  getReceipts: async (params = {}) => {
    const response = await axiosInstance.get('/receipts', { params });
    return response.data;
  },

  getReceiptById: async (id) => {
    const response = await axiosInstance.get(`/receipts/${id}`);
    return response.data;
  },

  downloadReceipt: async (id) => {
    const response = await axiosInstance.get(`/receipts/download/${id}`);
    return response.data;
  },

  // --- Settings Module ---
  getSettings: async () => {
    const response = await axiosInstance.get('/settings');
    return response.data;
  },

  updateSettings: async (settingsData) => {
    const response = await axiosInstance.put('/settings', settingsData);
    return response.data;
  },

  resetSettings: async () => {
    const response = await axiosInstance.post('/settings/reset');
    return response.data;
  },

  // --- Notifications Center Module ---
  getNotifications: async (params = {}) => {
    const response = await axiosInstance.get('/notifications', { params });
    return response.data;
  },

  getUnreadCount: async (params = {}) => {
    const response = await axiosInstance.get('/notifications/unread', { params });
    return response.data;
  },

  getNotificationById: async (id) => {
    const response = await axiosInstance.get(`/notifications/${id}`);
    return response.data;
  },

  markNotificationRead: async (id) => {
    const response = await axiosInstance.put(`/notifications/read/${id}`);
    return response.data;
  },

  markAllNotificationsRead: async () => {
    const response = await axiosInstance.put('/notifications/read-all');
    return response.data;
  },

  deleteNotification: async (id) => {
    const response = await axiosInstance.delete(`/notifications/${id}`);
    return response.data;
  }
};
