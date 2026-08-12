const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: [true, 'Please associate an employee']
    },
    date: {
      type: Date,
      required: [true, 'Please specify attendance date']
    },
    status: {
      type: String,
      enum: ['Present', 'Absent', 'Leave', 'Paid Leave', 'Unpaid Leave', 'Late', 'Holiday', 'Half Day', 'Weekend'],
      default: 'Present'
    },
    checkIn: {
      type: String,
      default: ''
    },
    checkOut: {
      type: String,
      default: ''
    },
    workingHours: {
      type: Number,
      default: 0
    },
    remarks: {
      type: String,
      default: ''
    }
  },
  { timestamps: true }
);

// Optimize queries for finding employee attendance records by date range
AttendanceSchema.index({ employee: 1, date: 1 });
AttendanceSchema.index({ date: 1 });

module.exports = mongoose.model('Attendance', AttendanceSchema);
