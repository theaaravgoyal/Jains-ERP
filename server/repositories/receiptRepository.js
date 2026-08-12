const Receipt = require('../models/Receipt');

/**
 * Receipt Repository - Handles database interactions for Receipt entities.
 * Automatically handles sequential receipt number generation inside sessions.
 */
class ReceiptRepository {
  /**
   * Create a new receipt record.
   * @param {Object} receiptData - Receipt details.
   * @param {Object|null} session - Mongoose transaction session.
   */
  async create(receiptData, session = null) {
    const options = session ? { session } : {};
    
    // Generate next sequential receipt number if not provided
    if (!receiptData.receiptNumber) {
      receiptData.receiptNumber = await this.getNextReceiptNumber(session);
    }
    
    const [receipt] = await Receipt.create([receiptData], options);
    return receipt;
  }

  /**
   * Helper to safely generate incremental sequential receipt numbers.
   * Format: RCPXXXXXX (e.g. RCP000001)
   * @param {Object|null} session - Transaction session to lock reads.
   */
  async getNextReceiptNumber(session = null) {
    const currentYear = new Date().getFullYear();
    const prefix = `RCP-${currentYear}-`;
    const q = Receipt.findOne({ receiptNumber: new RegExp(`^${prefix}`) }).sort({ receiptNumber: -1 });
    if (session) q.session(session);
    const lastReceipt = await q;

    let nextNum = 1;
    if (lastReceipt && lastReceipt.receiptNumber) {
      const parts = lastReceipt.receiptNumber.split('-');
      const lastNum = parseInt(parts[2] || parts[parts.length - 1], 10);
      if (!isNaN(lastNum)) {
        nextNum = lastNum + 1;
      }
    }

    return `${prefix}${String(nextNum).padStart(6, '0')}`;
  }

  /**
   * Find a receipt by payment ID.
   * @param {string} paymentId - Payment database Object ID.
   */
  async findByPaymentId(paymentId) {
    return await Receipt.findOne({ paymentId })
      .populate('student', 'fullName studentId course')
      .lean();
  }

  /**
   * Count documents matching a query filter.
   * @param {Object} filter - Query filter.
   */
  async count(filter = {}) {
    return await Receipt.countDocuments(filter);
  }

  /**
   * Fetch receipts with pagination and populate.
   * @param {Object} query - Filter parameters.
   * @param {number} skip - Offset skip count.
   * @param {number} limit - Max limit.
   */
  async findAndPaginate(query, skip, limit) {
    return await Receipt.find(query)
      .sort({ generatedDate: -1 })
      .skip(skip)
      .limit(limit)
      .populate('studentId', 'fullName studentId course mobile email')
      .populate({
        path: 'paymentId',
        select: 'amount paymentMode paymentType transactionId remarks receivedBy paymentDate',
        populate: {
          path: 'receivedBy',
          select: 'name email'
        }
      })
      .lean();
  }

  /**
   * Find receipt by ID.
   * @param {string} id - Receipt ID.
   */
  async findById(id) {
    return await Receipt.findById(id)
      .populate('studentId', 'fullName studentId course mobile email fatherName address')
      .populate({
        path: 'paymentId',
        select: 'amount paymentMode paymentType transactionId remarks receivedBy paymentDate',
        populate: {
          path: 'receivedBy',
          select: 'name email'
        }
      })
      .lean();
  }
}

module.exports = new ReceiptRepository();
