const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    fullName: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        required: true,
        validate: {
            validator: function (v) {
                return /^\d{10}$/.test(v);
            },
            message: props => `${props.value} is not a valid 10-digit phone number!`
        }
    },
    house: {
        type: String,
        required: true
    },
    street: {
        type: String,
        required: true
    },
    city: {
        type: String,
        required: true
    },
    state: {
        type: String,
        required: true
    },
    pincode: {
        type: String,
        required: true,
        validate: {
            validator: function (v) {
                return /^\d{5,6}$/.test(v);
            },
            message: props => `${props.value} is not a valid pincode! (Must be 5 or 6 digits)`
        }
    },
    type: {
        type: String,
        enum: ["Home", "Work", "Other"],
        default: "Home"
    },
    landmark: {
        type: String
    },
    isDefault: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Address', addressSchema);
