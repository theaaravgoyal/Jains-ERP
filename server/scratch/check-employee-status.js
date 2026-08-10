const mongoose = require('mongoose');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../.env') });

const mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/attendanceDB';
const Employee = require('../models/Employee');
const User = require('../models/User');

async function run() {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(mongoURI);
    console.log('Database connected successfully.');

    const targetEmail = 'chanchal.amk09@gmail.com';

    // Check in Employee collection
    const employee = await Employee.findOne({ email: targetEmail });
    if (employee) {
      console.log('--- EMPLOYEE FINDING ---');
      console.log('Employee ID:', employee._id);
      console.log('Name:', `${employee.name} ${employee.lastName}`);
      console.log('Status:', employee.status);
      console.log('Phone:', employee.phone);
      console.log('Department:', employee.department);
      console.log('Has Password Hash:', !!employee.password);
    } else {
      console.log('Employee NOT found in Employee collection.');
    }

    // Check in User collection
    const user = await User.findOne({ email: targetEmail }).populate('role');
    if (user) {
      console.log('--- USER FINDING ---');
      console.log('User ID:', user._id);
      console.log('Name:', user.name);
      console.log('Role:', user.role?.name);
      console.log('Status:', user.status);
      console.log('Has Password Hash:', !!user.password);
    } else {
      console.log('User NOT found in User collection.');
    }

    process.exit(0);
  } catch (err) {
    console.error('Diagnostic query failed:', err);
    process.exit(1);
  }
}

run();
