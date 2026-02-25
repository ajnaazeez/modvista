const asyncHandler = require("../utils/asyncHandler");
const User = require("../models/User.model");

// @desc    Get current user profile
// @route   GET /api/users/me
// @access  Private
const getMe = asyncHandler(async (req, res) => {
    // req.user is already set by the protect middleware
    res.json({
        success: true,
        user: {
            id: req.user._id,
            name: req.user.name,
            email: req.user.email,
            phone: req.user.phone,
            role: req.user.role || 'user',
            avatarUrl: req.user.avatarUrl || ""
        }
    });
});

// @desc    Update current user profile
// @route   PUT /api/users/me
// @access  Private
const updateMe = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);

    if (user) {
        user.name = req.body.name || user.name;
        user.phone = req.body.phone || user.phone;

        if (req.body.deleteAvatar === true) {
            user.avatarUrl = "";
        }

        if (req.body.password) {
            const bcrypt = require('bcryptjs');
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(req.body.password, salt);
        }

        const updatedUser = await user.save();

        res.json({
            success: true,
            message: "Profile updated",
            user: {
                id: updatedUser._id,
                name: updatedUser.name,
                email: updatedUser.email,
                phone: updatedUser.phone,
                role: updatedUser.role || 'user',
                avatarUrl: updatedUser.avatarUrl || ""
            }
        });
    } else {
        res.status(404);
        throw new Error("User not found");
    }
});

// @desc    Upload user avatar
// @route   POST /api/users/me/avatar
// @access  Private
const uploadAvatar = asyncHandler(async (req, res) => {
    if (!req.file) {
        res.status(400);
        throw new Error("Please upload a file");
    }

    const user = await User.findById(req.user._id);
    if (!user) {
        res.status(404);
        throw new Error("User not found");
    }

    // Save the path (using forward slashes for URL consistency)
    const avatarPath = '/uploads/avatars/' + req.file.filename;
    user.avatarUrl = avatarPath;
    await user.save();

    res.json({
        success: true,
        message: "Avatar updated",
        avatarUrl: avatarPath
    });
});

module.exports = { getMe, updateMe, uploadAvatar };
