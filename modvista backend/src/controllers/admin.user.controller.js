const User = require("../models/User.model");
const asyncHandler = require("../utils/asyncHandler");
const QueryFeatures = require("../utils/QueryFeatures");

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private/Admin
const getAllUsers = asyncHandler(async (req, res) => {
    // Custom Status & Date Filtering
    const filter = {};
    if (req.query.status === 'active') {
        filter.isBlocked = false;
        filter.isActive = { $ne: false };
    } else if (req.query.status === 'blocked') {
        filter.isBlocked = true;
    } else if (req.query.status === 'inactive') {
        filter.isActive = false;
    }

    if (req.query.startDate || req.query.endDate) {
        filter.createdAt = {};
        if (req.query.startDate) filter.createdAt.$gte = new Date(req.query.startDate);
        if (req.query.endDate) {
            const end = new Date(req.query.endDate);
            end.setHours(23, 59, 59, 999);
            filter.createdAt.$lte = end;
        }
    }

    const features = new QueryFeatures(User.find(filter).select("-password"), req.query)
        .search(['name', 'email', 'phone'])
        .filter()
        .sort()
        .limitFields()
        .paginate();

    const users = await features.query;
    const total = await User.countDocuments(features.query.getFilter());

    res.json({
        success: true,
        count: users.length,
        total,
        data: users
    });
});

// @desc    Toggle block/unblock user
// @route   PATCH /api/admin/users/:id/block
// @access  Private/Admin
const toggleBlockUser = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);

    if (!user) {
        res.status(404);
        throw new Error("User not found");
    }

    // Safety: Cannot block another admin
    if (user.role === "admin") {
        res.status(400);
        throw new Error("Cannot block an admin user");
    }

    // Toggle the block status
    user.isBlocked = !user.isBlocked;
    const updatedUser = await user.save();

    res.json({
        success: true,
        message: `User ${user.isBlocked ? 'blocked' : 'unblocked'} successfully`,
        user: {
            _id: updatedUser._id,
            name: updatedUser.name,
            email: updatedUser.email,
            phone: updatedUser.phone,
            isBlocked: updatedUser.isBlocked,
            role: updatedUser.role,
            createdAt: updatedUser.createdAt
        }
    });
});

// @desc    Delete user
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
const deleteUser = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);

    if (!user) {
        res.status(404);
        throw new Error("User not found");
    }

    // Safety: Cannot delete another admin
    if (user.role === "admin") {
        res.status(400);
        throw new Error("Cannot delete an admin user");
    }

    await User.findByIdAndDelete(req.params.id);

    res.json({
        success: true,
        message: "User deleted successfully"
    });
});

// @desc    Toggle active/inactive user
// @route   PATCH /api/admin/users/:id/active
// @access  Private/Admin
const toggleActiveStatus = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);

    if (!user) {
        res.status(404);
        throw new Error("User not found");
    }

    // Safety: Cannot deactivate another admin
    if (user.role === "admin") {
        res.status(400);
        throw new Error("Cannot deactivate an admin user");
    }

    // Toggle the active status
    user.isActive = !user.isActive;
    const updatedUser = await user.save();

    res.json({
        success: true,
        message: `User account ${user.isActive ? 'activated' : 'deactivated'} successfully`,
        user: {
            _id: updatedUser._id,
            name: updatedUser.name,
            isActive: updatedUser.isActive
        }
    });
});

module.exports = {
    getAllUsers,
    toggleBlockUser,
    toggleActiveStatus,
    deleteUser
};
