const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
    code: {
        type: String,
        required: [true, 'Please add a coupon code'],
        unique: true,
        trim: true,
        uppercase: true
    },
    title: {
        type: String,
        default: ''
    },
    description: {
        type: String,
        default: ''
    },
    discountType: {
        type: String,
        required: [true, 'Please add a discount type'],
        enum: ['PERCENT', 'FLAT']
    },
    discountValue: {
        type: Number,
        required: [true, 'Please add a discount value'],
        min: [0, 'Discount value cannot be negative']
    },
    maxDiscount: {
        type: Number,
        min: [0, 'Maximum discount cannot be negative']
    },
    minOrderAmount: {
        type: Number,
        default: 0,
        min: [0, 'Minimum order amount cannot be negative']
    },
    minProductPrice: {
        type: Number,
        default: 0,
        min: [0, 'Minimum product price cannot be negative']
    },
    usageLimit: {
        type: Number,
        min: [1, 'Usage limit must be at least 1']
    },
    usedCount: {
        type: Number,
        default: 0
    },
    startDate: {
        type: Date,
        required: [true, 'Please add a start date']
    },
    endDate: {
        type: Date,
        required: [true, 'Please add an end date']
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Ensure code is stored uppercase via pre-save hook
couponSchema.pre('save', function () {
    if (this.code) {
        this.code = this.code.toUpperCase().trim();
    }
});

module.exports = mongoose.model('Coupon', couponSchema);
