const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload.middleware');
const { protect, adminOnly } = require('../middleware/auth.middleware');

// POST /api/admin/upload -> Uploads images and returns paths
// Protected: Admin only
router.post('/', protect, adminOnly, upload.array('images', 3), (req, res) => {
    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ message: 'No image files uploaded' });
    }

    // Return paths relative to server root
    const imagePaths = req.files.map(file => `uploads/${file.filename}`);

    res.json({
        message: 'Images uploaded successfully',
        images: imagePaths
    });
});

module.exports = router;
