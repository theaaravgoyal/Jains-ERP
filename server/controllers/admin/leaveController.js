const Leave = require('../../models/Leave');
const Employee = require('../../models/Employee');
const notificationService = require('../../services/notificationService');
const { addEmailJob } = require('../../queues/queueManager');

// @desc    Get all leave requests
// @route   GET /api/admin/leaves
// @access  Private (Admin only)
exports.getAllLeaves = async (req, res, next) => {
  try {
    const leaves = await Leave.find({})
      .populate('employee', 'name lastName email department')
      .sort({ createdAt: -1 });
    return res.status(200).json({ success: true, leaves });
  } catch (err) {
    next(err);
  }
};

// @desc    Update leave request status (Approve / Reject)
// @route   PUT /api/admin/leaves/:id/status
// @access  Private (Admin only)
exports.updateLeaveStatus = async (req, res, next) => {
  try {
    const { status, remarks = '' } = req.body;
    
    if (!['Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value. Must be Approved or Rejected.' });
    }

    const leave = await Leave.findById(req.params.id).populate('employee');
    if (!leave) {
      return res.status(404).json({ success: false, message: 'Leave request not found.' });
    }

    leave.status = status;
    leave.approvedBy = req.user ? req.user._id : undefined;
    await leave.save();

    // Create notification for employee via BullMQ
    await notificationService.create({
      targetUser: leave.employee?._id || leave.employee,
      senderName: 'Admin',
      title: `Leave ${status}`,
      message: `Your leave request for ${leave.leaveType} leave has been ${status.toLowerCase()}.`,
      type: status === 'Approved' ? 'SUCCESS' : 'WARNING',
      module: 'HR Management',
      actionUrl: '/employee/leaves'
    });

    // Enqueue email notification via BullMQ
    if (leave.employee && leave.employee.email) {
      await addEmailJob('leave-status-email', {
        type: 'LEAVE_STATUS_UPDATE',
        to: leave.employee.email,
        subject: `Leave Request ${status}`,
        data: {
          employeeName: `${leave.employee.name} ${leave.employee.lastName || ''}`.trim(),
          leaveType: leave.leaveType,
          status,
          remarks
        }
      });
    }

    return res.status(200).json({
      success: true,
      message: `Leave request has been ${status.toLowerCase()} successfully.`,
      leave
    });
  } catch (err) {
    next(err);
  }
};
