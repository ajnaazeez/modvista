const User = require('../models/User.model');
const Order = require('../models/Order.model');
const Product = require('../models/Product.model');
const Category = require('../models/Category.model');

/**
 * @desc    Get Dashboard Statistics
 * @route   GET /api/admin/dashboard/stats
 * @access  Private/Admin
 */
exports.getDashboardStats = async (req, res, next) => {
    try {
        // Get total users count
        const totalUsers = await User.countDocuments();

        // Get total orders count
        const totalOrders = await Order.countDocuments();

        // Get total products count
        const totalProducts = await Product.countDocuments();

        // Get active products count
        const activeProducts = await Product.countDocuments({ isActive: true });

        // Get total categories count
        const totalCategories = await Category.countDocuments({ isActive: true });

        // Calculate total revenue from all orders (excluding cancelled)
        const revenueData = await Order.aggregate([
            {
                $match: { status: { $ne: 'cancelled' } }
            },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: '$total' }
                }
            }
        ]);
        const totalRevenue = revenueData.length > 0 ? revenueData[0].totalRevenue : 0;

        // Get order status breakdown
        const orderStatusBreakdown = await Order.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);

        // Get recent orders (last 30 days) for trend
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const recentOrdersCount = await Order.countDocuments({
            createdAt: { $gte: thirtyDaysAgo }
        });

        // Get revenue by payment method
        const revenueByPaymentMethod = await Order.aggregate([
            {
                $group: {
                    _id: '$paymentMethod',
                    total: { $sum: '$total' },
                    count: { $sum: 1 }
                }
            }
        ]);

        // Get pending orders count
        const pendingOrders = await Order.countDocuments({ status: 'pending' });

        // Get delivered orders count
        const deliveredOrders = await Order.countDocuments({ status: 'delivered' });

        // Get active users count
        const activeUsersCount = await User.countDocuments({ isActive: true });

        // Get low stock products count (stock < 5)
        const lowStockProducts = await Product.countDocuments({ stock: { $lt: 5 } });

        res.status(200).json({
            totalUsers,
            activeUsers: activeUsersCount,
            totalOrders,
            totalProducts,
            activeProducts,
            totalCategories,
            totalRevenue,
            recentOrdersCount,
            orderStatusBreakdown,
            revenueByPaymentMethod,
            pendingOrders,
            deliveredOrders,
            lowStockProducts
        });
    } catch (err) {
        next(err);
    }
};

/**
 * @desc    Get Recent Orders for Dashboard
 * @route   GET /api/admin/dashboard/recent-orders
 * @access  Private/Admin
 */
exports.getRecentOrders = async (req, res, next) => {
    try {
        const limit = parseInt(req.query.limit) || 10;

        const orders = await Order.find()
            .populate('user', 'name email')
            .sort({ createdAt: -1 })
            .limit(limit * 2) // Fetch more to account for filtering
            .select('user total paymentMethod status createdAt');

        // Filter out orders with missing users and transform
        const transformedOrders = orders
            .filter(order => order.user && order.user.name) // Only include orders with valid users
            .slice(0, limit) // Limit after filtering
            .map(order => ({
                _id: order._id,
                shortId: order._id.toString().slice(-4).toUpperCase(),
                user: order.user,
                totalAmount: order.total,
                paymentMethod: order.paymentMethod,
                status: order.status,
                createdAt: order.createdAt
            }));

        res.status(200).json(transformedOrders);
    } catch (err) {
        next(err);
    }
};
