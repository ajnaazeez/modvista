const express = require('express');
const router = express.Router();
const {
    getOffersAdmin, createOfferAdmin, updateOfferAdmin, toggleOfferAdmin, deleteOfferAdmin
} = require('../controllers/admin.offer.controller');
const { protect } = require('../middleware/auth.middleware');
const adminOnly = require('../middleware/admin.middleware');

// Protected and Admin Only
router.use(protect);
router.use(adminOnly);

// Offers Admin
router.route('/offers')
    .get(getOffersAdmin)
    .post(createOfferAdmin);

router.route('/offers/:id')
    .put(updateOfferAdmin)
    .delete(deleteOfferAdmin);

router.patch('/offers/:id/toggle', toggleOfferAdmin);

module.exports = router;
