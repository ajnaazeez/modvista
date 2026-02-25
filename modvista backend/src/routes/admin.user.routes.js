const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth.middleware");
const adminOnly = require("../middleware/admin.middleware");
const {
    getAllUsers,
    toggleBlockUser,
    toggleActiveStatus,
    deleteUser
} = require("../controllers/admin.user.controller");

// All routes here are protected and admin-only
router.use(protect);
router.use(adminOnly);

router.get("/users", getAllUsers);
router.patch("/users/:id/block", toggleBlockUser);
router.patch("/users/:id/active", toggleActiveStatus);
router.delete("/users/:id", deleteUser);

module.exports = router;
