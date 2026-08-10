const { Worker } = require('bullmq');
const { redisConnectionOptions } = require('../config/redis');
const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');
const cacheHelper = require('../utils/cacheHelper');

const getIstTodayBoundaries = (dateInput = new Date()) => {
  const d = new Date(dateInput);
  const istTime = new Date(d.getTime() + (5.5 * 60 * 60 * 1000));
  const startOfDayIst = new Date(istTime);
  startOfDayIst.setUTCHours(0, 0, 0, 0);
  const start = new Date(startOfDayIst.getTime() - (5.5 * 60 * 60 * 1000));
  const end = new Date(start.getTime() + (24 * 60 * 60 * 1000) - 1);
  return { start, end };
};

/**
 * Worker to process attendance background jobs
 */
const attendanceWorker = new Worker(
  'attendance-queue',
  async (job) => {
    const { action } = job.data;
    console.log(`[AttendanceWorker] Processing job #${job.id} (${job.name}) - Action: ${action || job.name}`);

    try {
      if (action === 'DAILY_AUDIT' || job.name === 'daily-attendance-audit') {
        const { start, end } = getIstTodayBoundaries();
        
        // Count active employees vs today's attendance records
        const [totalActive, todayRecords] = await Promise.all([
          Employee.countDocuments({ status: 'approved' }),
          Attendance.countDocuments({ date: { $gte: start, $lte: end } })
        ]);

        const summary = {
          date: new Date().toISOString().split('T')[0],
          totalActiveEmployees: totalActive,
          checkedInCount: todayRecords,
          unaccountedCount: Math.max(0, totalActive - todayRecords)
        };

        console.log(`[AttendanceWorker] Daily Audit Summary:`, summary);

        // Cache summary in Redis
        await cacheHelper.set(`attendance:daily-summary:${summary.date}`, summary, 24 * 3600);
        return { success: true, summary };
      }

      return { success: true, message: 'Attendance task completed.' };
    } catch (err) {
      console.error(`[AttendanceWorker Error] Job #${job.id} failed:`, err.message);
      throw err;
    }
  },
  {
    connection: redisConnectionOptions,
    concurrency: 2
  }
);

attendanceWorker.on('failed', (job, err) => {
  console.error(`[AttendanceWorker] Job #${job?.id} failed:`, err.message);
});

module.exports = attendanceWorker;
