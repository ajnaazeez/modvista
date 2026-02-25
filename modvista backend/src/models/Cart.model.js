const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    items: [{
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        quantity: {
            type: Number,
            required: true,
            min: 1,
            default: 1
        },
        variant: {
            type: String,
            default: "Standard"
        },
        price: {
            type: Number,
            required: true
        }
    }],
    appliedCoupon: {
        code: String,
        discountAmount: {
            type: Number,
            default: 0
        },
        couponId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Coupon'
        }
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Cart', cartSchema);
