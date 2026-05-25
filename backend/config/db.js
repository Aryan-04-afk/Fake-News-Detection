const { MongoClient } = require('mongodb');

let db = null;

async function connectDB() {
    try {
        const client = new MongoClient(process.env.MONGODB_URI);
        await client.connect();
        db = client.db('fakenewsdetector');
        console.log('Connected to MongoDB Atlas');

        // Create indexes
        await db.collection('users').createIndex({ email: 1 }, { unique: true });
        await db.collection('analyses').createIndex({ userEmail: 1, createdAt: -1 });

        return db;
    } catch (error) {
        console.error('MongoDB connection error:', error);
        throw error;
    }
}

function getDB() {
    return db;
}

module.exports = { connectDB, getDB };
