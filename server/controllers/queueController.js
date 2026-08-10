const { getQueueStats, addFeeJob, addReportJob, addSystemJob } = require('../queues/queueManager');
const { isRedisReady } = require('../config/redis');
const cacheHelper = require('../utils/cacheHelper');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/responseHelper');

/**
 * Get comprehensive health and metrics of Redis and BullMQ queues
 * @route GET /api/queues/status
 */
const getQueueHealthAndStats = asyncHandler(async (req, res) => {
  const redisStatus = isRedisReady();
  const queueStats = await getQueueStats();

  return sendSuccess(res, 'Queue status and metrics retrieved successfully', {
    redis: {
      connected: redisStatus
    },
    queues: queueStats,
    timestamp: new Date()
  }, 200);
});

/**
 * Manually trigger overdue installment scan job
 * @route POST /api/queues/trigger/overdue-check
 */
const triggerOverdueCheck = asyncHandler(async (req, res) => {
  const job = await addFeeJob('check-overdue-installments', {
    action: 'CHECK_OVERDUE_INSTALLMENTS',
    triggeredBy: req.user?.id || 'manual'
  });

  return sendSuccess(res, 'Overdue installment check job enqueued', { jobId: job.id }, 202);
});

/**
 * Manually trigger system cache cleanup
 * @route POST /api/queues/trigger/cache-clean
 */
const triggerCacheClean = asyncHandler(async (req, res) => {
  const { flushAll } = req.body;

  let job;
  if (flushAll) {
    job = await addSystemJob('flush-cache', { action: 'FLUSH_CACHE' });
  } else {
    job = await addSystemJob('system-cleanup', { action: 'CLEANUP_OLD_CACHES' });
  }

  return sendSuccess(res, 'System cleanup job enqueued', { jobId: job.id }, 202);
});

/**
 * Pre-warm or re-cache summary report
 * @route POST /api/queues/trigger/report-warm
 */
const triggerReportWarm = asyncHandler(async (req, res) => {
  const { reportType = 'SUMMARY' } = req.body;
  const job = await addReportJob('warm-report', { reportType });

  return sendSuccess(res, 'Report cache warming job enqueued', { jobId: job.id }, 202);
});

module.exports = {
  getQueueHealthAndStats,
  triggerOverdueCheck,
  triggerCacheClean,
  triggerReportWarm
};
