const { Worker } = require('bullmq');
const { redisConnectionOptions } = require('../config/redis');
const cacheHelper = require('../utils/cacheHelper');

/**
 * Worker to process system maintenance tasks
 */
const systemWorker = new Worker(
  'system-queue',
  async (job) => {
    const { action } = job.data;
    console.log(`[SystemWorker] Processing job #${job.id} (${job.name}) - Action: ${action || job.name}`);

    try {
      if (action === 'CLEANUP_OLD_CACHES' || job.name === 'system-cleanup') {
        console.log('[SystemWorker] Running system routine cleanup...');
        // Clean temporary caches
        await cacheHelper.delByPattern('temp:*');
        
        // Retention policy: Clean notifications older than 7 days
        const Notification = require('../models/Notification');
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const deleteResult = await Notification.deleteMany({ createdAt: { $lt: sevenDaysAgo } });
        console.log(`[SystemWorker] Auto-deleted ${deleteResult.deletedCount} notifications older than 7 days.`);
        
        return { success: true, message: `Cleanup complete. Deleted ${deleteResult.deletedCount} notifications.` };
      }

      if (action === 'FLUSH_CACHE') {
        await cacheHelper.flush();
        return { success: true, message: 'All Redis cache flushed.' };
      }

      return { success: true, message: 'System maintenance job executed.' };
    } catch (err) {
      console.error(`[SystemWorker Error] Job #${job.id} failed:`, err.message);
      throw err;
    }
  },
  {
    connection: redisConnectionOptions,
    concurrency: 1
  }
);

systemWorker.on('failed', (job, err) => {
  console.error(`[SystemWorker] Job #${job?.id} failed:`, err.message);
});

module.exports = systemWorker;
