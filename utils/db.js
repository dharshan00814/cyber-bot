const mongoose = require('mongoose');

mongoose.set('bufferCommands', false);

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 5000,
            connectTimeoutMS: 5000,
        });
        console.log('MongoDB Connected successfully!');
    } catch (error) {
        console.error('Error connecting to MongoDB:', error.message);
        console.warn('Bot will continue running without database. Some features may not work.');
    }
};

module.exports = connectDB;
