const mongoose = require('mongoose');
const slugify = require('slugify');

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please add a category name'],
        unique: true,
        trim: true,
        maxlength: [50, 'Name can not be more than 50 characters']
    },
    slug: {
        type: String,
        unique: true,
        lowercase: true
    },
    description: {
        type: String,
        default: ""
    },
    image: {
        type: String,
        default: "" // URL or path
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Create slug from name
categorySchema.pre('save', function () {
    if (this.isModified('name')) {
        const slugify = require('slugify');
        this.slug = slugify(this.name, { lower: true });
    }
});

module.exports = mongoose.model('Category', categorySchema);
