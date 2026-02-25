const express = require('express');
const { protect, adminOnly } = require('../middleware/auth.middleware');
const {
    adminGetCategories,
    adminCreateCategory,
    adminUpdateCategory,
    adminDeleteCategory
} = require('../controllers/category.controller');

const router = express.Router();

// All routes are protected and admin only
router.use(protect);
router.use(adminOnly);

router.route('/categories')
    .get(adminGetCategories)
    .post(adminCreateCategory);

router.route('/categories/:id')
    .put(adminUpdateCategory)
    .delete(adminDeleteCategory);

module.exports = router;
