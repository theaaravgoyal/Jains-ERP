const mongoose = require('mongoose');

/**
 * Payment Schema - Records every individual payment transaction initiated.
 * Supports different payment types, payment modes, transaction tracking, and operator auditing.
 */
const PaymentSchema = new mongoose.Schema(
  {
    // Associated Student profile
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: [true, 'Student reference is required'],
      index: true,
    },
    // Parent billing plan reference
    feePlanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FeePlan',
      required: [true, 'Fee plan reference is required'],
      index: true,
    },
    // Specific Installment reference if billing plan is INSTALLMENT (Optional)
    installmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Installment',
      default: null,
      index: true,
    },
    // The type categorization of this payment transaction
    paymentType: {
      type: String,
      required: [true, 'Payment type classification is required'],
      enum: {
        values: ['FULL_PAYMENT', 'INSTALLMENT_PAYMENT', 'PARTIAL_PAYMENT', 'ADVANCE_PAYMENT', 'INITIAL_PAYMENT'],
        message: '{VALUE} is not a valid payment type',
      },
    },
    // Payment instrument mode
    paymentMode: {
      type: String,
      required: [true, 'Payment mode is required'],
      enum: {
        values: ['Cash', 'UPI', 'Card', 'Net Banking', 'Bank Transfer', 'Cheque'],
        message: '{VALUE} is not a valid payment mode',
      },
    },
    // Financial amount processed in this transaction
    amount: {
      type: Number,
      required: [true, 'Transaction amount is required'],
      min: [1, 'Payment amount must be greater than zero'],
    },
    // Extra advance credit generated from overpayment (if applicable)
    advanceAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Gateway transaction hash or identifier (e.g. UPI Ref, Card Txn No, Check No)
    transactionId: {
      type: String,
      trim: true,
      default: '',
    },
    // Optional administrative or verification remarks
    remarks: {
      type: String,
      trim: true,
      default: '',
    },
    // Reference to User/Staff who accepted or verified the payment
    receivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Receiver staff reference is required'],
    },
    // Timestamp when payment transaction occurred
    paymentDate: {
      type: Date,
      default: Date.now,
    },
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// --- Virtual Relationships ---

// Virtual relationship referencing Student
PaymentSchema.virtual('student', {
  ref: 'Student',
  localField: 'studentId',
  foreignField: '_id',
  justOne: true,
});

// Virtual relationship referencing FeePlan
PaymentSchema.virtual('feePlan', {
  ref: 'FeePlan',
  localField: 'feePlanId',
  foreignField: '_id',
  justOne: true,
});

// Virtual relationship referencing specific Installment details
PaymentSchema.virtual('installment', {
  ref: 'Installment',
  localField: 'installmentId',
  foreignField: '_id',
  justOne: true,
});

// Virtual relationship referencing the generated Receipt document
PaymentSchema.virtual('receipt', {
  ref: 'Receipt',
  localField: '_id',
  foreignField: 'paymentId',
  justOne: true,
});

// Performance Indexes for collections reports, dashboard recent activities, and ledgers
PaymentSchema.index({ paymentDate: -1 });
PaymentSchema.index({ studentId: 1, paymentDate: -1 });

module.exports = mongoose.model('Payment', PaymentSchema);
