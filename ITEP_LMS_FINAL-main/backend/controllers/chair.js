const mongoose = require('mongoose');
const User = require('../models/user');
const Subject = require('../models/subject');
const StudentProgress = require('../models/studentProgress');
const { yearLevelFromSection, SECTION_YEAR_LEVEL } = require('../utils/sectionYearLevel');

const VALID_SECTIONS = Object.keys(SECTION_YEAR_LEVEL);
const TUPT_ID_REGEX = /^TUPT-\d{2}-\d{3,5}$/;

// ─── 1. ACCOUNT LIFECYCLE MANAGER ─────────────────────────────────────────────

// GET all accounts with filters, search, and aggregate metrics
exports.getAccounts = async (req, res) => {
  try {
    const { search, role, yearLevel, semester, schoolYear, subjectId, page = 1, limit = 50 } = req.query;

    const query = {};

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [
        { firstName: regex },
        { lastName: regex },
        { email: regex },
        { username: regex },
        { tuptId: regex },
      ];
    }

    if (role && role !== 'all') {
      if (role === 'program_chair' || role === 'program chair') {
        query.role = { $in: ['program chair', 'program_chair'] };
      } else {
        query.role = role;
      }
    }

    if (yearLevel && yearLevel !== 'all') {
      query.yearLevel = yearLevel;
    }

    if (semester && semester !== 'all') {
      query.activeSemester = semester;
    }

    if (schoolYear && schoolYear !== 'all') {
      query.schoolYear = schoolYear;
    }

    if (subjectId && subjectId !== 'all') {
      const subject = await Subject.findById(subjectId);
      if (subject) {
        query._id = { $in: subject.enrolledStudents || [] };
      }
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [accounts, totalCount] = await Promise.all([
      User.find(query)
        .select('-password -verificationToken -resetPasswordToken -resetPasswordExpire')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      User.countDocuments(query),
    ]);

    // Metric summary stats for the Program Chair strip
    const [totalUsers, studentCount, facultyCount, chairCount] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'student' }),
      User.countDocuments({ role: 'faculty' }),
      User.countDocuments({ role: { $in: ['program chair', 'program_chair'] } }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        accounts,
        totalCount,
        page: Number(page),
        totalPages: Math.ceil(totalCount / Number(limit)) || 1,
        stats: {
          totalUsers,
          studentCount,
          facultyCount,
          chairCount,
        },
      },
    });
  } catch (error) {
    console.error('getAccounts error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve accounts' });
  }
};

// CREATE single user account with specified role and cohort markers
exports.createAccount = async (req, res) => {
  try {
    const {
      email,
      username,
      password,
      firstName,
      lastName,
      role = 'student',
      yearLevel = '1st Year',
      activeSemester = '1st Semester',
      schoolYear = '2026-2027',
    } = req.body;

    if (!email || !username || !password || !firstName || !lastName) {
      return res.status(400).json({ success: false, message: 'Please provide all required fields.' });
    }

    // Check unique constraints
    const existing = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }],
    });

    if (existing) {
      const field = existing.email === email.toLowerCase() ? 'Email' : 'Username';
      return res.status(409).json({ success: false, message: `${field} is already in use.` });
    }

    const newUser = await User.create({
      email: email.toLowerCase(),
      username: username.toLowerCase(),
      password,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      role,
      yearLevel,
      activeSemester,
      schoolYear,
      isVerified: true, // Accounts provisioned by Program Chair are pre-verified
    });

    return res.status(201).json({
      success: true,
      message: `Account created successfully for ${newUser.firstName} ${newUser.lastName}.`,
      data: {
        id: newUser._id,
        email: newUser.email,
        username: newUser.username,
        role: newUser.role,
        yearLevel: newUser.yearLevel,
        activeSemester: newUser.activeSemester,
        schoolYear: newUser.schoolYear,
      },
    });
  } catch (error) {
    console.error('createAccount error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create user account' });
  }
};

