const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth.middleware');
const { getDashboardStats, getRecentOrders } = require('../controllers/admin.dashboard.controller');

// GET /api/admin/dashboard/stats
router.get('/stats', protect, adminOnly, getDashboardStats);

// GET /api/admin/dashboard/recent-orders
router.get('/recent-orders', protect, adminOnly, getRecentOrders);

module.exports = router;
