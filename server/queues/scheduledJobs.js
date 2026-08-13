const { feeQueue, attendanceQueue, systemQueue } = require('./queueManager');

/**
 * Register repeatable cron jobs with BullMQ
 */
const initScheduledJobs = async () => {
  const { isRedisConfigured } = require('../config/redis');
  if (!isRedisConfigured()) {
    console.log('[BullMQ Scheduler] Redis is not configured. Repeatable job registration skipped.');
    return;
  }

  try {
    console.log('[BullMQ Scheduler] Registering repeatable scheduled jobs...');

    // 1. Daily midnight Overdue Installment Status Checker (Runs daily at 00:05 AM)
    await feeQueue.add(
      'check-overdue-installments',
      { action: 'CHECK_OVERDUE_INSTALLMENTS' },
      {
        repeat: {
          pattern: '5 0 * * *' // 00:05 every day
        },
        jobId: 'daily-overdue-installments-check'
      }
    );

    // 2. Daily Attendance Summary Audit (Runs every night at 23:50 PM)
    await attendanceQueue.add(
      'daily-attendance-audit',
      { action: 'DAILY_AUDIT' },
      {
        repeat: {
          pattern: '50 23 * * *' // 23:50 every day
        },
        jobId: 'daily-attendance-summary-audit'
      }
    );

    // 3. Weekly Maintenance & Old Cache Cleanup (Every Sunday at 03:00 AM)
    await systemQueue.add(
      'system-cleanup',
      { action: 'CLEANUP_OLD_CACHES' },
      {
        repeat: {
          pattern: '0 3 * * 0' // Every Sunday 3:00 AM
        },
        jobId: 'weekly-system-maintenance'
      }
    );

    console.log('[BullMQ Scheduler] Repeatable cron jobs successfully registered.');
  } catch (err) {
    console.error('[BullMQ Scheduler Error] Failed registering repeatable jobs:', err.message);
  }
};

module.exports = {
  initScheduledJobs
};
