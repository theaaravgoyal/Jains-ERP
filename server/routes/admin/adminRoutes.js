const express = require('express');
const router = express.Router();
const {
  getPendingEmployees,
  approveEmployee,
  rejectEmployee,
  getActiveEmployees,
  getDepartments,
  createEmployee,
  updateEmployeeStatus,
  updateEmployeeProfileByAdmin,
  getAdminNotifications,
  markAdminNotificationsRead,
  getEmployeeMonthlyReport,
  markHoliday,
  getHolidays,
  updateHoliday,
  deleteHoliday,
  getAttendanceSettings,
  updateAttendanceSettings
} = require('../../controllers/admin/adminController');
const { protect } = require('../../middleware/authMiddleware');

router.get('/employees/pending', protect, getPendingEmployees);
router.post('/employees/:id/approve', protect, approveEmployee);
router.post('/employees/:id/reject', protect, rejectEmployee);
router.post('/employees/create', protect, createEmployee);
router.get('/employees', protect, getActiveEmployees);
router.put('/employees/:id/status', protect, updateEmployeeStatus);
router.put('/employees/:id', protect, updateEmployeeProfileByAdmin);
router.get('/notifications', protect, getAdminNotifications);
router.put('/notifications/read', protect, markAdminNotificationsRead);
router.get('/attendance/report', protect, getEmployeeMonthlyReport);
router.get('/attendance/settings', protect, getAttendanceSettings);
router.put('/attendance/settings', protect, updateAttendanceSettings);
router.post('/attendance/holiday', protect, markHoliday);
router.get('/holidays', protect, getHolidays);
router.put('/attendance/holiday/:id', protect, updateHoliday);
router.delete('/attendance/holiday/:id', protect, deleteHoliday);
router.get('/departments', getDepartments);

module.exports = router;
