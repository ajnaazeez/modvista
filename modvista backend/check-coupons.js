const mongoose = require('mongoose');
const path = require('path');
const Coupon = require('./src/models/Coupon.model');

const MONGO_URI = "mongodb://localhost:27017/modvista";

const checkCoupons = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        const now = new Date();
        console.log('Current server time:', now.toISOString());

        const coupons = await Coupon.find({});
        console.log(`Found ${coupons.length} total coupons`);

        coupons.forEach(c => {
            const isStarted = c.startDate <= now;
            const isNotExpired = c.endDate >= now;
            console.log(`- [${c.code}] Active: ${c.isActive}, Start: ${c.startDate.toISOString()}, End: ${c.endDate.toISOString()}`);
            console.log(`  Started: ${isStarted}, Not Expired: ${isNotExpired}, Usage: ${c.usedCount}/${c.usageLimit || '∞'}`);
        });

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

checkCoupons();
