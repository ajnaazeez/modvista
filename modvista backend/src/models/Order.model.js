const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    items: [{
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        name: {
            type: String,
            required: true
        },
        price: {
            type: Number,
            required: true
        },
        quantity: {
            type: Number,
            required: true
        },
        image: {
            type: String,
            required: true
        },
        variant: {
            type: String,
            default: "Standard"
        }
    }],
    shippingAddress: {
        fullName: String,
        phone: String,
        pincode: String,
        state: String,
        city: String,
        street: String,
        landmark: String
    },
    contact: {
        email: String,
        phone: String
    },
    paymentMethod: {
        type: String,
        enum: ["razorpay", "cod", "wallet", "mock_razorpay", "mock_wallet", "COD", "Razorpay", "Wallet"],
        default: "cod",
        set: v => v.toLowerCase()
    },
    paymentStatus: {
        type: String,
        enum: ["pending", "paid", "failed", "refunded_to_wallet"],
        default: "pending"
    },
    subtotal: {
        type: Number,
        required: true
    },
    shipping: {
        type: Number,
        default: 0
    },
    tax: {
        type: Number,
        default: 0
    },
    total: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        default: "pending",
        enum: ["pending", "confirmed", "shipped", "out_for_delivery", "delivered", "cancelled", "return_requested", "returned"]
    },
    returnReason: {
        type: String,
        default: null
    },
    returnRequestedAt: {
        type: Date,
        default: null
    },
    isPaid: {
        type: Boolean,
        default: false
    },
    paidAt: {
        type: Date
    },
    statusHistory: [{
        status: String,
        timestamp: {
            type: Date,
            default: Date.now
        },
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        comment: String
    }],
    coupon: {
        code: String,
        discount: {
            type: Number,
            default: 0
        }
    },
    offerDiscount: {
        type: Number,
        default: 0
    },
    razorpay_order_id: String,
    razorpay_payment_id: String,
    razorpay_signature: String
}, {
    timestamps: true
});

module.exports = mongoose.model('Order', orderSchema);
