const express = require('express');
const router = express.Router();
const { requestOtp, verifyOtp, resetPassword } = require('../controllers/forgotPassword.controller');

// POST /api/auth/forgot-password/request-otp
router.post('/request-otp', requestOtp);

// POST /api/auth/forgot-password/verify-otp
router.post('/verify-otp', verifyOtp);

// POST /api/auth/forgot-password/reset
router.post('/reset', resetPassword);

module.exports = router;
