let allWorkers = [];

/**
 * Initialize and verify all workers are running
 */
const initWorkers = () => {
  const isProd = process.env.NODE_ENV === 'production';
  const hasRedis = !!(process.env.REDIS_URL || (process.env.REDIS_HOST && process.env.REDIS_HOST !== '127.0.0.1'));
  if (isProd && !hasRedis) {
    console.log('[BullMQ Workers] Running without standalone Redis queues.');
    return [];
  }

  try {
    const notificationWorker = require('./notificationWorker');
    const emailWorker = require('./emailWorker');
    const feeWorker = require('./feeWorker');
    const reportWorker = require('./reportWorker');
    const attendanceWorker = require('./attendanceWorker');
    const systemWorker = require('./systemWorker');

    allWorkers = [
      notificationWorker,
      emailWorker,
      feeWorker,
      reportWorker,
      attendanceWorker,
      systemWorker
    ];

    console.log(`[BullMQ Workers] Successfully initialized ${allWorkers.length} background workers.`);
    return allWorkers;
  } catch (err) {
    console.warn('[BullMQ Workers] Worker initialization deferred:', err.message);
    return [];
  }
};

/**
 * Gracefully close all workers on process termination
 */
const stopAllWorkers = async () => {
  if (allWorkers.length === 0) return;
  console.log('[BullMQ Workers] Stopping all background workers gracefully...');
  await Promise.all(allWorkers.map((w) => w.close()));
  console.log('[BullMQ Workers] All background workers stopped.');
};

module.exports = {
  initWorkers,
  stopAllWorkers
};
