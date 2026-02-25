const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const connectDB = require('./src/config/db');
const { errorHandler } = require('./src/middleware/error.middleware');

dotenv.config();

// Connect to Database
connectDB();

const app = express();

// Middleware
// Middleware
const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl) and localhost:5000 itself
        if (!origin || origin === 'null') return callback(null, true);

        const allowedOrigins = [
            "http://127.0.0.1:5500",
            "http://localhost:5500",
            "http://localhost:5000",
            "http://127.0.0.1:5000"
        ];
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            console.log('Blocked CORS origin:', origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());

// Serve Static Uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve Admin Frontend
app.use('/admin', express.static(path.join(__dirname, '../modvista frontend/Modvista admin')));

// Serve User Frontend (Root)
app.use(express.static(path.join(__dirname, '../modvista frontend/ModVista user')));

// API Routes
app.use('/api/admin/upload', require('./src/routes/upload.routes'));
app.use('/api/admin/auth', require('./src/routes/adminAuth.routes'));
app.use('/api/auth', require('./src/routes/auth.routes'));
app.use('/api/products', require('./src/routes/product.routes'));
app.use('/api/admin', require('./src/routes/adminProduct.routes'));
app.use('/api/categories', require('./src/routes/category.routes'));
app.use('/api/admin', require('./src/routes/adminCategory.routes'));
app.use('/api/cart', require('./src/routes/cart.routes'));
app.use('/api/wishlist', require('./src/routes/wishlist.routes'));
app.use('/api/addresses', require('./src/routes/address.routes'));
app.use('/api/orders', require('./src/routes/order.routes'));
app.use('/api/checkout', require('./src/routes/checkout.routes'));
app.use('/api/razorpay', require('./src/routes/razorpay.routes'));
app.use('/api/public', require('./src/routes/public.routes'));
app.use('/api/wallet', require('./src/routes/wallet.routes'));
app.use('/api/users', require('./src/routes/user.routes'));
app.use('/api/admin', require('./src/routes/admin.user.routes'));
app.use('/api/admin', require('./src/routes/admin.order.routes'));
app.use('/api/admin/coupons', require('./src/routes/adminCoupon.routes'));
app.use('/api/admin', require('./src/routes/admin.offerCoupon.routes'));
app.use('/api/admin/dashboard', require('./src/routes/admin.dashboard.routes'));
app.use('/api/admin/analytics', require('./src/routes/adminAnalytics.routes'));
app.use('/api/analytics', require('./src/routes/analytics.routes'));
app.use('/api/coupons', require('./src/routes/public.offerCoupon.routes'));
app.use('/api', require('./src/routes/public.offerCoupon.routes'));
app.use('/api/vehicles', require('./src/routes/vehicle.routes'));
app.use('/api/seed', require('./src/routes/seed.routes'));

// Error Middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`)); // Restored
