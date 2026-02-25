const express = require('express');
const router = express.Router();
const { getProducts, getProductById } = require('../controllers/product.controller');
const asyncHandler = require('../utils/asyncHandler');

router.route('/').get(asyncHandler(getProducts));
router.route('/:id').get(asyncHandler(getProductById));

module.exports = router;