// UPDATE account details
// UPDATE account details
exports.updateAccount = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      firstName,
      lastName,
      email,
      username,
      role,
      yearLevel,
      activeSemester,
      schoolYear,
      section,
      tuptId,
    } = req.body;

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    if (firstName) user.firstName = firstName.trim();
    if (lastName) user.lastName = lastName.trim();
    if (email) user.email = email.toLowerCase().trim();
    if (username) user.username = username.toLowerCase().trim();
    if (role) user.role = role;
    if (yearLevel) user.yearLevel = yearLevel;
    if (activeSemester) user.activeSemester = activeSemester;
    if (schoolYear) user.schoolYear = schoolYear;

    // Section (year level follows the section)
    if (section !== undefined) {
      if (section && !VALID_SECTIONS.includes(section)) {
        return res.status(400).json({ success: false, message: 'Please choose a valid section.' });
      }
      if (section !== (user.section || '')) {
        user.section = section;
        if (section) user.yearLevel = yearLevelFromSection(section);
      }
    }

    // TUPT-ID (empty value removes it)
    if (tuptId !== undefined) {
      const cleanId = String(tuptId).trim().toUpperCase();
      if (cleanId && !TUPT_ID_REGEX.test(cleanId)) {
        return res.status(400).json({ success: false, message: 'Please provide a valid TUPT-ID (e.g. TUPT-22-0123).' });
      }
      if (cleanId) {
        const taken = await User.findOne({ tuptId: cleanId, _id: { $ne: user._id } });
        if (taken) {
          return res.status(409).json({ success: false, message: 'TUPT-ID is already taken.' });
        }
        user.tuptId = cleanId;
      } else {
        user.tuptId = undefined;
      }
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Account updated successfully.',
      data: user,
    });
  } catch (error) {
    console.error('updateAccount error:', error);
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue || {})[0];
      const label = field === 'email' ? 'Email' : field === 'tuptId' ? 'TUPT-ID' : 'Username';
      return res.status(409).json({ success: false, message: `${label} is already taken.` });
    }
    if (error.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: error.message });
    }
    return res.status(500).json({ success: false, message: 'Failed to update account' });
  }
};

// PATCH change role directly
exports.changeRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    const validRoles = ['student', 'faculty', 'program chair', 'program_chair', 'admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role specified.' });
    }

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    user.role = role;
    await user.save();

    return res.status(200).json({
      success: true,
      message: `Role updated to ${role} for ${user.firstName} ${user.lastName}.`,
      data: user,
    });
  } catch (error) {
    console.error('changeRole error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update user role' });
  }
};

// DELETE account
exports.deleteAccount = async (req, res) => {
  try {
    const { id } = req.params;

    if (id === req.user.id.toString()) {
      return res.status(400).json({ success: false, message: 'You cannot delete your own Program Chair account.' });
    }

    const user = await User.findByIdAndDelete(id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    // Clean up student enrollment references
    await Subject.updateMany(
      { enrolledStudents: id },
      { $pull: { enrolledStudents: id } }
    );
    await StudentProgress.deleteMany({ student: id });

    return res.status(200).json({ success: true, message: 'Account deleted successfully.' });
  } catch (error) {
    console.error('deleteAccount error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete account' });
  }
};

// ─── 2. ACADEMIC STATUS EDITOR ────────────────────────────────────────────────

// BATCH update student status markers (Year Level, Semester, School Year)
exports.batchUpdateStudentStatus = async (req, res) => {
  try {
    const { studentIds, yearLevel, activeSemester, schoolYear } = req.body;

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Please select at least one student.' });
    }

    const updateFields = {};
    if (yearLevel) updateFields.yearLevel = yearLevel;
    if (activeSemester) updateFields.activeSemester = activeSemester;
    if (schoolYear) updateFields.schoolYear = schoolYear;

    const result = await User.updateMany(
      { _id: { $in: studentIds } },
      { $set: updateFields }
    );

    return res.status(200).json({
      success: true,
      message: `Successfully updated academic status for ${result.modifiedCount} student(s).`,
      data: {
        modifiedCount: result.modifiedCount,
      },
    });
  } catch (error) {
    console.error('batchUpdateStudentStatus error:', error);
    return res.status(500).json({ success: false, message: 'Failed to batch update student status' });
  }
};

// ─── 3. SMART ENROLLMENT ENGINE ───────────────────────────────────────────────

