/**
 * Middleware to validate coupon input data using vanilla JavaScript
 */
exports.validateCoupon = (req, res, next) => {
    const {
        code,
        discountValue,
        startDate,
        endDate,
        minProductPrice
    } = req.body;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Code validation
    if (!code || typeof code !== 'string' || code.trim() === '') {
        return res.status(400).json({ success: false, message: 'Coupon code required' });
    }
    const trimmedCode = code.trim().toUpperCase();

    // 2. Discount Value (forced FLAT)
    const val = parseFloat(discountValue);
    if (isNaN(val) || val <= 0) {
        return res.status(400).json({ success: false, message: 'Discount must be greater than 0' });
    }

    // 3. Min Product Price (Slab)
    const minProd = parseFloat(minProductPrice || 0);
    if (isNaN(minProd) || minProd < 0) {
        return res.status(400).json({ success: false, message: 'Min product price must be >= 0' });
    }

    // 4. Dates
    if (!startDate) {
        return res.status(400).json({ success: false, message: 'Start date must be today or later' });
    }
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    if (isNaN(start.getTime())) {
        return res.status(400).json({ success: false, message: 'Invalid start date format' });
    }
    // Compare date strings to ignore time/timezone issues for "today"
    const todayStr = today.toISOString().split('T')[0];
    const startStr = start.toISOString().split('T')[0];
    if (startStr < todayStr) {
        return res.status(400).json({ success: false, message: 'Start date must be today or later' });
    }

    if (!endDate) {
        return res.status(400).json({ success: false, message: 'End date must be today or later' });
    }
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    if (isNaN(end.getTime())) {
        return res.status(400).json({ success: false, message: 'Invalid end date format' });
    }
    const endStr = end.toISOString().split('T')[0];
    if (endStr < todayStr) {
        return res.status(400).json({ success: false, message: 'End date must be today or later' });
    }
    if (end < start) {
        return res.status(400).json({ success: false, message: 'Start date should not be greater than end date' });
    }

    // Sanitize and set defaults for aggressive simplification
    req.body.code = trimmedCode;
    req.body.discountType = "FLAT";
    req.body.discountValue = val;
    req.body.minProductPrice = minProd;
    req.body.title = "";
    req.body.description = "";
    req.body.minOrderAmount = 0;
    req.body.maxDiscount = null;
    req.body.usageLimit = null;
    req.body.isActive = true;

    next();
};
