const Subject = require('../models/subject');
const User = require('../models/user');
const StudentProgress = require('../models/studentProgress');
const path = require('path');
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { extractTextFromBuffer } = require('../utils/extractText');
const { getPresignedViewUrl, hasAwsCredentials, createS3Client } = require('../utils/s3Service');

// Helper to generate unique string IDs
const generateId = (prefix = 'id') => `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

async function refreshSubjectPresentationUrls(subject) {
  if (!subject) return subject;
  const subjObj = subject.toObject ? subject.toObject() : subject;
  if (!subjObj.modules) return subjObj;
  for (const mod of subjObj.modules) {
    for (const top of mod.topics || []) {
      if (top.content && top.content.presentationS3Key) {
        const signed = await getPresignedViewUrl(top.content.presentationS3Key, top.content.presentationFileName);
        if (signed) {
          top.content.presentationUrl = signed;
        }
      }
    }
  }
  return subjObj;
}

// Optional AI summary generation. The endpoint remains usable without Gemini configured;
// the client supplies a deterministic local fallback in that case.
exports.generateTopicSummary = async (req, res) => {
  try {
    const richText = String(req.body.richText || '').replace(/<[^>]+>/g, ' ');
    const presentationText = String(req.body.presentationText || '');
    const source = `${richText}\n${presentationText}`.replace(/\s+/g, ' ').trim();
    if (!source) return res.status(400).json({ success: false, message: 'Text content is required.' });
    if (!process.env.GEMINI_API_KEY) {
      return res.status(204).send();
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: `Create a concise educational summary with 3-5 key takeaways from this lesson. Return plain text only.\n\n${source.slice(0, 30000)}` }] }] }),
    });
    if (!response.ok) return res.status(502).json({ success: false, message: 'AI summary service unavailable.' });
    const data = await response.json();
    const summary = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return res.status(200).json({ success: true, data: { summary } });
  } catch (error) {
    console.error('generateTopicSummary error:', error);
    return res.status(500).json({ success: false, message: 'Failed to generate summary.' });
  }
};

// ─── 1. SUBJECT CRUD ──────────────────────────────────────────────────────────

// GET all subjects for current faculty (NO SEEDING)
exports.getFacultySubjects = async (req, res) => {
  try {
    const facultyId = req.user._id || req.user.id;
    const subjects = await Subject.find({ faculty: { $in: [facultyId, String(facultyId)] } }).sort({ createdAt: -1 });
    const refreshed = await Promise.all(subjects.map(s => refreshSubjectPresentationUrls(s)));
    return res.status(200).json({ success: true, count: refreshed.length, data: refreshed });
  } catch (error) {
    console.error('getFacultySubjects error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve subjects' });
  }
};

// GET single subject
exports.getSubjectById = async (req, res) => {
  try {
    const subject = await Subject.findOne({ _id: req.params.subjectId, faculty: req.user._id });
    if (!subject) return res.status(404).json({ success: false, message: 'Subject not found.' });
    const professor = await User.findById(req.user.id).select('firstName lastName email').lean();
    const refreshed = await refreshSubjectPresentationUrls(subject);
    return res.status(200).json({ success: true, data: refreshed });
  } catch (error) {
    console.error('getSubjectById error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve subject' });
  }
};

// GET enrolled-student quiz report for a subject
exports.getSubjectProgressReport = async (req, res) => {
  try {
    const subject = await Subject.findOne({ _id: req.params.subjectId, faculty: req.user.id });
    if (!subject) return res.status(404).json({ success: false, message: 'Subject not found.' });
    const professor = await User.findById(req.user.id).select('firstName lastName email').lean();

    const students = await User.find({
      role: 'student',
      $or: [
        { _id: { $in: subject.enrolledStudents || [] } },
        { 'enrolledSubjects.code': subject.code },
      ],
    })
      .select('firstName lastName email studentId')
      .sort({ lastName: 1, firstName: 1 })
      .lean();
    const progressRows = await StudentProgress.find({
      subject: subject._id,
      student: { $in: students.map(student => student._id) },
    }).lean();
    const progressByStudent = new Map(progressRows.map(row => [String(row.student), row]));

    const topics = [];
    for (const module of subject.modules || []) {
      for (const topic of module.topics || []) {
        if (topic.status !== 'published' || !topic.quiz || !topic.quiz.questions?.length) continue;
        topics.push({
          topicId: topic.id,
          topicTitle: topic.title,
          moduleId: module.id,
          moduleTitle: module.title,
          passingScorePercent: Number(topic.quiz.passingScorePercent) || 75,
        });
      }
    }

    const reportStudents = students.map(student => {
      const progress = progressByStudent.get(String(student._id));
      const topicProgress = progress?.topicProgress || [];
      const topicScores = topics.map(topic => {
        const state = topicProgress.find(item => item.topicId === topic.topicId);
        const attempts = (state?.attempts || []).map((attempt, index) => ({
          attempt: attempt.attemptNumber || index + 1,
          scorePercent: attempt.scorePercent,
          correctCount: attempt.correctCount,
          totalQuestions: attempt.totalQuestions,
          passed: attempt.passed,
          submittedAt: attempt.submittedAt,
        }));
        return {
          ...topic,
          attempts,
          attemptsCount: state?.attemptsCount || attempts.length,
          bestScorePercent: state?.bestScorePercent || 0,
          lastScorePercent: state?.lastScorePercent || 0,
          passed: Boolean(state?.quizPassed),
        };
      });

      const completedTopics = topicScores.filter(topic => topic.passed);
      return {
        studentId: String(student._id),
        studentNumber: student.studentId || '',
        firstName: student.firstName,
        lastName: student.lastName,
        email: student.email,
        attemptsTotal: topicScores.reduce((total, topic) => total + topic.attemptsCount, 0),
        passedTopics: completedTopics.length,
        totalTopics: topicScores.length,
        overallScorePercent: topicScores.length
          ? Math.round(topicScores.reduce((total, topic) => total + topic.bestScorePercent, 0) / topicScores.length)
          : 0,
        passedAll: topicScores.length > 0 && completedTopics.length === topicScores.length,
        topicScores,
      };
    });

    const moduleSummaries = (subject.modules || []).map(module => {
      const moduleTopics = topics.filter(topic => topic.moduleId === module.id);
      const scores = reportStudents.flatMap(student =>
        student.topicScores.filter(topic => topic.moduleId === module.id).map(topic => topic.bestScorePercent)
      );
      return {
        moduleId: module.id,
        moduleTitle: module.title,
        topicCount: moduleTopics.length,
        studentCount: reportStudents.length,
        averageScorePercent: scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : 0,
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        subject: {
          id: subject._id,
          name: subject.name,
          code: subject.code,
          academicYear: subject.academicYear,
          semester: subject.semester,
          yearLevel: subject.yearLevel,
          professorName: professor ? `${professor.firstName} ${professor.lastName}` : 'Faculty Instructor',
          professorEmail: professor?.email || '',
        },
        generatedAt: new Date().toISOString(),
        topics,
        modules: moduleSummaries,
        students: reportStudents,
      },
    });
  } catch (error) {
    console.error('getSubjectProgressReport error:', error);
    return res.status(500).json({ success: false, message: 'Failed to generate subject progress report.' });
  }
};

// GET enrolled students for a subject
exports.getSubjectStudents = async (req, res) => {
  try {
    const facultyId = req.user._id || req.user.id;
    const subject = await Subject.findOne({
      _id: req.params.subjectId,
      faculty: { $in: [facultyId, String(facultyId)] },
    });
    if (!subject) return res.status(404).json({ success: false, message: 'Subject not found.' });

    const students = await User.find({
      role: 'student',
      $or: [
        { _id: { $in: subject.enrolledStudents || [] } },
        { 'enrolledSubjects.code': subject.code },
        {
          yearLevel: subject.yearLevel,
          activeSemester: subject.semester,
          schoolYear: subject.academicYear,
        },
      ],
    })
      .select('firstName lastName email tuptId section')
      .sort({ lastName: 1, firstName: 1 })
      .collation({ locale: 'en', strength: 2 })
      .lean();

    // Quiz scores
    const progressRows = await StudentProgress.find({
      subject: subject._id,
      student: { $in: students.map(s => s._id) },
    }).lean();
    const progressByStudent = new Map(progressRows.map(row => [String(row.student), row]));

    const quizTopics = [];
    for (const mod of subject.modules || []) {
      for (const topic of mod.topics || []) {
        if (topic.status !== 'published' || !topic.quiz || !topic.quiz.questions?.length) continue;
        quizTopics.push({
          topicId: topic.id,
          topicTitle: topic.title,
          moduleTitle: mod.title,
          totalQuestions: topic.quiz.questions.length,
        });
      }
    }
    const quizTopicIds = quizTopics.map(q => q.topicId);

    const data = students.map(s => {
      const progress = progressByStudent.get(String(s._id));
      const topicProgress = progress?.topicProgress || [];
      const states = quizTopicIds.map(id => topicProgress.find(t => t.topicId === id));
      const bestScores = states.map(t => t?.bestScorePercent || 0);
      const attemptsTotal = states.reduce((sum, t) => sum + (t?.attemptsCount || 0), 0);

      // Score for each quiz = correctCount of the best attempt
      const quizScores = quizTopics.map(q => {
        const state = topicProgress.find(t => t.topicId === q.topicId);
        const attempts = state?.attempts || [];
        let best = null;
        for (const a of attempts) {
          if (!best || (a.correctCount || 0) > (best.correctCount || 0)) best = a;
        }
        return {
          topicId: q.topicId,
          topicTitle: q.topicTitle,
          moduleTitle: q.moduleTitle,
          totalQuestions: best?.totalQuestions || q.totalQuestions,
          correctCount: best ? best.correctCount || 0 : null,
        };
      });

      return {
        _id: String(s._id),
        firstName: s.firstName,
        lastName: s.lastName,
        email: s.email,
        studentNumber: s.studentId || '',
        tuptId: s.tuptId || '',
        section: s.section || '',
        quizScorePercent: quizTopicIds.length
          ? Math.round(bestScores.reduce((sum, score) => sum + score, 0) / quizTopicIds.length)
          : 0,
        passedQuizzes: states.filter(t => t?.quizPassed).length,
        totalQuizzes: quizTopicIds.length,
        attemptsTotal,
        quizScores,
      };
    });

    return res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    console.error('getSubjectStudents error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve enrolled students.' });
  }
};

// CREATE subject
exports.createSubject = async (req, res) => {
  try {
    const { name, code, academicYear, semester, yearLevel } = req.body;

    if (!name || !code) {
      return res.status(400).json({ success: false, message: 'Subject name and course code are required.' });
    }

    const validSemesters = ['1st Semester', '2nd Semester', '3rd Semester'];
    const validYearLevels = ['1st Year', '2nd Year', '3rd Year', '4th Year'];

    const chosenSemester = validSemesters.includes(semester) ? semester : '1st Semester';
    const chosenYearLevel = validYearLevels.includes(yearLevel) ? yearLevel : '1st Year';
    const chosenAcademicYear = academicYear || '2026-2027';

    const newSubject = await Subject.create({
      name: name.trim(),
      code: code.trim().toUpperCase(),
      academicYear: chosenAcademicYear,
      semester: chosenSemester,
      yearLevel: chosenYearLevel,
      faculty: req.user._id || req.user.id,
      modules: [], // Clean start - no seeded dummy modules
    });

    return res.status(201).json({ success: true, message: 'Subject created successfully.', data: newSubject });
  } catch (error) {
    console.error('createSubject error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create subject' });
  }
};

// UPDATE subject
exports.updateSubject = async (req, res) => {
  try {
    const { name, code, academicYear, semester, yearLevel } = req.body;
    const subject = await Subject.findOne({ _id: req.params.subjectId, faculty: req.user.id });
    if (!subject) return res.status(404).json({ success: false, message: 'Subject not found.' });

    if (name) subject.name = name.trim();
    if (code) subject.code = code.trim().toUpperCase();
    if (academicYear) subject.academicYear = academicYear.trim();
    if (semester) subject.semester = semester;
    if (yearLevel) subject.yearLevel = yearLevel;

    await subject.save();
    return res.status(200).json({ success: true, message: 'Subject updated successfully.', data: subject });
  } catch (error) {
    console.error('updateSubject error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update subject' });
  }
};

// DELETE subject
exports.deleteSubject = async (req, res) => {
  try {
    const subject = await Subject.findOneAndDelete({ _id: req.params.subjectId, faculty: req.user.id });
    if (!subject) return res.status(404).json({ success: false, message: 'Subject not found.' });
    return res.status(200).json({ success: true, message: 'Subject deleted successfully.' });
  } catch (error) {
    console.error('deleteSubject error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete subject' });
  }
};

// ─── 2. MODULE CRUD ───────────────────────────────────────────────────────────

// ADD Module (Faculty specifies custom title)
exports.addModule = async (req, res) => {
  try {
    const { subjectId } = req.params;
    const { title } = req.body;

    const subject = await Subject.findOne({ _id: subjectId, faculty: req.user.id });
    if (!subject) return res.status(404).json({ success: false, message: 'Subject not found.' });

    const newModule = {
      id: generateId('mod'),
      title: title && title.trim() ? title.trim() : `Module ${subject.modules.length + 1}`,
      order: subject.modules.length + 1,
      topics: [],
    };

    subject.modules.push(newModule);
    await subject.save();

    return res.status(201).json({ success: true, message: 'Module created successfully.', data: subject });
  } catch (error) {
    console.error('addModule error:', error);
    return res.status(500).json({ success: false, message: 'Failed to add module' });
  }
};

// UPDATE Module title / order
exports.updateModule = async (req, res) => {
  try {
    const { subjectId, moduleId } = req.params;
    const { title, order } = req.body;

    const subject = await Subject.findOne({ _id: subjectId, faculty: req.user.id });
    if (!subject) return res.status(404).json({ success: false, message: 'Subject not found.' });

    const mod = subject.modules.find(m => m.id === moduleId);
    if (!mod) return res.status(404).json({ success: false, message: 'Module not found.' });

    if (title && title.trim()) mod.title = title.trim();
    if (order !== undefined) mod.order = Number(order);

    subject.markModified('modules');
    await subject.save();
    return res.status(200).json({ success: true, message: 'Module updated successfully.', data: subject });
  } catch (error) {
    console.error('updateModule error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update module' });
  }
};

// DELETE Module
exports.deleteModule = async (req, res) => {
  try {
    const { subjectId, moduleId } = req.params;

    const subject = await Subject.findOne({ _id: subjectId, faculty: req.user.id });
    if (!subject) return res.status(404).json({ success: false, message: 'Subject not found.' });

    subject.modules = subject.modules.filter(m => m.id !== moduleId);
    await subject.save();

    return res.status(200).json({ success: true, message: 'Module deleted successfully.', data: subject });
  } catch (error) {
    console.error('deleteModule error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete module' });
  }
};

// ─── 3. TOPIC CRUD ────────────────────────────────────────────────────────────

// ADD Topic (Faculty specifies custom title)
exports.addTopic = async (req, res) => {
  try {
    const { subjectId, moduleId } = req.params;
    const { title } = req.body;

    const subject = await Subject.findOne({ _id: subjectId, faculty: req.user.id });
    if (!subject) return res.status(404).json({ success: false, message: 'Subject not found.' });

    const targetModule = subject.modules.find(m => m.id === moduleId);
    if (!targetModule) return res.status(404).json({ success: false, message: 'Module not found.' });

    const newTopic = {
      id: generateId('top'),
      title: title && title.trim() ? title.trim() : `Topic ${targetModule.topics.length + 1}`,
      order: targetModule.topics.length + 1,
      status: 'draft',
      content: {
        richText: '',
        presentationS3Key: '',
        presentationUrl: '',
        presentationFileName: '',
        presentationFileSize: 0,
        presentationExtractedText: '',
        summaryBullets: [],
      },
      quiz: {
        title: 'Topic Assessment',
        hasTimer: true,
        durationMinutes: 15,
        passingScorePercent: 75,
        shuffleQuestions: true,
        shuffleOptions: true,
        questions: [],
      },
    };

    targetModule.topics.push(newTopic);
    await subject.save();

    return res.status(201).json({ success: true, message: 'Topic created successfully.', data: subject });
  } catch (error) {
    console.error('addTopic error:', error);
    return res.status(500).json({ success: false, message: 'Failed to add topic' });
  }
};

// UPDATE Topic (title, status, content, presentation S3 info)
exports.updateTopic = async (req, res) => {
  try {
    const { subjectId, topicId } = req.params;
    const { title, status, content } = req.body;

    const subject = await Subject.findOne({ _id: subjectId, faculty: req.user.id });
    if (!subject) return res.status(404).json({ success: false, message: 'Subject not found.' });

    let foundTopic = null;
    for (const mod of subject.modules) {
      const t = mod.topics.find(top => top.id === topicId);
      if (t) {
        foundTopic = t;
        break;
      }
    }

    if (!foundTopic) return res.status(404).json({ success: false, message: 'Topic not found.' });

    if (title && title.trim()) foundTopic.title = title.trim();
    if (status) foundTopic.status = status;
    if (content) {
      if (!foundTopic.content) {
        foundTopic.content = {};
      }
      if (content.richText !== undefined) foundTopic.content.richText = content.richText;
      if (content.presentationS3Key !== undefined) foundTopic.content.presentationS3Key = content.presentationS3Key;
      if (content.presentationUrl !== undefined) foundTopic.content.presentationUrl = content.presentationUrl;
      if (content.presentationFileName !== undefined) foundTopic.content.presentationFileName = content.presentationFileName;
      if (content.presentationFileSize !== undefined) foundTopic.content.presentationFileSize = content.presentationFileSize;
      if (content.presentationExtractedText !== undefined) foundTopic.content.presentationExtractedText = content.presentationExtractedText;
      if (content.summaryText !== undefined) foundTopic.content.summaryText = content.summaryText;
      if (content.summaryBullets !== undefined) foundTopic.content.summaryBullets = content.summaryBullets;
    }

    subject.markModified('modules');
    await subject.save();
    return res.status(200).json({ success: true, message: 'Topic updated successfully.', data: subject });
  } catch (error) {
    console.error('updateTopic error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update topic' });
  }
};

// DELETE Topic
exports.deleteTopic = async (req, res) => {
  try {
    const { subjectId, moduleId, topicId } = req.params;

    const subject = await Subject.findOne({ _id: subjectId, faculty: req.user.id });
    if (!subject) return res.status(404).json({ success: false, message: 'Subject not found.' });

    const targetModule = moduleId
      ? subject.modules.find(m => m.id === moduleId)
      : subject.modules.find(m => m.topics.some(t => t.id === topicId));
    if (!targetModule) return res.status(404).json({ success: false, message: 'Module not found.' });

    targetModule.topics = targetModule.topics.filter(t => t.id !== topicId);
    subject.markModified('modules');
    await subject.save();

    return res.status(200).json({ success: true, message: 'Topic deleted successfully.', data: subject });
  } catch (error) {
    console.error('deleteTopic error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete topic' });
  }
};

// ─── 4. QUIZ CRUD (STRICTLY MULTIPLE CHOICE, TIMER, SHUFFLE, PASSING SCORE) ──

exports.saveTopicQuiz = async (req, res) => {
  try {
    const { subjectId, topicId } = req.params;
    const { quiz } = req.body;

    if (!quiz) return res.status(400).json({ success: false, message: 'Quiz data required.' });

    // Validate Timer
    const hasTimer = Boolean(quiz.hasTimer);
    let duration = Number(quiz.durationMinutes) || 15;
    if (hasTimer) {
      if (duration < 10 || duration > 20) {
        return res.status(400).json({
          success: false,
          message: 'Duration with timer enabled must be between 10 and 20 minutes.',
        });
      }
    }

    // Validate Passing Score
    const passingScore = Number(quiz.passingScorePercent) || 75;
    if (passingScore < 1 || passingScore > 100) {
      return res.status(400).json({
        success: false,
        message: 'Passing score must be between 1% and 100%.',
      });
    }

    // Validate Multiple Choice Only
    const validatedQuestions = (quiz.questions || []).map((q, idx) => {
      if (!q.prompt || !q.prompt.trim()) {
        throw new Error(`Question ${idx + 1} requires a valid prompt.`);
      }
      if (!Array.isArray(q.options) || q.options.length < 2) {
        throw new Error(`Question ${idx + 1} must have at least 2 options.`);
      }
      return {
        id: q.id || generateId('q'),
        type: 'multiple_choice',
        prompt: q.prompt.trim(),
        options: q.options.map(opt => String(opt).trim()),
        correctAnswer: String(q.correctAnswer).trim(),
        explanation: q.explanation ? q.explanation.trim() : '',
        points: Number(q.points) || 1,
      };
    });

    const subject = await Subject.findOne({ _id: subjectId, faculty: req.user.id });
    if (!subject) return res.status(404).json({ success: false, message: 'Subject not found.' });

    let foundTopic = null;
    for (const mod of subject.modules) {
      const t = mod.topics.find(top => top.id === topicId);
      if (t) {
        foundTopic = t;
        break;
      }
    }

    if (!foundTopic) return res.status(404).json({ success: false, message: 'Topic not found.' });

    foundTopic.quiz = {
      title: quiz.title && quiz.title.trim() ? quiz.title.trim() : 'Topic Assessment',
      hasTimer,
      durationMinutes: duration,
      passingScorePercent: passingScore,
      shuffleQuestions: quiz.shuffleQuestions !== undefined ? Boolean(quiz.shuffleQuestions) : true,
      shuffleOptions: quiz.shuffleOptions !== undefined ? Boolean(quiz.shuffleOptions) : true,
      questions: validatedQuestions,
    };

    subject.markModified('modules');
    await subject.save();
    return res.status(200).json({ success: true, message: 'Quiz saved successfully.', data: subject });
  } catch (error) {
    console.error('saveTopicQuiz error:', error);
    return res.status(400).json({ success: false, message: error.message || 'Failed to save quiz' });
  }
};

// ─── 5. AWS S3 PRESENTATION STORAGE INTEGRATION ───────────────────────────────

// Real S3 upload for presentation files (multer memory storage → S3 PutObject)
exports.uploadPresentation = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file provided.' });
    }

    const { topicId, subjectId } = req.body;
    const bucket = process.env.AWS_S3_BUCKET || 'project-lms-files';
    const region = process.env.AWS_S3_BUCKET_REGION || process.env.AWS_REGION || 'ap-southeast-1';

    if (!hasAwsCredentials()) {
      return res.status(503).json({ success: false, message: 'AWS S3 is not configured. Set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, and AWS_S3_BUCKET.' });
    }
    const s3Client = createS3Client();

    const cleanFileName = req.file.originalname.replace(/\s+/g, '_');
    // Keep extracted PDF text with the topic so summary generation can use both sources.
    // PPTX extraction can be added by the configured document provider; PDFs are supported now.
    const extractedText = await extractTextFromBuffer(req.file.buffer, req.file.originalname).catch(() => '');
    const s3Key = `presentations/topics/${topicId || 'general'}/${Date.now()}_${cleanFileName}`;

    const uploadCommand = new PutObjectCommand({
      Bucket: bucket,
      Key: s3Key,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
    });

    try {
      await s3Client.send(uploadCommand);
    } catch (s3Err) {
      console.error('AWS S3 upload error:', s3Err.message);
      throw s3Err;
    }

    const presignedViewUrl = await getPresignedViewUrl(s3Key, cleanFileName);
    const publicUrl = presignedViewUrl || `https://${bucket}.s3.${region}.amazonaws.com/${s3Key}`;

    // Automatically attach presentation directly to the topic in MongoDB
    let updatedSubject = null;
    if (topicId) {
      try {
        let subject = null;
        if (subjectId) {
          subject = await Subject.findById(subjectId);
        }
        if (!subject) {
          subject = await Subject.findOne({ 'modules.topics.id': topicId });
        }
        if (subject) {
          for (const mod of subject.modules) {
            const t = mod.topics.find(top => top.id === topicId);
            if (t) {
              if (!t.content) t.content = {};
              t.content.presentationS3Key = s3Key;
              t.content.presentationUrl = publicUrl;
              t.content.presentationFileName = cleanFileName;
              t.content.presentationFileSize = req.file.size;
              t.content.presentationExtractedText = extractedText ? extractedText.trim() : '';
              subject.markModified('modules');
              await subject.save();
              updatedSubject = await refreshSubjectPresentationUrls(subject);
              break;
            }
          }
        }
      } catch (attachErr) {
        console.warn('Could not auto-attach presentation to topic in DB:', attachErr.message);
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Presentation uploaded to AWS S3 and attached to topic successfully.',
      data: {
        s3Key,
        publicUrl,
        viewableUrl: publicUrl,
        fileName: cleanFileName,
        fileSize: req.file.size,
        extractedText: extractedText ? extractedText.trim() : '',
      },
      subject: updatedSubject,
    });
  } catch (error) {
    console.error('uploadPresentation S3 error:', error);
    return res.status(500).json({ success: false, message: 'Failed to upload file to AWS S3.' });
  }
};

