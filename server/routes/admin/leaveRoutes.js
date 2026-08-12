const express = require('express');
const router = express.Router();
const { getAllLeaves, updateLeaveStatus, updateLeaveDetails } = require('../../controllers/admin/leaveController');
const { protect } = require('../../middleware/authMiddleware');

router.use(protect);

router.get('/', getAllLeaves);
router.put('/:id/status', updateLeaveStatus);
router.put('/:id', updateLeaveDetails);

module.exports = router;
