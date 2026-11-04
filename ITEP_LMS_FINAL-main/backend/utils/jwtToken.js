const sendToken = (user, statusCode, res) => {
  const token = user.getJwtToken();

  return res.status(statusCode).json({
    success: true,
    token,
    user: {
      id: user._id,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role || 'student',
      yearLevel: user.yearLevel || '1st Year',
      activeSemester: user.activeSemester || '1st Semester',
      schoolYear: user.schoolYear || '2026-2027',
      avatar: user.avatar,
      isVerified: user.isVerified,
      enrolledSubjects: user.enrolledSubjects,
    },
  });
};

module.exports = sendToken;
