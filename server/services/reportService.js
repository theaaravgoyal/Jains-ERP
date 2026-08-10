const studentRepository = require('../repositories/studentRepository');
const feePlanRepository = require('../repositories/feePlanRepository');
const installmentRepository = require('../repositories/installmentRepository');
const paymentRepository = require('../repositories/paymentRepository');
const activityLogRepository = require('../repositories/activityLogRepository');
const { getStartAndEndDate } = require('../utils/dateHelper');
const { NotFoundError } = require('../utils/customErrors');
const cacheHelper = require('../utils/cacheHelper');

/**
 * Report Service - Implements clean high-performance aggregation pipelines
 * to output daily, weekly, monthly, custom collections, course-wise summaries, and student ledgers.
 */
class ReportService {
  /**
   * Helper to build collections filters based on dates
   */
  async getCollectionReport(queryParams, dateFilter) {
    const { course, paymentMode, paymentType, feeStatus, search, sort = 'date_desc' } = queryParams;
    
    const pipeline = [];
    
    // 1. Filter payments by date, mode, type (for performance matching indexes)
    const matchPayment = { ...dateFilter };
    if (paymentMode) matchPayment.paymentMode = paymentMode;
    if (paymentType) matchPayment.paymentType = paymentType;
    pipeline.push({ $match: matchPayment });
    
    // 2. Resolve Student references
    pipeline.push({
      $lookup: {
        from: "students",
        localField: "studentId",
        foreignField: "_id",
        as: "student"
      }
    });
    pipeline.push({ $unwind: "$student" });
    pipeline.push({ $match: { "student.deletedAt": null } });
    
    // 3. Resolve parent FeePlans (for feeStatus filters)
    pipeline.push({
      $lookup: {
        from: "feeplans",
        localField: "feePlanId",
        foreignField: "_id",
        as: "feePlan"
      }
    });
    pipeline.push({ $unwind: "$feePlan" });
    
    // 4. Resolve virtual Receipts
    pipeline.push({
      $lookup: {
        from: "receipts",
        localField: "_id",
        foreignField: "paymentId",
        as: "receipt"
      }
    });
    pipeline.push({ $unwind: { path: "$receipt", preserveNullAndEmptyArrays: true } });

    // 5. Resolve receivedBy (Staff details)
    pipeline.push({
      $lookup: {
        from: "users",
        localField: "receivedBy",
        foreignField: "_id",
        as: "receivedBy"
      }
    });
    pipeline.push({ $unwind: { path: "$receivedBy", preserveNullAndEmptyArrays: true } });

    // 6. Apply search and course filters
    const matchStudent = {};
    if (course) {
      matchStudent["student.course"] = course;
    }
    if (feeStatus) {
      matchStudent["feePlan.status"] = feeStatus.toUpperCase();
    }
    
    if (search && search.trim()) {
      const searchRegex = { $regex: search.trim(), $options: 'i' };
      matchStudent.$or = [
        { "student.fullName": searchRegex },
        { "student.studentId": searchRegex },
        { "student.mobile": searchRegex },
        { "student.course": searchRegex },
        { "receipt.receiptNumber": searchRegex },
        { "transactionId": searchRegex }
      ];
    }
    
    if (Object.keys(matchStudent).length > 0) {
      pipeline.push({ $match: matchStudent });
    }
    
    // 7. Sorting
    let sortStage = { paymentDate: -1 }; // date_desc default
    if (sort === 'date_asc') {
      sortStage = { paymentDate: 1 };
    } else if (sort === 'amount_desc') {
      sortStage = { amount: -1 };
    } else if (sort === 'amount_asc') {
      sortStage = { amount: 1 };
    }
    pipeline.push({ $sort: sortStage });

    // 8. Projection
    pipeline.push({
      $project: {
        _id: 1,
        paymentType: 1,
        paymentMode: 1,
        amount: 1,
        transactionId: 1,
        remarks: 1,
        paymentDate: 1,
        student: {
          _id: "$student._id",
          fullName: "$student.fullName",
          studentId: "$student.studentId",
          course: "$student.course"
        },
        receipt: {
          receiptNumber: "$receipt.receiptNumber"
        },
        receivedBy: {
          name: "$receivedBy.name",
          email: "$receivedBy.email"
        }
      }
    });
    
    return await paymentRepository.aggregate(pipeline);
  }

