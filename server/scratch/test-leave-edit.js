const mongoose = require('mongoose');
require('dotenv').config({ path: './server/.env' });
const connectDB = require('../config/db');
const Leave = require('../models/Leave');
const { updateLeaveDetails } = require('../controllers/admin/leaveController');

async function run() {
  await connectDB();
  console.log('DB Connected');
  
  const leave = await Leave.findOne({});
  console.log('Found leave:', leave ? leave._id : 'None');
  if (!leave) {
    console.log('No leave found in DB');
    process.exit(0);
  }

  const req = {
    params: { id: leave._id.toString() },
    body: {
      startDate: leave.startDate,
      endDate: leave.endDate,
      leaveType: leave.leaveType,
      status: 'Approved',
      adminRemarks: 'Test update remarks'
    },
    user: { _id: leave.approvedBy || new mongoose.Types.ObjectId() }
  };

  const res = {
    statusCode: null,
    jsonData: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.jsonData = data;
      console.log('Response status:', this.statusCode, 'data:', data);
      return this;
    }
  };

  const next = (err) => {
    console.error('Next called with error:', err);
  };

  await updateLeaveDetails(req, res, next);
  process.exit(0);
}

run().catch(e => {
  console.error('Run failed:', e);
  process.exit(1);
});
