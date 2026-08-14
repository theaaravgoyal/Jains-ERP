const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const EmployeeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add employee name'],
      trim: true
    },
    lastName: {
      type: String,
      required: [true, 'Please add employee last name'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Please add email'],
      unique: true,
      lowercase: true,
      trim: true
    },
    password: {
      type: String,
      required: [true, 'Please add a password'],
      minlength: 6,
      select: false
    },
    phone: {
      type: String,
      default: ''
    },
    department: {
      type: String,
      default: ''
    },
    designation: {
      type: String,
      default: 'Employee'
    },
    profilePicture: {
      type: String,
      default: '',
      select: false
    },
    status: {
      type: String,
      enum: ['pending', 'active', 'approved', 'suspended', 'terminated', 'removed'],
      default: 'pending'
    },
    role: {
      type: String,
      default: 'employee'
    },
    dateOfJoining: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

// Encrypt password using bcrypt
EmployeeSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Match employee entered password to hashed password in database
EmployeeSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('Employee', EmployeeSchema);
