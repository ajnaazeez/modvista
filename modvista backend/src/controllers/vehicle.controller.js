const Vehicle = require('../models/Vehicle.model');
const asyncHandler = require('../utils/asyncHandler');

// @desc    Get all vehicles for current user
// @route   GET /api/vehicles
// @access  Private
const getMyVehicles = asyncHandler(async (req, res) => {
    const vehicles = await Vehicle.find({ user: req.user._id });
    res.json({
        success: true,
        count: vehicles.length,
        vehicles
    });
});

// @desc    Add a new vehicle
// @route   POST /api/vehicles
// @access  Private
const addVehicle = asyncHandler(async (req, res) => {
    const { make, model, year, variant, color, isDefault } = req.body;

    if (!make || !model || !year) {
        res.status(400);
        throw new Error('Please provide make, model, and year');
    }

    // If isDefault is true, set all other user vehicles to false
    if (isDefault) {
        await Vehicle.updateMany({ user: req.user._id }, { isDefault: false });
    }

    // If this is the first vehicle, make it default
    const count = await Vehicle.countDocuments({ user: req.user._id });
    const finalDefault = count === 0 ? true : !!isDefault;

    const vehicle = await Vehicle.create({
        user: req.user._id,
        make,
        model,
        year,
        variant,
        color,
        isDefault: finalDefault
    });

    res.status(201).json({
        success: true,
        message: 'Vehicle added successfully',
        vehicle
    });
});

// @desc    Update a vehicle
// @route   PUT /api/vehicles/:id
// @access  Private
const updateVehicle = asyncHandler(async (req, res) => {
    let vehicle = await Vehicle.findById(req.params.id);

    if (!vehicle) {
        res.status(404);
        throw new Error('Vehicle not found');
    }

    // Check user ownership
    if (vehicle.user.toString() !== req.user._id.toString()) {
        res.status(401);
        throw new Error('User not authorized');
    }

    const { isDefault } = req.body;

    // If setting to default, unset others
    if (isDefault && !vehicle.isDefault) {
        await Vehicle.updateMany({ user: req.user._id }, { isDefault: false });
    }

    vehicle = await Vehicle.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true
    });

    res.json({
        success: true,
        message: 'Vehicle updated successfully',
        vehicle
    });
});

// @desc    Delete a vehicle
// @route   DELETE /api/vehicles/:id
// @access  Private
const deleteVehicle = asyncHandler(async (req, res) => {
    const vehicle = await Vehicle.findById(req.params.id);

    if (!vehicle) {
        res.status(404);
        throw new Error('Vehicle not found');
    }

    // Check user ownership
    if (vehicle.user.toString() !== req.user._id.toString()) {
        res.status(401);
        throw new Error('User not authorized');
    }

    const wasDefault = vehicle.isDefault;
    await vehicle.deleteOne();

    // If we deleted the default vehicle, make another one default if available
    if (wasDefault) {
        const remaining = await Vehicle.findOne({ user: req.user._id });
        if (remaining) {
            remaining.isDefault = true;
            await remaining.save();
        }
    }

    res.json({
        success: true,
        message: 'Vehicle removed successfully'
    });
});

// @desc    Set default vehicle
// @route   PATCH /api/vehicles/:id/default
// @access  Private
const setDefaultVehicle = asyncHandler(async (req, res) => {
    const vehicle = await Vehicle.findById(req.params.id);

    if (!vehicle) {
        res.status(404);
        throw new Error('Vehicle not found');
    }

    if (vehicle.user.toString() !== req.user._id.toString()) {
        res.status(401);
        throw new Error('User not authorized');
    }

    await Vehicle.updateMany({ user: req.user._id }, { isDefault: false });

    vehicle.isDefault = true;
    await vehicle.save();

    res.json({
        success: true,
        message: 'Default vehicle updated',
        vehicle
    });
});

// @desc    Get user vehicles (Admin)
// @route   GET /api/admin/users/:userId/vehicles
// @access  Private/Admin
const getUserVehicles = asyncHandler(async (req, res) => {
    const vehicles = await Vehicle.find({ user: req.params.userId });
    res.json({
        success: true,
        count: vehicles.length,
        vehicles
    });
});

module.exports = {
    getMyVehicles,
    addVehicle,
    updateVehicle,
    deleteVehicle,
    setDefaultVehicle,
    getUserVehicles
};
