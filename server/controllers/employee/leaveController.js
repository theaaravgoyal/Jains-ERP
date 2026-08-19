const Leave = require('../../models/Leave');
const Employee = require('../../models/Employee');
const Notification = require('../../models/Notification');

// @desc    Apply for a leave
// @route   POST /api/employee/leaves
// @access  Private (Employee)
exports.applyLeave = async (req, res, next) => {
  try {
    const { leaveType, startDate, endDate, reason } = req.body;

    if (!leaveType || !startDate || !endDate || !reason) {
      return res.status(400).json({ success: false, message: 'Please provide all required fields.' });
    }

    const leave = await Leave.create({
      employee: req.employee._id,
      leaveType,
      startDate,
      endDate,
      reason,
      status: 'Pending'
    });

    // Create notification for admin
    const emp = await Employee.findById(req.employee._id);
    await Notification.create({
      isAdmin: true,
      senderName: `${emp.name} ${emp.lastName}`,
      title: 'New Leave Request',
      message: `${emp.name} ${emp.lastName} applied for a ${leaveType} leave.`,
      type: 'leave_request',
      module: 'Attendance',
      priority: 'HIGH',
      referenceId: leave._id,
      referenceType: 'Leave',
      actionUrl: '/attendance'
    });

    return res.status(201).json({
      success: true,
      message: 'Leave application submitted successfully.',
      leave
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get my leaves history
// @route   GET /api/employee/leaves
// @access  Private (Employee)
exports.getMyLeaves = async (req, res, next) => {
  try {
    const Settings = require('../../models/Settings');
    const settings = await Settings.findOne();
    const monthlyQuota = settings?.attendance?.monthlyPaidLeavesQuota ?? 2;

    const leaves = await Leave.find({ employee: req.employee._id }).sort({ createdAt: -1 });

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const approvedThisMonth = await Leave.find({
      employee: req.employee._id,
      status: 'Approved',
      startDate: { $gte: startOfMonth, $lte: endOfMonth }
    });

    const paidLeavesUsedThisMonth = approvedThisMonth.reduce((acc, l) => acc + (l.paidDaysCount || 0), 0);
    const unpaidLeavesThisMonth = approvedThisMonth.reduce((acc, l) => acc + (l.unpaidDaysCount || 0), 0);
    const paidLeavesRemaining = Math.max(0, monthlyQuota - paidLeavesUsedThisMonth);

    return res.status(200).json({
      success: true,
      leaves,
      monthlyQuota,
      paidLeavesUsedThisMonth,
      unpaidLeavesThisMonth,
      paidLeavesRemaining
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Cancel employee's own leave request
// @route   PUT /api/employee/leaves/:id/cancel
// @access  Private (Employee)
exports.cancelLeave = async (req, res, next) => {
  try {
    const leave = await Leave.findOne({
      _id: req.params.id,
      employee: req.employee._id
    });

    if (!leave) {
      return res.status(404).json({ success: false, message: 'Leave request not found or not authorized.' });
    }

    if (leave.status === 'Cancelled') {
      return res.status(400).json({ success: false, message: 'Leave request is already cancelled.' });
    }

    const Attendance = require('../../models/Attendance');
    const start = new Date(leave.startDate);
    const end = new Date(leave.endDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    // If the leave was previously Approved, clean up the attendance records created for these dates
    const cur = new Date(start);
    while (cur <= end) {
      const istTime = new Date(cur.getTime() + (5.5 * 60 * 60 * 1000));
      const startOfDayIst = new Date(istTime);
      startOfDayIst.setUTCHours(0, 0, 0, 0);
      const dayStart = new Date(startOfDayIst.getTime() - (5.5 * 60 * 60 * 1000));
      const dayEnd = new Date(dayStart.getTime() + (24 * 60 * 60 * 1000) - 1);

      await Attendance.deleteMany({
        employee: req.employee._id,
        status: { $in: ['Paid Leave', 'Unpaid Leave', 'Leave'] },
        date: { $gte: dayStart, $lte: dayEnd }
      });
      cur.setDate(cur.getDate() + 1);
    }

    leave.status = 'Cancelled';
    leave.paidDaysCount = 0;
    leave.unpaidDaysCount = 0;
    await leave.save();

    // Create admin notification
    try {
      const emp = await Employee.findById(req.employee._id);
      await Notification.create({
        isAdmin: true,
        senderName: `${emp.name} ${emp.lastName}`,
        title: 'Leave Application Cancelled',
        message: `${emp.name} ${emp.lastName} has cancelled their ${leave.leaveType} leave application (${new Date(leave.startDate).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })} - ${new Date(leave.endDate).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}).`,
        type: 'INFO',
        module: 'Attendance'
      });
    } catch (notifErr) {
      console.warn('Failed to dispatch leave cancel notification:', notifErr.message);
    }

    return res.status(200).json({
      success: true,
      message: 'Leave application cancelled successfully.',
      leave
    });
  } catch (err) {
    next(err);
  }
};
