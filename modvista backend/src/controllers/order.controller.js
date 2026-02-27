const Order = require('../models/Order.model');
const Cart = require('../models/Cart.model');
const Address = require('../models/Address.model');
const Wallet = require('../models/Wallet.model');
const Product = require('../models/Product.model');
const asyncHandler = require('../utils/asyncHandler');
const mongoose = require('mongoose');
const { calculatePriceBreakdown } = require('../utils/pricingEngine');
const Offer = require('../models/Offer.model');
const Coupon = require('../models/Coupon.model');

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
const createOrder = asyncHandler(async (req, res) => {
    const { addressId, paymentMethod } = req.body;

    // 1. Fetch cart and populate products
    const cart = await Cart.findOne({ user: req.user._id }).populate({
        path: 'items.product',
        populate: { path: 'category' }
    });

    if (!cart || cart.items.length === 0) {
        res.status(400);
        throw new Error('Your cart is empty');
    }

    // 2. Find and snapshot address
    const address = await Address.findById(addressId);
    if (!address || address.user.toString() !== req.user._id.toString()) {
        res.status(404);
        throw new Error('Shipping address not found or invalid');
    }

    // 3. Fetch active auto-apply offer (to match getCart logic)
    const now = new Date();
    const applicableOffer = await Offer.findOne({
        isActive: true,
        autoApply: true,
        $and: [
            { $or: [{ startDate: { $exists: false } }, { startDate: null }, { startDate: { $lte: now } }] },
            { $or: [{ endDate: { $exists: false } }, { endDate: null }, { endDate: { $gte: now } }] }
        ]
    }).sort({ createdAt: -1 });

    // 4. Fetch applied coupon details if any
    let coupon = null;
    if (cart.appliedCoupon && cart.appliedCoupon.code) {
        coupon = await Coupon.findOne({ code: cart.appliedCoupon.code, isActive: true });

        // Double check per-user restriction before ordering
        if (coupon && coupon.usersUsed && coupon.usersUsed.includes(req.user._id.toString())) {
            res.status(400);
            throw new Error('You have already used this coupon');
        }
    }

    // 5. Calculate breakdown using Pricing Engine
    const breakdown = calculatePriceBreakdown(cart.items, coupon, applicableOffer);
    const { orderItems, summary } = breakdown;

    // 6. Create Order & Process Wallet Payment
    const session = await mongoose.startSession();
    const useTransaction = mongoose.connection.transactionSupport;

    if (useTransaction) {
        await session.startTransaction();
    }

    const sessionOption = useTransaction ? { session } : {};

    let order;
    try {
        const paymentMethodLower = (paymentMethod || 'cod').toLowerCase();

        order = new Order({
            user: req.user._id,
            items: orderItems.map(item => ({
                product: item.product,
                name: item.name,
                price: item.price, // Final unit price after offer
                quantity: item.quantity,
                image: item.image,
                variant: item.variant
            })),
            shippingAddress: {
                fullName: address.fullName,
                phone: address.phone,
                pincode: address.pincode,
                state: address.state,
                city: address.city,
                street: address.street,
                landmark: address.landmark
            },
            paymentMethod: paymentMethodLower,
            subtotal: summary.subtotal,
            shipping: summary.shipping,
            tax: summary.tax,
            total: summary.total,
            offerDiscount: summary.offerDiscountTotal,
            coupon: {
                code: coupon ? coupon.code : undefined,
                discount: summary.couponDiscount
            },
            status: 'pending'
        });

        // Use Wallet Logic
        if (paymentMethodLower === 'wallet') {
            let wallet = await Wallet.findOne({ user: req.user._id }).session(useTransaction ? session : null);

            // Auto-create wallet if missing (safety)
            if (!wallet) {
                wallet = await Wallet.create([{ user: req.user._id, balance: 0 }], sessionOption);
                wallet = Array.isArray(wallet) ? wallet[0] : wallet;
            }

            if (wallet.balance < summary.total) {
                throw new Error(`Insufficient wallet balance. Available: ₹${wallet.balance}`);
            }

            // Deduct funds
            wallet.balance -= summary.total;
            wallet.transactionHistory.push({
                type: 'debit',
                amount: summary.total,
                description: `Payment for Order #${order._id.toString().substring(order._id.length - 8).toUpperCase()}`,
                relatedOrder: order._id
            });

            await wallet.save(sessionOption);

            // Mark order as paid
            order.isPaid = true;
            order.paidAt = Date.now();
            order.paymentStatus = 'paid';
            order.status = 'confirmed';
            order.statusHistory.push({
                status: 'confirmed',
                updatedBy: req.user._id,
                comment: 'Order automatically confirmed via wallet payment.'
            });
        }

        // 6. Atomic Stock Decrement
        for (const item of orderItems) {
            const result = await Product.updateOne(
                { _id: item.product, stock: { $gte: item.quantity } },
                { $inc: { stock: -item.quantity } },
                sessionOption
            );

            if (result.matchedCount === 0) {
                throw new Error(`Insufficient stock for product: ${item.name}`);
            }
        }

        await order.save(sessionOption);

        // Update coupon usage if applicable
        if (coupon) {
            await Coupon.updateOne(
                { _id: coupon._id },
                {
                    $inc: { usedCount: 1 },
                    $addToSet: { usersUsed: req.user._id }
                },
                sessionOption
            );
        }

        // 7. Clear user cart
        cart.items = [];
        await cart.save(sessionOption);

        if (useTransaction) {
            await session.commitTransaction();
        }
        session.endSession();

        res.status(201).json({
            success: true,
            data: order
        });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        res.status(400);
        throw error;
    }
});

