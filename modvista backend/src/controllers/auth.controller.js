const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User.model");
const asyncHandler = require("../utils/asyncHandler");
const sendEmail = require("../utils/sendEmail");
const { OAuth2Client } = require("google-auth-library");
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Utility to generate JWT
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: "30d",
    });
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const login = asyncHandler(async (req, res) => {
    const email = (req.body.email || "").toLowerCase().trim();
    const password = req.body.password || "";

    if (!email || !password) {
        res.status(400);
        throw new Error("Email and password are required");
    }

    const user = await User.findOne({ email });

    // Use bcryptjs direct compare
    if (user && (await bcrypt.compare(password, user.password))) {
        // Check if verified
        if (user.isVerified === false) {
            res.status(403);
            throw new Error("Please verify OTP first");
        }

        if (user.isBlocked) {
            res.status(403);
            throw new Error("Account blocked by admin");
        }

        if (user.isActive === false) {
            res.status(403);
            throw new Error("Account deactivated. Please contact support.");
        }

        res.json({
            success: true,
            token: generateToken(user._id),
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role
            }
        });
    } else {
        res.status(401);
        throw new Error("Invalid email or password");
    }
});

// @desc    Register a new user (with OTP)
// @route   POST /api/auth/signup
// @access  Public
const signup = asyncHandler(async (req, res) => {
    const name = (req.body.fullname || req.body.name || "").trim();
    const email = (req.body.email || "").toLowerCase().trim();
    const phone = (req.body.phone || "").trim();
    const password = req.body.password || "";
    const confirmPassword = req.body.confirmPassword || "";

    // 1. Required Fields
    if (!name || !email || !phone || !password || !confirmPassword) {
        res.status(400);
        throw new Error("fullname, email, phone, password, and confirmPassword are required");
    }

    // 1.1 Password Match
    if (password !== confirmPassword) {
        res.status(400);
        throw new Error("Passwords do not match");
    }

    // 2. Password Length
    if (password.length < 8) {
        res.status(400);
        throw new Error("Password must be at least 8 characters long");
    }

    // 3. Phone Validation (at least 10 digits)
    const digitsOnly = phone.replace(/\D/g, "");
    if (digitsOnly.length < 10) {
        res.status(400);
        throw new Error("Phone must be at least 10 digits");
    }
    const finalPhone = digitsOnly.slice(-10); // Take last 10 digits for consistency

    // 4. Unique Email Check
    const emailExists = await User.findOne({ email });
    if (emailExists) {
        res.status(409); // Conflict
        throw new Error("Email already registered");
    }

    // 5. Unique Phone Check
    const phoneExists = await User.findOne({ phone: finalPhone });
    if (phoneExists) {
        res.status(409); // Conflict
        throw new Error("Phone already registered");
    }

    // 6. Hash Password
    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(password, salt);

    // 7. OTP Generation
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = await bcrypt.hash(otp, salt);
    const otpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 mins

    // 8. Send OTP Email
    try {
        await sendEmail({
            to: email,
            subject: "ModVista - OTP Verification",
            text: `Your OTP is ${otp}. It is valid for 5 minutes.`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                    <h2 style="color: #333; text-align: center;">Verify your ModVista account</h2>
                    <p style="font-size: 16px; color: #666;">Your One-Time Password (OTP) for registration is:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <h1 style="letter-spacing: 8px; color: #ff1f1f; font-size: 36px; padding: 15px; background: #f9f9f9; display: inline-block; border-radius: 5px;">${otp}</h1>
                    </div>
                    <p style="font-size: 14px; color: #999; text-align: center;">This OTP is valid for 5 minutes. Please do not share this with anyone.</p>
                </div>
            `
        });
    } catch (error) {
        console.error("❌ Email sending failed:", error);
        res.status(500);
        throw new Error("OTP email sending failed. Please try again later.");
    }

    // 9. Create User (unverified)
    try {
        const user = await User.create({
            name,
            email,
            phone: finalPhone,
            password: hashed,
            role: "user",
            isVerified: false,
            otpHash,
            otpExpires
        });

        if (user) {
            res.status(201).json({
                success: true,
                message: "OTP sent to your email",
                otpSent: true,
                email: user.email
            });
        } else {
            res.status(400);
            throw new Error("Invalid user data");
        }
    } catch (error) {
        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern)[0];
            res.status(409);
            throw new Error(`${field.charAt(0).toUpperCase() + field.slice(1)} already registered`);
        }
        throw error;
    }
});

// @desc    Verify OTP
// @route   POST /api/auth/verify-otp
// @access  Public
const verifyOtp = asyncHandler(async (req, res) => {
    const { email, otp } = req.body;

    if (!email || !otp) {
        res.status(400);
        throw new Error("Email and OTP are required");
    }

    const user = await User.findOne({ email });

    if (!user) {
        res.status(404);
        throw new Error("User not found");
    }

    if (user.isVerified) {
        res.status(400);
        throw new Error("User already verified");
    }

    // Check expiry
    if (user.otpExpires < Date.now()) {
        res.status(400);
        throw new Error("OTP expired");
    }

    // Compare Hash
    const isMatch = await bcrypt.compare(otp, user.otpHash);
    if (!isMatch) {
        res.status(400);
        throw new Error("Invalid OTP");
    }

    // Mark as verified
    user.isVerified = true;
    user.otpHash = undefined;
    user.otpExpires = undefined;
    await user.save();

    res.json({
        success: true,
        message: "Email verified successfully",
        token: generateToken(user._id),
        user: {
            id: user._id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.role
        }
    });
});

// @desc    Resend OTP
// @route   POST /api/auth/resend-otp
// @access  Public
const resendOtp = asyncHandler(async (req, res) => {
    const { email } = req.body;

    if (!email) {
        res.status(400);
        throw new Error("Email is required");
    }

    const user = await User.findOne({ email });

    if (!user) {
        res.status(404);
        throw new Error("User not found");
    }

    if (user.isVerified) {
        res.status(400);
        throw new Error("User already verified");
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const salt = await bcrypt.genSalt(10);

    // Send Resend OTP Email
    try {
        await sendEmail({
            to: email,
            subject: "ModVista - New OTP Verification",
            text: `Your new OTP is ${otp}. It is valid for 5 minutes.`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                    <h2 style="color: #333; text-align: center;">New OTP Request</h2>
                    <p style="font-size: 16px; color: #666;">Your new One-Time Password (OTP) for ModVista is:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <h1 style="letter-spacing: 8px; color: #ff1f1f; font-size: 36px; padding: 15px; background: #f9f9f9; display: inline-block; border-radius: 5px;">${otp}</h1>
                    </div>
                    <p style="font-size: 14px; color: #999; text-align: center;">This OTP is valid for 5 minutes. Please do not share this with anyone.</p>
                </div>
            `
        });
    } catch (error) {
        console.error("❌ Resend Email sending failed:", error);
        res.status(500);
        throw new Error("Failed to resend OTP email. Please try again later.");
    }

    user.otpHash = await bcrypt.hash(otp, salt);
    user.otpExpires = new Date(Date.now() + 5 * 60 * 1000);
    await user.save();

    res.json({
        success: true,
        message: "OTP resent successfully"
    });
});

