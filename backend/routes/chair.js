const express = require('express');
const router = express.Router();
const {
  getAccounts,
  createAccount,
  updateAccount,
  changeRole,
  deleteAccount,
  batchUpdateStudentStatus,
  previewEnrollmentRules,
  executeEnrollmentRules,
  getAllSubjects,
  enrollStudentDirect,
  unenrollStudentDirect,
  getChairReports,
} = require('../controllers/chair');
const { isAuthenticatedUser, authorizeRoles } = require('../middlewares/auth');

// All chair endpoints require authentication and Program Chair or Admin role
router.use('/chair', isAuthenticatedUser);
router.use('/chair', authorizeRoles('program chair', 'program_chair', 'admin'));

// 1. Account Lifecycle Manager
router.get('/chair/accounts', getAccounts);
router.post('/chair/accounts', createAccount);
router.put('/chair/accounts/:id', updateAccount);
router.patch('/chair/accounts/:id/role', changeRole);
router.delete('/chair/accounts/:id', deleteAccount);

// 2. Academic Status Editor
router.patch('/chair/students/batch-status', batchUpdateStudentStatus);

// 3. Subjects & Direct Enrollment
router.get('/chair/subjects', getAllSubjects);
router.post('/chair/enrollment/direct', enrollStudentDirect);
router.post('/chair/enrollment/unenroll', unenrollStudentDirect);

// 4. Smart Enrollment Engine
router.post('/chair/enrollment/preview', previewEnrollmentRules);
router.post('/chair/enrollment/execute', executeEnrollmentRules);

// 5. Academic & Cohort Reports
router.get('/chair/reports', getChairReports);

module.exports = router;
