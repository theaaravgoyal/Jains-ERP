const mongoose = require('mongoose');
const { sendError } = require('../utils/responseHelper');

/**
 * Custom validation middleware for payment collection requests.
 * Validates payload structures, amounts, enums, and references.
 */
const validatePaymentInput = (req, res, next) => {
  const { studentId, paymentType, paymentMode, amount, installmentId, paymentDate } = req.body;
  const errors = [];

  // Validate studentId
  if (!studentId || !studentId.trim()) {
    errors.push('Student reference (studentId) is required.');
  } else if (!mongoose.Types.ObjectId.isValid(studentId.trim())) {
    errors.push('Please provide a valid Student reference ID.');
  }

  // Validate paymentType enum
  const allowedTypes = ['FULL_PAYMENT', 'INSTALLMENT_PAYMENT', 'PARTIAL_PAYMENT', 'ADVANCE_PAYMENT', 'INITIAL_PAYMENT'];
  if (!paymentType) {
    errors.push('Payment type is required.');
  } else if (!allowedTypes.includes(paymentType)) {
    errors.push(`Payment type must be one of: ${allowedTypes.join(', ')}`);
  }

  // Validate paymentMode enum
  const allowedModes = ['Cash', 'UPI', 'Card', 'Net Banking', 'Bank Transfer', 'Cheque'];
  if (!paymentMode) {
    errors.push('Payment mode is required.');
  } else if (!allowedModes.includes(paymentMode)) {
    errors.push(`Payment mode must be one of: ${allowedModes.join(', ')}`);
  }

  // Validate amount
  if (amount === undefined || amount === null) {
    errors.push('Payment amount is required.');
  } else {
    const amtNum = Number(amount);
    if (isNaN(amtNum)) {
      errors.push('Payment amount must be a number.');
    } else if (amtNum <= 0) {
      errors.push('Payment amount must be greater than zero.');
    }
  }

  // Validate installmentId if applicable
  if ((paymentType === 'INSTALLMENT_PAYMENT' || (paymentType === 'PARTIAL_PAYMENT' && installmentId)) && installmentId) {
    if (!mongoose.Types.ObjectId.isValid(installmentId.trim())) {
      errors.push('Please provide a valid Installment reference ID.');
    }
  }

  // Validate paymentDate
  if (paymentDate) {
    const parsedDate = Date.parse(paymentDate);
    if (isNaN(parsedDate)) {
      errors.push('Please provide a valid payment date.');
    }
  }

  if (errors.length > 0) {
    return sendError(res, 'Validation failed', errors, 400);
  }

  next();
};

module.exports = {
  validatePaymentInput
};