  /**
   * 1. GET /reports/summary
   */
  async getSummary() {
    return await cacheHelper.remember('report:summary', 60, async () => {
      const studentCount = await studentRepository.countActive();
      
      // Aggregate sum of total pending balances
      const feePlanStats = await feePlanRepository.aggregate([
        { $match: { deletedAt: null } },
        { $group: { _id: null, totalPending: { $sum: "$remainingAmount" } } }
      ]);
      const totalPending = feePlanStats[0]?.totalPending || 0;
      
      // Aggregate sum of total overdue balances
      const overdueStats = await installmentRepository.aggregate([
        { $match: { deletedAt: null, status: 'OVERDUE' } },
        { $group: { _id: null, totalOverdue: { $sum: "$remainingAmount" } } }
      ]);
      const totalOverdue = overdueStats[0]?.totalOverdue || 0;

      // Daily and Monthly collections sums
      const now = new Date();
      const todayStart = new Date(now); todayStart.setHours(0,0,0,0);
      const todayEnd = new Date(now); todayEnd.setHours(23,59,59,999);
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      monthStart.setHours(0,0,0,0);

      const paymentStats = await paymentRepository.aggregate([
        {
          $facet: {
            totalCollection: [
              { $group: { _id: null, total: { $sum: "$amount" } } }
            ],
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

      return {
        totalCollection: paymentStats[0]?.totalCollection[0]?.total || 0,
        totalPending,
        totalOverdue,
        todayCollection: paymentStats[0]?.todayCollection[0]?.total || 0,
        thisMonthCollection: paymentStats[0]?.monthCollection[0]?.total || 0,
        totalStudents: studentCount
      };
    });
  }

  /**
   * 2. GET /reports/daily
   */
  async getDailyReport(queryParams) {
    const today = new Date();
    const start = new Date(today); start.setHours(0,0,0,0);
    const end = new Date(today); end.setHours(23,59,59,999);
    const dateFilter = { paymentDate: { $gte: start, $lte: end } };
    return await this.getCollectionReport(queryParams, dateFilter);
  }

  /**
   * 3. GET /reports/weekly
   */
  async getWeeklyReport(queryParams) {
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - today.getDay()); start.setHours(0,0,0,0); // Sunday
    const end = new Date(today);
    end.setDate(start.getDate() + 6); end.setHours(23,59,59,999); // Saturday
    const dateFilter = { paymentDate: { $gte: start, $lte: end } };
    return await this.getCollectionReport(queryParams, dateFilter);
  }

  /**
   * 4. GET /reports/monthly
   */
  async getMonthlyReport(queryParams) {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), 1); start.setHours(0,0,0,0);
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 0); end.setHours(23,59,59,999);
    const dateFilter = { paymentDate: { $gte: start, $lte: end } };
    return await this.getCollectionReport(queryParams, dateFilter);
  }

  /**
   * 5. GET /reports/custom
   */
  async getCustomRangeReport(queryParams) {
    const { startDate, endDate } = queryParams;
    const start = startDate ? new Date(startDate) : new Date(); start.setHours(0,0,0,0);
    const end = endDate ? new Date(endDate) : new Date(); end.setHours(23,59,59,999);
    const dateFilter = { paymentDate: { $gte: start, $lte: end } };
    return await this.getCollectionReport(queryParams, dateFilter);
  }

