const mongoose = require('mongoose');

const LeaveSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: [true, 'Please associate an employee']
    },
    leaveType: {
      type: String,
      enum: ['Casual', 'Sick', 'Earned', 'Maternity', 'Unpaid'],
      required: [true, 'Please specify leave type']
    },
    startDate: {
      type: Date,
      required: [true, 'Please specify start date']
    },
    endDate: {
      type: Date,
      required: [true, 'Please specify end date']
    },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected', 'Cancelled'],
      default: 'Pending'
    },
    reason: {
      type: String,
      required: [true, 'Please specify a reason for leave']
    },
    paidDaysCount: {
      type: Number,
      default: 0
    },
    unpaidDaysCount: {
      type: Number,
      default: 0
    },
    adminRemarks: {
      type: String,
      default: ''
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Leave', LeaveSchema);
