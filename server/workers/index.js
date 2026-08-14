const { isRedisConfigured } = require('../config/redis');

let allWorkers = [];

/**
 * Initialize and verify all workers are running
 */
const initWorkers = () => {
  if (!isRedisConfigured()) {
    console.log('[BullMQ Workers] Redis is not configured. Background workers disabled.');
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