// PREVIEW matching simulation: matches students to subjects based on cohort rules
exports.previewEnrollmentRules = async (req, res) => {
  try {
    const { yearLevel, activeSemester, schoolYear } = req.body;

    if (!yearLevel || !activeSemester || !schoolYear) {
      return res.status(400).json({
        success: false,
        message: 'Year Level, Semester, and School Year criteria are required.',
      });
    }

    // 1. Find all students matching criteria
    const matchingStudents = await User.find({
      role: 'student',
      yearLevel,
      activeSemester,
      schoolYear,
    }).select('firstName lastName email username enrolledSubjects studentId');

    // 2. Find all active subjects matching the exact cohort criteria
    const matchingSubjects = await Subject.find({
      yearLevel,
      semester: activeSemester,
      academicYear: schoolYear,
    }).populate('faculty', 'firstName lastName');

    // 3. Compile matching matrix: compute how many new enrollments will be created
    let potentialEnrollmentCount = 0;
    const studentBreakdown = matchingStudents.map(student => {
      const alreadyEnrolledCodes = (student.enrolledSubjects || []).map(s => s.code);
      const subjectsToEnroll = matchingSubjects.filter(subj => !alreadyEnrolledCodes.includes(subj.code));
      potentialEnrollmentCount += subjectsToEnroll.length;

      return {
        id: student._id,
        name: `${student.firstName} ${student.lastName}`,
        email: student.email,
        alreadyEnrolledCount: alreadyEnrolledCodes.length,
        newSubjectsCount: subjectsToEnroll.length,
        subjectsToAdd: subjectsToEnroll.map(s => ({ code: s.code, name: s.name })),
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        criteria: { yearLevel, activeSemester, schoolYear },
        matchedStudentsCount: matchingStudents.length,
        matchedSubjectsCount: matchingSubjects.length,
        potentialEnrollmentCount,
        matchingSubjects: matchingSubjects.map(s => ({
          id: s._id,
          code: s.code,
          name: s.name,
          instructor: s.faculty ? `${s.faculty.firstName} ${s.faculty.lastName}` : 'Faculty',
          enrolledCount: (s.enrolledStudents || []).length,
        })),
        studentBreakdown,
      },
    });
  } catch (error) {
    console.error('previewEnrollmentRules error:', error);
    return res.status(500).json({ success: false, message: 'Failed to preview smart enrollment' });
  }
};

// EXECUTE Smart Enrollment: commit matching rules to MongoDB
exports.executeEnrollmentRules = async (req, res) => {
  try {
    const { yearLevel, activeSemester, schoolYear, selectedStudentIds, selectedSubjectIds } = req.body;

    if (!yearLevel || !activeSemester || !schoolYear) {
      return res.status(400).json({
        success: false,
        message: 'Year Level, Semester, and School Year criteria are required.',
      });
    }

    // Build student query
    const studentQuery = {
      role: 'student',
      yearLevel,
      activeSemester,
      schoolYear,
    };
    if (Array.isArray(selectedStudentIds) && selectedStudentIds.length > 0) {
      studentQuery._id = { $in: selectedStudentIds };
    }

    // Build subject query
    const subjectQuery = {
      yearLevel,
      semester: activeSemester,
      academicYear: schoolYear,
    };
    if (Array.isArray(selectedSubjectIds) && selectedSubjectIds.length > 0) {
      subjectQuery._id = { $in: selectedSubjectIds };
    }

    const [students, subjects] = await Promise.all([
      User.find(studentQuery),
      Subject.find(subjectQuery).populate('faculty', 'firstName lastName'),
    ]);

    if (students.length === 0 || subjects.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No matching students or subjects found to execute enrollment.',
      });
    }

    let enrollmentsCreated = 0;

    for (const subject of subjects) {
      const instructorName = subject.faculty ? `${subject.faculty.firstName} ${subject.faculty.lastName}` : 'Faculty Instructor';
      const scheduleString = `${subject.semester} | A.Y. ${subject.academicYear}`;

      for (const student of students) {
        // 1. Add subject to student.enrolledSubjects if not already present
        const alreadyEnrolled = (student.enrolledSubjects || []).some(s => s.code === subject.code);
        if (!alreadyEnrolled) {
          student.enrolledSubjects.push({
            code: subject.code,
            title: subject.name,
            instructor: instructorName,
            schedule: scheduleString,
          });
          await student.save();
          enrollmentsCreated++;
        }

        // 2. Add student to subject.enrolledStudents if not already present
        const studentAlreadyInSubject = (subject.enrolledStudents || []).some(
          id => id.toString() === student._id.toString()
        );
        if (!studentAlreadyInSubject) {
          if (!subject.enrolledStudents) subject.enrolledStudents = [];
          subject.enrolledStudents.push(student._id);
        }

        // 3. Initialize StudentProgress record
        await StudentProgress.findOneAndUpdate(
          { student: student._id, subject: subject._id },
          {
            $setOnInsert: {
              student: student._id,
              subject: subject._id,
              overallProgressPercent: 0,
              topicProgress: [],
            },
          },
          { upsert: true, new: true }
        );
      }
      await subject.save();
    }

    return res.status(200).json({
      success: true,
      message: `Smart enrollment committed successfully. Created ${enrollmentsCreated} new course enrollment(s).`,
      data: {
        enrollmentsCreated,
        studentsCount: students.length,
        subjectsCount: subjects.length,
      },
    });
  } catch (error) {
    console.error('executeEnrollmentRules error:', error);
    return res.status(500).json({ success: false, message: 'Failed to execute smart enrollment' });
  }
};

