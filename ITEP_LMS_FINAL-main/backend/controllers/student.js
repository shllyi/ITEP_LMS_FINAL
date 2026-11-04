const User = require('../models/user');
const Subject = require('../models/subject');
const StudentProgress = require('../models/studentProgress');
const path = require('path');
const { GetObjectCommand } = require('@aws-sdk/client-s3');
const { getPresignedViewUrl, createS3Client, hasAwsCredentials } = require('../utils/s3Service');

// ─── Student Dashboard ────────────────────────────────────────────────────────
exports.getStudentDashboard = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    // Retrieve subjects the student is enrolled in or eligible for based on cohort
    const enrolledCodes = (user.enrolledSubjects || []).map(s => s.code).filter(Boolean);
    const orConditions = [
      { enrolledStudents: user._id },
    ];
    if (enrolledCodes.length > 0) {
      orConditions.push({ code: { $in: enrolledCodes } });
    }
    if (user.yearLevel && user.activeSemester && user.schoolYear) {
      orConditions.push({
        yearLevel: user.yearLevel,
        semester: user.activeSemester,
        academicYear: user.schoolYear,
      });
    }
    if (user.role === 'admin' || user.role === 'program chair' || user.role === 'program_chair') {
      orConditions.push({});
    }

    const dbSubjects = await Subject.find(
      orConditions.length > 1 ? { $or: orConditions } : orConditions[0] || {}
    ).populate('faculty', 'firstName lastName email').sort({ createdAt: -1 });

    // Build the enrolled subjects list:
    const enrolledSubjects = await Promise.all(dbSubjects.map(async s => {
      let publishedCount = 0;
      let totalModules = s.modules ? s.modules.length : 0;
      for (const m of s.modules || []) {
        for (const t of m.topics || []) {
          if (t.status === 'published') publishedCount++;
        }
      }
      const instructorName = s.faculty ? `${s.faculty.firstName} ${s.faculty.lastName}` : 'Faculty Instructor';

      // Check student progress for this subject
      const progress = await StudentProgress.findOne({ student: user._id, subject: s._id });
      const overallProgress = progress ? progress.overallProgressPercent : 0;

      return {
        id: s._id.toString(),
        code: s.code,
        title: s.name,
        instructor: instructorName,
        schedule: `${s.semester} | A.Y. ${s.academicYear}`,
        publishedTopicsCount: publishedCount,
        totalModulesCount: totalModules,
        semester: s.semester,
        academicYear: s.academicYear,
        progressPercent: overallProgress,
      };
    }));

    const totalCredits = enrolledSubjects.length * 3;

    return res.status(200).json({
      success: true,
      data: {
        profile: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: `${user.firstName} ${user.lastName}`,
          email: user.email,
          username: user.username,
          avatar: user.avatar,
          studentId: `STU-${user._id.toString().slice(-6).toUpperCase()}`,
          memberSince: user.createdAt,
        },
        academics: {
          enrolledSubjects,
          totalSubjects: enrolledSubjects.length,
          gpa: 3.75,
          totalCredits: totalCredits || 18,
          completedCredits: 54,
          academicYear: user.yearLevel || '1st Year',
          semester: `${user.activeSemester || '1st Semester'}, A.Y. ${user.schoolYear || '2026-2027'}`,
          standing: 'Good Standing',
        },
      },
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return res.status(500).json({ success: false, message: 'Server Error: Could not load dashboard.' });
  }
};

