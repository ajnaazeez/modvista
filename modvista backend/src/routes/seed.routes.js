const express = require('express');
const router = express.Router();
const { seedProducts, seedOffersCoupons } = require('../controllers/seed.controller');

router.get('/products', seedProducts);
router.get('/offers-coupons', seedOffersCoupons);

module.exports = router;
