const asyncHandler = require('../utils/asyncHandler');
const Order = require('../models/Order.model');
const Cart = require('../models/Cart.model');
const Address = require('../models/Address.model');
const User = require('../models/User.model');
const Wallet = require('../models/Wallet.model');

// @desc    Place a new order
// @route   POST /api/checkout
// @access  Private
const { calculatePriceBreakdown } = require('../utils/pricingEngine');
const Coupon = require('../models/Coupon.model');
const Product = require('../models/Product.model');
const mongoose = require('mongoose');

// @desc    Place a new order
// @route   POST /api/checkout
// @access  Private
const placeOrder = asyncHandler(async (req, res) => {
    const { addressId, contactPhone, paymentMethod } = req.body;

    if (!addressId) {
        res.status(400);
        throw new Error('Please select an address');
    }

    // 1. Get User Contact Info
    const user = await User.findById(req.user._id).select('email phone');
    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }

    // 2. Get Cart and validate items
    const cart = await Cart.findOne({ user: req.user._id }).populate('items.product');

    if (!cart || cart.items.length === 0) {
        res.status(400);
        throw new Error('Your cart is empty');
    }

    // 3. Stock Verification (Step 1: Before transaction)
    for (const item of cart.items) {
        if (!item.product) {
            res.status(400);
            throw new Error(`Product in your cart is no longer available`);
        }
        if (item.product.stock < item.quantity) {
            res.status(400);
            throw new Error(`Insufficient stock for ${item.product.name}. Available: ${item.product.stock}`);
        }
    }

    // 4. Validate Address
    const address = await Address.findOne({ _id: addressId, user: req.user._id });
    if (!address) {
        res.status(400);
        throw new Error('Invalid address selected');
    }

    // 5. Coupon Logic
    let coupon = null;
    if (cart.appliedCoupon && cart.appliedCoupon.code) {
        coupon = await Coupon.findOne({ code: cart.appliedCoupon.code, isActive: true });
        // Re-validate coupon expiry and minOrder
        const now = new Date();
        if (coupon && coupon.expiry && new Date(coupon.expiry) < now) {
            coupon = null; // Expired
        }
    }

    // 5.1 Fetch applicable Product Offers (auto-apply logic)
    const now = new Date();
    const Offer = require('../models/Offer.model'); // Ensure model is available
    const applicableOffer = await Offer.findOne({
        isActive: true,
        autoApply: true,
        $and: [
            { $or: [{ startDate: { $exists: false } }, { startDate: null }, { startDate: { $lte: now } }] },
            { $or: [{ endDate: { $exists: false } }, { endDate: null }, { endDate: { $gte: now } }] }
        ]
    }).sort({ createdAt: -1 });

    // 6. Pricing Breakdown
    const { orderItems, summary } = calculatePriceBreakdown(cart.items, coupon, applicableOffer);

    // 7. Execute Checkout
    const session = await mongoose.startSession();
    const useTransaction = mongoose.connection.transactionSupport;

    if (useTransaction) {
        await session.startTransaction();
    }

    const sessionOption = useTransaction ? { session } : {};

    try {
        // --- NEW: Atomic Handling of stale pending orders ---
        // Find if this user already has an unfinished "pending" order
        const existingPendingOrders = await Order.find({
            user: req.user._id,
            status: 'pending',
            isPaid: false
        }).session(useTransaction ? session : null);

        for (const oldOrder of existingPendingOrders) {
            // Restore stock for the items in the abandoned order
            for (const item of oldOrder.items) {
                await Product.findByIdAndUpdate(
                    item.product,
                    { $inc: { stock: item.quantity } },
                    { session: useTransaction ? session : null }
                );
            }
            // Cancel the abandoned order
            oldOrder.status = 'cancelled';
            oldOrder.paymentStatus = 'failed';
            oldOrder.statusHistory.push({
                status: 'cancelled',
                comment: 'Implicitly cancelled by new checkout initiation'
            });
            await oldOrder.save(sessionOption);
        }

        // Re-verify stock inside transaction to prevent race conditions
        for (const item of cart.items) {
            const product = await Product.findById(item.product._id).session(useTransaction ? session : null);
            if (!product || product.stock < item.quantity) {
                throw new Error(`Stock changed for ${item.product.name || 'a product'}. Please refresh your cart.`);
            }
            // Atomic decrement
            product.stock -= item.quantity;
            await product.save(sessionOption);
        }

        // Determine initial statuses
        const isWallet = (paymentMethod === 'wallet' || paymentMethod === 'mock_wallet');
        const isPaid = isWallet || (paymentMethod === 'mock_razorpay');

        // --- Wallet Payment Processing ---
        if (isWallet) {
            let wallet = await Wallet.findOne({ user: req.user._id }).session(useTransaction ? session : null);
            if (!wallet || wallet.balance < summary.total) {
                throw new Error('Insufficient wallet balance');
            }
            wallet.balance -= summary.total;
            wallet.transactionHistory.push({
                type: 'debit',
                amount: summary.total,
                description: `Order Payment for #${summary.total}`, // Rough desc, short ID not generated yet
                createdAt: new Date()
            });
            await wallet.save(sessionOption);
        }

        const orderResult = await Order.create([{
            user: req.user._id,
            items: orderItems,
            shippingAddress: {
                fullName: address.fullName,
                phone: address.phone,
                pincode: address.pincode,
                state: address.state,
                city: address.city,
                street: address.street,
                landmark: address.landmark
            },
            contact: {
                email: user.email,
                phone: contactPhone || user.phone
            },
            paymentMethod: paymentMethod || 'cod',
            paymentStatus: isPaid ? 'paid' : 'pending',
            subtotal: summary.subtotal,
            tax: summary.tax,
            shipping: summary.shipping,
            total: summary.total,
            offerDiscount: summary.offerDiscountTotal || 0,
            status: isPaid ? 'confirmed' : 'pending',
            isPaid,
            paidAt: isPaid ? Date.now() : undefined,
            coupon: coupon ? { code: coupon.code, discount: summary.couponDiscount } : undefined,
            statusHistory: [{
                status: isPaid ? 'confirmed' : 'pending',
                updatedBy: req.user._id,
                comment: isPaid ? `Order confirmed via ${paymentMethod} payment.` : 'Order initiated. Waiting for final confirmation/payment.'
            }]
        }], sessionOption);

        const order = Array.isArray(orderResult) ? orderResult[0] : orderResult;

        // NOTE: We DO NOT clear the cart items here anymore.
        // Cart will be cleared in the 'payOrder' controller upon final confirmation.

        if (useTransaction) {
            await session.commitTransaction();
        }
        session.endSession();

        res.status(201).json({
            success: true,
            orderId: order._id,
            total: summary.total,
            message: 'Order placed successfully'
        });

    } catch (error) {
        if (useTransaction) {
            await session.abortTransaction();
        }
        session.endSession();
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = {
    placeOrder
};
