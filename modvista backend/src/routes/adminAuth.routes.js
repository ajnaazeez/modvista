const express = require("express");
const router = express.Router();
const asyncHandler = require("../utils/asyncHandler");
const { adminLogin } = require("../controllers/adminAuth.controller");

router.post("/login", asyncHandler(adminLogin));

module.exports = router;
