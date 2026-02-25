const express = require('express');
const router = express.Router();
const {
    getCart,
    addToCart,
    updateCartItem,
    removeCartItem,
    removeCoupon
} = require('../controllers/cart.controller');
const { protect } = require('../middleware/auth.middleware');

// Note: asyncHandler is now applied directly in the controller methods
router.get('/', protect, getCart);
router.post('/', protect, addToCart);
router.put('/item/:itemId', protect, updateCartItem);
router.delete('/item/:itemId', protect, removeCartItem);
router.post('/coupon/remove', protect, removeCoupon);

module.exports = router;
