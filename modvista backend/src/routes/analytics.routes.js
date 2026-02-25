const express = require('express');
const router = express.Router();
const { getAdminAnalytics, getUserAnalytics } = require('../controllers/analytics.controller');
const { protect, adminOnly } = require('../middleware/auth.middleware');

router.get('/admin', protect, adminOnly, getAdminAnalytics);
router.get('/user', protect, getUserAnalytics);

module.exports = router;
