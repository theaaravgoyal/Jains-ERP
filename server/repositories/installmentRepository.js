const Installment = require('../models/Installment');

/**
 * Installment Repository - Handles concrete database interactions for Installment entities.
 * Automatically filters out soft-deleted documents.
 */
class InstallmentRepository {
  /**
   * Batch insert an array of installment records.
   * @param {Array<Object>} installmentsArray - List of installment objects.
   */
  async createMany(installmentsArray) {
    return await Installment.insertMany(installmentsArray);
  }

  /**
   * Find all active installments of a student.
   * @param {string} studentId - Student database Object ID.
   */
  async findByStudentId(studentId) {
    return await Installment.find({ studentId, deletedAt: null })
      .sort({ installmentNo: 1 })
      .lean();
  }

  /**
   * Find a specific active installment by student ID and installment number index.
   * @param {string} studentId - Student database Object ID.
   * @param {number} installmentNo - Number of target installment.
   */
  async findByIdAndNo(studentId, installmentNo) {
    return await Installment.findOne({ studentId, installmentNo, deletedAt: null }).lean();
  }

  /**
   * Get non-deleted installment by Object ID.
   * @param {string} id - Installment database Object ID.
   */
  async findById(id) {
    return await Installment.findOne({ _id: id, deletedAt: null }).lean();
  }

  /**
   * Update parameters of an active installment.
   * @param {string} id - Installment database Object ID.
   * @param {Object} updateData - Key-values to update.
   */
  async update(id, updateData) {
    return await Installment.findOneAndUpdate(
      { _id: id, deletedAt: null },
      updateData,
      { new: true, runValidators: true }
    );
  }

  /**
   * Perform a soft delete on an installment.
   * @param {string} id - Installment Object ID.
   * @param {string} userId - User ID of staff deleting the record.
   */
  async softDelete(id, userId) {
    return await Installment.findOneAndUpdate(
      { _id: id, deletedAt: null },
      {
        deletedAt: new Date(),
        deletedBy: userId
      },
      { new: true }
    );
  }

  /**
   * Hard delete all installments associated with a Fee Plan (for regeneration).
   * @param {string} feePlanId - Fee Plan database Object ID.
   */
  async deleteManyByPlan(feePlanId) {
    return await Installment.deleteMany({ feePlanId });
  }

  /**
   * Find all active installments that are unpaid, not marked overdue, but past their due date.
   * @param {Date} date - Reference date.
   */
  async findUnpaidOverdue(date) {
    return await Installment.find({
      deletedAt: null,
      status: { $nin: ['PAID', 'OVERDUE'] },
      dueDate: { $lt: date }
    }).lean();
  }

  /**
   * Run custom aggregation pipelines.
   * @param {Array} pipeline - Aggregation pipeline.
   */
  async aggregate(pipeline) {
    return await Installment.aggregate(pipeline);
  }

  /**
   * Find a single installment document with optional session.
   * @param {Object} filter - Query filter.
   * @param {Object|null} session - Transaction session.
   */
  async findOne(filter, session = null) {
    const query = Installment.findOne({ ...filter, deletedAt: null });
    if (session) query.session(session);
    return await query;
  }

  /**
   * Find multiple installment documents with optional sorting and session.
   * @param {Object} filter - Query filter.
   * @param {Object} sort - Sorting options.
   * @param {Object|null} session - Transaction session.
   */
  async find(filter, sort = {}, session = null) {
    const query = Installment.find({ ...filter, deletedAt: null }).sort(sort);
    if (session) query.session(session);
    return await query;
  }

  /**
   * Check if any installment document exists matching filter with optional session.
   * @param {Object} filter - Query filter.
   * @param {Object|null} session - Transaction session.
   */
  async exists(filter, session = null) {
    const query = Installment.exists({ ...filter, deletedAt: null });
    if (session) query.session(session);
    return await query;
  }

  /**
   * Fetch upcoming scheduled dues.
   * @param {number} limit - Target number of installments.
   */
  async getUpcomingDue(limit = 10) {
    const now = new Date();
    return await Installment.find({
      deletedAt: null,
      status: { $ne: 'PAID' },
      dueDate: { $gte: now }
    })
    .sort({ dueDate: 1 })
    .limit(limit)
    .populate('studentId', 'fullName studentId course mobile')
    .lean();
  }

  /**
   * Fetch oldest overdue installments.
   * @param {number} limit - Target number of installments.
   */
  async getOverdue(limit = 10) {
    return await Installment.find({
      deletedAt: null,
      status: 'OVERDUE'
    })
    .sort({ dueDate: 1 })
    .limit(limit)
    .populate('studentId', 'fullName studentId course mobile')
    .lean();
  }
}

module.exports = new InstallmentRepository();
