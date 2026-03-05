const mongoose = require('mongoose');
const Product = require('./src/models/Product.model');
const QueryFeatures = require('./src/utils/QueryFeatures');
require('dotenv').config();

async function testFullRequest() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        const queryString = { 'price[gte]': '1000', 'price[lte]': '2000' };
        console.log('Testing query:', queryString);

        const features = new QueryFeatures(Product.find(), queryString)
            .filter();

        console.log('Final Mongoose Filter:', JSON.stringify(features.query.getFilter(), null, 2));

        const products = await features.query;
        console.log('Found Products Count:', products.length);
        products.forEach(p => console.log(`- ${p.name}: ${p.price}`));

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

testFullRequest();
