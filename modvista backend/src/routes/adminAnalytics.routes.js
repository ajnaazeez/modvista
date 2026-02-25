const express = require('express');
const router = express.Router();
const { getOrdersOverTime, getRevenueByCategory } = require('../controllers/adminAnalytics.controller');
const { protect, adminOnly } = require('../middleware/auth.middleware');

// Apply protection to all routes
router.use(protect);
router.use(adminOnly);

router.get('/orders-over-time', getOrdersOverTime);
router.get('/revenue-by-category', getRevenueByCategory);

module.exports = router;
