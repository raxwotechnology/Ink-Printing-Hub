import mongoose from 'mongoose';

let isConnecting = null;

const connectDB = async () => {
    // If already connected, return existing connection
    if (mongoose.connection.readyState === 1) {
        return mongoose.connection;
    }

    // If currently in the middle of connecting, await the promise
    if (isConnecting) {
        return isConnecting;
    }

    try {
        isConnecting = mongoose.connect(process.env.MONGO_URI);
        const conn = await isConnecting;
        isConnecting = null;
        console.log(`✓ MongoDB Connected: ${conn.connection.host}`);
        return conn;
    } catch (error) {
        isConnecting = null;
        console.error(`✗ MongoDB Connection Error: ${error.message}`);
        if (!process.env.VERCEL) {
            process.exit(1);
        }
        throw error;
    }
};

export default connectDB;
