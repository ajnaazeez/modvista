const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const Product = require('./src/models/Product.model');

async function checkProducts() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const products = await Product.find().limit(5);
        console.log('Total Products checked:', products.length);

        products.forEach(p => {
            console.log(`Product: ${p.name}`);
            console.log(`- ID: ${p._id}`);
            console.log(`- Images:`, p.images);
            console.log(`- Has images property: ${Object.prototype.hasOwnProperty.call(p.toObject(), 'images')}`);
            console.log('-------------------');
        });

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkProducts();
