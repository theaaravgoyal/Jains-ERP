const dns = require('dns');
try {
  if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder('ipv4first');
  }
} catch (e) {
  // Fallback gracefully
}

const mongoose = require('mongoose');
const Department = require('../models/Department');
const User = require('../models/User');
const Role = require('../models/Role');
const Permission = require('../models/Permission');
const RolePermission = require('../models/RolePermission');

const seedDefaultAuthData = async () => {
  try {
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log('No users found in database. Seeding default RBAC & Admin user...');

      // 1. Create Permissions
      const permissionsData = [
        {
          name: 'Attendance Module Access',
          code: 'access_attendance',
          module: 'Attendance Management',
          route: '/attendance',
          icon: 'ClipboardList',
          description: 'Read and write attendance access logs.'
        },
        {
          name: 'Fees Module Access',
          code: 'access_fees',
          module: 'Fees Management',
          route: '/fees-management',
          icon: 'DollarSign',
          description: 'Oversee invoice receipts and due collections.'
        },
        {
          name: 'Lead Module Access',
          code: 'access_leads',
          module: 'Lead Management',
          route: '/lead-management',
          icon: 'UserCheck',
          description: 'Read and write leads database logs.'
        },
        {
          name: 'Certificate Module Access',
          code: 'access_certificates',
          module: 'Certificate Management',
          route: '/certificate-management',
          icon: 'Award',
          description: 'Create and verify student certificates.'
        },
        {
          name: 'Website Module Access',
          code: 'access_site',
          module: 'Website Management',
          route: '/site-management',
          icon: 'Globe',
          description: 'Manage site operations and website settings.'
        }
      ];

      const permissions = {};
      for (let pData of permissionsData) {
        const p = await Permission.findOneAndUpdate(
          { code: pData.code },
          pData,
          { new: true, upsert: true }
        );
        permissions[p.code] = p._id;
      }

      // 2. Create Roles
      const rolesList = [
        { name: 'Super Admin', description: 'Full access across all modules.' },
        { name: 'Attendance Admin', description: 'Restricted access to Personnel logbooks.' },
        { name: 'Website Admin', description: 'Restricted access to Site operations.' },
        { name: 'Fees Admin', description: 'Restricted access to financials and billings.' },
        { name: 'Lead Admin', description: 'Restricted access to Lead management logs.' }
      ];

      const roles = {};
      for (let rData of rolesList) {
        const r = await Role.findOneAndUpdate(
          { name: rData.name },
          rData,
          { new: true, upsert: true }
        );
        roles[r.name] = r._id;
      }

      // 3. Map Roles to Permissions
      await RolePermission.deleteMany();
      const rolePermissionMappings = [
        { roleName: 'Super Admin', permissionCode: 'access_attendance' },
        { roleName: 'Super Admin', permissionCode: 'access_fees' },
        { roleName: 'Super Admin', permissionCode: 'access_leads' },
        { roleName: 'Super Admin', permissionCode: 'access_certificates' },
        { roleName: 'Attendance Admin', permissionCode: 'access_attendance' },
        { roleName: 'Website Admin', permissionCode: 'access_site' },
        { roleName: 'Fees Admin', permissionCode: 'access_fees' },
        { roleName: 'Lead Admin', permissionCode: 'access_leads' }
      ];

      for (let mapping of rolePermissionMappings) {
        const roleId = roles[mapping.roleName];
        const permissionId = permissions[mapping.permissionCode];
        if (roleId && permissionId) {
          await RolePermission.create({ role: roleId, permission: permissionId });
        }
      }

      // 4. Create Super Admin User
      const adminUser = {
        name: 'Aadish Jain Design',
        email: 'aadishjaindesign@gmail.com',
        password: 'aadishjain',
        role: roles['Super Admin'],
        status: 'active'
      };
      await User.create(adminUser);
      console.log('Successfully seeded default Super Admin: aadishjaindesign@gmail.com');
    }
  } catch (err) {
    console.error('Failed to seed default auth/RBAC data:', err.message);
  }
};

let isConnecting = false;

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/erp-portal';

  if (!process.env.MONGO_URI) {
    console.warn('[MongoDB Warning] MONGO_URI environment variable is not defined. Falling back to local mongodb://127.0.0.1:27017/erp-portal. (If deployed on Railway/Render, ensure MONGO_URI is added in project environment variables).');
  }

  if (isConnecting) return;
  isConnecting = true;

  try {
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      family: 4
    });

    console.log(`[MongoDB] Successfully connected to database: ${conn.connection.host}`);
    isConnecting = false;

    // Seed default auth and RBAC data
    await seedDefaultAuthData();

    // Seed default departments if none exist
    try {
      const count = await Department.countDocuments();
      if (count === 0) {
        const defaultDepts = [
          { name: 'Human Resources', code: 'HR', description: 'HR department' },
          { name: 'Engineering', code: 'ENG', description: 'Engineering and Development' },
          { name: 'Sales & Marketing', code: 'MKT', description: 'Sales & Marketing' },
          { name: 'Operations', code: 'OPS', description: 'Operations management' }
        ];
        await Department.insertMany(defaultDepts);
        console.log('[MongoDB] Seeded default departments.');
      }
    } catch (seedErr) {
      console.error('[MongoDB Warning] Failed to seed default departments:', seedErr.message);
    }
  } catch (error) {
    isConnecting = false;
    console.error(`[Database Connection Error] Failed to connect to MongoDB: ${error.message}`);
    console.log('[MongoDB] Retrying database connection in 5 seconds...');
    setTimeout(connectDB, 5000);
  }
};

mongoose.connection.on('connected', () => {
  console.log('[MongoDB] Connection state: CONNECTED');
});

mongoose.connection.on('error', (err) => {
  console.error('[MongoDB Error]', err.message);
});

mongoose.connection.on('disconnected', () => {
  console.warn('[MongoDB] Connection state: DISCONNECTED');
});

module.exports = connectDB;
