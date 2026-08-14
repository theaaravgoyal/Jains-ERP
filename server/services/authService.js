const userRepository = require('../repositories/userRepository');
const permissionRepository = require('../repositories/permissionRepository');
const jwt = require('jsonwebtoken');

class AuthService {
  generateToken(id, email) {
    return jwt.sign(
      { id, email },
      process.env.JWT_SECRET || 'super_secret_erp_key_12345',
      { expiresIn: '30d' }
    );
  }

  async resolveRoleAndPermissions(user) {
    const Role = require('../models/Role');
    const Permission = require('../models/Permission');

    let roleName = 'Super Admin';
    let roleId = null;

    // 1. If role is populated object with _id and name
    if (user.role && typeof user.role === 'object' && user.role._id) {
      roleId = user.role._id;
      roleName = user.role.name || 'Super Admin';
    } 
    // 2. If role is an ObjectId or string ID
    else if (user.role && (typeof user.role === 'object' || (typeof user.role === 'string' && /^[0-9a-fA-F]{24}$/.test(user.role)))) {
      try {
        const foundRole = await Role.findById(user.role);
        if (foundRole) {
          roleId = foundRole._id;
          roleName = foundRole.name;
        }
      } catch (e) {
        console.warn('Role findById lookup failed:', e.message);
      }
    } 
    // 3. If role is a string name (e.g. 'admin', 'Super Admin')
    else if (typeof user.role === 'string') {
      try {
        const isSuper = ['admin', 'super admin', 'superadmin'].includes(user.role.toLowerCase());
        const roleQuery = isSuper ? 'Super Admin' : user.role;
        const foundRole = await Role.findOne({ name: new RegExp('^' + roleQuery + '$', 'i') });
        if (foundRole) {
          roleId = foundRole._id;
          roleName = foundRole.name;
        }
      } catch (e) {
        console.warn('Role findOne lookup failed:', e.message);
      }
    }

    // 4. Fallback if still not found
    if (!roleId) {
      try {
        let defaultRole = await Role.findOne({ name: 'Super Admin' }) || await Role.findOne();
        if (!defaultRole) {
          defaultRole = await Role.create({ name: 'Super Admin', description: 'Full administrative access' });
        }
        roleId = defaultRole._id;
        roleName = defaultRole.name;
        // Auto heal user record in database
        const User = require('../models/User');
        await User.updateOne({ _id: user._id }, { $set: { role: roleId } }).catch(() => {});
      } catch (e) {
        console.warn('Fallback role creation/lookup failed:', e.message);
      }
    }

    // 5. Resolve permissions
    let permissions = [];
    if (roleId) {
      try {
        permissions = await permissionRepository.findPermissionsByRoleId(roleId);
      } catch (err) {
        console.warn('Failed to load role permissions from repo:', err.message);
      }
    }

    // If permissions are empty or user is Super Admin, ensure all active permissions are present
    if ((!permissions || permissions.length === 0) || roleName === 'Super Admin' || roleName === 'Admin') {
      try {
        const allPerms = await Permission.find({});
        if (allPerms.length > 0) {
          permissions = allPerms;
        }
      } catch (err) {
        console.warn('Failed to query all permissions:', err.message);
      }
    }

    // Standard fallback list if DB permissions collection is empty
    if (!permissions || permissions.length === 0) {
      permissions = [
        { code: 'access_attendance', name: 'Attendance Module Access', route: '/attendance', module: 'Attendance Management', icon: 'ClipboardList' },
        { code: 'access_fees', name: 'Fees Module Access', route: '/fees-management', module: 'Fees Management', icon: 'DollarSign' },
        { code: 'access_leads', name: 'Lead Module Access', route: '/lead-management', module: 'Lead Management', icon: 'UserCheck' },
        { code: 'access_certificates', name: 'Certificate Module Access', route: '/certificate-management', module: 'Certificate Management', icon: 'Award' }
      ];
    }

    return {
      roleName: roleName || 'Super Admin',
      roleId,
      permissions: permissions.map(p => ({
        code: p.code,
        name: p.name,
        route: p.route,
        module: p.module,
        icon: p.icon
      }))
    };
  }

  async authenticate(email, password) {
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState !== 1) {
      throw new Error('Database is offline. Service Temporarily Unavailable.');
    }

    const user = await userRepository.findByEmail(email, true);

