const Leave = require('../../models/Leave');
const Employee = require('../../models/Employee');
const Attendance = require('../../models/Attendance');
const Settings = require('../../models/Settings');
const Notification = require('../../models/Notification');
const { addEmailJob } = require('../../queues/queueManager');

const getIstTodayBoundaries = (dateInput = new Date()) => {
  const d = new Date(dateInput);
  const istTime = new Date(d.getTime() + (5.5 * 60 * 60 * 1000));
  const startOfDayIst = new Date(istTime);
  startOfDayIst.setUTCHours(0, 0, 0, 0);
  const start = new Date(startOfDayIst.getTime() - (5.5 * 60 * 60 * 1000));
  const end = new Date(start.getTime() + (24 * 60 * 60 * 1000) - 1);
  return { start, end };
};

// @desc    Get all leave requests with monthly paid/unpaid summary
// @route   GET /api/admin/leaves
// @access  Private (Admin only)
exports.getAllLeaves = async (req, res, next) => {
  try {
    const leaves = await Leave.find({})
      .populate('employee', 'name lastName email department designation')
      .sort({ createdAt: -1 });

    const settings = await Settings.findOne();
    const monthlyQuota = settings?.attendance?.monthlyPaidLeavesQuota ?? 2;

    // Calculate month-to-date paid leave usage per employee
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const approvedThisMonth = await Leave.find({
      status: 'Approved',
      startDate: { $gte: startOfMonth, $lte: endOfMonth }
    });

    const usageMap = {};
    approvedThisMonth.forEach(l => {
      const empId = l.employee?.toString();
      if (!usageMap[empId]) {
        usageMap[empId] = { paidUsed: 0, unpaidUsed: 0 };
      }
      usageMap[empId].paidUsed += (l.paidDaysCount || 0);
      usageMap[empId].unpaidUsed += (l.unpaidDaysCount || 0);
    });

    const enrichedLeaves = leaves.map(l => {
      const empId = l.employee?._id?.toString() || l.employee?.toString();
      const usage = usageMap[empId] || { paidUsed: 0, unpaidUsed: 0 };
      return {
        ...l.toObject(),
        monthlyQuota,
        paidUsedInMonth: usage.paidUsed,
        unpaidUsedInMonth: usage.unpaidUsed
      };
    });

    return res.status(200).json({ 
      success: true, 
      leaves: enrichedLeaves,
      monthlyQuota 
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update leave request status (Approve / Reject) & sync Attendance records
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

    const empId = leave.employee?._id || leave.employee;
    const settings = await Settings.findOne();
    const monthlyQuota = settings?.attendance?.monthlyPaidLeavesQuota ?? 2;

    const start = new Date(leave.startDate);
    const end = new Date(leave.endDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    // Calculate all calendar days in range
    const daysList = [];
    const cur = new Date(start);
    while (cur <= end) {
      daysList.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }
    const totalLeaveDays = daysList.length;

    if (status === 'Approved') {
      // Find month range for this leave
      const leaveMonthStart = new Date(start.getFullYear(), start.getMonth(), 1);
      const leaveMonthEnd = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59, 999);

      // Fetch previously approved leaves in this month for this employee
      const prevApprovedLeaves = await Leave.find({
        _id: { $ne: leave._id },
        employee: empId,
        status: 'Approved',
        startDate: { $gte: leaveMonthStart, $lte: leaveMonthEnd }
      });

      const alreadyUsedPaidDays = prevApprovedLeaves.reduce((acc, l) => acc + (l.paidDaysCount || 0), 0);
      const availablePaidQuota = Math.max(0, monthlyQuota - alreadyUsedPaidDays);

      // Allocate paid vs unpaid days
      const paidDays = Math.min(totalLeaveDays, availablePaidQuota);
      const unpaidDays = totalLeaveDays - paidDays;

      leave.paidDaysCount = paidDays;
      leave.unpaidDaysCount = unpaidDays;
      leave.adminRemarks = remarks;
      leave.status = 'Approved';
      leave.approvedBy = req.user ? req.user._id : undefined;
      await leave.save();

      // Auto-create / Update Attendance records for each day of the leave
      for (let i = 0; i < daysList.length; i++) {
        const leaveDate = daysList[i];
        const isPaid = i < paidDays;
        const statusToMark = isPaid ? 'Paid Leave' : 'Unpaid Leave';

        const { start: dayStart, end: dayEnd } = getIstTodayBoundaries(leaveDate);

        let attRecord = await Attendance.findOne({
          employee: empId,
          date: { $gte: dayStart, $lte: dayEnd }
        });

        if (attRecord) {
          attRecord.status = statusToMark;
          attRecord.remarks = `${leave.leaveType} Leave (${isPaid ? 'Paid' : 'Unpaid'}): ${leave.reason || ''}`;
          attRecord.checkIn = '';
          attRecord.checkOut = '';
          await attRecord.save();
        } else {
          await Attendance.create({
            employee: empId,
            date: dayStart,
            status: statusToMark,
            checkIn: '',
            checkOut: '',
            remarks: `${leave.leaveType} Leave (${isPaid ? 'Paid' : 'Unpaid'}): ${leave.reason || ''}`
          });
        }
      }
    } else if (status === 'Rejected') {
      leave.status = 'Rejected';
      leave.paidDaysCount = 0;
      leave.unpaidDaysCount = 0;
      leave.adminRemarks = remarks;
      leave.approvedBy = req.user ? req.user._id : undefined;
      await leave.save();

      // Clean up any Attendance records that were previously marked as Paid/Unpaid Leave for these dates
      for (const leaveDate of daysList) {
        const { start: dayStart, end: dayEnd } = getIstTodayBoundaries(leaveDate);
        await Attendance.deleteMany({
          employee: empId,
          status: { $in: ['Paid Leave', 'Unpaid Leave', 'Leave'] },
          date: { $gte: dayStart, $lte: dayEnd }
        });
      }
    }

    // Create notification for employee
    try {
      const summaryText = status === 'Approved'
        ? ` (${leave.paidDaysCount} Paid, ${leave.unpaidDaysCount} Unpaid/LOP)`
        : '';

      await Notification.create({
        recipient: empId,
        targetUser: empId,
        senderName: 'Admin',
        title: `Leave ${status}`,
        message: `Your ${leave.leaveType || ''} leave request (${new Date(leave.startDate).toLocaleDateString('en-IN')} - ${new Date(leave.endDate).toLocaleDateString('en-IN')}) has been ${status.toLowerCase()}${summaryText}.${remarks ? ` Note: ${remarks}` : ''}`,
        type: status === 'Approved' ? 'SUCCESS' : 'WARNING',
        module: 'Attendance',
        priority: 'HIGH',
        actionUrl: '/employee'
      });
    } catch (notifErr) {
      console.warn('Failed to dispatch leave notification:', notifErr.message);
    }

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
          paidDays: leave.paidDaysCount,
          unpaidDays: leave.unpaidDaysCount,
          remarks
        }
      });
    }

    return res.status(200).json({
      success: true,
      message: `Leave request ${status.toLowerCase()} successfully. (${leave.paidDaysCount} Paid, ${leave.unpaidDaysCount} Unpaid).`,
      leave
    });
  } catch (err) {
    next(err);
  }
};
