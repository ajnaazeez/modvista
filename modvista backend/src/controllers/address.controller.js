const Address = require("../models/Address.model");
const asyncHandler = require("../utils/asyncHandler");

// @desc    Get all addresses for logged-in user
// @route   GET /api/addresses
// @access  Private
const getAddresses = asyncHandler(async (req, res) => {
  const addresses = await Address.find({ user: req.user._id }).sort({
    isDefault: -1,
    createdAt: -1
  });

  res.status(200).json({
    success: true,
    count: addresses.length,
    data: addresses
  });
});

// @desc    Create new address
// @route   POST /api/addresses
// @access  Private
const createAddress = asyncHandler(async (req, res) => {
  // Prevent more than 10 addresses
  const addressCount = await Address.countDocuments({ user: req.user._id });
  if (addressCount >= 10) {
    res.status(400);
    throw new Error("Maximum limit of 10 addresses reached");
  }

  // Force default if this is the first address
  let { isDefault } = req.body;
  if (addressCount === 0) isDefault = true;

  // If set as default, unset others
  if (isDefault) {
    await Address.updateMany({ user: req.user._id }, { isDefault: false });
  }

  const address = await Address.create({
    ...req.body,
    isDefault: !!isDefault,
    user: req.user._id
  });

  res.status(201).json({
    success: true,
    data: address
  });
});

// @desc    Update address
// @route   PUT /api/addresses/:id
// @access  Private
const updateAddress = asyncHandler(async (req, res) => {
  // Ownership check (atomic)
  const existing = await Address.findOne({
    _id: req.params.id,
    user: req.user._id
  });

  if (!existing) {
    res.status(404);
    throw new Error("Address not found or not authorized");
  }

  // If updated to default, unset others
  if (req.body.isDefault === true) {
    await Address.updateMany(
      { user: req.user._id, _id: { $ne: req.params.id } },
      { isDefault: false }
    );
  }

  const updated = await Address.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    success: true,
    data: updated
  });
});

// @desc    Delete address
// @route   DELETE /api/addresses/:id
// @access  Private
const deleteAddress = asyncHandler(async (req, res) => {
  // Ownership check (atomic)
  const address = await Address.findOne({
    _id: req.params.id,
    user: req.user._id
  });

  if (!address) {
    res.status(404);
    throw new Error("Address not found or not authorized");
  }

  const wasDefault = address.isDefault;
  await address.deleteOne();

  // If deleted address was default, set newest remaining as default
  if (wasDefault) {
    const remaining = await Address.findOne({ user: req.user._id }).sort({
      createdAt: -1
    });

    if (remaining) {
      remaining.isDefault = true;
      await remaining.save();
    }
  }

  res.status(200).json({
    success: true,
    message: "Address removed"
  });
});

// @desc    Set address as default
// @route   PUT /api/addresses/:id/default
// @access  Private
const setDefaultAddress = asyncHandler(async (req, res) => {
  // Ownership check (atomic)
  const address = await Address.findOne({
    _id: req.params.id,
    user: req.user._id
  });

  if (!address) {
    res.status(404);
    throw new Error("Address not found or not authorized");
  }

  // Unset others except current one
  await Address.updateMany(
    { user: req.user._id, _id: { $ne: req.params.id } },
    { isDefault: false }
  );

  address.isDefault = true;
  await address.save();

  res.status(200).json({
    success: true,
    data: address
  });
});

module.exports = {
  getAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress
};
