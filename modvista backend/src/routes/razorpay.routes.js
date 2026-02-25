const express = require('express');
const router = express.Router();
const { createRazorpayOrder, verifyRazorpayPayment } = require('../controllers/razorpay.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);

router.post('/create-order', createRazorpayOrder);
router.post('/verify', verifyRazorpayPayment);

module.exports = router;
