const express = require("express");
const router = express.Router();
const { signup, login, verifyOtp, resendOtp, googleLogin } = require("../controllers/auth.controller");

router.post("/signup", signup);
router.post("/login", login);
router.post("/google", googleLogin);
router.post("/verify-otp", verifyOtp);
router.post("/resend-otp", resendOtp);

module.exports = router;
