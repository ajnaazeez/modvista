const asyncHandler = require('../utils/asyncHandler');
const Offer = require('../models/Offer.model');
const Coupon = require('../models/Coupon.model');
const Cart = require('../models/Cart.model');
const { calculatePriceBreakdown } = require('../utils/pricingEngine');

// @desc    Get active and valid offers (User)
// @route   GET /api/offers
// @access  Public
const getPublicOffers = asyncHandler(async (req, res) => {
    const now = new Date();
    const offers = await Offer.find({
        isActive: true,
        $and: [
            { $or: [{ startDate: { $exists: false } }, { startDate: null }, { startDate: { $lte: now } }] },
            { $or: [{ endDate: { $exists: false } }, { endDate: null }, { endDate: { $gte: now } }] }
        ]
    }).sort({ createdAt: -1 });

    res.json({ success: true, count: offers.length, data: offers });
});

// @desc    Get coupons for user page
// @route   GET /api/coupons
// @access  Public
const getPublicCoupons = asyncHandler(async (req, res) => {
    const coupons = await Coupon.find({ isActive: true }).sort({ createdAt: -1 });
    const now = new Date();
    const userId = req.user ? req.user._id : null;

    const formattedCoupons = coupons.map(coupon => {
        const couponObj = coupon.toObject();
        couponObj.isExpired = coupon.endDate && new Date(coupon.endDate) < now;

        // Check if current user has already used this coupon
        couponObj.usedByUser = Boolean(userId && coupon.usersUsed &&
            coupon.usersUsed.some(id => id.toString() === userId.toString()));

        return couponObj;
    });

    res.json({ success: true, count: formattedCoupons.length, data: formattedCoupons });
});

// @desc    Apply coupon at checkout
// @route   POST /api/coupons/apply
// @access  Private
const applyCoupon = asyncHandler(async (req, res) => {
    let { code } = req.body;
    if (!code) {
        res.status(400);
        throw new Error('Please provide a coupon code');
    }

    const normalizedCode = code.toUpperCase().trim();
    const coupon = await Coupon.findOne({ code: normalizedCode, isActive: true });

    if (!coupon) {
        res.status(404);
        throw new Error('Invalid or inactive coupon code');
    }

    // Check expiry
    const now = new Date();
    if (coupon.endDate && new Date(coupon.endDate) < now) {
        res.status(400);
        throw new Error('Coupon has expired');
    }

    // Check usage limit
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
        res.status(400);
        throw new Error('Coupon usage limit reached');
    }

    // Check if user has already used this coupon
    if (coupon.usersUsed && coupon.usersUsed.some(id => id.toString() === req.user._id.toString())) {
        res.status(400);
        throw new Error('You have already used this coupon');
    }

    // Load Cart with populated products and categories (for offer logic)
    const cart = await Cart.findOne({ user: req.user._id }).populate({
        path: 'items.product',
        populate: { path: 'category' }
    });

    if (!cart || !cart.items || cart.items.length === 0) {
        res.status(400);
        throw new Error('Your cart is empty');
    }

    // Fetch applicable Product Offers (auto-apply logic)
    // We pick the most recent valid offer for 'all' or specific categories
    const applicableOffer = await Offer.findOne({
        isActive: true,
        autoApply: true,
        $and: [
            { $or: [{ startDate: { $exists: false } }, { startDate: null }, { startDate: { $lte: now } }] },
            { $or: [{ endDate: { $exists: false } }, { endDate: null }, { endDate: { $gte: now } }] }
        ]
    }).sort({ createdAt: -1 });

    // Use Pricing Engine
    const breakdown = calculatePriceBreakdown(cart.items, coupon, applicableOffer);

    // Validate minProductPrice
    const hasQualifyingProduct = cart.items.some(item => {
        const itemPrice = item.product?.price || item.price || 0;
        return itemPrice >= (coupon.minProductPrice || 0);
    });

    if (!hasQualifyingProduct) {
        res.status(400);
        throw new Error(`Your cart must contain at least one item priced at ₹${(coupon.minProductPrice || 0).toLocaleString()} or more to use this coupon`);
    }

    // Validate minOrder from breakdown (on discounted subtotal)
    if (breakdown.summary.discountedSubtotal < (coupon.minOrderAmount || 0)) {
        res.status(400);
        throw new Error(`Minimum order of ₹${(coupon.minOrderAmount || 0).toLocaleString()} is required for this coupon`);
    }

    // Store applied coupon in cart
    cart.appliedCoupon = {
        code: coupon.code,
        discountAmount: breakdown.summary.couponDiscount,
        couponId: coupon._id
    };
    await cart.save();

    res.json({
        success: true,
        message: 'Coupon applied successfully',
        data: {
            ...breakdown.summary,
            appliedCoupon: cart.appliedCoupon
        }
    });
});

module.exports = {
    getPublicOffers,
    getPublicCoupons,
    applyCoupon
};
