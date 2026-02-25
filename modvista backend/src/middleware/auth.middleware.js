const jwt = require('jsonwebtoken');
const User = require('../models/User.model');

const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            req.user = await User.findById(decoded.id).select('-password');
            if (!req.user) return res.status(401).json({ message: 'Not authorized, user not found' });

            if (req.user.isBlocked) {
                return res.status(403).json({ success: false, message: "Account blocked" });
            }

            if (req.user.isActive === false) {
                return res.status(403).json({ success: false, message: "Account deactivated" });
            }

            return next();
        } catch (err) {
            return res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }

    return res.status(401).json({ message: 'Not authorized, no token' });
};

const adminOnly = (req, res, next) => {
    if (req.user && req.user.role === 'admin') return next();
    return res.status(403).json({ message: 'Admin only' });
};

module.exports = { protect, adminOnly };
