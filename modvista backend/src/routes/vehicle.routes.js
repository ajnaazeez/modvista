const express = require('express');
const router = express.Router();
const {
    getMyVehicles,
    addVehicle,
    updateVehicle,
    deleteVehicle,
    setDefaultVehicle,
    getUserVehicles
} = require('../controllers/vehicle.controller');
const { protect, adminOnly } = require('../middleware/auth.middleware');

// User Routes
router.route('/')
    .get(protect, getMyVehicles)
    .post(protect, addVehicle);

router.route('/:id')
    .put(protect, updateVehicle)
    .delete(protect, deleteVehicle);

router.patch('/:id/default', protect, setDefaultVehicle);

// Admin Routes (Can be mounted differently or here)
router.get('/admin/users/:userId/vehicles', protect, adminOnly, getUserVehicles);

module.exports = router;
