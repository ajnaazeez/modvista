const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    offerActive: {
        type: Boolean,
        default: false
    },
    salePrice: {
        type: Number,
        default: null
    },
    offerStart: {
        type: Date,
        default: null
    },
    offerEnd: {
        type: Date,
        default: null
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        default: null
    },
    images: [String],
    stock: {
        type: Number,
        required: true,
        default: 0
    },
    rating: {
        type: Number,
        default: 0
    },
    numReviews: {
        type: Number,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Product', productSchema);
