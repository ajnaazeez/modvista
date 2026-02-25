const mongoose = require('mongoose');
const dotenv = require('dotenv');

const uri = "mongodb://localhost:27017/modvista";

const fixCartIndex = async () => {
    try {
        await mongoose.connect(uri);
        console.log('MongoDB Connected');

        const db = mongoose.connection.db;
        const collection = db.collection('carts');

        // 1. Drop the bad index if it exists
        try {
            await collection.dropIndex('userId_1');
            console.log('Dropped index: userId_1');
        } catch (error) {
            console.log('Index userId_1 not found or already dropped.');
        }

        // 2. Clean up bad documents
        const result = await collection.deleteMany({ userId: null });
        console.log(`Deleted ${result.deletedCount} documents with userId: null`);

        // Also cleanup documents where 'user' might be missing if schema allows (it shouldn't but good to be safe)
        const result2 = await collection.deleteMany({ user: null });
        console.log(`Deleted ${result2.deletedCount} documents with user: null`);

        // 3. List remaining indexes
        const indexes = await collection.indexes();
        console.log('Remaining Indexes:', indexes);

        process.exit();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

fixCartIndex();
