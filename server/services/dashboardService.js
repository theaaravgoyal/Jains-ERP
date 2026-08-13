const studentRepository = require('../repositories/studentRepository');
const feePlanRepository = require('../repositories/feePlanRepository');
const installmentRepository = require('../repositories/installmentRepository');
const paymentRepository = require('../repositories/paymentRepository');
const receiptRepository = require('../repositories/receiptRepository');
const activityLogRepository = require('../repositories/activityLogRepository');
const cacheHelper = require('../utils/cacheHelper');

/**
 * Dashboard Service - Executes high-performance MongoDB Aggregation pipelines
 * to gather financial summaries, payment mode distribution, projected schedules, and timeline records.
 */
class DashboardService {
  /**
   * Gather summary totals and snapshot counts.
   * @param {Object} queryParams - Filters such as range indicators.
   */
  async getSummary(queryParams = {}) {
    const cacheKey = `dashboard:summary:${JSON.stringify(queryParams)}`;
    return await cacheHelper.remember(cacheKey, 60, async () => {
      const { filterType = 'month', startDate, endDate } = queryParams;
    
    // A. Gather Students census counts by active status
    const studentStats = await studentRepository.aggregate([
      { $match: { deletedAt: null } },
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]);
    
    let totalStudents = 0;
    let activeStudents = 0;
    let inactiveStudents = 0;
    
    studentStats.forEach(stat => {
      totalStudents += stat.count;
      if (stat._id === 'ACTIVE') activeStudents = stat.count;
      if (stat._id === 'INACTIVE') inactiveStudents = stat.count;
    });

    // B. Gather Financial balances from parent FeePlans
    const feePlanStats = await feePlanRepository.aggregate([
      { $match: { deletedAt: null } },
      {
        $group: {
          _id: null,
          totalFees: { $sum: "$totalFees" },
          paidAmount: { $sum: "$paidAmount" },
          remainingAmount: { $sum: "$remainingAmount" }
        }
      }
    ]);
    
    const financialSummary = feePlanStats[0] || { totalFees: 0, totalFeesWithTax: 0, paidAmount: 0, remainingAmount: 0 };

    // C. Gather payments collection totals (Today vs Month)
    const now = new Date();
    const todayStart = new Date(now); todayStart.setHours(0,0,0,0);
    const todayEnd = new Date(now); todayEnd.setHours(23,59,59,999);
    
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    monthStart.setHours(0,0,0,0);

    const paymentTimeStats = await paymentRepository.aggregate([
      {
        $facet: {
          todayCollection: [
            { $match: { paymentDate: { $gte: todayStart, $lte: todayEnd } } },
            { $group: { _id: null, total: { $sum: "$amount" } } }
          ],
          monthCollection: [
            { $match: { paymentDate: { $gte: monthStart } } },
            { $group: { _id: null, total: { $sum: "$amount" } } }
          ]
        }
      }
    ]);
    
    const todayCollVal = paymentTimeStats[0]?.todayCollection[0]?.total || 0;
    const monthCollVal = paymentTimeStats[0]?.monthCollection[0]?.total || 0;

    // D. Installments metrics (unpaid, overdue, upcoming next 7 days)
    const next7Days = new Date(now);
    next7Days.setDate(now.getDate() + 7);
    next7Days.setHours(23,59,59,999);

    const installmentStats = await installmentRepository.aggregate([
      { $match: { deletedAt: null } },
      {
        $facet: {
          pendingCount: [
            { $match: { status: { $ne: 'PAID' } } },
            { $count: "count" }
          ],
          overdueCount: [
            { $match: { status: 'OVERDUE' } },
            { $count: "count" }
          ],
          upcomingCount: [
            { 
              $match: { 
                status: { $ne: 'PAID' }, 
                dueDate: { $gte: now, $lte: next7Days } 
              } 
            },
            { $count: "count" }
          ]
        }
      }
    ]);

    const pendingInsts = installmentStats[0]?.pendingCount[0]?.count || 0;
    const overdueInsts = installmentStats[0]?.overdueCount[0]?.count || 0;
    const upcomingInsts = installmentStats[0]?.upcomingCount[0]?.count || 0;

    // E. Total receipts generated
    const totalReceipts = await receiptRepository.count({});

    return {
      totalStudents,
      activeStudents,
      inactiveStudents,
      totalFees: financialSummary.totalFees,
      collectedFees: financialSummary.paidAmount,
      remainingAmount: financialSummary.remainingAmount,
      todayCollection: todayCollVal,
      thisMonthCollection: monthCollVal,
      pendingInstallments: pendingInsts,
      overdueInstallments: overdueInsts,
      upcomingDue7Days: upcomingInsts,
      totalReceipts
    };
    });
  }

