const { Worker } = require('bullmq');
const { redisConnectionOptions } = require('../config/redis');
const reportService = require('../services/reportService');
const cacheHelper = require('../utils/cacheHelper');

/**
 * Worker to process heavy background reports and analytics pre-caching
 */
const reportWorker = new Worker(
  'report-queue',
  async (job) => {
    const { reportType, query = {} } = job.data;
    console.log(`[ReportWorker] Processing job #${job.id} (${job.name}) - ReportType: ${reportType}`);

    try {
      let result = null;

      switch (reportType) {
        case 'SUMMARY':
          result = await reportService.getSummary();
          await cacheHelper.set('report:summary', result, 600); // 10 mins cache
          break;

        case 'DAILY':
          result = await reportService.getDailyReport(query);
          await cacheHelper.set(`report:daily:${query.date || 'today'}`, result, 300);
          break;

        case 'MONTHLY':
          result = await reportService.getMonthlyReport(query);
          await cacheHelper.set(`report:monthly:${query.month || 'current'}:${query.year || 'current'}`, result, 600);
          break;

        case 'COURSE_WISE':
          result = await reportService.getCourseWiseReport();
          await cacheHelper.set('report:course-wise', result, 600);
          break;

        case 'OVERDUE':
          result = await reportService.getOverdueReport(query);
          await cacheHelper.set('report:overdue', result, 300);
          break;

        default:
          console.log(`[ReportWorker] Generic report generation for ${reportType}`);
      }

      return { success: true, reportType, timestamp: new Date() };
    } catch (err) {
      console.error(`[ReportWorker Error] Job #${job.id} failed:`, err.message);
      throw err;
    }
  },
  {
    connection: redisConnectionOptions,
    concurrency: 3
  }
);

reportWorker.on('failed', (job, err) => {
  console.error(`[ReportWorker] Job #${job?.id} failed:`, err.message);
});

module.exports = reportWorker;
