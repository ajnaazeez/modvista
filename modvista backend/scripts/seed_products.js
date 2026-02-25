const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Product = require('../src/models/Product.model');
const Category = require('../src/models/Category.model');

const sampleProducts = [
    {
        name: 'Carbon Fiber GT Wing',
        description: 'High-quality 3K twill carbon fiber rear wing for improved downforce and aggressive styling.',
        price: 850.00,
        categoryName: 'Exterior Mods',
        stock: 12,
        rating: 4.8,
        images: ['https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&q=80&w=800']
    },
    {
        name: 'Forged Alloy Wheels V1',
        description: 'Lightweight forged wheels, 19-inch, matte black finish. Set of 4.',
        price: 2400.00,
        categoryName: 'Exterior Mods',
        stock: 5,
        rating: 4.9,
        images: ['https://images.unsplash.com/photo-1550064824-8f993041ffd3?auto=format&fit=crop&q=80&w=800']
    },
    {
        name: 'Racing Cockpit Seat',
        description: 'FIA approved racing bucket seat with Alcantara finish and side supports.',
        price: 1200.00,
        categoryName: 'Interior Precision',
        stock: 8,
        rating: 4.7,
        images: ['https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&q=80&w=800']
    },
    {
        name: 'Digital LED Steering Wheel',
        description: 'Custom carbon fiber steering wheel with integrated shift lights and performance display.',
        price: 950.00,
        categoryName: 'Interior Precision',
        stock: 15,
        rating: 4.6,
        images: ['https://images.unsplash.com/photo-1536691663765-82a012715fb3?auto=format&fit=crop&q=80&w=800']
    },
    {
        name: 'Stage 2 Turbo Kit',
        description: 'Complete bolt-on turbocharger upgrade kit. Adds up to 150HP.',
        price: 4500.00,
        categoryName: 'Performance',
        stock: 3,
        rating: 4.9,
        images: ['https://images.unsplash.com/photo-1493238507151-c0a6b63d0c91?auto=format&fit=crop&q=80&w=800']
    },
    {
        name: 'Cold Air Intake System',
        description: 'High-flow air intake for better engine breathing and sound.',
        price: 350.00,
        categoryName: 'Performance',
        stock: 25,
        rating: 4.5,
        images: ['https://images.unsplash.com/photo-1486496572940-2bb2341fdbdf?auto=format&fit=crop&q=80&w=800']
    }
];

const seedProducts = async () => {
    try {
        if (!process.env.MONGODB_URI) {
            throw new Error("MONGODB_URI is not defined in .env");
        }
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB for product seeding...');

        for (const pData of sampleProducts) {
            try {
                // Find category ID
                const category = await Category.findOne({ name: pData.categoryName });
                if (!category) {
                    console.warn(`Category not found: ${pData.categoryName}. Skipping product: ${pData.name}`);
                    continue;
                }

                const { categoryName, ...productPayload } = pData;
                productPayload.category = category._id;

                await Product.updateOne(
                    { name: pData.name },
                    { $set: productPayload },
                    { upsert: true }
                );
                console.log(`Synced product: ${pData.name} in category ${pData.categoryName}`);
            } catch (innerError) {
                console.error(`Failed to sync product ${pData.name}:`, innerError.message);
            }
        }

        console.log('Product seeding complete!');
        process.exit(0);
    } catch (error) {
        console.error('CRITICAL Error seeding products:', error.message);
        process.exit(1);
    }
};

seedProducts();