// @desc    Get logged-in user's orders
// @route   GET /api/orders/my
// @access  Private
const getMyOrders = asyncHandler(async (req, res) => {
    const orders = await Order.find({ user: req.user._id })
        .sort({ createdAt: -1 });

    res.status(200).json({
        success: true,
        count: orders.length,
        data: orders
    });
});

// @desc    Get order by ID (Supports Full ObjectId or Short ID suffix)
// @route   GET /api/orders/:id
// @access  Private (owner only)
const getOrderById = asyncHandler(async (req, res) => {
    let { id } = req.params;
    const userId = req.user._id;

    let order;

    if (mongoose.Types.ObjectId.isValid(id)) {
        // Direct lookup if valid ObjectId
        order = await Order.findOne({ _id: id, user: userId }).populate('items.product');
    } else {
        // Fallback: Search by "Short ID" (suffix)
        // 1. Clean the ID (remove 'MV-' prefix if present, trim whitespace)
        const searchId = id.replace(/^MV-?/i, '').trim().toUpperCase();

        // 2. Fetch user's orders (Sorted by Newest First)
        // We only fetch _id to filter in memory first
        const userOrders = await Order.find({ user: userId })
            .select('_id')
            .sort({ createdAt: -1 });

        // 3. Find match
        const match = userOrders.find(o => {
            const shortParams = o._id.toString().toUpperCase();
            return shortParams.endsWith(searchId);
        });

        if (match) {
            order = await Order.findOne({ _id: match._id }).populate('items.product');
        }
    }

    if (!order) {
        res.status(404);
        throw new Error('Order not found');
    }

    res.json({
        success: true,
        data: order
    });
});

// @desc    Set/Update payment method for an order
// @route   PATCH /api/orders/:id/method
// @access  Private (owner only)
const setPaymentMethod = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user._id;
    const { paymentMethod } = req.body;

    const allowed = ['cod', 'razorpay', 'wallet', 'mock_razorpay', 'mock_wallet'];
    if (!allowed.includes(paymentMethod)) {
        res.status(400);
        throw new Error('Invalid payment method');
    }

    const order = await Order.findOne({ _id: id, user: userId });

    if (!order) {
        res.status(404);
        throw new Error('Order not found');
    }

    order.paymentMethod = paymentMethod;

    // If COD, mark as unpaid and pending
    if (paymentMethod === 'cod') {
        order.isPaid = false;
        order.status = 'pending';
    }

    await order.save();

    res.json({
        success: true,
        data: order
    });
});