// ─── Get Single Subject Published Coursework (NetAcad Progression Tree) ────────
exports.getStudentSubjectDetails = async (req, res) => {
  try {
    const { subjectId } = req.params;
    const studentId = req.user.id;

    const subject = await Subject.findById(subjectId).populate('faculty', 'firstName lastName email');
    if (!subject) {
      return res.status(404).json({ success: false, message: 'Subject not found.' });
    }

    const isOwnerOrAdmin =
      req.user.role === 'admin' ||
      req.user.role === 'program chair' ||
      req.user.role === 'program_chair' ||
      (subject.faculty && subject.faculty.toString() === studentId.toString());

    const isEnrolled =
      isOwnerOrAdmin ||
      (subject.enrolledStudents || []).some(s => s.toString() === studentId.toString()) ||
      (req.user.enrolledSubjects || []).some(s => s.code === subject.code) ||
      (subject.yearLevel === req.user.yearLevel &&
       subject.semester === req.user.activeSemester &&
       subject.academicYear === req.user.schoolYear);

    if (!isEnrolled) {
      return res.status(403).json({
        success: false,
        message: 'Access Denied: You must be enrolled in this subject before accessing its curriculum. Please contact your Program Chair.',
      });
    }

    // Auto-sync bidirectional enrollment if student matches
    if (!isOwnerOrAdmin && !(subject.enrolledStudents || []).some(s => s.toString() === studentId.toString())) {
      if (!subject.enrolledStudents) subject.enrolledStudents = [];
      subject.enrolledStudents.push(studentId);
      await subject.save();
    }

    // Get or initialize student progress
    let progress = await StudentProgress.findOne({ student: studentId, subject: subjectId });
    if (!progress) {
      progress = await StudentProgress.create({
        student: studentId,
        subject: subjectId,
        overallProgressPercent: 0,
        topicProgress: [],
      });
    }

    // Flatten all published topics to compute sequential locks
    const allPublishedTopics = [];
    for (const mod of subject.modules || []) {
      for (const top of mod.topics || []) {
        if (top.status === 'published') {
          allPublishedTopics.push({
            topic: top,
            moduleId: mod.id,
          });
        }
      }
    }

    // Compute lock and completion states sequentially
    let previousTopicSatisfied = true; // First topic in course is ALWAYS unlocked
    const topicStates = {};

    for (let i = 0; i < allPublishedTopics.length; i++) {
      const { topic } = allPublishedTopics[i];
      const prog = (progress.topicProgress || []).find(p => p.topicId === topic.id);

      const contentReviewed = prog ? prog.contentReviewed : false;
      const quizPassed = prog ? prog.quizPassed : false;
      const bestScorePercent = prog ? prog.bestScorePercent : 0;
      const attemptsCount = prog ? prog.attemptsCount : 0;
      const lastScorePercent = prog?.lastScorePercent || 0;

      const isUnlocked = previousTopicSatisfied;

      topicStates[topic.id] = {
        unlocked: isUnlocked,
        contentReviewed,
        quizPassed,
        bestScorePercent,
        attemptsCount,
        lastScorePercent,
        hasQuiz: Boolean(topic.quiz && topic.quiz.questions && topic.quiz.questions.length > 0),
      };

      // To unlock the next topic, current topic must be satisfied:
      // If topic has a quiz with questions, quiz must be passed. If no quiz, content must be reviewed.
      const hasQuiz = topic.quiz && topic.quiz.questions && topic.quiz.questions.length > 0;
      if (hasQuiz) {
        previousTopicSatisfied = isUnlocked && quizPassed;
      } else {
        previousTopicSatisfied = isUnlocked && contentReviewed;
      }
    }

    // Calculate completed count
    const completedCount = Object.values(topicStates).filter(s => s.quizPassed || (s.contentReviewed && !s.hasQuiz)).length;
    const STREAK_TARGET = 3;
    const streak = {
      current: completedCount,
      target: STREAK_TARGET,
      unlocked: completedCount >= STREAK_TARGET,
    };

    const overallProgressPercent = allPublishedTopics.length > 0
      ? Math.round((completedCount / allPublishedTopics.length) * 100)
      : 0;

    // Update overallProgress in DB if changed
    if (progress.overallProgressPercent !== overallProgressPercent) {
      progress.overallProgressPercent = overallProgressPercent;
      progress.markModified('topicProgress');
    await progress.save();
    }

    // Assemble NetAcad hierarchical modules structure
    const studentModules = [];
    for (const mod of subject.modules || []) {
      const publishedTopics = (mod.topics || []).filter(t => t.status === 'published');
      if (publishedTopics.length > 0) {
        const topicsWithPresigned = await Promise.all(publishedTopics.map(async t => {
          const state = topicStates[t.id] || { unlocked: false, contentReviewed: false, quizPassed: false };
          let presignedUrl = t.content?.presentationUrl || '';
          if (t.content?.presentationS3Key) {
            const signed = await getPresignedViewUrl(t.content.presentationS3Key, t.content.presentationFileName);
            if (signed) presignedUrl = signed;
          }
          return {
            id: t.id,
            title: t.title,
            order: t.order,
            status: t.status,
            unlocked: state.unlocked,
            contentReviewed: state.contentReviewed,
            quizPassed: state.quizPassed,
            bestScorePercent: state.bestScorePercent,
            attemptsCount: state.attemptsCount,
            lastScorePercent: state.lastScorePercent,
            content: {
              richText: t.content?.richText || '',
              presentationS3Key: t.content?.presentationS3Key || '',
              presentationUrl: presignedUrl,
              presentationFileName: t.content?.presentationFileName || '',
              presentationFileSize: t.content?.presentationFileSize || 0,
              summaryText: t.content?.summaryText || '',
              summaryBullets: t.content?.summaryBullets || [],
            },
            quiz: t.quiz ? {
              title: t.quiz.title,
              hasTimer: t.quiz.hasTimer,
              durationMinutes: t.quiz.durationMinutes,
              passingScorePercent: t.quiz.passingScorePercent,
              shuffleQuestions: t.quiz.shuffleQuestions,
              shuffleOptions: t.quiz.shuffleOptions,
              totalQuestions: (t.quiz.questions || []).length,
              questions: (t.quiz.questions || []).map(q => ({
                id: q.id,
                type: q.type,
                prompt: q.prompt,
                options: q.options,
                points: q.points,
                explanation: q.explanation,
                // Do not expose correct answer before submission
              })),
            } : null,
          };
        }));

        studentModules.push({
          id: mod.id,
          title: mod.title,
          order: mod.order,
          topics: topicsWithPresigned,
        });
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        id: subject._id,
        name: subject.name,
        code: subject.code,
        semester: subject.semester,
        academicYear: subject.academicYear,
        yearLevel: subject.yearLevel,
        instructor: subject.faculty ? `${subject.faculty.firstName} ${subject.faculty.lastName}` : 'Faculty Instructor',
        overallProgressPercent,
        streak,
        modules: studentModules,
      },
    });
  } catch (error) {
    console.error('getStudentSubjectDetails error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve subject details.' });
  }
};

