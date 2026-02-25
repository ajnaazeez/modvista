const express = require('express');
const router = express.Router();

// @desc    Get Razorpay Key ID
// @route   GET /api/public/razorpay-key
// @access  Public
router.get('/razorpay-key', (req, res) => {
    res.status(200).json({
        success: true,
        key_id: process.env.RAZORPAY_KEY_ID
    });
});

module.exports = router;
