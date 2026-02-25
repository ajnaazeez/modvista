const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Offer = require('./src/models/Offer.model');

// Load env vars
dotenv.config({ path: __dirname + '/.env' });

console.log('Loading .env from:', __dirname + '/.env');
console.log('MONGO_URI exists:', !!process.env.MONGO_URI);

const connectDB = async () => {
    try {
        const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
        if (!uri) throw new Error('MONGODB_URI is undefined');
        const conn = await mongoose.connect(uri);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

const updateOffers = async () => {
    await connectDB();

    try {
        // 1. Update or Create "Interior" Offer
        const interiorOfferData = {
            title: 'Interior Upgrades Special',
            discountType: 'percentage',
            value: 15,
            applicable: 'interior',
            autoApply: true,
            isActive: true,
            bannerImage: 'assets/interior-offer-banner.png'
        };

        let interiorOffer = await Offer.findOne({ title: interiorOfferData.title });
        if (interiorOffer) {
            interiorOffer.bannerImage = interiorOfferData.bannerImage;
            interiorOffer.applicable = interiorOfferData.applicable;
            await interiorOffer.save();
            console.log('Updated Interior Offer');
        } else {
            await Offer.create(interiorOfferData);
            console.log('Created Interior Offer');
        }

        // 2. Create or Update "New Year" Offer
        const newYearOfferData = {
            title: 'New Year Special',
            discountType: 'flat',
            value: 500,
            applicable: 'all',
            autoApply: true,
            isActive: true,
            bannerImage: 'assets/new-year-offer-banner.png',
            startDate: new Date('2026-01-01'),
            endDate: new Date('2026-02-28') // Extended for visibility
        };

        let newYearOffer = await Offer.findOne({ title: newYearOfferData.title });
        if (newYearOffer) {
            newYearOffer.bannerImage = newYearOfferData.bannerImage;
            newYearOffer.endDate = newYearOfferData.endDate; // Ensure it's valid
            await newYearOffer.save();
            console.log('Updated New Year Offer');
        } else {
            await Offer.create(newYearOfferData);
            console.log('Created New Year Offer');
        }

        console.log('Offers updated successfully');
        process.exit();
    } catch (error) {
        console.error('Error updating offers:', error);
        process.exit(1);
    }
};

updateOffers();
