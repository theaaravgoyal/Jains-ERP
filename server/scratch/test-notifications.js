const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

// Load env from server directory
dotenv.config({ path: path.join(__dirname, '../.env') });

const serverDir = path.join(__dirname, '..');

// Load models and services
const User = require(path.join(serverDir, 'models/User'));
const Role = require(path.join(serverDir, 'models/Role'));
const Notification = require(path.join(serverDir, 'models/Notification'));
const notificationService = require(path.join(serverDir, 'services/notificationService'));

const runNotificationTests = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/erp-portal';
    console.log('Connecting to:', mongoUri);
    await mongoose.connect(mongoUri);
    console.log('Connected to Database');

    // 1. Setup mock user
    let role = await Role.findOne({ name: 'Admin' });
    if (!role) {
      role = await Role.create({ name: 'Admin', description: 'Administrator' });
    }
    let mockUser = await User.findOne({ email: 'notifier_test@test.com' });
    if (!mockUser) {
      mockUser = await User.create({
        name: 'Alert User',
        email: 'notifier_test@test.com',
        password: 'password123',
        role: role._id,
        status: 'active'
      });
    }

    // 2. Clear old notifications for mock user
    await Notification.deleteMany({ targetUser: mockUser._id });
    console.log('Cleared previous test notifications.');

    console.log('\n--- Running Notification Creation & Validation ---');

    // Trigger Notification 1: Fees Management Success
    console.log('Triggering payment collection success notification...');
    const n1 = await notificationService.create({
      title: 'Payment Received',
      message: 'Offline payment of ₹12,000 collected for Vicky Yadav.',
      module: 'Fees Management',
      type: 'SUCCESS',
      priority: 'HIGH',
      targetUser: mockUser._id,
      createdBy: mockUser._id,
      actionUrl: '/fees/payments'
    });
    console.log('Created Notification ID:', n1._id, 'Title:', n1.title);
    if (n1.module !== 'Fees Management' || n1.priority !== 'HIGH') {
      throw new Error('FAIL: Notification 1 parameters mapping error!');
    }

    // Trigger Notification 2: Attendance warning
    console.log('Triggering late attendance alert...');
    const n2 = await notificationService.create({
      title: 'Late Attendance',
      message: 'Employee John check-in recorded 45 minutes late.',
      module: 'Attendance',
      type: 'WARNING',
      priority: 'MEDIUM',
      targetUser: mockUser._id,
      createdBy: mockUser._id,
      actionUrl: '/attendance/daily'
    });
    console.log('Created Notification ID:', n2._id, 'Title:', n2.title);

    // Trigger Notification 3: System critical reset
    console.log('Triggering critical configuration modification notice...');
    const n3 = await notificationService.create({
      title: 'Settings Reset',
      message: 'Global ERP Billing configurations were reset to factory defaults.',
      module: 'System',
      type: 'ERROR',
      priority: 'CRITICAL',
      targetUser: mockUser._id,
      createdBy: mockUser._id,
      actionUrl: '/fees/settings'
    });
    console.log('Created Notification ID:', n3._id, 'Title:', n3.title);

    // 3. Verify counts
    console.log('\nVerifying unread counts...');
    const unreadCount = await Notification.countDocuments({ targetUser: mockUser._id, isRead: false });
    console.log('Unread Count:', unreadCount);
    if (unreadCount !== 3) {
      throw new Error(`FAIL: Expected 3 unread, got ${unreadCount}`);
    }
    console.log('PASS: Count matches.');

    // 4. Test Single notification retrieval & update mark read
    console.log('\nMarking notification 1 as read...');
    const readN1 = await Notification.findOneAndUpdate(
      { _id: n1._id, targetUser: mockUser._id },
      { isRead: true, readAt: new Date() },
      { returnDocument: 'after' }
    );
    console.log('Updated Status isRead:', readN1.isRead, 'readAt:', readN1.readAt);
    if (!readN1.isRead || !readN1.readAt) {
      throw new Error('FAIL: Mark read status update did not persist!');
    }
    console.log('PASS: Status marked read successfully.');

    // Check count again
    const countAfterRead = await Notification.countDocuments({ targetUser: mockUser._id, isRead: false });
    console.log('New Unread Count:', countAfterRead);
    if (countAfterRead !== 2) {
      throw new Error(`FAIL: Expected 2 unread, got ${countAfterRead}`);
    }
    console.log('PASS: Count updated accurately.');

    // 5. Test clean up
    console.log('\nCleaning test data...');
    await Notification.deleteMany({ targetUser: mockUser._id });
    await User.deleteOne({ _id: mockUser._id });
    console.log('Cleanup finished.');

    console.log('\nALL ERP GLOBAL NOTIFICATIONS LOGIC TESTS PASSED SUCCESSFULLY! 🔔💎');

  } catch (error) {
    console.error('TEST ERROR:', error);
  } finally {
    await mongoose.disconnect();
  }
};

runNotificationTests();
