const mongoose = require('mongoose');
const Counter = require('./Counter');

/**
 * Receipt Schema - Represents a transaction receipt issued to a student upon successful payment.
 * Contains references to Student, Payment, and tracks PDF/printing generation & download status.
 */
const ReceiptSchema = new mongoose.Schema(
  {
    // Auto-generated unique alphanumeric receipt number
    receiptNumber: {
      type: String,
      unique: true,
      index: true,
    },
    // Reference to the source payment transaction (indexed and unique: one receipt per payment)
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
      required: [true, 'Payment transaction reference is required'],
      unique: true,
      index: true,
    },
    // Reference to Student (indexed for lookups)
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: [true, 'Student reference is required'],
      index: true,
    },
    // Amount detailed on the receipt
    amount: {
      type: Number,
      required: [true, 'Receipt amount is required'],
      min: [1, 'Amount must be greater than zero'],
    },
    // Payment mode used (UPI, Cash, Card, Net Banking)
    paymentMode: {
      type: String,
      required: [true, 'Payment mode is required'],
    },
    // Timestamp when this receipt was issued
    generatedDate: {
      type: Date,
      default: Date.now,
    },
    // Tracks if receipt was downloaded by the user or student
    downloadStatus: {
      type: Boolean,
      default: false,
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
ReceiptSchema.virtual('student', {
  ref: 'Student',
  localField: 'studentId',
  foreignField: '_id',
  justOne: true,
});

// Virtual relationship referencing Payment transaction
ReceiptSchema.virtual('payment', {
  ref: 'Payment',
  localField: 'paymentId',
  foreignField: '_id',
  justOne: true,
});

// Pre-save middleware to auto-generate sequential receiptNumber (collision-free)
ReceiptSchema.pre('save', async function () {
  if (!this.receiptNumber) {
    const currentYear = new Date().getFullYear();
    
    // Fetch dynamic prefix from settings
    const Settings = mongoose.model('Settings');
    const settingsDoc = await Settings.findOne({}) || { fee: { receiptPrefix: 'RCP' } };
    const receiptPrefix = settingsDoc.fee?.receiptPrefix || 'RCP';
    const prefix = `${receiptPrefix}-${currentYear}-`;
    
    // Find or seed counter
    let counter = await Counter.findOne({ key: `receipt_counter_${receiptPrefix}_${currentYear}` });
    if (!counter) {
      // Find last receipt starting with this prefix
      const lastReceipt = await mongoose.models.Receipt.findOne({
        receiptNumber: new RegExp(`^${prefix}`)
      }).sort({ receiptNumber: -1 });

      let startVal = 0;
      if (lastReceipt && lastReceipt.receiptNumber) {
        const parts = lastReceipt.receiptNumber.split('-');
        const lastNum = parseInt(parts[2], 10);
        if (!isNaN(lastNum)) {
          startVal = lastNum;
        }
      }
      
      counter = await Counter.findOneAndUpdate(
        { key: `receipt_counter_${receiptPrefix}_${currentYear}` },
        { $setOnInsert: { value: startVal } },
        { upsert: true, new: true, returnDocument: 'after' }
      );
    }
    
    // Now increment atomically
    counter = await Counter.findOneAndUpdate(
      { key: `receipt_counter_${receiptPrefix}_${currentYear}` },
      { $inc: { value: 1 } },
      { returnDocument: 'after', new: true }
    );
    
    const padded = String(counter.value).padStart(6, '0');
    this.receiptNumber = `${prefix}${padded}`;
  }
});

module.exports = mongoose.model('Receipt', ReceiptSchema);