// @desc    Request a return (sets status to return_requested)
// @route   POST /api/orders/:id/return
// @access  Private (owner only)
const processReturn = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason || !reason.trim()) {
        res.status(400);
        throw new Error('Please provide a reason for the return request');
    }

    const order = await Order.findOne({ _id: id, user: req.user._id });

    if (!order) {
        res.status(404);
        throw new Error('Order not found');
    }

    if (order.status !== 'delivered') {
        res.status(400);
        throw new Error('Only delivered orders can be returned');
    }

    if (order.status === 'return_requested') {
        res.status(400);
        throw new Error('A return request is already pending for this order');
    }

    order.status = 'return_requested';
    order.returnReason = reason.trim();
    order.returnRequestedAt = new Date();
    order.statusHistory.push({
        status: 'return_requested',
        updatedBy: req.user._id,
        comment: `Return requested by user. Reason: ${reason.trim()}`
    });

    await order.save();

    res.json({
        success: true,
        message: 'Return request submitted. You will be notified once it is reviewed.',
        data: order
    });
});



// @desc    Mark order as paid
// @route   PATCH /api/orders/:id/pay
// @access  Private (owner only)
const payOrder = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { paymentMethod, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const userId = req.user._id;

    const session = await mongoose.startSession();
    const useTransaction = mongoose.connection.transactionSupport;

    if (useTransaction) {
        await session.startTransaction();
    }

    const sessionOption = useTransaction ? { session } : {};

    try {
        const order = await Order.findOne({ _id: id, user: userId }).session(useTransaction ? session : null);

        if (!order) {
            res.status(404);
            throw new Error('Order not found');
        }

        // Normalize payment method
        const normalizedMethod = (paymentMethod || order.paymentMethod || 'razorpay').toLowerCase();

        // 1. If paying via Wallet, deduct balance
        if (normalizedMethod === 'wallet') {
            let wallet = await Wallet.findOne({ user: userId }).session(useTransaction ? session : null);

            if (!wallet) {
                // Should not happen if balance was checked on frontend, but for safety:
                wallet = await Wallet.create([{ user: userId, balance: 0 }], sessionOption);
                wallet = Array.isArray(wallet) ? wallet[0] : wallet;
            }

            if (wallet.balance < order.total) {
                throw new Error(`Insufficient wallet balance. Available: ₹${wallet.balance}`);
            }

            // Deduct funds
            wallet.balance -= order.total;
            wallet.transactionHistory.push({
                type: 'debit',
                amount: order.total,
                description: `Payment for Order #${order._id.toString().slice(-8).toUpperCase()}`,
                relatedOrder: order._id,
                createdAt: new Date()
            });

            await wallet.save(sessionOption);
        }

        // 2. Mark Order as Paid (Prepaid only)
        if (normalizedMethod !== 'cod') {
            order.isPaid = true;
            order.paidAt = new Date();
            order.paymentStatus = 'paid';
        } else {
            // COD: Keep unpaid but confirmed
            order.isPaid = false;
            order.paymentStatus = 'pending';
        }
        order.paymentMethod = normalizedMethod;

        if (razorpay_order_id) order.razorpay_order_id = razorpay_order_id;
        if (razorpay_payment_id) order.razorpay_payment_id = razorpay_payment_id;
        if (razorpay_signature) order.razorpay_signature = razorpay_signature;

        order.status = 'confirmed';

        order.statusHistory.push({
            status: 'confirmed',
            updatedBy: userId,
            comment: `Payment marked as paid via ${normalizedMethod}. Order confirmed.`
        });

        await order.save(sessionOption);

        // 3. Clear Cart upon successful payment/confirmation
        const Cart = require('../models/Cart.model');
        const cart = await Cart.findOne({ user: userId }).session(useTransaction ? session : null);
        if (cart) {
            cart.items = [];
            cart.appliedCoupon = undefined;
            await cart.save(sessionOption);
        }

        // 4. Update Coupon usedCount and usersUsed
        if (order.coupon && order.coupon.code) {
            const Coupon = require('../models/Coupon.model');
            await Coupon.findOneAndUpdate(
                { code: order.coupon.code },
                {
                    $inc: { usedCount: 1 },
                    $addToSet: { usersUsed: userId }
                },
                { session: useTransaction ? session : null }
            );
        }

        if (useTransaction) {
            await session.commitTransaction();
        }
        session.endSession();

        res.json({
            success: true,
            message: normalizedMethod === 'wallet' ? 'Order paid via wallet successfully' : 'Order marked as paid',
            data: order
        });

    } catch (error) {
        if (useTransaction) {
            await session.abortTransaction();
        }
        session.endSession();
        res.status(400);
        throw error;
    }
});

