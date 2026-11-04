const crypto = require('crypto');
const User = require('../models/user');
const sendToken = require('../utils/jwtToken');
const sendEmail = require('../utils/sendEmail');
const { getVerificationEmailTemplate } = require('../utils/emailTemplates');
const VALID_SECTIONS = ['BSIT 1A', 'BSIT 1B', 'BSIT 2A', 'BSIT 2B', 'BSIT S3A', 'BSIT NS3A', 'BSIT S4A', 'BSIT NS4A'];
const TUPT_ID_REGEX = /^TUPT-\d{2}-\d{3,5}$/;
const { yearLevelFromSection } = require('../utils/sectionYearLevel');

// Register
// Register
// Register
exports.registerUser = async (req, res) => {
  try {
    const { email, username, firstName, lastName, avatar, password, confirmPassword, section } = req.body;
    const tuptId = String(req.body.tuptId || '').trim().toUpperCase();

    // Basic validation
    if (!email || !username || !firstName || !lastName || !password) {
      return res.status(400).json({ success: false, message: 'Please provide all required fields.' });
    }

    if (!tuptId) {
      return res.status(400).json({ success: false, message: 'TUPT-ID is required.' });
    }

    if (!TUPT_ID_REGEX.test(tuptId)) {
      return res.status(400).json({ success: false, message: 'Please provide a valid TUPT-ID (e.g. TUPT-22-0123).' });
    }

    if (section && !VALID_SECTIONS.includes(section)) {
      return res.status(400).json({ success: false, message: 'Please choose a valid section.' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Passwords do not match.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    }

    // Check duplicates
    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }, { tuptId }],
    });
    if (existingUser) {
      const field =
        existingUser.email === email.toLowerCase()
          ? 'Email'
          : existingUser.tuptId === tuptId
          ? 'TUPT-ID'
          : 'Username';
      return res.status(409).json({ success: false, message: `${field} is already registered.` });
    }

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');

    // Create user
    const user = await User.create({
      email: email.toLowerCase(),
      username: username.toLowerCase(),
      firstName,
      lastName,
      avatar: avatar || '',
      password,
      role: 'student',
      tuptId,
      section: section || '',
      isVerified: false,
      verificationToken,
      enrolledSubjects: [],
    });

    // Send verification email
    const backendUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 8000}`;
    const verificationUrl = `${backendUrl}/api/auth/verify/${verificationToken}`;
    try {
      await sendEmail({
        to: user.email,
        subject: 'Verify Your LMS Account Email Address',
        html: getVerificationEmailTemplate(user.firstName, verificationUrl),
      });
    } catch (emailError) {
      console.error('Email send failed:', emailError.message);
      // Don't block registration if email fails; user can resend later
    }

    return res.status(201).json({
      success: true,
      message: 'Registration successful! Please check your Gmail to verify your account before logging in.',
    });
  } catch (error) {
    console.error('Register error:', error);
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      return res.status(409).json({ success: false, message: `${field === 'tuptId' ? 'TUPT-ID' : field} is already taken.` });
    }
    return res.status(500).json({ success: false, message: 'Server Error: Registration failed.' });
  }
};

// Verify Email
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    const user = await User.findOne({ verificationToken: token }).select('+verificationToken');
    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired verification token.' });
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    await user.save({ validateBeforeSave: false });

    // Redirect to frontend with success param
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8081';
    return res.redirect(`${frontendUrl}/verified?status=success`);
  } catch (error) {
    console.error('Verify email error:', error);
    return res.status(500).json({ success: false, message: 'Server Error: Email verification failed.' });
  }
};

// ─── Login ───────────────────────────────────────────────────────────────────
// ─── Login ───────────────────────────────────────────────────────────────────
exports.loginUser = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ success: false, message: 'Please provide TUPT-ID, username or email and password.' });
    }

    // Accept email, TUPT-ID, or username
    const value = String(identifier).trim();
    let query;
    if (value.includes('@')) {
      query = { email: value.toLowerCase() };
    } else if (/^TUPT-/i.test(value)) {
      query = { tuptId: value.toUpperCase() };
    } else {
      query = { username: value.toLowerCase() };
    }

    const user = await User.findOne(query).select('+password');

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    if (!user.isVerified) {
      return res.status(403).json({
        success: false,
        message: 'Your account is not verified. Please check your Gmail and click the verification link.',
        code: 'EMAIL_NOT_VERIFIED',
      });
    }

    const isPasswordMatched = await user.comparePassword(password);
    if (!isPasswordMatched) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    sendToken(user, 200, res);
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, message: 'Server Error: Login failed.' });
  }
};

// ─── Get Me (Profile) ─────────────────────────────────────────────────────────
// ─── Get Me (Profile) ─────────────────────────────────────────────────────────
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    return res.status(200).json({
      success: true,
      data: {
        id: user._id,
        _id: user._id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role || 'student',
        yearLevel: user.yearLevel || yearLevelFromSection(user.section),
        activeSemester: user.activeSemester || '1st Semester',
        schoolYear: user.schoolYear || '2026-2027',
        avatar: user.avatar,
        section: user.section || '',
        tuptId: user.tuptId || '',
        isVerified: user.isVerified,
        enrolledSubjects: user.enrolledSubjects,
      },
    });
  } catch (error) {
    console.error('GetMe error:', error);
    return res.status(500).json({ success: false, message: 'Server Error: Could not fetch profile.' });
  }
};
