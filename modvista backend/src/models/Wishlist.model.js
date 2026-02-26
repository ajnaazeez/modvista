const mongoose = require('mongoose');

const wishlistSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    products: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product'
    }]
}, {
    timestamps: true
});

const Wishlist = mongoose.model('Wishlist', wishlistSchema);

// Cleanup: Drop legacy index if it exists to prevent E11000 errors on old field names
Wishlist.collection.dropIndex('userId_1').catch(err => {
    // Silently ignore if index doesn't exist
    if (err.codeName !== 'IndexNotFound') {
        console.warn('Note: Could not drop legacy wishlist index:', err.message);
    }
});

module.exports = Wishlist;
