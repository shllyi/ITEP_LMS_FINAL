const express = require('express');
const router = express.Router();
const {
  getFacultySubjects,
  getSubjectById,
  getSubjectProgressReport,
  getSubjectStudents,
  createSubject,
  updateSubject,
  deleteSubject,
  addModule,
  updateModule,
  deleteModule,
  addTopic,
  updateTopic,
  deleteTopic,
  saveTopicQuiz,
  getS3UploadUrl,
  uploadPresentation,
  uploadQuizDocument,
  generateTopicSummary,
  getPresentationSignedUrl,
  streamPresentation,
} = require('../controllers/faculty');
const { isAuthenticatedUser, authorizeRoles } = require('../middlewares/auth');
const { presentationUpload, quizDocUpload } = require('../utils/multerS3');

// All faculty endpoints require authentication
router.use('/faculty', isAuthenticatedUser);
router.use('/faculty', authorizeRoles('faculty', 'admin', 'program chair', 'program_chair'));

// Subjects CRUD
router.get('/faculty/subjects', getFacultySubjects);
router.post('/faculty/subjects', createSubject);
router.get('/faculty/subjects/:subjectId', getSubjectById);
router.get('/faculty/subjects/:subjectId/progress-report', getSubjectProgressReport);
router.get('/faculty/subjects/:subjectId/students', getSubjectStudents);
router.put('/faculty/subjects/:subjectId', updateSubject);
router.delete('/faculty/subjects/:subjectId', deleteSubject);

// Modules CRUD
router.post('/faculty/subjects/:subjectId/modules', addModule);
router.put('/faculty/subjects/:subjectId/modules/:moduleId', updateModule);
router.delete('/faculty/subjects/:subjectId/modules/:moduleId', deleteModule);

// Topics CRUD
router.post('/faculty/subjects/:subjectId/modules/:moduleId/topics', addTopic);
router.put('/faculty/subjects/:subjectId/modules/:moduleId/topics/:topicId', updateTopic);
router.put('/faculty/subjects/:subjectId/topics/:topicId', updateTopic);
router.delete('/faculty/subjects/:subjectId/modules/:moduleId/topics/:topicId', deleteTopic);
router.delete('/faculty/subjects/:subjectId/topics/:topicId', deleteTopic);

// Wayground Quiz (Multiple choice only, timer, passing score, shuffling)
router.put('/faculty/subjects/:subjectId/topics/:topicId/quiz', saveTopicQuiz);

// AWS S3 Pre-signed URL (legacy)
router.post('/faculty/lessons/s3-upload-url', getS3UploadUrl);

// Real AWS S3 file uploads (multipart)
router.post('/faculty/upload/presentation', presentationUpload.single('file'), uploadPresentation);
router.post('/faculty/upload/quiz-document', quizDocUpload.single('file'), uploadQuizDocument);
router.post('/faculty/topics/generate-summary', generateTopicSummary);
router.get('/faculty/presentation/signed-url', getPresentationSignedUrl);
router.get('/faculty/presentation/stream', streamPresentation);

module.exports = router;