// @desc    Cancel order and refund to wallet if paid
// @route   PATCH /api/orders/:id/cancel
// @access  Private (owner only)
const cancelOrder = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user._id;

    const session = await mongoose.startSession();
    const useTransaction = mongoose.connection.transactionSupport;

    if (useTransaction) {
        await session.startTransaction();
    }

    const sessionOption = useTransaction ? { session } : {};

    try {
        const order = await Order.findOne({ _id: id, user: userId }).session(useTransaction ? session : null);

        if (!order) {
            res.status(404);
            throw new Error('Order not found');
        }

        // 1. Idempotency: If already cancelled, return success
        if (order.status === 'cancelled') {
            return res.status(200).json({
                success: true,
                message: 'Order already cancelled',
                orderStatus: order.status,
                paymentStatus: order.paymentStatus,
                order
            });
        }

        // 2. Allow cancel only if NOT shipped or delivered
        const nonCancellable = ['shipped', 'delivered'];
        if (nonCancellable.includes(order.status)) {
            res.status(400);
            throw new Error(`Order cannot be cancelled as it is already ${order.status}`);
        }

        let refundedAmount = 0;
        let walletBalance = 0;

        // 3. Refund Logic if Paid (AND NOT COD)
        if ((order.paymentStatus === 'paid' || order.isPaid === true) && order.paymentMethod !== 'cod') {
            let wallet = await Wallet.findOne({ user: userId }).session(useTransaction ? session : null);

            // If wallet doesn't exist, create it
            if (!wallet) {
                wallet = await Wallet.create([{ user: userId, balance: 0, transactionHistory: [] }], sessionOption);
                wallet = Array.isArray(wallet) ? wallet[0] : wallet;
            }

            // Ensure transactionHistory is an array
            if (!Array.isArray(wallet.transactionHistory)) {
                wallet.transactionHistory = [];
            }

            // Deep Idempotency: Check if refund transaction already exists for this order
            const alreadyRefunded = wallet.transactionHistory.some(
                t => String(t.relatedOrder) === String(order._id) && t.type === 'refund'
            );

            if (!alreadyRefunded) {
                refundedAmount = order.total;
                wallet.balance += refundedAmount;
                wallet.transactionHistory.push({
                    type: 'refund',
                    amount: refundedAmount,
                    description: `Refund for cancelled Order #${order._id.toString().slice(-8).toUpperCase()}`,
                    relatedOrder: order._id,
                    createdAt: new Date()
                });

                await wallet.save(sessionOption);
                order.paymentStatus = 'refunded_to_wallet';
            }
            walletBalance = wallet.balance;
        }

        // 4. Restore Stock
        for (const item of order.items) {
            await Product.findByIdAndUpdate(
                item.product,
                { $inc: { stock: item.quantity } },
                sessionOption
            );
        }

        // 5. Update Order Status
        order.status = 'cancelled';
        order.statusHistory.push({
            status: 'cancelled',
            comment: order.paymentStatus === 'refunded_to_wallet'
                ? 'Order cancelled and refunded'
                : 'Order cancelled by user'
        });

        await order.save(sessionOption);

        if (useTransaction) {
            await session.commitTransaction();
        }
        session.endSession();

        res.status(200).json({
            success: true,
            refundedAmount,
            walletBalance,
            order
        });

    } catch (error) {
        if (useTransaction) {
            await session.abortTransaction();
        }
        session.endSession();
        res.status(res.statusCode === 200 ? 500 : res.statusCode);
        throw error;
    }
});

module.exports = {
    createOrder,
    getMyOrders,
    getOrderById,
    setPaymentMethod,
    payOrder,
    processReturn,
    cancelOrder
};
