const mongoose = require('mongoose');
require('dotenv').config();
const Product = require('./src/models/Product.model');

async function check() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const products = await Product.find({ images: { $exists: true, $not: { $size: 0 } } }).limit(10);
        console.log('Found ' + products.length + ' products with images');
        products.forEach(p => {
            console.log(`Product: ${p.name}, Images: ${JSON.stringify(p.images)}`);
        });
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
check();
