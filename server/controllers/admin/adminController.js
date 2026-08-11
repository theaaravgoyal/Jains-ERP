const Employee = require('../../models/Employee');
const Department = require('../../models/Department');
const Notification = require('../../models/Notification');
const Attendance = require('../../models/Attendance');
const Holiday = require('../../models/Holiday');

const getIstTodayBoundaries = (dateInput = new Date()) => {
  const d = new Date(dateInput);
  const istTime = new Date(d.getTime() + (5.5 * 60 * 60 * 1000));
  const startOfDayIst = new Date(istTime);
  startOfDayIst.setUTCHours(0, 0, 0, 0);
  const start = new Date(startOfDayIst.getTime() - (5.5 * 60 * 60 * 1000));
  const end = new Date(start.getTime() + (24 * 60 * 60 * 1000) - 1);
  return { start, end };
};

// @desc    Get pending employee approvals
// @route   GET /api/admin/employees/pending
// @access  Private (Admin only)
exports.getPendingEmployees = async (req, res, next) => {
  try {
    const pending = await Employee.find({ status: 'pending' });
    return res.status(200).json({ success: true, pending });
  } catch (err) {
    next(err);
  }
};

// @desc    Approve employee status
// @route   POST /api/admin/employees/:id/approve
// @access  Private (Admin only)
exports.approveEmployee = async (req, res, next) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found.' });
    }

    employee.status = 'approved';
    await employee.save();

    // Create notification for employee
    try {
      await Notification.create({
        recipient: employee._id,
        targetUser: employee._id,
        senderName: 'System Admin',
        title: 'Account Approved',
        message: 'Congratulations! Your employee account has been approved by the Admin. You can now access your attendance portal.',
        type: 'ACCOUNT_APPROVED',
        module: 'Attendance',
        priority: 'HIGH'
      });
    } catch (notifErr) {
      console.warn('Failed to dispatch employee approval notification:', notifErr.message);
    }

    return res.status(200).json({ success: true, message: 'Employee approved successfully.', employee });
  } catch (err) {
    next(err);
  }
};

// @desc    Reject/Delete pending employee
// @route   POST /api/admin/employees/:id/reject
// @access  Private (Admin only)
exports.rejectEmployee = async (req, res, next) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found.' });
    }

    await Employee.findByIdAndDelete(req.params.id);

    return res.status(200).json({ success: true, message: 'Employee registration rejected and removed.' });
  } catch (err) {
    next(err);
  }
};

// @desc    Get all active employees
// @route   GET /api/admin/employees
// @access  Private (Admin only)
exports.getActiveEmployees = async (req, res, next) => {
  try {
    const employees = await Employee.find({ status: { $ne: 'pending' } });
    return res.status(200).json({ success: true, employees });
  } catch (err) {
    next(err);
  }
};

// @desc    Get list of departments
// @route   GET /api/admin/departments
// @access  Public
exports.getDepartments = async (req, res, next) => {
  try {
    const departments = await Department.find();
    return res.status(200).json({ success: true, departments });
  } catch (err) {
    next(err);
  }
};

// @desc    Create a new employee profile directly
// @route   POST /api/admin/employees/create
// @access  Private (Admin only)
exports.createEmployee = async (req, res, next) => {
  try {
    const { name, lastName, email, phone, department, designation, password } = req.body;

    if (!name || !lastName || !email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide all required fields.' });
    }

    const cleanEmail = email.trim().toLowerCase();

    const employeeExists = await Employee.findOne({ email: cleanEmail });
    if (employeeExists) {
      return res.status(400).json({ success: false, message: 'An employee with this email already exists.' });
    }

    const employee = await Employee.create({
      name,
      lastName,
      email: cleanEmail,
      phone,
      department: department || '',
      designation: designation || 'Employee',
      password,
      status: 'active' // Direct admin creation is active by default
    });

    return res.status(201).json({
      success: true,
      message: 'Employee profile created successfully.',
      employee
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update employee status (active/suspended/etc)
// @route   PUT /api/admin/employees/:id/status
// @access  Private (Admin only)
exports.updateEmployeeStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ success: false, message: 'Status is required' });
    }

    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found.' });
    }

    employee.status = status;
    await employee.save();

    return res.status(200).json({ success: true, message: `Employee status updated to ${status}.`, employee });
  } catch (err) {
    next(err);
  }
};