// @desc    Auth with Google
// @route   POST /api/auth/google
// @access  Public
const googleLogin = asyncHandler(async (req, res) => {
    const { credential } = req.body;

    if (!credential) {
        res.status(400);
        throw new Error("Credential is required");
    }

    try {
        const ticket = await client.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        const { sub: googleId, email, name, picture } = payload;

        let user = await User.findOne({ email });

        if (user) {
            // If user exists but no googleId (registered conventionally)
            if (!user.googleId) {
                user.googleId = googleId;
                if (!user.avatarUrl) user.avatarUrl = picture;
                await user.save();
            }
        } else {
            // Create new Google user
            user = await User.create({
                name,
                email,
                googleId,
                avatarUrl: picture,
                isVerified: true, // Google accounts are pre-verified
                isActive: true
            });
        }

        if (user.isBlocked) {
            res.status(403);
            throw new Error("Account blocked by admin");
        }

        if (user.isActive === false) {
            res.status(403);
            throw new Error("Account deactivated. Please contact support.");
        }

        res.json({
            success: true,
            token: generateToken(user._id),
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone || "",
                role: user.role,
                avatarUrl: user.avatarUrl
            }
        });

    } catch (error) {
        console.error("Google verify error:", error);
        res.status(401);
        throw new Error("Google authentication failed");
    }
});

module.exports = { signup, login, verifyOtp, resendOtp, googleLogin };
