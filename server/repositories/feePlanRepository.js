const FeePlan = require('../models/FeePlan');

/**
 * FeePlan Repository - Concrete implementation of database operations for Fee Plan entities.
 * Automatically handles soft-delete filtering so deleted documents are excluded from application logic.
 */
class FeePlanRepository {
  /**
   * Check if a student already has an active, non-deleted Fee Plan.
   * @param {string} studentId - Student database Object ID.
   */
  async existsActivePlan(studentId) {
    const plan = await FeePlan.findOne({ studentId, deletedAt: null }).lean();
    return !!plan;
  }

  /**
   * Create a new student Fee Plan.
   * @param {Object} planData - Fee plan registration details.
   */
  async create(planData) {
    return await FeePlan.create(planData);
  }

  /**
   * Find a student's active Fee Plan.
   * @param {string} studentId - Student database Object ID.
   */
  async findByStudentId(studentId) {
    return await FeePlan.findOne({ studentId, deletedAt: null })
      .populate('student')
      .lean();
  }

  /**
   * Update details of a student's active Fee Plan.
   * @param {string} studentId - Student database Object ID.
   * @param {Object} updateData - Key-value pair parameters to update.
   */
  async update(studentId, updateData) {
    return await FeePlan.findOneAndUpdate(
      { studentId, deletedAt: null },
      updateData,
      { returnDocument: 'after', runValidators: true }
    ).populate('student');
  }

  /**
   * Soft-delete a student's active Fee Plan.
   * @param {string} studentId - Student database Object ID.
   * @param {string} userId - User ID of staff deleting the plan.
   */
  async softDelete(studentId, userId) {
    return await FeePlan.findOneAndUpdate(
      { studentId, deletedAt: null },
      {
        status: 'INACTIVE',
        deletedAt: new Date(),
        deletedBy: userId
      },
      { returnDocument: 'after' }
    ).populate('student');
  }

  /**
   * Run custom aggregation pipelines.
   * @param {Array} pipeline - Aggregation pipeline.
   */
  async aggregate(pipeline) {
    return await FeePlan.aggregate(pipeline);
  }

  /**
   * Find one fee plan using specific filter (optional transaction session).
   * @param {Object} filter - Query filter.
   * @param {Object|null} session - Transaction session.
   */
  async findOne(filter, session = null) {
    const query = FeePlan.findOne({ ...filter, deletedAt: null });
    if (session) query.session(session);
    return await query;
  }
}

module.exports = new FeePlanRepository();
