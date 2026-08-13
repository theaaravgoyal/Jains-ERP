const { Queue } = require('bullmq');
const { isRedisReady, redisConnectionOptions, getRedisClient, isRedisConfigured } = require('../config/redis');

// Default job options
const defaultJobOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 2000
  },
  removeOnComplete: {
    age: 24 * 3600,
    count: 500
  },
  removeOnFail: {
    age: 7 * 24 * 3600,
    count: 1000
  }
};

const createSafeQueue = (name) => {
  try {
    if (!isRedisConfigured()) {
      return {
        name,
        add: async () => null,
        getWaitingCount: async () => 0,
        getActiveCount: async () => 0,
        getCompletedCount: async () => 0,
        getFailedCount: async () => 0,
        getDelayedCount: async () => 0,
        isPaused: async () => false,
        close: async () => {}
      };
    }
    const q = new Queue(name, {
      connection: redisConnectionOptions,
      defaultJobOptions
    });
    q.on('error', () => {}); // swallow queue-level connection errors
    return q;
  } catch (err) {
    return {
      name,
      add: async () => null,
      getWaitingCount: async () => 0,
      getActiveCount: async () => 0,
      getCompletedCount: async () => 0,
      getFailedCount: async () => 0,
      getDelayedCount: async () => 0,
      isPaused: async () => false,
      close: async () => {}
    };
  }
};

const notificationQueue = createSafeQueue('notification-queue');
const emailQueue = createSafeQueue('email-queue');
const feeQueue = createSafeQueue('fee-queue');
const reportQueue = createSafeQueue('report-queue');
const attendanceQueue = createSafeQueue('attendance-queue');
const systemQueue = createSafeQueue('system-queue');

const allQueues = [
  notificationQueue,
  emailQueue,
  feeQueue,
  reportQueue,
  attendanceQueue,
  systemQueue
];

/**
 * Dispatch Helpers
 */
const addNotificationJob = async (name, data, opts = {}) => {
  try {
    return await notificationQueue.add(name || 'send-notification', data, opts);
  } catch (err) {
    console.warn('[Queue Fallback] Notification queue unavailable:', err.message);
    return null;
  }
};

const addEmailJob = async (name, data, opts = {}) => {
  try {
    return await emailQueue.add(name || 'send-email', data, opts);
  } catch (err) {
    console.warn('[Queue Fallback] Email queue unavailable:', err.message);
    return null;
  }
};

const addFeeJob = async (name, data, opts = {}) => {
  try {
    return await feeQueue.add(name || 'process-fee-task', data, opts);
  } catch (err) {
    console.warn('[Queue Fallback] Fee queue unavailable:', err.message);
    return null;
  }
};

const addReportJob = async (name, data, opts = {}) => {
  try {
    return await reportQueue.add(name || 'generate-report', data, opts);
  } catch (err) {
    console.warn('[Queue Fallback] Report queue unavailable:', err.message);
    return null;
  }
};

const addAttendanceJob = async (name, data, opts = {}) => {
  try {
    return await attendanceQueue.add(name || 'process-attendance', data, opts);
  } catch (err) {
    console.warn('[Queue Fallback] Attendance queue unavailable:', err.message);
    return null;
  }
};

const addSystemJob = async (name, data, opts = {}) => {
  try {
    return await systemQueue.add(name || 'system-task', data, opts);
  } catch (err) {
    console.warn('[Queue Fallback] System queue unavailable:', err.message);
    return null;
  }
};

/**
 * Fetch stats across all queues
 */
const getQueueStats = async () => {
  const stats = {};
  for (const q of allQueues) {
    const [waiting, active, completed, failed, delayed, paused] = await Promise.all([
      q.getWaitingCount(),
      q.getActiveCount(),
      q.getCompletedCount(),
      q.getFailedCount(),
      q.getDelayedCount(),
      q.isPaused()
    ]);
    stats[q.name] = {
      waiting,
      active,
      completed,
      failed,
      delayed,
      isPaused: paused
    };
  }
  return stats;
};

/**
 * Gracefully close all queues
 */
const closeQueues = async () => {
  console.log('[BullMQ] Closing all queues...');
  await Promise.all(allQueues.map(q => q.close()));
  console.log('[BullMQ] All queues closed.');
};

module.exports = {
  notificationQueue,
  emailQueue,
  feeQueue,
  reportQueue,
  attendanceQueue,
  systemQueue,
  allQueues,
  addNotificationJob,
  addEmailJob,
  addFeeJob,
  addReportJob,
  addAttendanceJob,
  addSystemJob,
  getQueueStats,
  closeQueues
};
