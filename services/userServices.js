import { User } from '../models.js';


const userServices = {
    
}
// Activate a user and save to MongoDB
 async function activateUser(id, name, room) {
    const user = new User({ id, name, room });

    // Save or update the user in the database
    await User.findOneAndUpdate({ id }, user, { upsert: true, new: true });
    return user;
}

// Remove a user from MongoDB
async function userLeavesApp(id) {
    await User.deleteOne({ id });
}

// Get a user from MongoDB
async function getUser(id) {
    return await User.findOne({ id });
}

// Get users in a room from MongoDB
async function getUsersInRoom(room) {
    return await User.find({ room });
}

// Get all active rooms from MongoDB
async function getAllActiveRooms() {
    const users = await User.find();
    return Array.from(new Set(users.map(user => user.room)));
}