const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const { getWalletBalance, getTransactions, topUpWallet } = require('../controllers/user.wallet.controller');

// GET /api/wallet/balance
router.get('/balance', protect, getWalletBalance);

// GET /api/wallet/transactions
router.get('/transactions', protect, getTransactions);

// POST /api/wallet/top-up
router.post('/top-up', protect, topUpWallet);

module.exports = router;
