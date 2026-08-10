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

    // Fetch all employees including select('+password') to check password fields
    const employees = await Employee.find({}).select('+password');
    console.log(`Total employees in DB: ${employees.length}`);

    let updatedCount = 0;

    for (let emp of employees) {
      if (!emp.password) {
        console.log(`Employee ${emp.name} ${emp.lastName} (${emp.email}) has no password set. Updating to default "123456"...`);
        
        emp.password = '123456';
        await emp.save();
        
        updatedCount++;
      } else {
        console.log(`Employee ${emp.name} ${emp.lastName} (${emp.email}) has a valid password hash.`);
      }
    }

    console.log(`Password reset migration finished. Updated ${updatedCount} employees.`);
    process.exit(0);
  } catch (err) {
    console.error('Password reset failed:', err);
    process.exit(1);
  }
}

run();
