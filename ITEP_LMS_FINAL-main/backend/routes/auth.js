const express = require('express');
const router = express.Router();
const { registerUser, loginUser, verifyEmail, getMe } = require('../controllers/auth');
const { isAuthenticatedUser } = require('../middlewares/auth');

router.post('/auth/register', registerUser);
router.get('/auth/verify/:token', verifyEmail);
router.post('/auth/login', loginUser);
router.get('/auth/me', isAuthenticatedUser, getMe);

module.exports = router;
