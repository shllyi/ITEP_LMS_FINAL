const express = require('express');
const router = express.Router();
const User = require('../models/user');
const { isAuthenticatedUser } = require('../middlewares/auth');

const VALID_SECTIONS = ['BSIT 1A', 'BSIT 1B', 'BSIT 2A', 'BSIT 2B', 'BSIT S3A', 'BSIT NS3A', 'BSIT S4A', 'BSIT NS4A'];
const TUPT_ID_REGEX = /^TUPT-\d{2}-\d{3,5}$/;
const { yearLevelFromSection } = require('../utils/sectionYearLevel');

const profileFields = [
  'id',
  'email',
  'username',
  'firstName',
  'lastName',
  'avatar',
  'role',
  'tuptId',
  'section',
  'yearLevel',
  'activeSemester',
  'schoolYear',
  'isVerified',
  'enrolledSubjects',
];

const serializeProfile = (user) => {
  const profile = {
    id: user._id,
    email: user.email,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    avatar: user.avatar || '',
    role: user.role || 'student',
    tuptId: user.tuptId || '',
    section: user.section || '',
    yearLevel: user.yearLevel,
    activeSemester: user.activeSemester,
    schoolYear: user.schoolYear,
    isVerified: user.isVerified,
    enrolledSubjects: user.enrolledSubjects || [],
  };

  return profileFields.reduce((result, field) => {
    if (profile[field] !== undefined) result[field] = profile[field];
    return result;
  }, {});
};

router.get('/user/profile', isAuthenticatedUser, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    return res.status(200).json({ success: true, data: serializeProfile(user) });
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({ success: false, message: 'Could not fetch profile.' });
  }
});

router.patch('/user/profile', isAuthenticatedUser, async (req, res) => {
  try {
    const allowedFields = ['email', 'username', 'firstName', 'lastName', 'avatar', 'section', 'tuptId'];
    const updates = {};

    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        if (typeof req.body[field] !== 'string') {
          return res.status(400).json({ success: false, message: `${field} must be a string.` });
        }
        if (field === 'avatar' && req.body[field].startsWith('data:')) {
          if (!/^data:image\/(?:jpeg|png);base64,[A-Za-z0-9+/=\s]+$/.test(req.body[field])) {
            return res.status(400).json({ success: false, message: 'Profile photo must be a PNG or JPEG image.' });
          }
          if (req.body[field].length > 2.8 * 1024 * 1024) {
            return res.status(400).json({ success: false, message: 'Profile photo must be smaller than 2 MB.' });
          }
        }
        updates[field] = req.body[field].trim();
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: 'Provide at least one profile field to update.' });
    }

    if (updates.email) {
      updates.email = updates.email.toLowerCase();
      if (!/^\S+@\S+\.\S+$/.test(updates.email)) {
        return res.status(400).json({ success: false, message: 'Please provide a valid email.' });
      }
    }

    if (updates.username) {
      updates.username = updates.username.toLowerCase();
      if (updates.username.length < 3) {
        return res.status(400).json({ success: false, message: 'Username must be at least 3 characters.' });
      }
    }

    if (Object.prototype.hasOwnProperty.call(updates, 'firstName') && !updates.firstName) {
      return res.status(400).json({ success: false, message: 'First name is required.' });
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'lastName') && !updates.lastName) {
      return res.status(400).json({ success: false, message: 'Last name is required.' });
    }

    if (Object.prototype.hasOwnProperty.call(updates, 'section')) {
      if (updates.section && !VALID_SECTIONS.includes(updates.section)) {
        return res.status(400).json({ success: false, message: 'Please choose a valid section.' });
      }
    }

        if (updates.section) {
      updates.yearLevel = yearLevelFromSection(updates.section);
    }

    if (Object.prototype.hasOwnProperty.call(updates, 'tuptId') && updates.tuptId) {
      updates.tuptId = updates.tuptId.toUpperCase();
      if (!TUPT_ID_REGEX.test(updates.tuptId)) {
        return res.status(400).json({ success: false, message: 'Please provide a valid TUPT-ID (e.g. TUPT-22-0123).' });
      }
    }

    // An empty TUPT-ID is removed from the record instead of saved as ''
    const updateQuery = {};
    const setFields = { ...updates };
    if (Object.prototype.hasOwnProperty.call(updates, 'tuptId') && !updates.tuptId) {
      delete setFields.tuptId;
      updateQuery.$unset = { tuptId: '' };
    }
    if (Object.keys(setFields).length > 0) updateQuery.$set = setFields;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updateQuery,
      { new: true, runValidators: true },
    );

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      data: serializeProfile(user),
    });
  } catch (error) {
    console.error('Update profile error:', error);
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || error.keyValue || {})[0];
      const label = field === 'email' ? 'Email' : field === 'tuptId' ? 'TUPT-ID' : 'Username';
      return res.status(409).json({
        success: false,
        message: `${label} is already taken.`,
      });
    }
    return res.status(500).json({ success: false, message: 'Could not update profile.' });
  }
});

module.exports = router;