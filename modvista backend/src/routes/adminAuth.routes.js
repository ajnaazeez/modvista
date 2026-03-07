const express = require("express");
const router = express.Router();
const asyncHandler = require("../utils/asyncHandler");
const { adminLogin, disableSignup } = require("../controllers/adminAuth.controller");

router.post("/login", asyncHandler(adminLogin));
router.post("/register", asyncHandler(disableSignup));
router.post("/signup", asyncHandler(disableSignup));

module.exports = router;
