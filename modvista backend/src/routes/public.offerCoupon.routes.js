const express = require('express');
const router = express.Router();
const {
    getPublicOffers, getPublicCoupons, applyCoupon
} = require('../controllers/public.offerCoupon.controller');
const { protect } = require('../middleware/auth.middleware');

// Public
router.get('/offers', getPublicOffers);
router.get('/coupons', getPublicCoupons);

// Protected (Apply)
router.post('/coupons/apply', protect, applyCoupon);

module.exports = router;
