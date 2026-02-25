const Wishlist = require('../models/Wishlist.model');
const asyncHandler = require('../utils/asyncHandler');

// @desc    Get user wishlist
// @route   GET /api/wishlist
// @access  Private
const getWishlist = asyncHandler(async (req, res) => {
    const wishlist = await Wishlist.findOne({ user: req.user._id }).populate('products');
    res.json({
        success: true,
        data: wishlist ? wishlist.products : []
    });
});

// @desc    Add product to wishlist
// @route   POST /api/wishlist/:productId
// @access  Private
const addToWishlist = asyncHandler(async (req, res) => {
    const { productId } = req.params;
    let wishlist = await Wishlist.findOne({ user: req.user._id });

    if (!wishlist) {
        wishlist = await Wishlist.create({ user: req.user._id, products: [] });
    }

    if (!wishlist.products.includes(productId)) {
        wishlist.products.push(productId);
        await wishlist.save();
    }

    res.json({
        success: true,
        message: 'Product added to wishlist',
        data: wishlist.products
    });
});

// @desc    Remove product from wishlist
// @route   DELETE /api/wishlist/:productId
// @access  Private
const removeFromWishlist = asyncHandler(async (req, res) => {
    const { productId } = req.params;
    let wishlist = await Wishlist.findOne({ user: req.user._id });

    if (wishlist) {
        wishlist.products = wishlist.products.filter(p => p.toString() !== productId);
        await wishlist.save();
    }

    res.json({
        success: true,
        message: 'Product removed from wishlist',
        data: wishlist ? wishlist.products : []
    });
});

module.exports = { getWishlist, addToWishlist, removeFromWishlist };
