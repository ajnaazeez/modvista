const Order = require('../models/Order.model');
const User = require('../models/User.model');
const Product = require('../models/Product.model');
const asyncHandler = require('../utils/asyncHandler');

// @desc    Get Admin Analytics
// @route   GET /api/analytics/admin
// @access  Private/Admin
const getAdminAnalytics = asyncHandler(async (req, res) => {
    // 1. KPI Stats
    const totalOrders = await Order.countDocuments({ status: { $ne: 'cancelled' } });
    const revenueData = await Order.aggregate([
        { $match: { status: { $ne: 'cancelled' } } },
        { $group: { _id: null, total: { $sum: "$total" } } }
    ]);
    const totalRevenue = revenueData[0] ? revenueData[0].total : 0;
    const avgOrderValue = totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(2) : 0;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const activeUsers = await User.countDocuments({ createdAt: { $gte: thirtyDaysAgo } });

    // 2. Sales Trend (Last 30 Days)
    const rawSalesTrend = await Order.aggregate([
        { $match: { createdAt: { $gte: thirtyDaysAgo }, status: { $ne: 'cancelled' } } },
        {
            $group: {
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                revenue: { $sum: "$total" },
                orders: { $sum: 1 }
            }
        },
        { $sort: { "_id": 1 } }
    ]);

    // Fill in gaps with 0 for the last 30 days
    const salesTrendMap = rawSalesTrend.reduce((acc, curr) => {
        acc[curr._id] = curr;
        return acc;
    }, {});

    const salesTrend = [];
    for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];

        if (salesTrendMap[dateStr]) {
            salesTrend.push(salesTrendMap[dateStr]);
        } else {
            salesTrend.push({
                _id: dateStr,
                revenue: 0,
                orders: 0
            });
        }
    }

    // 3. Payment Distribution
    const paymentDistribution = await Order.aggregate([
        { $group: { _id: "$paymentMethod", count: { $sum: 1 }, revenue: { $sum: "$total" } } }
    ]);

    // 4. Product Performance (Top 5)
    const productPerformance = await Order.aggregate([
        { $unwind: "$items" },
        {
            $group: {
                _id: "$items.product",
                name: { $first: "$items.name" },
                unitsSold: { $sum: "$items.quantity" },
                revenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } }
            }
        },
        { $sort: { revenue: -1 } },
        { $limit: 10 }
    ]);

    res.json({
        success: true,
        data: {
            kpis: {
                totalRevenue,
                totalOrders,
                avgOrderValue,
                activeUsers,
                conversionRate: "3.4%" // Mocked as we don't track visits
            },
            salesTrend,
            paymentDistribution,
            productPerformance
        }
    });
});

// @desc    Get User Analytics
// @route   GET /api/analytics/user
// @access  Private
const getUserAnalytics = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    // 1. KPI Stats
    const orders = await Order.find({ user: userId });
    const totalOrders = orders.length;
    const totalSpent = orders.reduce((acc, current) => acc + current.total, 0);
    const avgSpending = totalOrders > 0 ? (totalSpent / totalOrders).toFixed(2) : 0;

    // 2. Monthly Trend (Last 6 Months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyTrend = await Order.aggregate([
        { $match: { user: userId, createdAt: { $gte: sixMonthsAgo } } },
        {
            $group: {
                _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
                spent: { $sum: "$total" },
                count: { $sum: 1 }
            }
        },
        { $sort: { "_id": 1 } }
    ]);

    // 3. Category Preference
    const categoryStats = await Order.aggregate([
        { $match: { user: userId } },
        { $unwind: "$items" },
        {
            $group: {
                _id: "$items.product",
                count: { $sum: "$items.quantity" }
            }
        },
        {
            $lookup: {
                from: "products",
                localField: "_id",
                foreignField: "_id",
                as: "productInfo"
            }
        },
        { $unwind: "$productInfo" },
        {
            $group: {
                _id: "$productInfo.category",
                count: { $sum: "$count" }
            }
        },
        {
            $lookup: {
                from: "categories",
                localField: "_id",
                foreignField: "_id",
                as: "categoryInfo"
            }
        },
        { $unwind: "$categoryInfo" },
        { $project: { name: "$categoryInfo.name", count: 1 } },
        { $sort: { count: -1 } }
    ]);

    res.json({
        success: true,
        data: {
            kpis: {
                totalOrders,
                totalSpent,
                avgSpending
            },
            monthlyTrend,
            categoryStats
        }
    });
});

module.exports = {
    getAdminAnalytics,
    getUserAnalytics
};
