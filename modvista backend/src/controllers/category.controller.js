const Category = require('../models/Category.model');
const Product = require('../models/Product.model');
const buildQueryFeatures = require('../utils/queryHelper'); // Keeping old for now just in case, but using new below
const asyncHandler = require('../utils/asyncHandler');
const QueryFeatures = require('../utils/QueryFeatures');

// @desc    Get all active categories with product counts
// @route   GET /api/categories
// @access  Public
exports.getCategories = asyncHandler(async (req, res) => {
    // Fetch categories and counts in a single aggregation for efficiency
    const categoriesWithCounts = await Category.aggregate([
        { $match: { isActive: true } },
        {
            $lookup: {
                from: "products",
                localField: "_id",
                foreignField: "category",
                as: "products"
            }
        },
        {
            $project: {
                name: 1,
                image: 1,
                description: 1,
                slug: 1,
                totalProducts: { $size: "$products" }
            }
        },
        { $sort: { name: 1 } }
    ]);

    res.json({ success: true, count: categoriesWithCounts.length, data: categoriesWithCounts });
});

// @desc    Get all categories (Admin) with product count and pagination
// @route   GET /api/admin/categories
// @access  Private/Admin
exports.adminGetCategories = asyncHandler(async (req, res) => {
    const features = new QueryFeatures(Category.find(), req.query)
        .filter()
        .search(['name'])
        .sort()
        .limitFields()
        .paginate();

    const categories = await features.query.lean();
    const total = await Category.countDocuments(features.query.getFilter());

    const counts = await Product.aggregate([
        { $group: { _id: "$category", count: { $sum: 1 } } }
    ]);

    const categoriesWithCounts = categories.map(cat => {
        const found = counts.find(c => c._id && c._id.toString() === cat._id.toString());
        return {
            ...cat,
            totalProducts: found ? found.count : 0
        };
    });

    res.json({
        success: true,
        total,
        count: categoriesWithCounts.length,
        data: categoriesWithCounts
    });
});

// @desc    Create category
// @route   POST /api/admin/categories
// @access  Private/Admin
exports.adminCreateCategory = asyncHandler(async (req, res) => {
    const { name, description, image, isActive } = req.body;

    // Check for duplicate name
    const existing = await Category.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
    if (existing) {
        res.status(400);
        throw new Error('Category name already exists');
    }

    const category = await Category.create({
        name,
        description,
        image,
        isActive: isActive !== undefined ? isActive : true
    });

    res.status(201).json({ success: true, message: 'Category created', data: category });
});

// @desc    Update category
// @route   PUT /api/admin/categories/:id
// @access  Private/Admin
exports.adminUpdateCategory = asyncHandler(async (req, res) => {
    let category = await Category.findById(req.params.id);
    if (!category) {
        res.status(404);
        throw new Error('Category not found');
    }

    const { name, description, image, isActive } = req.body;

    if (name && name !== category.name) {
        const existing = await Category.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') }, _id: { $ne: req.params.id } });
        if (existing) {
            res.status(400);
            throw new Error('Category name already exists');
        }
        category.name = name;
    }

    if (description !== undefined) category.description = description;
    if (image !== undefined) category.image = image;
    if (isActive !== undefined) category.isActive = isActive;

    await category.save();

    res.json({ success: true, message: 'Category updated', data: category });
});

// @desc    Toggle category active status
// @route   PATCH /api/admin/categories/:id/toggle-active
// @access  Private/Admin
exports.toggleCategoryActive = asyncHandler(async (req, res) => {
    const category = await Category.findById(req.params.id);
    if (!category) {
        res.status(404);
        throw new Error('Category not found');
    }

    category.isActive = !category.isActive;
    await category.save();

    res.json({
        success: true,
        message: `Category ${category.isActive ? 'enabled' : 'disabled'}`,
        data: category
    });
});

// @desc    Delete category
// @route   DELETE /api/admin/categories/:id
// @access  Private/Admin
exports.adminDeleteCategory = asyncHandler(async (req, res) => {
    const categoryId = req.params.id;

    const productCount = await Product.countDocuments({ category: categoryId });
    if (productCount > 0) {
        res.status(400);
        throw new Error(`Cannot delete category with ${productCount} associated products.`);
    }

    const category = await Category.findByIdAndDelete(categoryId);
    if (!category) {
        res.status(404);
        throw new Error('Category not found');
    }

    res.json({ success: true, message: 'Category deleted' });
});
