const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const enrolledSubjectSchema = new mongoose.Schema({
  code: { type: String, required: true },
  title: { type: String, required: true },
  instructor: { type: String, required: true },
  schedule: { type: String, required: true },
}, { _id: false });

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
  },
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    lowercase: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters'],
  },
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
  },
  avatar: {
    type: String,
    default: '',
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  verificationToken: {
    type: String,
    select: false,
  },
  enrolledSubjects: {
    type: [enrolledSubjectSchema],
    default: [],
  },
  yearLevel: {
    type: String,
    enum: ['1st Year', '2nd Year', '3rd Year', '4th Year'],
    default: '1st Year',
  },
  activeSemester: {
    type: String,
    enum: ['1st Semester', '2nd Semester', '3rd Semester'],
    default: '1st Semester',
  },
  schoolYear: {
    type: String,
    default: '2026-2027',
  },
  role: {
    type: String,
    enum: ['student', 'faculty', 'program chair', 'program_chair', 'admin'],
    default: 'student',
  },
    section: {
    type: String,
    enum: ['', 'BSIT 1A', 'BSIT 1B', 'BSIT 2A', 'BSIT 2B', 'BSIT S3A', 'BSIT NS3A', 'BSIT S4A', 'BSIT NS4A'],
    default: '',
  },
  
    tuptId: {
    type: String,
    uppercase: true,
    trim: true,
    unique: true,
    sparse: true,
    match: [/^TUPT-\d{2}-\d{3,5}$/, 'Please provide a valid TUPT-ID (e.g. TUPT-22-0123)'],
  },

  resetPasswordToken: String,
  resetPasswordExpire: Date,
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return;
  }
  this.password = await bcrypt.hash(this.password, 12);
});

// Generate JWT token
userSchema.methods.getJwtToken = function () {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_TIME || '7d',
  });
};

// Compare password
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate reset password token
userSchema.methods.getResetPasswordToken = function () {
  const resetToken = crypto.randomBytes(20).toString('hex');
  this.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  this.resetPasswordExpire = Date.now() + 30 * 60 * 1000;
  return resetToken;
};

module.exports = mongoose.model('User', userSchema);
