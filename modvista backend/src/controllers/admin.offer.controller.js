const Offer = require('../models/Offer.model');
const asyncHandler = require('../utils/asyncHandler');
const QueryFeatures = require('../utils/QueryFeatures');

// @desc    Get all offers (Admin)
// @route   GET /api/admin/offers
// @access  Private/Admin
const getOffersAdmin = asyncHandler(async (req, res) => {
    const features = new QueryFeatures(Offer.find(), req.query)
        .filter()
        .sort()
        .limitFields()
        .paginate();

    const offers = await features.query;
    const total = await Offer.countDocuments(features.query.getFilter());

    res.json({ success: true, count: offers.length, total, data: offers });
});

// @desc    Create an offer (Admin)
// @route   POST /api/admin/offers
// @access  Private/Admin
const createOfferAdmin = asyncHandler(async (req, res) => {
    const { name, type, value, startDate, endDate } = req.body;

    if (!name || !type || value === undefined) {
        res.status(400);
        throw new Error('Please provide name, type and value');
    }

    // Validation: Max 70% for PERCENT discounts
    if (type === 'PERCENT' && value > 70) {
        res.status(400);
        throw new Error('Percentage offer cannot exceed 70%');
    }

    // Validation: Date logic
    const start = new Date(startDate);
    const end = new Date(endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (start < today) {
        res.status(400);
        throw new Error('Dates must be today or later');
    }
    if (start > end) {
        res.status(400);
        throw new Error('Start date cannot be after end date');
    }

    const offer = await Offer.create(req.body);
    res.status(201).json({ success: true, data: offer });
});

// @desc    Update an offer (Admin)
// @route   PUT /api/admin/offers/:id
// @access  Private/Admin
const updateOfferAdmin = asyncHandler(async (req, res) => {
    const { type, value, startDate, endDate } = req.body;
    let offer = await Offer.findById(req.params.id);
    if (!offer) {
        res.status(404);
        throw new Error('Offer not found');
    }

    const checkType = type || offer.type;
    const checkValue = value !== undefined ? value : offer.value;

    if (checkType === 'PERCENT' && checkValue > 70) {
        res.status(400);
        throw new Error('Percentage offer cannot exceed 70%');
    }

    if (startDate || endDate) {
        const start = new Date(startDate || offer.startDate);
        const end = new Date(endDate || offer.endDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (startDate && new Date(startDate) < today) {
            res.status(400);
            throw new Error('Dates must be today or later');
        }

        if (start > end) {
            res.status(400);
            throw new Error('Start date cannot be after end date');
        }
    }

    offer = await Offer.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true
    });

    res.json({ success: true, data: offer });
});

// @desc    Toggle offer active status (Admin)
// @route   PATCH /api/admin/offers/:id/toggle
// @access  Private/Admin
const toggleOfferAdmin = asyncHandler(async (req, res) => {
    const offer = await Offer.findById(req.params.id);
    if (!offer) {
        res.status(404);
        throw new Error('Offer not found');
    }

    offer.isActive = !offer.isActive;
    await offer.save();

    res.json({
        success: true,
        message: `Offer ${offer.isActive ? 'activated' : 'deactivated'}`,
        data: offer
    });
});

// @desc    Delete an offer (Admin)
// @route   DELETE /api/admin/offers/:id
// @access  Private/Admin
const deleteOfferAdmin = asyncHandler(async (req, res) => {
    const offer = await Offer.findByIdAndDelete(req.params.id);
    if (!offer) {
        res.status(404);
        throw new Error('Offer not found');
    }

    res.json({ success: true, message: 'Offer deleted' });
});

module.exports = {
    getOffersAdmin,
    createOfferAdmin,
    updateOfferAdmin,
    toggleOfferAdmin,
    deleteOfferAdmin
};
