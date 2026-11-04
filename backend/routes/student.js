const express = require('express');
const router = express.Router();
const {
  getStudentDashboard,
  getStudentSubjectDetails,
  markTopicReviewed,
  submitTopicQuiz,
  streamStudentPresentation,
} = require('../controllers/student');
const { isAuthenticatedUser, authorizeRoles } = require('../middlewares/auth');

router.use('/student', isAuthenticatedUser);
router.use('/student', authorizeRoles('student', 'admin', 'program chair', 'program_chair'));

router.get('/student/dashboard', getStudentDashboard);
router.get('/student/subjects/:subjectId', getStudentSubjectDetails);
router.get('/student/presentation/stream', streamStudentPresentation);
router.post('/student/topics/mark-reviewed', markTopicReviewed);
router.post('/student/topics/quiz/submit', submitTopicQuiz);

module.exports = router;
