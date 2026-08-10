const paymentService = require('../services/paymentService');
const { sendSuccess } = require('../utils/responseHelper');
const asyncHandler = require('../utils/asyncHandler');
const notificationService = require('../services/notificationService');
const { addEmailJob } = require('../queues/queueManager');
const cacheHelper = require('../utils/cacheHelper');

/**
 * Payment Controller - Directs incoming Manual Payment Collection requests to the service layer.
 * Standardizes output formatting and success mappings.
 */

/**
 * Process a new payment entry manually.
 * @route POST /api/payments
 */
const createPayment = asyncHandler(async (req, res) => {
  const staffId = req.user.id || req.user._id;
  const payment = await paymentService.collectPayment(req.body, staffId);

  // Dynamic Notifications Center Trigger via BullMQ
  await notificationService.create({
    title: 'Payment Received',
    message: `Offline payment of ₹${payment.amount} collected via ${payment.paymentMode} for student.`,
    module: 'Fees Management',
    type: 'SUCCESS',
    priority: 'HIGH',
    targetUser: staffId,
    createdBy: staffId,
    referenceId: payment._id,
    referenceType: 'Payment',
    actionUrl: `/fees/payments`
  });

  // Enqueue receipt notification / email job via BullMQ
  if (req.body.studentEmail || payment.studentId?.email) {
    const studentEmail = req.body.studentEmail || payment.studentId?.email;
    await addEmailJob('payment-receipt-email', {
      type: 'PAYMENT_RECEIPT',
      to: studentEmail,
      subject: `Payment Receipt: ₹${payment.amount} Received`,
      data: {
        amount: payment.amount,
        paymentMode: payment.paymentMode,
        transactionId: payment.transactionId || 'Offline Collection',
        studentName: req.body.studentName || 'Student',
        receiptNumber: payment.receiptNumber || `RCP-${Date.now()}`
      }
    });
  }

  // Invalidate Redis dashboard and report caches
  await cacheHelper.delByPattern('dashboard:*');
  await cacheHelper.delByPattern('report:*');

  return sendSuccess(res, 'Payment registered successfully', payment, 201);
});

/**
 * Get all payment history logs in the system.
 * @route GET /api/payments
 */
const getPayments = asyncHandler(async (req, res) => {
  const payments = await paymentService.listAllPayments();
  return sendSuccess(res, 'All payments retrieved successfully', payments, 200);
});

/**
 * Get details for a specific payment entry.
 * @route GET /api/payments/:id
 */
const getPaymentById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const payment = await paymentService.getPaymentDetails(id);
  return sendSuccess(res, 'Payment details retrieved successfully', payment, 200);
});

/**
 * Get payment logs registered for a specific student.
 * @route GET /api/payments/student/:studentId
 */
const getPaymentsByStudent = asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  const payments = await paymentService.getStudentPayments(studentId);
  return sendSuccess(res, 'Student payment history retrieved successfully', payments, 200);
});

/**
 * Get student activity logs history.
 * @route GET /api/payments/logs/student/:studentId
 */
const getStudentActivityLogs = asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  const logs = await paymentService.getStudentLogs(studentId);
  return sendSuccess(res, 'Student activity logs retrieved successfully', logs, 200);
});

module.exports = {
  createPayment,
  getPayments,
  getPaymentById,
  getPaymentsByStudent,
  getStudentActivityLogs
};
