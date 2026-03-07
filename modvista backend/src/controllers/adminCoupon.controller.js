const Coupon = require('../models/Coupon.model');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @desc    Get all coupons with pagination, search, and status filtering
 * @route   GET /api/admin/coupons
 * @access  Private/Admin
 */
exports.getCoupons = asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const query = {};

    // Search by code or title
    if (req.query.search) {
        query.$or = [
            { code: { $regex: req.query.search, $options: 'i' } },
            { title: { $regex: req.query.search, $options: 'i' } }
        ];
    }

    // Filter by status
    if (req.query.status) {
        query.isActive = req.query.status === 'active';
    }

    const total = await Coupon.countDocuments(query);
    const coupons = await Coupon.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

    const now = new Date();
    const data = coupons.map(coupon => {
        const couponObj = coupon.toObject();
        if (!coupon.isActive) {
            couponObj.status = 'inactive';
        } else if (coupon.endDate && new Date(coupon.endDate) < now) {
            couponObj.status = 'expired';
        } else {
            couponObj.status = 'active';
        }
        return couponObj;
    });

    res.status(200).json({
        success: true,
        count: coupons.length,
        pagination: {
            total,
            page,
            pages: Math.ceil(total / limit)
        },
        data: data
    });
});

/**
 * @desc    Get single coupon by ID
 * @route   GET /api/admin/coupons/:id
 * @access  Private/Admin
 */
exports.getCouponById = asyncHandler(async (req, res) => {
    const coupon = await Coupon.findById(req.params.id);

    if (!coupon) {
        return res.status(404).json({
            success: false,
            message: 'Coupon not found'
        });
    }

    res.status(200).json({
        success: true,
        data: coupon
    });
});

/**
 * @desc    Create new coupon
 * @route   POST /api/admin/coupons
 * @access  Private/Admin
 */
exports.createCoupon = asyncHandler(async (req, res) => {
    // Check if coupon code already exists
    const existingCoupon = await Coupon.findOne({ code: req.body.code.toUpperCase() });
    if (existingCoupon) {
        return res.status(409).json({
            success: false,
            message: 'Coupon code already exists'
        });
    }

    const coupon = await Coupon.create(req.body);

    res.status(201).json({
        success: true,
        data: coupon
    });
});

/**
 * @desc    Update coupon
 * @route   PUT /api/admin/coupons/:id
 * @access  Private/Admin
 */
exports.updateCoupon = asyncHandler(async (req, res) => {
    let coupon = await Coupon.findById(req.params.id);

    if (!coupon) {
        return res.status(404).json({
            success: false,
            message: 'Coupon not found'
        });
    }

    // Check if new code already exists for another coupon
    if (req.body.code && req.body.code.toUpperCase() !== coupon.code) {
        const existing = await Coupon.findOne({ code: req.body.code.toUpperCase() });
        if (existing) {
            return res.status(409).json({
                success: false,
                message: 'Coupon code already exists'
            });
        }
    }

    coupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true
    });

    res.json({
        success: true,
        data: coupon
    });
});

/**
 * @desc    Toggle coupon status
 * @route   PATCH /api/admin/coupons/:id/toggle
 * @access  Private/Admin
 */
exports.toggleCoupon = asyncHandler(async (req, res) => {
    const coupon = await Coupon.findById(req.params.id);

    if (!coupon) {
        return res.status(404).json({
            success: false,
            message: 'Coupon not found'
        });
    }

    coupon.isActive = !coupon.isActive;
    await coupon.save();

    res.status(200).json({
        success: true,
        data: coupon
    });
});

/**
 * @desc    Delete coupon
 * @route   DELETE /api/admin/coupons/:id
 * @access  Private/Admin
 */
exports.deleteCoupon = asyncHandler(async (req, res) => {
    const coupon = await Coupon.findById(req.params.id);

    if (!coupon) {
        return res.status(404).json({
            success: false,
            message: 'Coupon not found'
        });
    }

    await coupon.deleteOne();

    res.status(200).json({
        success: true,
        message: 'Coupon deleted successfully'
    });
});
