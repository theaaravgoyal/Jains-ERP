const mongoose = require('mongoose');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/attendanceDB';
const Settings = require('../models/Settings');

async function run() {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(mongoURI);
    console.log('Database connected successfully.');

    // Find and update the settings document (or create if not existing)
    const updatedSettings = await Settings.findOneAndUpdate(
      {},
      {
        $set: {
          'institute.name': 'Jains Computer',
          'institute.address': '13, Shivpuri Colony, Main Kalwar Road, Jhotwara',
          'institute.city': 'Jaipur',
          'institute.state': 'Rajasthan',
          'institute.pincode': '302012',
          'institute.mobile': '+91-9571406998',
          'institute.email': 'contact@jainscomputer.com',
          'institute.website': 'www.jainscomputer.com'
        }
      },
      { returnDocument: 'after', upsert: true }
    );

    console.log('Successfully updated DB global settings with new contact information:', updatedSettings.institute);
    process.exit(0);
  } catch (err) {
    console.error('Settings database update failed:', err);
    process.exit(1);
  }
}

run();
