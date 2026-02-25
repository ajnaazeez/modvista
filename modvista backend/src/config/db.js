const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI);
        console.log(`MongoDB Connected: ${conn.connection.host}`);

        // Detect Transaction Support (Replica Set or Sharded Cluster)
        try {
            const hello = await mongoose.connection.db.admin().command({ hello: 1 });
            mongoose.connection.transactionSupport = !!(hello.setName || hello.msg === 'isdbgrid');

            if (mongoose.connection.transactionSupport) {
                console.log('MongoDB Transactions supported');
            } else {
                console.log('MongoDB Transactions NOT supported (Standalone) - using fallback mode');
            }
        } catch (err) {
            console.log('Could not detect transaction support, defaulting to false');
            mongoose.connection.transactionSupport = false;
        }
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

module.exports = connectDB;
