const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please add an offer name'],
        trim: true
    },
    bannerImage: {
        type: String,
        required: false
    },
    type: {
        type: String,
        required: [true, 'Please add an offer type'],
        enum: ['PERCENT', 'FLAT']
    },
    value: {
        type: Number,
        required: [true, 'Please add a discount value'],
        min: [0, 'Discount value cannot be negative'],
        validate: {
            validator: function (val) {
                if (this.type === 'PERCENT' && val > 70) return false;
                return true;
            },
            message: 'Percentage offer cannot exceed 70%'
        }
    },
    applicable: {
        type: String,
        enum: ['all', 'exterior', 'interior', 'performance'],
        default: 'all'
    },
    startDate: {
        type: Date,
        required: [true, 'Please add a start date']
    },
    endDate: {
        type: Date,
        required: [true, 'Please add an end date'],
        validate: {
            validator: function (val) {
                return !this.startDate || val >= this.startDate;
            },
            message: 'Start date cannot be after end date'
        }
    },
    autoApply: {
        type: Boolean,
        default: true
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Offer', offerSchema);
