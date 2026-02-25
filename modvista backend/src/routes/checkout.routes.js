const express = require('express');
const router = express.Router();
const { placeOrder } = require('../controllers/checkout.controller');
const { protect } = require('../middleware/auth.middleware');

router.post('/', protect, placeOrder);

module.exports = router;
