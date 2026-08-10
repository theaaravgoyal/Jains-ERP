const { Worker } = require('bullmq');
const { redisConnectionOptions } = require('../config/redis');
const installmentService = require('../services/installmentService');
const cacheHelper = require('../utils/cacheHelper');

/**
 * Worker to process Fee and Billing Queue tasks
 */
const feeWorker = new Worker(
  'fee-queue',
  async (job) => {
    const { action, payload } = job.data;
    console.log(`[FeeWorker] Processing job #${job.id} (${job.name}) - Action: ${action || job.name}`);

    try {
      if (action === 'CHECK_OVERDUE_INSTALLMENTS' || job.name === 'check-overdue-installments') {
        const updatedCount = await installmentService.checkAndUpdateOverdueInstallments();
        console.log(`[FeeWorker] Overdue installment check complete. Updated ${updatedCount} records.`);

        // Invalidate fees dashboard and reports caches
        await cacheHelper.delByPattern('dashboard:*');
        await cacheHelper.delByPattern('report:*');

        return { success: true, updatedCount };
      }

      if (action === 'REGENERATE_SCHEDULE') {
        const { feePlan, creatorId } = payload;
        // Trigger installment schedule re-calc if requested via worker
        console.log(`[FeeWorker] Regenerating installments for student: ${feePlan?.studentId}`);
        return { success: true };
      }

      return { success: true, message: 'Fee job executed successfully.' };
    } catch (err) {
      console.error(`[FeeWorker Error] Job #${job.id} failed:`, err.message);
      throw err;
    }
  },
  {
    connection: redisConnectionOptions,
    concurrency: 2
  }
);

feeWorker.on('failed', (job, err) => {
  console.error(`[FeeWorker] Job #${job?.id} failed:`, err.message);
});

module.exports = feeWorker;