  /**
   * Fetch statistical aggregates for graphic charts.
   * @param {Object} queryParams - Filters such as range indicators.
   */
  async getCharts(queryParams = {}) {
    const cacheKey = `dashboard:charts:${JSON.stringify(queryParams)}`;
    return await cacheHelper.remember(cacheKey, 120, async () => {
      const now = new Date();
      
      // A. Monthly collections trend (last 12 months)
      const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);
      twelveMonthsAgo.setHours(0,0,0,0);

      const monthlyCollections = await paymentRepository.aggregate([
        { $match: { paymentDate: { $gte: twelveMonthsAgo } } },
        {
          $group: {
            _id: {
              year: { $year: "$paymentDate" },
              month: { $month: "$paymentDate" }
            },
            amount: { $sum: "$amount" }
          }
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } }
      ]);

      // B. Payment mode distributions
      const modeDistribution = await paymentRepository.aggregate([
        { $group: { _id: "$paymentMode", amount: { $sum: "$amount" }, count: { $sum: 1 } } }
      ]);

      // C. Payment Plan splits (Doughnut chart)
      const planDistribution = await feePlanRepository.aggregate([
        { $match: { deletedAt: null } },
        { $group: { _id: "$paymentPlan", count: { $sum: 1 } } }
      ]);

      // D. General Fee status breakdowns (Paid vs Pending vs Overdue)
      const statusDistribution = await feePlanRepository.aggregate([
        { $match: { deletedAt: null } },
        { $group: { _id: "$status", count: { $sum: 1 } } }
      ]);

      return {
        monthlyCollections: monthlyCollections.map(item => ({
          year: item._id.year,
          month: item._id.month,
          amount: item.amount
        })),
        modeDistribution: modeDistribution.map(item => ({
          mode: item._id,
          amount: item.amount,
          count: item.count
        })),
        planDistribution: planDistribution.map(item => ({
          plan: item._id,
          count: item.count
        })),
        statusDistribution: statusDistribution.map(item => ({
          status: item._id,
          count: item.count
        }))
      };
    });
  }

  /**
   * Fetch 10 most recent payment log entries.
   */
  async getRecentPayments() {
    return await cacheHelper.remember('dashboard:recent_payments', 300, async () => {
      return await paymentRepository.getRecentPayments(10);
    });
  }

  /**
   * Fetch 10 upcoming scheduled dues.
   */
  async getUpcomingDue() {
    return await cacheHelper.remember('dashboard:upcoming_due', 300, async () => {
      return await installmentRepository.getUpcomingDue(10);
    });
  }

  /**
   * Fetch 10 oldest overdue installments.
   */
  async getOverdue() {
    return await cacheHelper.remember('dashboard:overdue', 300, async () => {
      return await installmentRepository.getOverdue(10);
    });
  }

  /**
   * Fetch latest 10 student admissions.
   */
  async getRecentStudents() {
    return await cacheHelper.remember('dashboard:recent_students', 300, async () => {
      return await studentRepository.getRecentStudents(10);
    });
  }

  /**
   * Fetch latest 15 activity audit logs.
   */
  async getRecentActivities() {
    return await cacheHelper.remember('dashboard:recent_activities', 300, async () => {
      return await activityLogRepository.getRecent(15);
    });
  }
}

module.exports = new DashboardService();