// @desc    Update employee profile details by Admin
// @route   PUT /api/admin/employees/:id
// @access  Private (Admin only)
exports.updateEmployeeProfileByAdmin = async (req, res, next) => {
  try {
    const { name, lastName, email, phone, department, designation, password, profilePicture } = req.body;
    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found.' });
    }

    if (email) {
      const cleanEmail = email.trim().toLowerCase();
      if (cleanEmail !== employee.email) {
        const emailExists = await Employee.findOne({ email: cleanEmail });
        if (emailExists) {
          return res.status(400).json({ success: false, message: 'An employee with this email already exists.' });
        }
        employee.email = cleanEmail;
      }
    }

    if (name) employee.name = name;
    if (lastName) employee.lastName = lastName;
    if (phone !== undefined) employee.phone = phone;
    if (department !== undefined) employee.department = department;
    if (designation !== undefined) employee.designation = designation;
    if (profilePicture !== undefined) employee.profilePicture = profilePicture;
    if (password) {
      employee.password = password; // pre-save hook will hash it automatically
    }

    await employee.save();

    // Create notification for employee
    await Notification.create({
      recipient: employee._id,
      senderName: 'Admin',
      message: 'Your profile details have been updated by the Admin.',
      type: 'profile_update'
    });

    return res.status(200).json({
      success: true,
      message: 'Employee profile updated successfully by admin.',
      employee
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get admin notifications
// @route   GET /api/admin/notifications
// @access  Private (Admin only)
exports.getAdminNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.find({ isAdmin: true }).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, notifications });
  } catch (err) {
    next(err);
  }
};

// @desc    Mark admin notifications as read
// @route   PUT /api/admin/notifications/read
// @access  Private (Admin only)
exports.markAdminNotificationsRead = async (req, res, next) => {
  try {
    await Notification.updateMany({ isAdmin: true, isRead: false }, { isRead: true });
    return res.status(200).json({ success: true, message: 'All notifications marked as read.' });
  } catch (err) {
    next(err);
  }
};

