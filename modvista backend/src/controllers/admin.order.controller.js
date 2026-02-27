const Order = require('../models/Order.model');
const Wallet = require('../models/Wallet.model');
const Product = require('../models/Product.model');
const asyncHandler = require('../utils/asyncHandler');
const QueryFeatures = require('../utils/QueryFeatures');
const mongoose = require('mongoose');

// @desc    Get all orders
// @route   GET /api/admin/orders
// @access  Private/Admin
const getAllOrders = asyncHandler(async (req, res) => {
    const features = new QueryFeatures(Order.find().populate('user', 'name email phone'), req.query)
        .filter()
        .search(['status', 'paymentMethod', 'razorpay_order_id'])
        .sort()
        .limitFields()
        .paginate();

    const orders = await features.query;
    const total = await Order.countDocuments(features.query.getFilter());

    res.json({
        success: true,
        count: orders.length,
        total,
        data: orders
    });
});

// @desc    Get order by ID
// @route   GET /api/admin/orders/:id
// @access  Private/Admin
const getOrderByIdAdmin = asyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id)
        .populate('user', 'name email phone')
        .populate('items.product');

    if (!order) {
        res.status(404);
        throw new Error('Order not found');
    }

    res.json({
        success: true,
        data: order
    });
});

// @desc    Update order status
// @route   PATCH /api/admin/orders/:id/status
// @access  Private/Admin
const updateOrderStatus = asyncHandler(async (req, res) => {
    const { status, comment } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
        res.status(404);
        throw new Error('Order not found');
    }

    const currentStatus = order.status;
    if (!Order.isValidTransition(currentStatus, status)) {
        res.status(400);
        throw new Error(`Invalid transition from ${currentStatus} to ${status}`);
    }

    order.status = status;
    order.statusHistory.push({
        status,
        updatedBy: req.user._id,
        comment: comment || `Status updated to ${status}`
    });

    const updatedOrder = await order.save();

    res.json({
        success: true,
        message: `Order marked as ${status}`,
        data: updatedOrder
    });
});

// @desc    Approve a return request — refund to wallet and restock
// @route   PATCH /api/admin/orders/:id/return/approve
// @access  Private/Admin
const approveReturn = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const session = await mongoose.startSession();
    const useTransaction = mongoose.connection.transactionSupport;
    if (useTransaction) await session.startTransaction();
    const sessionOption = useTransaction ? { session } : {};

    try {
        const order = await Order.findById(id).session(useTransaction ? session : null);

        if (!order) {
            res.status(404); throw new Error('Order not found');
        }
        if (order.status !== 'return_requested') {
            res.status(400); throw new Error('No pending return request on this order');
        }

        // 1. Refund to wallet
        let wallet = await Wallet.findOne({ user: order.user }).session(useTransaction ? session : null);
        if (!wallet) {
            wallet = await Wallet.create([{ user: order.user, balance: 0 }], sessionOption);
            wallet = Array.isArray(wallet) ? wallet[0] : wallet;
        }

        const refundAmount = order.total;
        wallet.balance += refundAmount;
        wallet.transactionHistory.push({
            type: 'refund',
            amount: refundAmount,
            description: `Refund for returned Order #${order._id.toString().slice(-8).toUpperCase()}`,
            relatedOrder: order._id,
            createdAt: new Date()
        });
        await wallet.save(sessionOption);

        // 2. Restock products
        for (const item of order.items) {
            await Product.findByIdAndUpdate(
                item.product,
                { $inc: { stock: item.quantity } },
                sessionOption
            );
        }

        // 3. Update order
        order.status = 'returned';
        order.paymentStatus = 'refunded_to_wallet';
        order.statusHistory.push({
            status: 'returned',
            updatedBy: req.user._id,
            comment: `Return approved by admin. ₹${refundAmount} refunded to wallet.`
        });
        await order.save(sessionOption);

        if (useTransaction) await session.commitTransaction();
        session.endSession();

        res.json({
            success: true,
            message: `Return approved. ₹${refundAmount} refunded to user's wallet.`,
            data: order
        });
    } catch (error) {
        if (useTransaction) await session.abortTransaction();
        session.endSession();
        res.status(400);
        throw error;
    }
});

// @desc    Reject a return request — revert to delivered
// @route   PATCH /api/admin/orders/:id/return/reject
// @access  Private/Admin
const rejectReturn = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;

    const order = await Order.findById(id);

    if (!order) {
        res.status(404);
        throw new Error('Order not found');
    }
    if (order.status !== 'return_requested') {
        res.status(400);
        throw new Error('No pending return request on this order');
    }

    order.status = 'delivered';
    order.statusHistory.push({
        status: 'delivered',
        updatedBy: req.user._id,
        comment: `Return request rejected. Reason: ${reason || 'Not specified'}`
    });

    await order.save();

    res.json({
        success: true,
        message: 'Return request rejected. Order reverted to delivered.',
        data: order
    });
});

// @desc    Fix existing "Paid" but "Pending" orders (Migration)
// @route   POST /api/admin/orders/migrate-statuses
// @access  Private/Admin
const migrateOrderStatuses = asyncHandler(async (req, res) => {
    const result = await Order.updateMany(
        {
            paymentStatus: 'paid',
            status: 'pending'
        },
        {
            $set: { status: 'confirmed' },
            $push: {
                statusHistory: {
                    status: 'confirmed',
                    updatedBy: req.user._id,
                    comment: 'System Migration: Auto-confirmed Paid orders.'
                }
            }
        }
    );

    res.json({
        success: true,
        message: `Migration successful. Updated ${result.modifiedCount} orders.`,
        data: result
    });
});

// @desc    Delete an order
// @route   DELETE /api/admin/orders/:id
// @access  Private/Admin
const deleteOrder = asyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id);

    if (!order) {
        res.status(404);
        throw new Error('Order not found');
    }

    await order.deleteOne();

    res.json({
        success: true,
        message: 'Order removed successfully'
    });
});

module.exports = {
    getAllOrders,
    getOrderByIdAdmin,
    updateOrderStatus,
    approveReturn,
    rejectReturn,
    migrateOrderStatuses,
    deleteOrder
};