// ─── 4. DIRECT STUDENT-SUBJECT ENROLLMENT & UNENROLLMENT ───────────────────────

// GET All Subjects with metadata for filters & dropdowns
exports.getAllSubjects = async (req, res) => {
  try {
    const { yearLevel, semester, schoolYear } = req.query;
    const query = {};
    if (yearLevel && yearLevel !== 'all') query.yearLevel = yearLevel;
    if (semester && semester !== 'all') query.semester = semester;
    if (schoolYear && schoolYear !== 'all') query.academicYear = schoolYear;

    const subjects = await Subject.find(query)
      .populate('faculty', 'firstName lastName email')
      .sort({ code: 1 });

    const formatted = subjects.map(s => ({
      id: s._id.toString(),
      _id: s._id.toString(),
      code: s.code,
      name: s.name,
      academicYear: s.academicYear,
      semester: s.semester,
      yearLevel: s.yearLevel,
      facultyName: s.faculty ? `${s.faculty.firstName} ${s.faculty.lastName}` : 'Unassigned',
      enrolledCount: (s.enrolledStudents || []).length,
      modulesCount: (s.modules || []).length,
    }));

    return res.status(200).json({ success: true, data: formatted });
  } catch (error) {
    console.error('getAllSubjects error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve subjects' });
  }
};

// DIRECT ENROLL: Enroll a single student in a specific subject
exports.enrollStudentDirect = async (req, res) => {
  try {
    const { studentId, subjectId } = req.body;

    if (!studentId || !subjectId) {
      return res.status(400).json({ success: false, message: 'Student ID and Subject ID are required.' });
    }

    const [student, subject] = await Promise.all([
      User.findById(studentId),
      Subject.findById(subjectId).populate('faculty', 'firstName lastName'),
    ]);

    if (!student) return res.status(404).json({ success: false, message: 'Student account not found.' });
    if (!subject) return res.status(404).json({ success: false, message: 'Subject curriculum not found.' });

    // 1. Add student to subject.enrolledStudents
    if (!subject.enrolledStudents) subject.enrolledStudents = [];
    const alreadyInSubject = subject.enrolledStudents.some(id => id.toString() === student._id.toString());
    if (!alreadyInSubject) {
      subject.enrolledStudents.push(student._id);
      await subject.save();
    }

    // 2. Add subject to student.enrolledSubjects
    const instructorName = subject.faculty ? `${subject.faculty.firstName} ${subject.faculty.lastName}` : 'Faculty Instructor';
    const scheduleString = `${subject.semester} | A.Y. ${subject.academicYear}`;
    if (!student.enrolledSubjects) student.enrolledSubjects = [];
    const alreadyInUser = student.enrolledSubjects.some(s => s.code === subject.code);
    if (!alreadyInUser) {
      student.enrolledSubjects.push({
        id: subject._id.toString(),
        code: subject.code,
        title: subject.name,
        instructor: instructorName,
        schedule: scheduleString,
      });
      await student.save();
    }

    // 3. Initialize progress tracker
    await StudentProgress.findOneAndUpdate(
      { student: student._id, subject: subject._id },
      {
        $setOnInsert: {
          student: student._id,
          subject: subject._id,
          overallProgressPercent: 0,
          topicProgress: [],
        },
      },
      { upsert: true, new: true }
    );

    return res.status(200).json({
      success: true,
      message: `Student ${student.firstName} ${student.lastName} enrolled in ${subject.code} successfully.`,
      data: {
        studentId: student._id,
        subjectId: subject._id,
        subjectCode: subject.code,
      },
    });
  } catch (error) {
    console.error('enrollStudentDirect error:', error);
    return res.status(500).json({ success: false, message: 'Failed to enroll student' });
  }
};

