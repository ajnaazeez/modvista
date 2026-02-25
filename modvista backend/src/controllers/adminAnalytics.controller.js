const Order = require('../models/Order.model');
const asyncHandler = require('../utils/asyncHandler');

// @desc    Get orders count over time (grouped by day)
// @route   GET /api/admin/analytics/orders-over-time
// @access  Private/Admin
const getOrdersOverTime = asyncHandler(async (req, res) => {
    const ordersOverTime = await Order.aggregate([
        {
            $match: { status: 'delivered' }
        },
        {
            $group: {
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                totalOrders: { $sum: 1 }
            }
        },
        {
            $sort: { _id: 1 }
        },
        {
            $project: {
                _id: 0,
                date: "$_id",
                totalOrders: 1
            }
        }
    ]);

    res.status(200).json({
        success: true,
        data: ordersOverTime
    });
});

// @desc    Get revenue distribution by product category
// @route   GET /api/admin/analytics/revenue-by-category
// @access  Private/Admin
const getRevenueByCategory = asyncHandler(async (req, res) => {
    const revenueByCategory = await Order.aggregate([
        // Unwind order items
        { $unwind: "$items" },

        // Lookup product from Product collection
        {
            $lookup: {
                from: "products",
                localField: "items.product",
                foreignField: "_id",
                as: "productInfo"
            }
        },
        { $unwind: "$productInfo" },

        // Lookup category from Category collection
        {
            $lookup: {
                from: "categories",
                localField: "productInfo.category",
                foreignField: "_id",
                as: "categoryInfo"
            }
        },
        { $unwind: "$categoryInfo" },

        // Group by category name and sum revenue
        {
            $group: {
                _id: "$categoryInfo.name",
                revenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } }
            }
        },
        {
            $project: {
                _id: 0,
                category: "$_id",
                revenue: 1
            }
        },
        {
            $sort: { revenue: -1 }
        }
    ]);

    res.status(200).json({
        success: true,
        data: revenueByCategory
    });
});

module.exports = {
    getOrdersOverTime,
    getRevenueByCategory
};
