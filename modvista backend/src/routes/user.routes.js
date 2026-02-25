const express = require("express");
const router = express.Router();
const { getMe, updateMe, uploadAvatar } = require("../controllers/user.controller");
const { protect } = require("../middleware/auth.middleware");
const upload = require("../middleware/upload.middleware");

// GET /api/users/me -> Protected route to get current user data
router.get("/me", protect, getMe);

// PUT /api/users/me -> Protected route to update user profile
router.put("/me", protect, updateMe);

// POST /api/users/me/avatar -> Protected route to upload user avatar
router.post("/me/avatar", protect, upload.single('avatar'), uploadAvatar);

module.exports = router;