// ─── Mark Content Reviewed (Unlocks Quiz for this topic) ──────────────────────
exports.markTopicReviewed = async (req, res) => {
  try {
    const { subjectId, topicId } = req.body;
    const studentId = req.user.id;

    const subject = await Subject.findById(subjectId);
    if (!subject) return res.status(404).json({ success: false, message: 'Subject not found.' });

    const isOwnerOrAdmin =
      req.user.role === 'admin' ||
      req.user.role === 'program chair' ||
      req.user.role === 'program_chair' ||
      (subject.faculty && subject.faculty.toString() === studentId.toString());

    const isEnrolled =
      isOwnerOrAdmin ||
      (subject.enrolledStudents || []).some(s => s.toString() === studentId.toString()) ||
      (req.user.enrolledSubjects || []).some(s => s.code === subject.code) ||
      (subject.yearLevel === req.user.yearLevel &&
       subject.semester === req.user.activeSemester &&
       subject.academicYear === req.user.schoolYear);

    if (!isEnrolled) {
      return res.status(403).json({
        success: false,
        message: 'Access Denied: You must be enrolled in this subject to perform coursework.',
      });
    }

    let progress = await StudentProgress.findOne({ student: studentId, subject: subjectId });
    if (!progress) {
      progress = await StudentProgress.create({
        student: studentId,
        subject: subjectId,
        overallProgressPercent: 0,
        topicProgress: [],
      });
    }

    let topProg = progress.topicProgress.find(p => p.topicId === topicId);
    if (topProg?.quizPassed) {
      return res.status(200).json({
        success: true,
        message: 'This topic has already been passed.',
        data: {
          passed: true,
          quizPassed: true,
          scorePercent: topProg.lastScorePercent,
          attemptsCount: topProg.attemptsCount,
        },
      });
    }

    if (!topProg) {
      progress.topicProgress.push({
        topicId,
        contentReviewed: true,
        quizPassed: false,
        bestScorePercent: 0,
        attemptsCount: 0,
        unlockedAt: new Date(),
      });
    } else {
      topProg.contentReviewed = true;
    }

    progress.markModified('topicProgress');
    progress.markModified('topicProgress');
    await progress.save();

    return res.status(200).json({
      success: true,
      message: 'Topic content marked as reviewed. Assessment is now unlocked.',
      data: {
        topicId,
        contentReviewed: true,
      },
    });
  } catch (error) {
    console.error('markTopicReviewed error:', error);
    return res.status(500).json({ success: false, message: 'Failed to mark topic as reviewed' });
  }
};

