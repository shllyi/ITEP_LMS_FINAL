const User = require('../models/user');
const sendToken = require('../utils/jwtToken');
const VALID_SECTIONS = ['BSIT 1A', 'BSIT 1B', 'BSIT 2A', 'BSIT 2B', 'BSIT S3A', 'BSIT NS3A', 'BSIT S4A', 'BSIT NS4A'];
const TUPT_ID_REGEX = /^TUPT-\d{2}-\d{3,5}$/;
const { yearLevelFromSection } = require('../utils/sectionYearLevel');

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

    // Create user
    await User.create({
      email: email.toLowerCase(),
      username: username.toLowerCase(),
      firstName,
      lastName,
      avatar: avatar || '',
      password,
      role: 'student',
      tuptId,
      section: section || '',
      isVerified: true,
      enrolledSubjects: [],
    });

    return res.status(201).json({
      success: true,
      message: 'Registration successful! You can now sign in.',
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

    const isPasswordMatched = await user.comparePassword(password);
    if (!isPasswordMatched) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    if (!user.isVerified) {
      user.isVerified = true;
      await user.save();
    }

    sendToken(user, 200, res);
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, message: 'Server Error: Login failed.' });
  }
};

// ─── Get Me (Profile) ─────────────────────────────────────────────────────────
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (!user.isVerified) {
      user.isVerified = true;
      await user.save();
    }
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