    if (user) {
      // Validate account status
      if (user.status !== 'active') {
        throw new Error('Your account is inactive. Please contact your system administrator.');
      }

      // Match password
      const isMatch = await user.matchPassword(password);
      if (!isMatch) {
        throw new Error('Invalid credentials');
      }

      // Fetch dynamic permissions and resolve role safely
      const { roleName, permissions } = await this.resolveRoleAndPermissions(user);

      return {
        token: this.generateToken(user._id, user.email),
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: roleName,
          permissions,
          status: user.status
        }
      };
    }

    // Mock Login Fallback (For instant testing and demo purposes, non-production only)
    const isProduction = process.env.NODE_ENV === 'production';
    if (!isProduction) {
      const mockAccounts = {
        'aadishjaindesign@gmail.com': { name: 'Aadish Jain', role: 'Super Admin', status: 'active' }
      };

      if (mockAccounts[email] && password === 'aadishjain') {
        const mockProfile = mockAccounts[email];

        if (mockProfile.status !== 'active') {
          throw new Error('Your account is inactive. Please contact your system administrator.');
        }

        // Mock permissions list corresponding to the role
        const mockPermissions = {
          'Super Admin': [
            { code: 'access_attendance', name: 'Attendance Access', route: '/attendance', module: 'Attendance Management', icon: 'ClipboardList' },
            { code: 'access_fees', name: 'Fees Access', route: '/fees-management', module: 'Fees Management', icon: 'DollarSign' },
            { code: 'access_leads', name: 'Lead Access', route: '/lead-management', module: 'Lead Management', icon: 'UserCheck' },
            { code: 'access_certificates', name: 'Certificate Access', route: '/certificate-management', module: 'Certificate Management', icon: 'Award' }
          ],
          'Attendance Admin': [
            { code: 'access_attendance', name: 'Attendance Access', route: '/attendance', module: 'Attendance Management', icon: 'ClipboardList' }
          ],
          'Fees Admin': [
            { code: 'access_fees', name: 'Fees Access', route: '/fees-management', module: 'Fees Management', icon: 'DollarSign' }
          ],
          'Lead Admin': [
            { code: 'access_leads', name: 'Lead Access', route: '/lead-management', module: 'Lead Management', icon: 'UserCheck' }
          ]
        };

        const permissions = mockPermissions[mockProfile.role] || [];

        return {
          token: this.generateToken('mock-id-' + mockProfile.role.replace(' ', '-'), email),
          user: {
            id: 'mock-id-' + mockProfile.role.replace(' ', '-'),
            name: mockProfile.name,
            email: email,
            role: mockProfile.role,
            permissions,
            status: mockProfile.status
          }
        };
      }
    }

    throw new Error('Invalid credentials');
  }

  async verifyUserToken(token) {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_erp_key_12345');
    
    // Fail fast if database is disconnected
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState !== 1) {
      const err = new Error('Database is offline. Service Temporarily Unavailable.');
      err.statusCode = 503;
      throw err;
    }

    let user;
    try {
      user = await userRepository.findById(decoded.id);
    } catch (dbErr) {
      const err = new Error('Database query failed: ' + dbErr.message);
      err.statusCode = 500;
      throw err;
    }

    if (user) {
      if (user.status !== 'active') {
        const err = new Error('Your account is inactive. Access denied.');
        err.statusCode = 403;
        throw err;
      }
      const { roleName, permissions } = await this.resolveRoleAndPermissions(user);
      return {
        id: user._id,
        name: user.name,
        email: user.email,
        role: roleName,
        permissions,
        status: user.status
      };
    }

    // Mock verification fallback (Allowed only in non-production environments)
    const isProduction = process.env.NODE_ENV === 'production';
    if (!isProduction && decoded.email) {
      let matchedRole = 'Super Admin';
      if (decoded.email.includes('attendance')) matchedRole = 'Attendance Admin';
      else if (decoded.email.includes('fees')) matchedRole = 'Fees Admin';
      else if (decoded.email.includes('leads')) matchedRole = 'Lead Admin';

      const mockPermissions = {
        'Super Admin': [
          { code: 'access_attendance', name: 'Attendance Access', route: '/attendance', module: 'Attendance Management', icon: 'ClipboardList' },
          { code: 'access_fees', name: 'Fees Access', route: '/fees-management', module: 'Fees Management', icon: 'DollarSign' },
          { code: 'access_leads', name: 'Lead Access', route: '/lead-management', module: 'Lead Management', icon: 'UserCheck' },
          { code: 'access_certificates', name: 'Certificate Access', route: '/certificate-management', module: 'Certificate Management', icon: 'Award' }
        ],
        'Attendance Admin': [
          { code: 'access_attendance', name: 'Attendance Access', route: '/attendance', module: 'Attendance Management', icon: 'ClipboardList' }
        ],
        'Fees Admin': [
          { code: 'access_fees', name: 'Fees Access', route: '/fees-management', module: 'Fees Management', icon: 'DollarSign' }
        ],
        'Lead Admin': [
          { code: 'access_leads', name: 'Lead Access', route: '/lead-management', module: 'Lead Management', icon: 'UserCheck' }
        ]
      };

      const status = decoded.email.includes('inactive') ? 'inactive' : 'active';
      if (status !== 'active') {
        const err = new Error('Your account is inactive. Access denied.');
        err.statusCode = 403;
        throw err;
      }

      return {
        id: decoded.id || 'mock-admin-id',
        name: matchedRole + ' User',
        email: decoded.email,
        role: matchedRole,
        permissions: mockPermissions[matchedRole] || [],
        status
      };
    }

    const err = new Error('User not found');
    err.statusCode = 401;
    throw err;
  }

  async changePassword(userId, currentPassword, newPassword) {
    // Validate inputs
    if (!currentPassword || !newPassword) {
      throw new Error('Current password and new password are required.');
    }
    if (newPassword.length < 8) {
      throw new Error('New password must be at least 8 characters long.');
    }
    if (currentPassword === newPassword) {
      throw new Error('New password must be different from your current password.');
    }

    // Fail fast if database is disconnected
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState !== 1) {
      throw new Error('Database is offline. Service Temporarily Unavailable.');
    }

    // We need to select the password field for verification
    const User = require('../models/User');
    const user = await User.findById(userId).select('+password');

    if (user) {
      // Verify current password
      const isMatch = await user.matchPassword(currentPassword);
      if (!isMatch) {
        throw new Error('Current password is incorrect.');
      }

      // Set new password — the pre-save hook will hash it
      user.password = newPassword;
      await user.save();

      return { message: 'Password changed successfully.' };
    }

    // Mock fallback — only in non-production environments
    const isProduction = process.env.NODE_ENV === 'production';
    if (!isProduction) {
      const MOCK_PASSWORD = 'admin123';
      if (currentPassword !== MOCK_PASSWORD) {
        throw new Error('Current password is incorrect.');
      }

      return { message: 'Password changed successfully.' };
    }

    throw new Error('User not found');
  }
}

module.exports = new AuthService();
