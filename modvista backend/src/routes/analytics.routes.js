const express = require('express');
const router = express.Router();
const {
    getAdminAnalytics,
    getUserAnalytics,
    getSalesReport,
    getUserActivity
} = require('../controllers/analytics.controller');
const { protect, adminOnly } = require('../middleware/auth.middleware');

router.get('/admin', protect, adminOnly, getAdminAnalytics);
router.get('/sales-report', protect, adminOnly, getSalesReport);
router.get('/user-activity', protect, adminOnly, getUserActivity);
router.get('/user', protect, getUserAnalytics);

module.exports = router;