// ─── 6. QUIZ DOCUMENT UPLOAD & TEXT EXTRACTION ────────────────────────────────

exports.uploadQuizDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file provided.' });
    }

    // 1. Extract text from the document buffer
    const extractedText = await extractTextFromBuffer(req.file.buffer, req.file.originalname);

    if (!extractedText || extractedText.trim().length < 10) {
      return res.status(422).json({
        success: false,
        message: 'Could not extract readable text from the uploaded file. Ensure the document has selectable text.',
      });
    }

    // 2. Optionally also upload the raw document to S3 for archiving
    const bucket = process.env.AWS_S3_BUCKET || 'project-lms-files';
    const region = process.env.AWS_S3_BUCKET_REGION || process.env.AWS_REGION || 'ap-southeast-1';

    const s3Client = hasAwsCredentials() ? createS3Client() : null;

    const cleanFileName = req.file.originalname.replace(/\s+/g, '_');
    const s3Key = `quiz-documents/${Date.now()}_${cleanFileName}`;

    const uploadCommand = new PutObjectCommand({
      Bucket: bucket,
      Key: s3Key,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
    });

    // Upload silently — failure doesn't block text extraction result
    if (s3Client) {
      s3Client.send(uploadCommand).catch(err => console.warn('Quiz doc S3 archive warning:', err.message));
    }

    return res.status(200).json({
      success: true,
      message: 'Document text extracted successfully.',
      data: {
        extractedText: extractedText.trim(),
        fileName: cleanFileName,
        fileSize: req.file.size,
        s3Key,
      },
    });
  } catch (error) {
    console.error('uploadQuizDocument error:', error);
    return res.status(500).json({ success: false, message: 'Failed to process uploaded document.' });
  }
};

