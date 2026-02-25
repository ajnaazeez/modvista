const express = require('express');
const router = express.Router();
const { getWishlist, addToWishlist, removeFromWishlist } = require('../controllers/wishlist.controller');
const { protect } = require('../middleware/auth.middleware');
const asyncHandler = require('../utils/asyncHandler');

router.route('/').get(protect, asyncHandler(getWishlist));
router.route('/:productId')
    .post(protect, asyncHandler(addToWishlist))
    .delete(protect, asyncHandler(removeFromWishlist));

module.exports = router;
