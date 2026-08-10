const notificationWorker = require('./notificationWorker');
const emailWorker = require('./emailWorker');
const feeWorker = require('./feeWorker');
const reportWorker = require('./reportWorker');
const attendanceWorker = require('./attendanceWorker');
const systemWorker = require('./systemWorker');

const allWorkers = [
  notificationWorker,
  emailWorker,
  feeWorker,
  reportWorker,
  attendanceWorker,
  systemWorker
];

/**
 * Initialize and verify all workers are running
 */
const initWorkers = () => {
  console.log(`[BullMQ Workers] Successfully initialized ${allWorkers.length} background workers.`);
  return allWorkers;
};

/**
 * Gracefully close all workers on process termination
 */
const stopAllWorkers = async () => {
  console.log('[BullMQ Workers] Stopping all background workers gracefully...');
  await Promise.all(allWorkers.map((w) => w.close()));
  console.log('[BullMQ Workers] All background workers stopped.');
};

module.exports = {
  notificationWorker,
  emailWorker,
  feeWorker,
  reportWorker,
  attendanceWorker,
  systemWorker,
  allWorkers,
  initWorkers,
  stopAllWorkers
};