// ─── Submit Wayground Quiz (Evaluates Score & Mastery Gate) ───────────────────
exports.submitTopicQuiz = async (req, res) => {
  try {
    const { subjectId, topicId, answers } = req.body;
    const studentId = req.user.id;

    if (!subjectId || !topicId || !answers) {
      return res.status(400).json({ success: false, message: 'Submission parameters missing.' });
    }

    const subject = await Subject.findById(subjectId);
    if (!subject) return res.status(404).json({ success: false, message: 'Subject not found.' });

    const isEnrolled = (subject.enrolledStudents || []).some(
      s => s.toString() === studentId.toString()
    ) || (req.user.enrolledSubjects || []).some(s => s.code === subject.code);

    if (!isEnrolled) {
      return res.status(403).json({
        success: false,
        message: 'Access Denied: You must be enrolled in this subject to submit assessments.',
      });
    }

    // Locate topic and quiz
    let targetTopic = null;
    for (const mod of subject.modules || []) {
      const top = (mod.topics || []).find(t => t.id === topicId);
      if (top) {
        targetTopic = top;
        break;
      }
    }

    if (!targetTopic || !targetTopic.quiz) {
      return res.status(404).json({ success: false, message: 'Topic quiz not found.' });
    }

    const quiz = targetTopic.quiz;
    const questions = quiz.questions || [];

    if (questions.length === 0) {
      return res.status(400).json({ success: false, message: 'Quiz has no configured questions.' });
    }

    // Evaluate answers
    let correctCount = 0;
    let earnedPoints = 0;
    let totalPossiblePoints = 0;
    const feedback = [];

    for (const q of questions) {
      const points = Number(q.points) || 1;
      totalPossiblePoints += points;
      const studentAnswer = typeof answers[q.id] === 'string' ? answers[q.id] : '';
      const isCorrect = studentAnswer.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase();

      if (isCorrect) {
        correctCount++;
        earnedPoints += points;
      }

      feedback.push({
        questionId: q.id,
        prompt: q.prompt,
        studentAnswer: studentAnswer || 'No Answer',
        correctAnswer: q.correctAnswer,
        isCorrect,
        explanation: q.explanation || '',
      });
    }

    const scorePercent = totalPossiblePoints > 0
      ? Math.round((earnedPoints / totalPossiblePoints) * 100)
      : 0;

    const passingThreshold = Number(quiz.passingScorePercent) || 75;
    const passed = scorePercent >= passingThreshold;

    // Update StudentProgress in DB
    let progress = await StudentProgress.findOne({ student: studentId, subject: subjectId });
    if (!progress) {
      progress = await StudentProgress.create({
        student: studentId,
        subject: subjectId,
        overallProgressPercent: 0,
        topicProgress: [],
      });
    }

    let topProg = progress.topicProgress.find(p => p.topicId === topicId);
    if (!topProg) {
      topProg = {
        topicId,
        contentReviewed: passed,
        quizPassed: passed,
        bestScorePercent: scorePercent,
        attemptsCount: 1,
        lastScorePercent: scorePercent,
        attempts: [{ attemptNumber: 1, scorePercent, correctCount, totalQuestions: questions.length, passed, submittedAt: new Date() }],
        completedAt: passed ? new Date() : undefined,
      };
      progress.topicProgress.push(topProg);
    } else {
      topProg.attemptsCount = (topProg.attemptsCount || 0) + 1;
      topProg.lastScorePercent = scorePercent;
      topProg.attempts = topProg.attempts || [];
      topProg.attempts.push({
        attemptNumber: topProg.attemptsCount,
        scorePercent,
        correctCount,
        totalQuestions: questions.length,
        passed,
        submittedAt: new Date(),
      });
      topProg.bestScorePercent = Math.max(topProg.bestScorePercent || 0, scorePercent);
      if (passed) {
        topProg.quizPassed = true;
        topProg.completedAt = new Date();
      } else {
        // A failed attempt requires the student to review the topic again
        // before another attempt can unlock progression.
        topProg.quizPassed = false;
        topProg.contentReviewed = false;
      }
    }

    progress.markModified('topicProgress');
    await progress.save();

    return res.status(200).json({
      success: true,
      message: passed
        ? 'Congratulations! You passed the assessment and unlocked the next topic.'
        : `Assessment not passed. You scored ${scorePercent}%, which is below the ${passingThreshold}% passing threshold. Please review the material and try again.`,
      data: {
        passed,
        scorePercent,
        passingScorePercent: passingThreshold,
        passingThreshold,
        correctCount,
        totalQuestions: questions.length,
        totalScore: `${correctCount} / ${questions.length} Correct`,
        earnedPoints,
        totalPossiblePoints,
        attemptsCount: topProg.attemptsCount,
        unlockedNextTopic: passed,
        feedback,
      },
    });
  } catch (error) {
    console.error('submitTopicQuiz error:', error);
    return res.status(500).json({ success: false, message: 'Failed to evaluate quiz submission.' });
  }
};

// Stream student presentation file through the server
exports.streamStudentPresentation = async (req, res) => {
  try {
    const { key, download } = req.query;
    if (!key) return res.status(400).send('S3 Key is required.');
    if (!hasAwsCredentials()) return res.status(503).send('AWS S3 credentials not configured.');

    const bucket = process.env.AWS_S3_BUCKET || 'project-lms-files';
    const s3Client = createS3Client();
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    const s3Res = await s3Client.send(command);
    const fileName = path.basename(key);
    const isPdf = fileName.toLowerCase().endsWith('.pdf');
    const isPptx = fileName.toLowerCase().endsWith('.pptx') || fileName.toLowerCase().endsWith('.ppt');
    const contentType = isPdf
      ? 'application/pdf'
      : isPptx
      ? 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
      : s3Res.ContentType || 'application/octet-stream';

    const disposition = download === 'true' ? 'attachment' : 'inline';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `${disposition}; filename="${fileName}"`);
    if (s3Res.ContentLength) {
      res.setHeader('Content-Length', s3Res.ContentLength);
    }

    s3Res.Body.pipe(res);
  } catch (error) {
    console.error('streamStudentPresentation error:', error);
    return res.status(500).send('Error streaming presentation from AWS S3');
  }
};
