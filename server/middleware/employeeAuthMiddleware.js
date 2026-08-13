const jwt = require('jsonwebtoken');
const Employee = require('../models/Employee');

const employeeProtect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      let decoded;
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_erp_key_12345');
      } catch (jwtErr) {
        console.error('Employee JWT verify error:', jwtErr.message);
        return res.status(401).json({ success: false, message: 'Not authorized, token expired or invalid.' });
      }

      // Find employee
      const employee = await Employee.findById(decoded.id);

      if (!employee) {
        return res.status(401).json({ success: false, message: 'Employee account not found.' });
      }

      if (employee.status !== 'active' && employee.status !== 'approved') {
        return res.status(403).json({ success: false, message: 'Your account is not active. Please contact administrator.' });
      }

      // Attach employee to request
      req.employee = employee;
      next();
    } catch (error) {
      console.error('Employee auth verification database/server error:', error.message);
      return res.status(500).json({ success: false, message: 'Database connection timeout or server error. Please try again.' });
    }
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, no token provided' });
  }
};

module.exports = { employeeProtect };
