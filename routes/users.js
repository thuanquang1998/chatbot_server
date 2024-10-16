// routes/users.js
import express from 'express';
import { User } from '../models.js'; // Import model User

const router = express.Router();

// Endpoint để lấy tất cả người dùng
router.get('/', async (req, res) => {
    try {
        const users = await User.find(); // Lấy tất cả người dùng từ DB
        res.status(200).json(users);
    } catch (error) {
        console.error('Error retrieving users:', error);
        res.status(500).json({ error: 'An error occurred while retrieving users' });
    }
});

export default router;