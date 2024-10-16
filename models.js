// models.js
import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
    room: { type: String, required: true },
    userId: { type: String, required: true },
    userName: { type: String, required: true },
    message: { type: String, required: true },
    time: { type: Date, default: Date.now }
});


const userSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    name: { type: String, required: true },
    room: { type: String, required: true }
});

export const Message = mongoose.model('Message', messageSchema);
export const User = mongoose.model('User', userSchema);