const Cart = require('../models/Cart.model');
const Product = require('../models/Product.model');
const Offer = require('../models/Offer.model');
const Coupon = require('../models/Coupon.model');
const asyncHandler = require('../utils/asyncHandler');
const { calculatePriceBreakdown } = require('../utils/pricingEngine');

// Helper to get full cart breakdown
const getFullCartBreakdown = async (userId) => {
  const cart = await Cart.findOne({ user: userId }).populate({
    path: 'items.product',
    populate: { path: 'category' }
  });

  if (!cart) return null;

  // Fetch active auto-apply offer
  const now = new Date();
  const applicableOffer = await Offer.findOne({
    isActive: true,
    autoApply: true,
    $and: [
      { $or: [{ startDate: { $exists: false } }, { startDate: null }, { startDate: { $lte: now } }] },
      { $or: [{ endDate: { $exists: false } }, { endDate: null }, { endDate: { $gte: now } }] }
    ]
  }).sort({ createdAt: -1 });

  // Fetch applied coupon details if any
  let coupon = null;
  if (cart.appliedCoupon && cart.appliedCoupon.code) {
    coupon = await Coupon.findOne({ code: cart.appliedCoupon.code, isActive: true });
  }

  const breakdown = calculatePriceBreakdown(cart.items, coupon, applicableOffer);

  return {
    ...breakdown,
    items: cart.items,
    appliedCoupon: cart.appliedCoupon
  };
};

// @desc    Get cart for logged-in user
// @route   GET /api/cart
// @access  Private
const getCart = asyncHandler(async (req, res) => {
  const breakdown = await getFullCartBreakdown(req.user._id);

  if (!breakdown) {
    return res.json({
      success: true,
      items: [],
      summary: { subtotal: 0, total: 0 }
    });
  }

  res.json({
    success: true,
    ...breakdown
  });
});

// @desc    Add item to cart
// @route   POST /api/cart
// @access  Private
const addToCart = asyncHandler(async (req, res) => {
  const { productId, quantity, variant } = req.body;
  const qty = quantity ? Number(quantity) : 1;
  const itemVariant = variant || "Standard";

  const MAX_DISTINCT_ITEMS = 20;
  const MAX_QTY_PER_ITEM = 5;

  if (qty > MAX_QTY_PER_ITEM) {
    res.status(400);
    throw new Error(`Maximum quantity per item is ${MAX_QTY_PER_ITEM}`);
  }

  const product = await Product.findById(productId);
  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }

  if (product.stock < qty) {
    res.status(400);
    throw new Error('Not enough stock available');
  }

  let cart = await Cart.findOne({ user: req.user._id });
  if (!cart) {
    cart = new Cart({ user: req.user._id, items: [] });
  }

  if (cart.items.length >= MAX_DISTINCT_ITEMS && !cart.items.find(i => i.product.toString() === productId && i.variant === itemVariant)) {
    res.status(400);
    throw new Error(`Cart cannot have more than ${MAX_DISTINCT_ITEMS} distinct items`);
  }

  const existingItemIndex = cart.items.findIndex(item =>
    item.product && item.product.toString() === productId && item.variant === itemVariant
  );

  if (existingItemIndex > -1) {
    const newQty = cart.items[existingItemIndex].quantity + qty;
    if (newQty > MAX_QTY_PER_ITEM) {
      res.status(400);
      throw new Error(`Total quantity for this item cannot exceed ${MAX_QTY_PER_ITEM}`);
    }
    if (product.stock < newQty) {
      res.status(400);
      throw new Error(`Only ${product.stock} items available in stock`);
    }
    cart.items[existingItemIndex].quantity = newQty;
    cart.items[existingItemIndex].price = product.price;
  } else {
    cart.items.push({
      product: productId,
      quantity: qty,
      variant: itemVariant,
      price: product.price
    });
  }

  await cart.save();
  const breakdown = await getFullCartBreakdown(req.user._id);

  res.json({
    success: true,
    message: 'Item added to cart',
    ...breakdown
  });
});

// @desc    Update cart item quantity
// @route   PUT /api/cart/item/:itemId
// @access  Private
const updateCartItem = asyncHandler(async (req, res) => {
  const { quantity } = req.body;

  if (!quantity || Number(quantity) < 1) {
    res.status(400);
    throw new Error('Quantity must be at least 1');
  }

  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) {
    res.status(404);
    throw new Error('Cart not found');
  }

  const item = cart.items.id(req.params.itemId);
  if (!item) {
    res.status(404);
    throw new Error('Item not found in cart');
  }

  // Stock check for update
  const product = await Product.findById(item.product);
  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }

  const newQty = Number(quantity);
  if (product.stock < newQty) {
    res.status(400);
    throw new Error(`Only ${product.stock} items available in stock`);
  }

  item.quantity = newQty;
  await cart.save();

  const breakdown = await getFullCartBreakdown(req.user._id);
  res.json({
    success: true,
    message: 'Cart updated',
    ...breakdown
  });
});

// @desc    Remove item from cart
// @route   DELETE /api/cart/item/:itemId
// @access  Private
const removeCartItem = asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) {
    res.status(404);
    throw new Error('Cart not found');
  }

  cart.items.pull({ _id: req.params.itemId });
  await cart.save();

  const breakdown = await getFullCartBreakdown(req.user._id);
  res.json({
    success: true,
    message: 'Item removed from cart',
    ...breakdown
  });
});

// @desc    Remove coupon from cart
// @route   POST /api/cart/coupon/remove
// @access  Private
const removeCoupon = asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) {
    res.status(404);
    throw new Error('Cart not found');
  }

  cart.appliedCoupon = undefined;
  await cart.save();

  const breakdown = await getFullCartBreakdown(req.user._id);
  res.json({
    success: true,
    message: 'Coupon removed',
    ...breakdown
  });
});

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  removeCoupon
};
