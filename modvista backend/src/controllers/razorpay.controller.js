const razorpay = require('../config/razorpay');
const crypto = require('crypto');
const Order = require('../models/Order.model');
const asyncHandler = require('../utils/asyncHandler');

// @desc    Create Razorpay Order
// @route   POST /api/razorpay/create-order
// @access  Private
const createRazorpayOrder = asyncHandler(async (req, res) => {
    const { amount, receipt } = req.body;

    if (!amount) {
        res.status(400);
        throw new Error('Amount is required');
    }

    const options = {
        amount: Math.round(amount * 100), // convert to paise
        currency: 'INR',
        receipt: receipt || `receipt_${Date.now()}`,
    };

    try {
        const order = await razorpay.orders.create(options);
        res.status(201).json({
            success: true,
            order_id: order.id,
            amount: order.amount,
            currency: order.currency
        });
    } catch (error) {
        console.error('Razorpay Order Creation Error:', error);
        res.status(500);
        throw new Error('Failed to create Razorpay order');
    }
});

// @desc    Verify Razorpay Signature
// @route   POST /api/razorpay/verify
// @access  Private
const verifyRazorpayPayment = asyncHandler(async (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        res.status(400);
        throw new Error('All Razorpay fields are required for verification');
    }

    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(body.toString())
        .digest('hex');

    const isVerified = expectedSignature === razorpay_signature;

    if (isVerified) {
        // Update Order Status
        const order = await Order.findOne({ razorpay_order_id });
        if (order) {
            order.isPaid = true;
            order.paidAt = Date.now();
            order.paymentStatus = 'paid';
            order.razorpay_payment_id = razorpay_payment_id;
            order.razorpay_signature = razorpay_signature;
            order.status = 'confirmed';

            order.statusHistory.push({
                status: 'confirmed',
                comment: 'Payment verified via Razorpay. Order confirmed.'
            });

            await order.save();
        }

        res.status(200).json({
            success: true,
            message: 'Payment verified successfully and order updated',
            orderId: order ? order._id : null
        });
    } else {
        res.status(400);
        throw new Error('Invalid signature, verification failed');
    }
});

module.exports = {
    createRazorpayOrder,
    verifyRazorpayPayment
};
