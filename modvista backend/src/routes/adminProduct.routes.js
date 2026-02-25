const express = require('express');
const router = express.Router();

const { protect, adminOnly } = require('../middleware/auth.middleware');
const asyncHandler = require('../utils/asyncHandler');
const {
    adminGetProducts,
    adminCreateProduct,
    adminUpdateProduct,
    adminDeleteProduct,
    toggleProductActive,
    updateProductStock,
    adminSetProductOffer,
    adminGetOfferProducts
} = require('../controllers/adminProduct.controller');

router.use(protect);
router.use(adminOnly);

router.route('/products')
    .get(asyncHandler(adminGetProducts))
    .post(asyncHandler(adminCreateProduct));

router.get('/products/offers', asyncHandler(adminGetOfferProducts));

router.route('/products/:id')
    .put(asyncHandler(adminUpdateProduct))
    .delete(asyncHandler(adminDeleteProduct));

router.patch('/products/:id/toggle-active', asyncHandler(toggleProductActive));
router.patch('/products/:id/stock', asyncHandler(updateProductStock));
router.patch('/products/:id/offer', asyncHandler(adminSetProductOffer));

module.exports = router;
