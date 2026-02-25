const express = require("express");
const router = express.Router();
const asyncHandler = require("../utils/asyncHandler");
const { adminLogin, adminSignup } = require("../controllers/adminAuth.controller");

router.post("/login", asyncHandler(adminLogin));
router.post("/signup", asyncHandler(adminSignup));

module.exports = router;
