const mongoose = require('mongoose');
const Product = require('./src/models/Product.model');
const Category = require('./src/models/Category.model');
const Order = require('./src/models/Order.model');
const Coupon = require('./src/models/Coupon.model');
const dotenv = require('dotenv');
dotenv.config();

async function checkCounts() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        const pCount = await Product.countDocuments();
        const cCount = await Category.countDocuments();
        const oCount = await Order.countDocuments();
        const cpCount = await Coupon.countDocuments();

        console.log('--- Counts ---');
        console.log('Products:', pCount);
        console.log('Categories:', cCount);
        console.log('Orders:', oCount);
        console.log('Coupons:', cpCount);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkCounts();
