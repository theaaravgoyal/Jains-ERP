const crypto = require('crypto');
if (!global.crypto) {
  global.crypto = crypto;
}
if (!globalThis.crypto) {
  globalThis.crypto = crypto;
}

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
    // 1. Create / Upsert Permissions
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
      }
    ];

    // Clean up deprecated access_site permission if present
    await Permission.deleteMany({ code: 'access_site' });

    const permissions = {};
    for (let pData of permissionsData) {
      const p = await Permission.findOneAndUpdate(
        { code: pData.code },
        pData,
        { returnDocument: 'after', upsert: true }
      );
      permissions[p.code] = p._id;
    }

    // 2. Create / Upsert Roles
    const rolesList = [
      { name: 'Super Admin', description: 'Full access across all modules.' },
      { name: 'Attendance Admin', description: 'Restricted access to Personnel logbooks.' },
      { name: 'Fees Admin', description: 'Restricted access to financials and billings.' },
      { name: 'Lead Admin', description: 'Restricted access to Lead management logs.' }
    ];

    // Clean up deprecated Website Admin role if present
    await Role.deleteMany({ name: 'Website Admin' });

    const roles = {};
    for (let rData of rolesList) {
      const r = await Role.findOneAndUpdate(
        { name: rData.name },
        rData,
        { returnDocument: 'after', upsert: true }
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

    // 4. Auto-heal all existing users' role references
    const existingUsers = await User.find({});
    for (const u of existingUsers) {
      const isInvalidRole = !u.role || 
        typeof u.role === 'string' || 
        !Object.values(roles).some(rId => rId.toString() === u.role.toString());

      if (isInvalidRole) {
        let assignedRole = roles['Super Admin'];
        if (typeof u.role === 'string') {
          const lower = u.role.toLowerCase();
          if (lower.includes('attendance')) assignedRole = roles['Attendance Admin'];
          else if (lower.includes('website')) assignedRole = roles['Website Admin'];
          else if (lower.includes('fee')) assignedRole = roles['Fees Admin'];
          else if (lower.includes('lead')) assignedRole = roles['Lead Admin'];
          else assignedRole = roles['Super Admin'];
        }
        await User.updateOne({ _id: u._id }, { $set: { role: assignedRole } });
        console.log(`[RBAC Auto-Heal] Updated role for user: ${u.email} to ${assignedRole}`);
      }
    }

    // 5. Create Super Admin User if no users exist
    if (existingUsers.length === 0) {
      const adminUser = {
        name: 'Aadish Jain',
        email: 'aadishjaindesign@gmail.com',
        password: 'aadishjain',
        role: roles['Super Admin'],
        status: 'active'
      };
      await User.create(adminUser);
      console.log('Successfully seeded default Super Admin: aadishjaindesign@gmail.com');
    }
  } catch (err) {
    console.error('Failed to seed/sync default auth/RBAC data:', err.message);
  }
};

const DEFAULT_MONGO_URI = 'mongodb+srv://yadavakhil415_db_user:XANHB3uc4LdlhhwQ@ac-c1qxgnd.dhl6oc8.mongodb.net/attendanceDB?retryWrites=true&w=majority';

let isConnecting = false;
let lastDbError = null;

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI || process.env.ATTENDANCE_MONGO_URI || DEFAULT_MONGO_URI;

  if (isConnecting) return;
  isConnecting = true;

  try {
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000
    });

    console.log(`[MongoDB] Successfully connected to database: ${conn.connection.host}`);
    lastDbError = null;
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
    lastDbError = error.message;
    console.error(`[Database Connection Error] Failed to connect to MongoDB: ${error.message}`);
    console.log('[MongoDB] Retrying database connection in 5 seconds...');
    setTimeout(connectDB, 5000);
  }
};

mongoose.connection.on('connected', () => {
  lastDbError = null;
  console.log('[MongoDB] Connection state: CONNECTED');
});

mongoose.connection.on('error', (err) => {
  lastDbError = err.message;
  console.error('[MongoDB Error]', err.message);
});

mongoose.connection.on('disconnected', () => {
  console.warn('[MongoDB] Connection state: DISCONNECTED');
});

module.exports = connectDB;
module.exports.getLastDbError = () => lastDbError;
