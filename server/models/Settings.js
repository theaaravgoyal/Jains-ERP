const mongoose = require('mongoose');

/**
 * Settings Schema - Represents a single document holding ERP global configuration parameters.
 * Automatically generates defaults upon database read initialization.
 */
const SettingsSchema = new mongoose.Schema(
  {
    institute: {
      name: { type: String, default: 'Jains Computer' },
      logo: { type: String, default: '' },
      address: { type: String, default: '13, Shivpuri Colony, Main Kalwar Road, Jhotwara' },
      city: { type: String, default: 'Jaipur' },
      state: { type: String, default: 'Rajasthan' },
      country: { type: String, default: 'India' },
      pincode: { type: String, default: '302012' },
      mobile: { type: String, default: '+91-9571406998' },
      email: { type: String, default: 'contact@jainscomputer.com' },
      website: { type: String, default: 'www.jainscomputer.com' }
    },
    fee: {
      defaultCurrency: { type: String, default: 'INR' },
      currencySymbol: { type: String, default: '₹' },
      financialYear: { type: String, default: '2026-2027' },
      defaultDueDays: { type: Number, default: 14 },
      defaultPaymentPlan: { type: String, default: 'INSTALLMENT' },
      receiptPrefix: { type: String, default: 'RCP' },
      invoicePrefix: { type: String, default: 'INV' },
      studentPrefix: { type: String, default: 'STU' }
    },
    receipt: {
      receiptHeader: { type: String, default: 'Official Payment Receipt' },
      receiptFooter: { type: String, default: 'Thank you for your payment!' },
      signaturePlaceholder: { type: String, default: 'Authorized Signature' },
      showLogo: { type: Boolean, default: true },
      showQrPlaceholder: { type: Boolean, default: true }
    },
    invoice: {
      invoiceHeader: { type: String, default: 'Billing Invoice Voucher' },
      invoiceFooter: { type: String, default: 'Please pay within the due date.' },
      termsAndConditions: { type: String, default: 'Fee once paid is non-refundable.' },
      signaturePlaceholder: { type: String, default: 'Authorized Representative' }
    },
    general: {
      timeZone: { type: String, default: 'Asia/Kolkata' },
      dateFormat: { type: String, default: 'DD/MM/YYYY' },
      timeFormat: { type: String, default: '12h' },
      defaultLanguage: { type: String, default: 'English' }
    },
    attendance: {
      officeStartTime: { type: String, default: '10:00' },
      officeEndTime: { type: String, default: '18:00' },
      lateThresholdTime: { type: String, default: '10:15' },
      halfDayThresholdHours: { type: Number, default: 4.0 },
      fullDayThresholdHours: { type: Number, default: 8.0 },
      monthlyPaidLeavesQuota: { type: Number, default: 2 }
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Settings', SettingsSchema);
