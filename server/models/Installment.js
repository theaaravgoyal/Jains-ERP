const mongoose = require('mongoose');

/**
 * Installment Schema - Tracks individual installment breakdowns for students on an installment plan.
 * Each document stores payment obligations, due dates, paid date records, and status.
 */
const InstallmentSchema = new mongoose.Schema(
  {
    // Reference to Student (indexed for performance)
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: [true, 'Student reference is required'],
      index: true,
    },
    // Reference to parent FeePlan
    feePlanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FeePlan',
      required: [true, 'Fee plan reference is required'],
      index: true,
    },
    // Installment number index (e.g., 1st, 2nd, etc.)
    installmentNo: {
      type: Number,
      required: [true, 'Installment number index is required'],
      min: [1, 'Installment number must be at least 1'],
    },
    // Financial amount expected for this installment
    amount: {
      type: Number,
      required: [true, 'Installment amount is required'],
      min: [0, 'Installment amount cannot be negative'],
    },
    // Expected payment due date
    dueDate: {
      type: Date,
      required: [true, 'Due date is required'],
    },
    // Date when this installment was fully paid (default null)
    paidDate: {
      type: Date,
      default: null,
    },
    // Payment status of this installment
    status: {
      type: String,
      enum: {
        values: ['PENDING', 'PAID', 'PARTIAL', 'OVERDUE'],
        message: '{VALUE} is not a valid installment status',
      },
      default: 'PENDING',
    },
    // Operator remarks or notes
    remarks: {
      type: String,
      trim: true,
      default: '',
    },
    // Amount paid on this installment so far
    paidAmount: {
      type: Number,
      default: 0,
      min: [0, 'Paid amount cannot be negative'],
    },
    // Amount of advance credit applied to this installment
    advanceApplied: {
      type: Number,
      default: 0,
      min: [0, 'Advance applied cannot be negative'],
    },
    // Remaining unpaid balance of this installment
    remainingAmount: {
      type: Number,
      required: [true, 'Remaining amount details are required'],
      min: [0, 'Remaining balance cannot be negative'],
    },
    // Timestamp when installment was soft deleted
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

// Virtual relationship referencing Student
InstallmentSchema.virtual('student', {
  ref: 'Student',
  localField: 'studentId',
  foreignField: '_id',
  justOne: true,
});

// Virtual relationship referencing FeePlan
InstallmentSchema.virtual('feePlan', {
  ref: 'FeePlan',
  localField: 'feePlanId',
  foreignField: '_id',
  justOne: true,
});

// Virtual relationship referencing Payment transactions made for this installment
InstallmentSchema.virtual('payments', {
  ref: 'Payment',
  localField: '_id',
  foreignField: 'installmentId',
});

// Virtual relationship referencing Invoices generated for this installment
InstallmentSchema.virtual('invoices', {
  ref: 'Invoice',
  localField: '_id',
  foreignField: 'installmentId',
});

// Compound index to guarantee uniqueness of installment numbers per fee plan
InstallmentSchema.index({ feePlanId: 1, installmentNo: 1 }, { unique: true });

// Performance Indexes for reports, overdue scans, and student lookups
InstallmentSchema.index({ deletedAt: 1, status: 1, dueDate: 1 });
InstallmentSchema.index({ studentId: 1, deletedAt: 1 });

module.exports = mongoose.model('Installment', InstallmentSchema);
