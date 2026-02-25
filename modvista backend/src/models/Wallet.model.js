const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['credit', 'debit', 'refund'],
        required: true
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    relatedOrder: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order'
    },
    reason: {
        type: String,
        default: 'normal'
    },
    refOrderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order'
    },
    description: {
        type: String,
        required: true
    }
}, {
    timestamps: true
});

const walletSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    balance: {
        type: Number,
        default: 0,
        min: 0
    },
    transactionHistory: [transactionSchema]
}, {
    timestamps: true
});

module.exports = mongoose.model('Wallet', walletSchema);
