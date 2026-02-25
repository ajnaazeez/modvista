const mongoose = require('mongoose');
const slugify = require('slugify');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Category = require('../src/models/Category.model');

const categories = [
    {
        name: 'Exterior Mods',
        description: 'Aerodynamics, body kits, spoilers, and custom lighting.',
        isActive: true
    },
    {
        name: 'Interior Precision',
        description: 'Racing seats, custom steering wheels, and ambient electronics.',
        isActive: true
    },
    {
        name: 'Performance',
        description: 'Turbochargers, exhaust systems, and engine tuning.',
        isActive: true
    }
];

const seedCategories = async () => {
    try {
        if (!process.env.MONGODB_URI) {
            throw new Error("MONGODB_URI is not defined in .env");
        }
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB for seeding...');

        for (const catData of categories) {
            try {
                const slug = slugify(catData.name, { lower: true });
                await Category.updateOne(
                    { name: catData.name },
                    {
                        $set: {
                            ...catData,
                            slug: slug
                        }
                    },
                    { upsert: true }
                );
                console.log(`Synced category: ${catData.name} (${slug})`);
            } catch (innerError) {
                console.error(`Failed to sync category ${catData.name}:`, innerError.message);
            }
        }

        console.log('Seeding complete!');
        process.exit(0);
    } catch (error) {
        console.error('CRITICAL Error seeding categories:', error.message);
        process.exit(1);
    }
};

seedCategories();
