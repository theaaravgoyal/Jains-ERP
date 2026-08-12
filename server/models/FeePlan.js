const mongoose = require('mongoose');

/**
 * FeePlan Schema - Defines the billing schedule/plan structure for an enrolled student.
 * Tracks total fee obligations, installments division, amounts collected vs remaining balance.
 */
const FeePlanSchema = new mongoose.Schema(
  {
    // The student this plan belongs to (One-to-One index constraint)
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: [true, 'Student profile reference is required'],
      unique: true,
      index: true,
    },
    // Total fees designated for the student
    totalFees: {
      type: Number,
      required: [true, 'Total billing amount is required'],
      min: [0, 'Total fees cannot be negative'],
    },
    // Chosen payment plan mode (FULL_PAYMENT or INSTALLMENT)
    paymentPlan: {
      type: String,
      required: [true, 'Payment plan classification is required'],
      enum: {
        values: ['FULL_PAYMENT', 'INSTALLMENT'],
        message: '{VALUE} is not a valid payment plan',
      },
    },
    // Number of installment divisions (default is 1 for FULL_PAYMENT)
    numberOfInstallments: {
      type: Number,
      default: 1,
      min: [1, 'Number of installments must be at least 1'],
    },
    // Divided installment amount (totalFees divided by numberOfInstallments)
    installmentAmount: {
      type: Number,
      required: [true, 'Installment amount division is required'],
      min: [0, 'Installment amount cannot be negative'],
    },
    // Expected date for first billing payment
    firstDueDate: {
      type: Date,
      required: [true, 'First installment due date is required'],
    },
    // Remaining balance to be paid
    remainingAmount: {
      type: Number,
      required: [true, 'Remaining balance details are required'],
      min: [0, 'Remaining fees cannot be negative'],
    },
    // Cumulative amount paid by the student so far
    paidAmount: {
      type: Number,
      default: 0,
      min: [0, 'Paid amount cannot be negative'],
    },
    // Remaining unallocated advance credit balance
    advanceCreditBalance: {
      type: Number,
      default: 0,
      min: [0, 'Advance credit cannot be negative'],
    },
    // Overall payment status of the fee plan
    status: {
      type: String,
      enum: {
        values: ['PENDING', 'PARTIAL', 'PAID', 'CANCELLED', 'INACTIVE'],
        message: '{VALUE} is not a valid plan status',
      },
      default: 'PENDING',
    },
    // Timestamp when fee plan was soft deleted
    deletedAt: {
      type: Date,
      default: null,
    },
    // Reference to User who performed soft delete
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// --- Virtual Relationships ---

// Virtual relationship referencing Student details
FeePlanSchema.virtual('student', {
  ref: 'Student',
  localField: 'studentId',
  foreignField: '_id',
  justOne: true,
});

// Virtual relationship referencing all associated installments
FeePlanSchema.virtual('installments', {
  ref: 'Installment',
  localField: '_id',
  foreignField: 'feePlanId',
});

// Virtual relationship referencing all associated payments
FeePlanSchema.virtual('payments', {
  ref: 'Payment',
  localField: '_id',
  foreignField: 'feePlanId',
});

// Computed virtual returning percentage of total fee paid
FeePlanSchema.virtual('percentagePaid').get(function () {
  if (!this.totalFees) return 0;
  return Math.round((this.paidAmount / this.totalFees) * 100);
});

// Pre-validate hook to auto-align remainingAmount to totalFees before save if not specified
FeePlanSchema.pre('validate', function () {
  if (this.isNew && this.remainingAmount === undefined) {
    this.remainingAmount = this.totalFees;
  }
});

module.exports = mongoose.model('FeePlan', FeePlanSchema);