  /**
   * 6. GET /reports/course-wise
   */
  async getCourseWiseReport() {
    return await studentRepository.aggregate([
      { $match: { deletedAt: null } },
      {
        $lookup: {
          from: "feeplans",
          localField: "_id",
          foreignField: "studentId",
          as: "feePlan"
        }
      },
      { $unwind: { path: "$feePlan", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: "$course",
          totalStudents: { $sum: 1 },
          collectedAmount: { $sum: { $ifNull: ["$feePlan.paidAmount", 0] } },
          pendingAmount: { $sum: { $ifNull: ["$feePlan.remainingAmount", 0] } }
        }
      },
      {
        $project: {
          course: "$_id",
          totalStudents: 1,
          collectedAmount: 1,
          pendingAmount: 1,
          _id: 0
        }
      },
      { $sort: { course: 1 } }
    ]);
  }

  /**
   * 7. GET /reports/student-ledger/:studentId
   */
  async getStudentLedger(studentId) {
    const student = await studentRepository.findById(studentId);
    if (!student) {
      throw new NotFoundError('The specified student does not exist.');
    }

    const installments = await installmentRepository.findByStudentId(studentId);
    const payments = await paymentRepository.findByStudentId(studentId);
    const timeline = await activityLogRepository.findByStudentId(studentId);

    return {
      student,
      installments,
      payments,
      timeline
    };
  }

  /**
   * 8. GET /reports/pending
   */
  async getPendingReport(queryParams) {
    const { course, search } = queryParams;

    const pipeline = [
      { $match: { deletedAt: null, status: { $ne: 'PAID' } } },
      {
        $lookup: {
          from: "students",
          localField: "studentId",
          foreignField: "_id",
          as: "student"
        }
      },
      { $unwind: "$student" },
      { $match: { "student.deletedAt": null } }
    ];

    const matchFilter = {};
    if (course) {
      matchFilter["student.course"] = course;
    }
    if (search && search.trim()) {
      const searchRegex = { $regex: search.trim(), $options: 'i' };
      matchFilter.$or = [
        { "student.fullName": searchRegex },
        { "student.studentId": searchRegex },
        { "student.mobile": searchRegex },
        { "student.course": searchRegex }
      ];
    }

    if (Object.keys(matchFilter).length > 0) {
      pipeline.push({ $match: matchFilter });
    }

    pipeline.push({ $sort: { dueDate: 1 } });
    
    pipeline.push({
      $project: {
        _id: 1,
        installmentNo: 1,
        dueDate: 1,
        amount: 1,
        paidAmount: 1,
        remainingAmount: 1,
        status: 1,
        student: {
          _id: "$student._id",
          fullName: "$student.fullName",
          studentId: "$student.studentId",
          course: "$student.course"
        }
      }
    });

    return await installmentRepository.aggregate(pipeline);
  }

  /**
   * 9. GET /reports/overdue
   */
  async getOverdueReport(queryParams) {
    const { course, search } = queryParams;
    const pipeline = [
      { $match: { deletedAt: null, status: 'OVERDUE' } },
      {
        $lookup: {
          from: "students",
          localField: "studentId",
          foreignField: "_id",
          as: "student"
        }
      },
      { $unwind: "$student" },
      { $match: { "student.deletedAt": null } }
    ];

    const matchFilter = {};
    if (course) {
      matchFilter["student.course"] = course;
    }
    if (search && search.trim()) {
      const searchRegex = { $regex: search.trim(), $options: 'i' };
      matchFilter.$or = [
        { "student.fullName": searchRegex },
        { "student.studentId": searchRegex },
        { "student.mobile": searchRegex },
        { "student.course": searchRegex }
      ];
    }

    if (Object.keys(matchFilter).length > 0) {
      pipeline.push({ $match: matchFilter });
    }

    pipeline.push({ $sort: { dueDate: 1 } });
    
    pipeline.push({
      $project: {
        _id: 1,
        installmentNo: 1,
        dueDate: 1,
        amount: 1,
        paidAmount: 1,
        remainingAmount: 1,
        status: 1,
        student: {
          _id: "$student._id",
          fullName: "$student.fullName",
          studentId: "$student.studentId",
          course: "$student.course"
        }
      }
    });

    return await installmentRepository.aggregate(pipeline);
  }
}

module.exports = new ReportService();
