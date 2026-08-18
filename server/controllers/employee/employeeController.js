const Employee = require('../../models/Employee');
const jwt = require('jsonwebtoken');
const Notification = require('../../models/Notification');
const path = require('path');
const fs = require('fs');

// Generate JWT
const generateToken = (id, email) => {
  return jwt.sign(
    { id, email },
    process.env.JWT_SECRET || 'super_secret_erp_key_12345',
    { expiresIn: '30d' }
  );
};

// @desc    Register a new employee
// @route   POST /api/employee/register
// @access  Public
exports.registerEmployee = async (req, res, next) => {
  try {
    const { name, lastName, email, phone, department, password, profilePicture } = req.body;

    if (!name || !lastName || !email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide all required fields.' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check if employee email exists
    const employeeExists = await Employee.findOne({ email: cleanEmail });
    if (employeeExists) {
      return res.status(400).json({ success: false, message: 'An employee with this email already exists.' });
    }

    // Create employee
    const employee = await Employee.create({
      name,
      lastName,
      email: cleanEmail,
      phone,
      department: department || null,
      password,
      profilePicture: profilePicture || '',
      status: 'pending' // default status is pending approval
    });
    
    // Create admin notification
    await Notification.create({
      isAdmin: true,
      senderName: `${employee.name} ${employee.lastName}`,
      title: 'New Employee Request',
      message: `New employee registration request received from ${employee.name} ${employee.lastName}. Status: Pending`,
      type: 'new_registration',
      module: 'Attendance',
      priority: 'HIGH',
      referenceId: employee._id,
      referenceType: 'Employee',
      actionUrl: '/attendance'
    });

    return res.status(201).json({
      success: true,
      message: 'Registration successful! Your account is pending admin approval.',
      employee: {
        id: employee._id,
        name: employee.name,
        lastName: employee.lastName,
        email: employee.email,
        status: employee.status
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Login employee
// @route   POST /api/employee/login
// @access  Public
exports.loginEmployee = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password.' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Find employee and select password field
    const employee = await Employee.findOne({ email: cleanEmail }).select('+password');
    if (!employee) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await employee.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Check approval status
    if (employee.status === 'pending') {
      return res.status(403).json({
        success: false,
        message: 'Your account is pending admin approval. You can log in once approved.'
      });
    }

    if (employee.status !== 'active' && employee.status !== 'approved') {
      return res.status(403).json({
        success: false,
        message: `Your account is ${employee.status}. Access denied.`
      });
    }

    return res.status(200).json({
      success: true,
      token: generateToken(employee._id, employee.email),
      employee: {
        id: employee._id,
        name: employee.name,
        lastName: employee.lastName,
        email: employee.email,
        phone: employee.phone,
        department: employee.department || '',
        profilePicture: employee.profilePicture || ''
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get current employee profile
// @route   GET /api/employee/me
// @access  Private
exports.getEmployeeProfile = async (req, res, next) => {
  try {
    const employee = await Employee.findById(req.employee._id).select('+profilePicture');
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee profile not found' });
    }
    return res.status(200).json({
      success: true,
      employee: {
        id: employee._id,
        name: employee.name,
        lastName: employee.lastName,
        email: employee.email,
        phone: employee.phone,
        department: employee.department || '',
        designation: employee.designation || 'Employee',
        profilePicture: employee.profilePicture || ''
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update employee profile details
// @route   PUT /api/employee/me
// @access  Private
exports.updateEmployeeProfile = async (req, res, next) => {
  try {
    const { name, lastName, email, phone, profilePicture, password } = req.body;
    const employee = await Employee.findById(req.employee._id);
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
    if (profilePicture !== undefined) employee.profilePicture = profilePicture;
    if (password) {
      employee.password = password; // triggers pre-save hash hook
    }

    await employee.save();

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      employee: {
        id: employee._id,
        name: employee.name,
        lastName: employee.lastName,
        email: employee.email,
        phone: employee.phone,
        department: employee.department || '',
        designation: employee.designation || 'Employee',
        profilePicture: employee.profilePicture || ''
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Upload employee profile picture (multipart/form-data)
// @route   POST /api/employee/me/upload-picture
// @access  Private
exports.uploadProfilePicture = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image file provided.' });
    }

    const employee = await Employee.findById(req.employee._id).select('+profilePicture');
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found.' });
    }

    // Delete old profile picture file from disk if it was a local upload
    if (employee.profilePicture && employee.profilePicture.startsWith('/uploads/')) {
      const oldFilePath = path.join(__dirname, '../../', employee.profilePicture);
      if (fs.existsSync(oldFilePath)) {
        fs.unlink(oldFilePath, (err) => {
          if (err) console.warn('[Upload] Failed to delete old profile picture:', err.message);
        });
      }
    }

    // Save relative URL path in DB (e.g. /uploads/profile-pictures/abc123.jpg)
    const relativeUrl = `/uploads/profile-pictures/${req.file.filename}`;
    employee.profilePicture = relativeUrl;
    await employee.save();

    return res.status(200).json({
      success: true,
      message: 'Profile picture updated successfully.',
      profilePicture: relativeUrl,
      employee: {
        id: employee._id,
        name: employee.name,
        lastName: employee.lastName,
        email: employee.email,
        phone: employee.phone,
        department: employee.department || '',
        designation: employee.designation || 'Employee',
        profilePicture: relativeUrl
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get employee notifications
// @route   GET /api/employee/notifications
// @access  Private
exports.getEmployeeNotifications = async (req, res, next) => {
  try {
    const empId = req.employee._id;
    const notifications = await Notification.find({
      $or: [
        { recipient: empId },
        { targetUser: empId }
      ]
    })
      .sort({ createdAt: -1 })
      .limit(50);
    const unreadCount = notifications.filter(n => !n.isRead).length;
    return res.status(200).json({ success: true, notifications, unreadCount });
  } catch (err) {
    next(err);
  }
};

// @desc    Mark employee notifications as read
// @route   PUT /api/employee/notifications/read
// @access  Private
exports.markEmployeeNotificationsRead = async (req, res, next) => {
  try {
    const empId = req.employee._id;
    await Notification.updateMany(
      {
        $or: [
          { recipient: empId },
          { targetUser: empId }
        ],
        isRead: false
      },
      { isRead: true, readAt: new Date() }
    );
    return res.status(200).json({ success: true, message: 'All notifications marked as read.' });
  } catch (err) {
    next(err);
  }
};