// DIRECT UNENROLL: Remove student from a specific subject
exports.unenrollStudentDirect = async (req, res) => {
  try {
    const { studentId, subjectId } = req.body;

    const [student, subject] = await Promise.all([
      User.findById(studentId),
      Subject.findById(subjectId),
    ]);

    if (!student || !subject) {
      return res.status(404).json({ success: false, message: 'Student or Subject not found.' });
    }

    // Remove from subject
    subject.enrolledStudents = (subject.enrolledStudents || []).filter(
      id => id.toString() !== student._id.toString()
    );
    await subject.save();

    // Remove from student
    student.enrolledSubjects = (student.enrolledSubjects || []).filter(
      s => s.code !== subject.code && s.id !== subject._id.toString()
    );
    await student.save();

    return res.status(200).json({
      success: true,
      message: `Student unenrolled from ${subject.code} successfully.`,
    });
  } catch (error) {
    console.error('unenrollStudentDirect error:', error);
    return res.status(500).json({ success: false, message: 'Failed to unenroll student' });
  }
};

// ─── 5. COMPREHENSIVE ACADEMIC & PROGRESS REPORTS ────────────────────────────

exports.getChairReports = async (req, res) => {
  try {
    const { subjectId, yearLevel, semester, schoolYear } = req.query;

    const subjectFilter = {};
    if (subjectId && subjectId !== 'all' && mongoose.Types.ObjectId.isValid(subjectId)) {
      subjectFilter._id = subjectId;
    }
    if (yearLevel && yearLevel !== 'all') subjectFilter.yearLevel = yearLevel;
    if (semester && semester !== 'all') subjectFilter.semester = semester;
    if (schoolYear && schoolYear !== 'all') subjectFilter.academicYear = schoolYear;

    const [subjects, totalStudents, totalFaculty, allProgress] = await Promise.all([
      Subject.find(subjectFilter).populate('faculty', 'firstName lastName email'),
      User.countDocuments({ role: 'student' }),
      User.countDocuments({ role: 'faculty' }),
      StudentProgress.find().populate('student', 'firstName lastName yearLevel activeSemester schoolYear'),
    ]);

    // Subject breakdown
    const subjectReports = subjects.map(s => {
      const enrollCount = (s.enrolledStudents || []).length;
      let totalPublishedTopics = 0;
      for (const m of s.modules || []) {
        for (const t of m.topics || []) {
          if (t.status === 'published') totalPublishedTopics++;
        }
      }

      const relevantProgress = allProgress.filter(p => p.subject && p.subject.toString() === s._id.toString());
      const avgProgress = relevantProgress.length > 0
        ? Math.round(relevantProgress.reduce((sum, p) => sum + (p.overallProgressPercent || 0), 0) / relevantProgress.length)
        : 0;

      // Count students with 100% completion
      const completedCount = relevantProgress.filter(p => (p.overallProgressPercent || 0) >= 100).length;

      return {
        subjectId: s._id.toString(),
        code: s.code,
        name: s.name,
        faculty: s.faculty ? `${s.faculty.firstName} ${s.faculty.lastName}` : 'Unassigned',
        yearLevel: s.yearLevel,
        semester: s.semester,
        academicYear: s.academicYear,
        enrolledCount: enrollCount,
        publishedTopicsCount: totalPublishedTopics,
        averageProgressPercent: avgProgress,
        completedStudentsCount: completedCount,
      };
    });

    // Cohort breakdown
    const [year1, year2, year3, year4] = await Promise.all([
      User.countDocuments({ role: 'student', yearLevel: '1st Year' }),
      User.countDocuments({ role: 'student', yearLevel: '2nd Year' }),
      User.countDocuments({ role: 'student', yearLevel: '3rd Year' }),
      User.countDocuments({ role: 'student', yearLevel: '4th Year' }),
    ]);

    const overallAvg = subjectReports.length > 0
      ? Math.round(subjectReports.reduce((sum, r) => sum + r.averageProgressPercent, 0) / subjectReports.length)
      : 0;

    return res.status(200).json({
      success: true,
      data: {
        summary: {
          totalStudents,
          totalFaculty,
          totalSubjects: subjects.length,
          overallAverageCompletion: overallAvg,
        },
        yearLevelDistribution: {
          firstYear: year1,
          secondYear: year2,
          thirdYear: year3,
          fourthYear: year4,
        },
        subjectReports,
      },
    });
  } catch (error) {
    console.error('getChairReports error:', error);
    return res.status(500).json({ success: false, message: 'Failed to generate chair reports' });
  }
};

