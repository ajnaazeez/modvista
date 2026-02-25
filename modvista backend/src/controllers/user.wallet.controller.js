const Wallet = require('../models/Wallet.model');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @desc    Get user's wallet balance
 * @route   GET /api/wallet/balance
 * @access  Private
 */
const getWalletBalance = asyncHandler(async (req, res) => {
    let wallet = await Wallet.findOne({ user: req.user._id });

    // Auto-create wallet if missing
    if (!wallet) {
        wallet = await Wallet.create({ user: req.user._id, balance: 0 });
    }

    res.json({
        success: true,
        balance: wallet.balance || 0
    });
});

/**
 * @desc    Get user's wallet transactions
 * @route   GET /api/wallet/transactions
 * @access  Private
 */
const getTransactions = asyncHandler(async (req, res) => {
    const wallet = await Wallet.findOne({ user: req.user._id })
        .populate({
            path: 'transactionHistory.relatedOrder',
            select: 'total status'
        });

    if (!wallet) {
        return res.json({
            success: true,
            data: [],
            pagination: { page: 1, limit: 20, total: 0, pages: 0 }
        });
    }

    // Since it's an embedded array, we handle sorting and pagination in memory or return all
    // For now, let's reverse to show newest first and return all or a slice
    const transactions = [...wallet.transactionHistory].sort((a, b) => b.createdAt - a.createdAt);

    res.json({
        success: true,
        data: transactions,
        pagination: {
            page: 1,
            limit: transactions.length,
            total: transactions.length,
            pages: 1
        }
    });
});

/**
 * @desc    Add money to wallet (Simulated)
 * @route   POST /api/wallet/top-up
 * @access  Private
 */
const topUpWallet = asyncHandler(async (req, res) => {
    const { amount, description } = req.body;

    if (!amount || amount <= 0) {
        res.status(400);
        throw new Error('Please provide a valid amount');
    }

    let wallet = await Wallet.findOne({ user: req.user._id });
    if (!wallet) {
        wallet = new Wallet({ user: req.user._id, balance: 0 });
    }

    wallet.balance += Number(amount);
    wallet.transactionHistory.push({
        type: 'credit',
        amount: Number(amount),
        description: description || 'Wallet Top-up'
    });

    await wallet.save();

    res.json({
        success: true,
        message: 'Wallet topped up successfully',
        balance: wallet.balance,
        transaction: wallet.transactionHistory[wallet.transactionHistory.length - 1]
    });
});

module.exports = {
    getWalletBalance,
    getTransactions,
    topUpWallet
};
