const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '../.env') });

const { getRedisClient, closeRedis } = require('../config/redis');
const connectDB = require('../config/db');
const mongoose = require('mongoose');
const cacheHelper = require('../utils/cacheHelper');
const {
  addNotificationJob,
  addEmailJob,
  addFeeJob,
  addReportJob,
  addAttendanceJob,
  addSystemJob,
  getQueueStats,
  closeQueues
} = require('../queues/queueManager');
const { initWorkers, stopAllWorkers } = require('../workers');
const { initScheduledJobs } = require('../queues/scheduledJobs');

const runTests = async () => {
  console.log('=== REDIS & BULLMQ VERIFICATION TEST ===\n');

  try {
    // 0. Connect MongoDB
    await connectDB();
    // 1. Test Redis Client
    const redis = getRedisClient();
    const pong = await redis.ping();
    console.log(`✅ 1. Redis Connection: PING -> ${pong}`);

    // 2. Test CacheHelper
    await cacheHelper.set('test:key', { message: 'Redis is working!' }, 10);
    const cachedVal = await cacheHelper.get('test:key');
    console.log('✅ 2. CacheHelper SET/GET:', cachedVal);

    const remembered = await cacheHelper.remember('test:remember', 10, async () => {
      return { computed: true, time: Date.now() };
    });
    console.log('✅ 3. CacheHelper Remember:', remembered);

    // 3. Start Workers
    initWorkers();
    console.log('✅ 4. Workers initialized.');

    // 4. Initialize Repeatable Jobs
    await initScheduledJobs();
    console.log('✅ 5. Scheduled Jobs registered.');

    // 5. Test Notification Queue
    const notifJob = await addNotificationJob('test-notification', {
      action: 'CREATE_NOTIFICATION',
      payload: {
        title: 'Test BullMQ Alert',
        message: 'This is a test notification generated via BullMQ worker.',
        module: 'System',
        type: 'INFO',
        priority: 'MEDIUM',
        targetUser: '64f000000000000000000001'
      }
    });
    console.log(`✅ 6. Notification Job added (ID: ${notifJob.id})`);

    // 6. Test Email Queue
    const emailJob = await addEmailJob('test-welcome-email', {
      type: 'STUDENT_WELCOME',
      to: 'student.test@example.com',
      subject: 'Welcome to ERP Portal',
      data: {
        studentName: 'Akhilesh Yadav',
        studentId: 'STU-2026-001',
        course: 'Full Stack Web Development',
        totalFees: 45000
      }
    });
    console.log(`✅ 7. Email Job added (ID: ${emailJob.id})`);

    // 7. Test Fee Queue
    const feeJob = await addFeeJob('test-fee-job', {
      action: 'CHECK_OVERDUE_INSTALLMENTS'
    });
    console.log(`✅ 8. Fee Job added (ID: ${feeJob.id})`);

    // 8. Test Attendance Queue
    const attJob = await addAttendanceJob('test-att-job', {
      action: 'DAILY_AUDIT'
    });
    console.log(`✅ 9. Attendance Job added (ID: ${attJob.id})`);

    // 9. Test Report Queue
    const repJob = await addReportJob('test-rep-job', {
      reportType: 'SUMMARY'
    });
    console.log(`✅ 10. Report Job added (ID: ${repJob.id})`);

    // 10. Test System Queue
    const sysJob = await addSystemJob('test-sys-job', {
      action: 'CLEANUP_OLD_CACHES'
    });
    console.log(`✅ 11. System Job added (ID: ${sysJob.id})`);

    // Wait 2.5 seconds for workers to process jobs
    console.log('\nWaiting for background workers to process jobs...');
    await new Promise((r) => setTimeout(r, 2500));

    // 11. Fetch Queue Statistics
    const stats = await getQueueStats();
    console.log('\n📊 BullMQ Queue Statistics:');
    console.log(JSON.stringify(stats, null, 2));

    console.log('\n🎉 ALL REDIS AND BULLMQ TESTS PASSED SUCCESSFULLY!');
  } catch (err) {
    console.error('❌ Test failed with error:', err);
  } finally {
    await stopAllWorkers();
    await closeQueues();
    await closeRedis();
    await mongoose.connection.close();
    process.exit(0);
  }
};

runTests();
