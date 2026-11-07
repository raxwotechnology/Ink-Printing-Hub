import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User.js';
import connectDB from './src/config/db.js';

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const createAdmin = async () => {
    try {
        await connectDB();
        console.log('Connected to MongoDB');

        let adminUser = await User.findOne({ email: 'admin@admin.com' });
        
        if (adminUser) {
            console.log('Admin user exists. Resetting password and ensuring active status...');
            adminUser.password = 'password123';
            adminUser.isActive = true;
            await adminUser.save();
        } else {
            console.log('Creating new admin user...');
            adminUser = new User({
                firstName: 'Super',
                lastName: 'Admin',
                email: 'admin@admin.com',
                password: 'password123',
                role: 'admin',
                isActive: true
            });
            await adminUser.save();
        }

        console.log('Admin user updated/created successfully!');
        console.log('Email: admin@admin.com');
        console.log('Password: password123');

        process.exit(0);
    } catch (error) {
        console.error('Error creating admin user:', error);
        process.exit(1);
    }
};

createAdmin();
