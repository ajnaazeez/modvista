const express = require('express');
const router = express.Router();
const {
    getAddresses,
    createAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress
} = require('../controllers/address.controller');
const { protect } = require('../middleware/auth.middleware');

// All routes are protected
router.use(protect);

router.route('/')
    .get(getAddresses)
    .post(createAddress);

router.route('/:id')
    .put(updateAddress)
    .delete(deleteAddress);

router.put('/:id/default', setDefaultAddress);

module.exports = router;
