const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/User.model");

function signToken(userId) {
    return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "30d" });
}

const adminLogin = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: "Email and password required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(401).json({ message: "Invalid email or password" });

    let ok = false;

    // If model has comparePassword method (it should if using standard mongoose setup)
    if (typeof user.comparePassword === "function") {
        ok = await user.comparePassword(password);
    } else {
        // fallback bcrypt compare if method missing
        ok = await bcrypt.compare(password, user.password);
    }

    if (!ok) return res.status(401).json({ message: "Invalid email or password" });

    // Check if user is actually an admin
    // Handling both role: 'admin' string and isAdmin: true boolean for compatibility
    const isAdmin = (user.role === "admin") || (user.isAdmin === true);
    if (!isAdmin) {
        return res.status(403).json({ message: "Access Denied. Please login as Admin." });
    }

    const token = signToken(user._id);

    return res.json({
        message: "Admin login success",
        token,
        admin: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role || (user.isAdmin ? "admin" : "user")
        }
    });
};

const adminSignup = async (req, res) => {
    const { name, email, phone, password } = req.body;

    if (!name || !email || !phone || !password) {
        return res.status(400).json({ message: "All fields are required" });
    }

    if (password.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters long" });
    }

    const emailExists = await User.findOne({ email: email.toLowerCase() });
    if (emailExists) return res.status(400).json({ message: "Email already registered" });

    const phoneExists = await User.findOne({ phone });
    if (phoneExists) return res.status(400).json({ message: "Phone number already registered" });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
        name,
        email: email.toLowerCase(),
        phone,
        password: hashedPassword,
        role: "admin",
        isAdmin: true,
        isVerified: true // Admin accounts are verified by default in this flow
    });

    if (user) {
        const token = signToken(user._id);
        return res.status(201).json({
            message: "Admin registered successfully",
            token,
            admin: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } else {
        return res.status(400).json({ message: "Invalid admin data" });
    }
};

module.exports = { adminLogin, adminSignup };
