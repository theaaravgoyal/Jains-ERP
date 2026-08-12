const express = require('express');
const router = express.Router();
const { applyLeave, getMyLeaves, cancelLeave } = require('../../controllers/employee/leaveController');
const { employeeProtect } = require('../../middleware/employeeAuthMiddleware');

router.use(employeeProtect);

router.post('/', applyLeave);
router.get('/', getMyLeaves);
router.put('/:id/cancel', cancelLeave);

module.exports = router;
