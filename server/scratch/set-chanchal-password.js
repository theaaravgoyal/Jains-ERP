const mongoose = require('mongoose');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../.env') });

const mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/attendanceDB';
const Employee = require('../models/Employee');

async function run() {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(mongoURI);
    console.log('Database connected successfully.');

    const targetEmail = 'chanchal.amk09@gmail.com';
    const employee = await Employee.findOne({ email: targetEmail });

    if (!employee) {
      console.error(`Employee ${targetEmail} not found in database!`);
      process.exit(1);
    }

    console.log(`Found Employee: ${employee.name} ${employee.lastName}. Current status: ${employee.status}`);
    
    // Explicitly update password and status
    employee.password = '123456';
    employee.status = 'approved'; // Make sure she is approved
    await employee.save();

    console.log(`Successfully updated password to "123456" and status to "approved" for ${targetEmail}`);
    process.exit(0);
  } catch (err) {
    console.error('Failed to update employee password:', err);
    process.exit(1);
  }
}

run();
