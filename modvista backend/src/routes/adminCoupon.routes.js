const express = require('express');
const router = express.Router();
const {
    getCoupons,
    getCouponById,
    createCoupon,
    updateCoupon,
    toggleCoupon,
    deleteCoupon
} = require('../controllers/adminCoupon.controller');
const { validateCoupon } = require('../middleware/coupon.validate');
const { protect } = require('../middleware/auth.middleware');
const adminOnly = require('../middleware/admin.middleware');

// Protected and Admin Only
router.use(protect);
router.use(adminOnly);

router.route('/')
    .get(getCoupons)
    .post(validateCoupon, createCoupon);

router.route('/:id')
    .get(getCouponById)
    .put(validateCoupon, updateCoupon)
    .delete(deleteCoupon);

router.patch('/:id/toggle', toggleCoupon);

module.exports = router;
