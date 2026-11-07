import mongoose from 'mongoose';
import dns from 'dns';

// Ensure DNS resolver can resolve MongoDB Atlas SRV records reliably
try {
    const existing = dns.getServers();
    dns.setServers(['1.1.1.1', '8.8.8.8', ...existing.filter(s => s !== '1.1.1.1' && s !== '8.8.8.8')]);
} catch (e) {
    // Keep system defaults if cannot override
}

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

    // Check for missing or placeholder URI
    if (!process.env.MONGO_URI || process.env.MONGO_URI.includes('REPLACE_WITH')) {
        const errorMsg = !process.env.MONGO_URI
            ? 'MONGO_URI is missing from environment variables.'
            : 'MONGO_URI contains placeholder "REPLACE_WITH_MY_SUPERVISOR_PROVIDED_MONGODB_URI". Please insert your supervisor-provided MongoDB connection string into backend/.env.';
        console.error(`✗ MongoDB Configuration Error: ${errorMsg}`);
        throw new Error(errorMsg);
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
        throw error;
    }
};

export default connectDB;