// Legacy pre-signed URL helper (kept for compatibility)
exports.getS3UploadUrl = async (req, res) => {
  try {
    const { fileName, mimeType, topicId } = req.body;
    const bucket = process.env.AWS_S3_BUCKET || 'project-lms-files';
    const region = process.env.AWS_S3_BUCKET_REGION || process.env.AWS_REGION || 'ap-southeast-1';
    const cleanFileName = (fileName || 'presentation.pptx').replace(/\s+/g, '_');
    const s3Key = `presentations/topics/${topicId || 'general'}/${Date.now()}_${cleanFileName}`;

    if (!hasAwsCredentials()) {
      return res.status(503).json({ success: false, message: 'AWS S3 is not configured.' });
    }
    const s3Client = createS3Client();

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: s3Key,
      ContentType: mimeType || 'application/octet-stream',
    });

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 900 });

    return res.status(200).json({
      success: true,
      data: {
        uploadUrl,
        s3Key,
        publicUrl: `https://${bucket}.s3.${region}.amazonaws.com/${s3Key}`,
        fileName: cleanFileName,
      },
    });
  } catch (error) {
    console.error('getS3UploadUrl error:', error);
    return res.status(500).json({ success: false, message: 'Failed to generate S3 signature' });
  }
};

// GET fresh presigned view URL for any S3 key
exports.getPresentationSignedUrl = async (req, res) => {
  try {
    const { key, fileName } = req.query;
    if (!key) return res.status(400).json({ success: false, message: 'S3 Key is required.' });
    const viewableUrl = await getPresignedViewUrl(key, fileName);
    if (!viewableUrl) {
      return res.status(500).json({ success: false, message: 'Could not generate signed URL.' });
    }
    return res.status(200).json({ success: true, url: viewableUrl });
  } catch (error) {
    console.error('getPresentationSignedUrl error:', error);
    return res.status(500).json({ success: false, message: 'Failed to generate signed URL' });
  }
};

// STREAM presentation file directly through server (bypasses S3 Block Public Access)
exports.streamPresentation = async (req, res) => {
  try {
    const { key, download } = req.query;
    if (!key) return res.status(400).send('S3 key is required.');
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
    console.error('streamPresentation error:', error);
    return res.status(500).send('Error streaming file from AWS S3');
  }
};
