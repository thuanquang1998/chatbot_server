// src/db.js
import mongoose from 'mongoose';

const uri = "mongodb+srv://thuanquang2009:yCXUNmBa9MqAkKAB@cluster0.0cds4.mongodb.net/?retryWrites=true&w=majority";

export const connectDB = async () => {
    try {
        await mongoose.connect(uri, { useUnifiedTopology: true });
        console.log('Connected to MongoDB');
    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
        process.exit(1);
    }
};