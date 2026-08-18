const express = require('express');
const router = express.Router();
const {
  registerEmployee,
  loginEmployee,
  getEmployeeProfile,
  updateEmployeeProfile,
  uploadProfilePicture,
  getEmployeeNotifications,
  markEmployeeNotificationsRead
} = require('../../controllers/employee/employeeController');
const { employeeProtect } = require('../../middleware/employeeAuthMiddleware');
const upload = require('../../middleware/uploadMiddleware');

router.post('/register', registerEmployee);
router.post('/login', loginEmployee);
router.get('/me', employeeProtect, getEmployeeProfile);
router.put('/me', employeeProtect, updateEmployeeProfile);
// Profile picture upload — multipart/form-data with field name "profilePicture"
router.post('/me/upload-picture', employeeProtect, upload.single('profilePicture'), uploadProfilePicture);
router.get('/notifications', employeeProtect, getEmployeeNotifications);
router.put('/notifications/read', employeeProtect, markEmployeeNotificationsRead);

module.exports = router;
