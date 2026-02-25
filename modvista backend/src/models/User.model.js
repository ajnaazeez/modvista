console.log("✅ User.model loaded from:", __filename);
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: function () {
            return !this.googleId; // Password required only if not a Google user
        }
    },
    phone: {
        type: String,
        required: function () {
            return !this.googleId; // Phone required only if not a Google user
        }
    },
    googleId: {
        type: String,
        unique: true,
        sparse: true // Allows multiple null/missing values but enforces uniqueness for non-nulls
    },
    role: {
        type: String,
        enum: ["user", "admin"],
        default: "user"
    },
    isAdmin: {
        type: Boolean,
        default: false
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    otpHash: {
        type: String
    },
    otpExpires: {
        type: Date
    },
    avatarUrl: {
        type: String,
        default: ""
    },
    isBlocked: {
        type: Boolean,
        default: false
    },
    isActive: {
        type: Boolean,
        default: true
    },
    walletBalance: {
        type: Number,
        default: 0,
        min: 0
    }
}, {
    timestamps: true
});

userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// userSchema.pre('save', async function (next) {
//     if (!this.isModified('password')) {
//         return next();
//     }
// 
//     // If it's already a bcrypt hash, don't hash it again
//     if (this.password.startsWith('$2')) {
//         return next();
//     }
// 
//     const salt = await bcrypt.genSalt(10);
//     this.password = await bcrypt.hash(this.password, salt);
//     next();
// });

module.exports = mongoose.model('User', userSchema);
