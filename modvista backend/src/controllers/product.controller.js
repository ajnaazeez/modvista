const Product = require('../models/Product.model');
const { computePricing } = require('../utils/pricingHelper');

// @desc    Fetch all products
// @route   GET /api/products
// @access  Public
const getProducts = async (req, res) => {
    const QueryFeatures = require('../utils/QueryFeatures');
    const features = new QueryFeatures(Product.find(), req.query)
        .filter()
        .search(['name', 'description', 'brand', 'model'])
        .sort()
        .limitFields()
        .paginate();

    const products = await features.query;
    const total = await Product.countDocuments(features.query.getFilter());

    // Transform products to include pricing object
    const productsWithPricing = products.map(product => {
        const productObj = product.toObject();
        productObj.pricing = computePricing(product);
        return productObj;
    });

    res.json({
        success: true,
        count: productsWithPricing.length,
        total,
        data: productsWithPricing
    });
};

// @desc    Fetch single product
// @route   GET /api/products/:id
// @access  Public
const getProductById = async (req, res) => {
    const product = await Product.findById(req.params.id);

    if (product) {
        const productObj = product.toObject();
        productObj.pricing = computePricing(product);
        res.json(productObj);
    } else {
        res.status(404);
        throw new Error('Product not found');
    }
};

module.exports = { getProducts, getProductById };