// @desc    Get monthly attendance report for an employee
// @route   GET /api/admin/attendance/report
// @access  Private (Admin only)
exports.getEmployeeMonthlyReport = async (req, res, next) => {
  try {
    const { employeeId, year, month } = req.query;
    if (!employeeId || !year || !month) {
      return res.status(400).json({ success: false, message: 'Please provide employeeId, year, and month.' });
    }

    const yr = parseInt(year);
    const mn = parseInt(month); // 1-indexed

    // Calculate dates in UTC/Local correctly for range
    const startDate = new Date(yr, mn - 1, 1);
    const endDate = new Date(yr, mn, 0, 23, 59, 59, 999);

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found.' });
    }

    const attendanceRecords = await Attendance.find({
      employee: employeeId,
      date: { $gte: startDate, $lte: endDate }
    }).sort({ date: 1 });

    const joiningDate = employee.dateOfJoining || employee.createdAt || new Date();
    const joiningDayStart = new Date(joiningDate);
    joiningDayStart.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const report = [];
    const daysInMonth = endDate.getDate();

    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(yr, mn - 1, day);
      currentDate.setHours(12, 0, 0, 0);
      
      // Find matching attendance log
      const record = attendanceRecords.find(r => {
        const d = new Date(r.date);
        return d.getFullYear() === currentDate.getFullYear() &&
               d.getMonth() === currentDate.getMonth() &&
               d.getDate() === currentDate.getDate();
      });

      const dayOfWeek = currentDate.getDay();
      const isWeekend = dayOfWeek === 0; // Only Sunday is counted as Weekend / Weekly Off

      let status = '-';
      if (record) {
        status = record.status;
      } else {
        const isFuture = currentDate > today;
        const isBeforeJoining = currentDate < joiningDayStart;

        if (isFuture || isBeforeJoining) {
          status = '-';
        } else {
          status = isWeekend ? 'Weekend' : 'Absent';
        }
      }

      report.push({
        date: currentDate.toISOString(),
        dayOfWeek: currentDate.toLocaleDateString('en-US', { weekday: 'long' }),
        status: status,
        checkIn: record ? record.checkIn || '-' : '-',
        checkOut: record ? record.checkOut || '-' : '-',
        remarks: record ? record.remarks || '-' : '-'
      });
    }

    return res.status(200).json({
      success: true,
      employee: {
        name: employee.name,
        lastName: employee.lastName,
        department: employee.department || 'Unassigned',
        designation: employee.designation || 'Staff',
        profilePicture: employee.profilePicture,
        dateOfJoining: employee.dateOfJoining || employee.createdAt
      },
      report
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Mark a date as a Holiday and auto-create attendance records for all active employees
// @route   POST /api/admin/attendance/holiday
// @access  Private (Admin only)
exports.markHoliday = async (req, res, next) => {
  try {
    const { date, reason } = req.body;
    if (!date) {
      return res.status(400).json({ success: false, message: 'Please specify the holiday date.' });
    }

    const { start: startOfDay, end: endOfDay } = getIstTodayBoundaries(date);

    // Save to Holiday collection, checking for duplicate date
    let holiday = await Holiday.findOne({
      date: { $gte: startOfDay, $lte: endOfDay }
    });

    if (holiday) {
      return res.status(400).json({ success: false, message: 'A holiday is already declared on this date.' });
    }

    holiday = await Holiday.create({
      date: startOfDay,
      reason: reason || 'System Holiday'
    });

    // Fetch all active/approved employees
    const employees = await Employee.find({ status: { $in: ['active', 'approved'] } });

    // For each employee, create or update attendance for that date to status 'Holiday'
    for (const emp of employees) {
      let attendance = await Attendance.findOne({
        employee: emp._id,
        date: { $gte: startOfDay, $lte: endOfDay }
      });

      if (attendance) {
        attendance.status = 'Holiday';
        attendance.remarks = reason || 'System Holiday';
        attendance.checkIn = '';
        attendance.checkOut = '';
        await attendance.save();
      } else {
        await Attendance.create({
          employee: emp._id,
          date: startOfDay,
          status: 'Holiday',
          checkIn: '',
          checkOut: '',
          remarks: reason || 'System Holiday'
        });
      }
    }

    // Broadcast holiday notification to all active employees
    try {
      const holidayDateFormatted = new Date(holiday.date).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
      const notificationsToInsert = employees.map((emp) => ({
        recipient: emp._id,
        targetUser: emp._id,
        senderName: 'Admin',
        title: 'Holiday Announcement',
        message: `Official Holiday declared on ${holidayDateFormatted} (${holiday.reason || 'Holiday'}). Attendance is excused.`,
        type: 'HOLIDAY_ANNOUNCEMENT',
        module: 'Attendance',
        priority: 'MEDIUM'
      }));

      if (notificationsToInsert.length > 0) {
        await Notification.insertMany(notificationsToInsert);
      }
    } catch (notifErr) {
      console.warn('Failed to broadcast holiday notifications:', notifErr.message);
    }

    return res.status(200).json({
      success: true,
      message: `Holiday successfully marked.`,
      holiday
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get all holidays
// @route   GET /api/admin/holidays
// @access  Private (Admin only)
exports.getHolidays = async (req, res, next) => {
  try {
    const holidays = await Holiday.find().sort({ date: -1 });
    return res.status(200).json({ success: true, holidays });
  } catch (err) {
    next(err);
  }
};

// @desc    Update holiday details
// @route   PUT /api/admin/attendance/holiday/:id
// @access  Private (Admin only)
exports.updateHoliday = async (req, res, next) => {
  try {
    const { date, reason } = req.body;
    const holiday = await Holiday.findById(req.params.id);
    if (!holiday) {
      return res.status(404).json({ success: false, message: 'Holiday record not found.' });
    }

    // Keep old date parameters for cleaning attendance logs if date changes
    const { start: oldStartOfDay, end: oldEndOfDay } = getIstTodayBoundaries(holiday.date);

    if (date) {
      const { start: newStart, end: newEnd } = getIstTodayBoundaries(date);

      // Check if another holiday is declared on this new date
      const duplicate = await Holiday.findOne({
        _id: { $ne: holiday._id },
        date: { $gte: newStart, $lte: newEnd }
      });
      if (duplicate) {
        return res.status(400).json({ success: false, message: 'A holiday is already declared on this new date.' });
      }

      holiday.date = newStart;
    }

    if (reason) {
      holiday.reason = reason;
    }

    await holiday.save();

    // Sync corresponding Attendance records
    // 1. Delete attendance logs of old date
    await Attendance.deleteMany({
      status: 'Holiday',
      date: { $gte: oldStartOfDay, $lte: oldEndOfDay }
    });

    // 2. Create attendance logs for new date
    const { start: finalStart, end: finalEnd } = getIstTodayBoundaries(holiday.date);

    const employees = await Employee.find({ status: { $in: ['active', 'approved'] } });
    for (const emp of employees) {
      let attendance = await Attendance.findOne({
        employee: emp._id,
        date: { $gte: finalStart, $lte: finalEnd }
      });

      if (attendance) {
        attendance.status = 'Holiday';
        attendance.remarks = holiday.reason;
        attendance.checkIn = '';
        attendance.checkOut = '';
        await attendance.save();
      } else {
        await Attendance.create({
          employee: emp._id,
          date: finalStart,
          status: 'Holiday',
          checkIn: '',
          checkOut: '',
          remarks: holiday.reason
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Holiday details successfully updated and synchronized.',
      holiday
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete/Cancel a declared holiday
// @route   DELETE /api/admin/attendance/holiday/:id
// @access  Private (Admin only)
exports.deleteHoliday = async (req, res, next) => {
  try {
    const holiday = await Holiday.findById(req.params.id);
    if (!holiday) {
      return res.status(404).json({ success: false, message: 'Holiday record not found.' });
    }

    const { start: startOfDay, end: endOfDay } = getIstTodayBoundaries(holiday.date);

    // Delete holiday definition
    await Holiday.findByIdAndDelete(req.params.id);

    // Delete matching 'Holiday' status attendance logs so employees' records revert
    await Attendance.deleteMany({
      status: 'Holiday',
      date: { $gte: startOfDay, $lte: endOfDay }
    });

    return res.status(200).json({
      success: true,
      message: 'Holiday successfully canceled and attendance logs reverted.'
    });
  } catch (err) {
    next(err);
  }
};
