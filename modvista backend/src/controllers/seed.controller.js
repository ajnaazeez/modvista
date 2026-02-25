const Product = require('../models/Product.model');
const Offer = require('../models/Offer.model');
const Coupon = require('../models/Coupon.model');

const seedProducts = async (req, res) => {
    try {
        await Product.deleteMany({});

        const products = [
            {
                name: "Forged Carbon Rims V12",
                description: "Ultra-lightweight forged carbon fiber rims for superior performance and style.",
                price: 2499.00,
                images: ["assets/Gemini_Generated_Image_8hc4oj8hc4oj8hc4 - Copy.png"],
                stock: 10,
                rating: 5.0,
                numReviews: 12
            },
            {
                name: "Carbon Fiber Wing - GT Pro",
                description: "Aerodynamic GT Pro wing made from high-grade carbon fiber.",
                price: 850.00,
                images: ["assets/Gemini_Generated_Image_azgoosazgoosazgo.png"],
                stock: 5,
                rating: 4.8,
                numReviews: 8
            },
            {
                name: "Matrix LED Headlights - Laser V2",
                description: "Advanced matrix LED headlights with laser technology for night visibility.",
                price: 1899.00,
                images: ["assets/Gemini_Generated_Image_6zz6za6zz6za6zz6.png"],
                stock: 8,
                rating: 4.9,
                numReviews: 15
            },
            {
                name: "Racing Alcantara Seat - GT-X",
                description: "Premium racing seat upholstered in Alcantara for maximum grip and comfort.",
                price: 1200.00,
                images: ["assets/Gemini_Generated_Image_5mip4f5mip4f5mip.png"],
                stock: 12,
                rating: 5.0,
                numReviews: 20
            },
            {
                name: "Performance Alloy Wheels - X7",
                description: "High-performance alloy wheels designed for speed and durability.",
                price: 1899.00,
                images: ["assets/ChatGPT Image Jan 22, 2026, 04_34_54 PM.png"],
                stock: 15,
                rating: 4.7,
                numReviews: 10
            },
            {
                name: "Wide Body Kit - Aggressive",
                description: "Complete wide body kit to transform the look of your vehicle.",
                price: 3499.00,
                images: ["assets/ChatGPT Image Jan 22, 2026, 04_41_41 PM.png"],
                stock: 3,
                rating: 4.9,
                numReviews: 5
            }
        ];

        await Product.insertMany(products);

        res.json({ message: "Seeded products", count: products.length, products });
    } catch (error) {
        console.error("Seed Error:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

const seedOffersCoupons = async (req, res) => {
    try {
        await Offer.deleteMany({});
        await Coupon.deleteMany({});

        const offers = [
            {
                title: "New Year Mega Sale",
                discountType: "percentage",
                value: 20,
                applicable: "all",
                startDate: new Date(),
                endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
                autoApply: true,
                isActive: true
            },
            {
                title: "Interior Upgrade Special",
                discountType: "flat",
                value: 150,
                applicable: "interior",
                startDate: new Date(),
                endDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
                autoApply: true,
                isActive: true
            }
        ];

        const coupons = [
            {
                code: "WELCOME10",
                discType: "percentage",
                discValue: 10,
                minOrder: 0,
                usageLimit: 1000,
                expiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
                isActive: true
            },
            {
                code: "MODFIRST500",
                discType: "flat",
                discValue: 500,
                minOrder: 2500,
                maxDiscount: 500,
                usageLimit: 100,
                expiry: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
                isActive: true
            },
            {
                code: "FESTIVE25",
                discType: "percentage",
                discValue: 25,
                minOrder: 1500,
                maxDiscount: 1000,
                usageLimit: 500,
                expiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                isActive: true
            },
            {
                code: "SUPER20",
                discType: "percentage",
                discValue: 20,
                minOrder: 5000,
                usageLimit: 200,
                expiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                isActive: true
            },
            {
                code: "OFFER100",
                discType: "flat",
                discValue: 100,
                minOrder: 1000,
                usageLimit: 500,
                expiry: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
                isActive: true
            },
            {
                code: "WINTER50",
                discType: "percentage",
                discValue: 50,
                minOrder: 10000,
                maxDiscount: 2000,
                usageLimit: 50,
                expiry: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
                isActive: true
            },
            {
                code: "RACING30",
                discType: "percentage",
                discValue: 30,
                minOrder: 3000,
                usageLimit: 150,
                expiry: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
                isActive: true
            },
            {
                code: "EXPIRED24",
                discType: "percentage",
                discValue: 50,
                minOrder: 1000,
                usageLimit: 10,
                expiry: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
                isActive: true
            }
        ];

        await Offer.insertMany(offers);
        await Coupon.insertMany(coupons);

        res.json({
            success: true,
            message: "Seeded offers and coupons",
            offersCount: offers.length,
            couponsCount: coupons.length
        });
    } catch (error) {
        console.error("Seed Error:", error);
        res.status(500).json({ success: false, message: "Server Error", error: error.message });
    }
};

module.exports = { seedProducts, seedOffersCoupons };
