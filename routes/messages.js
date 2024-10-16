// routes/messages.js
import express from 'express';
import { Message } from '../models.js'; // Import model Message

const router = express.Router();

// Endpoint để lấy danh sách tin nhắn theo roomId và userName
router.get('/', async (req, res) => {
    const { roomId, userId } = req.query;

    if (!roomId || !userId) {
        return res.status(400).json({ error: 'roomId and userID are required' });
    }

    try {
        const messages = await Message.find({ room: roomId, userId }).sort({ time: 1 });
        res.status(200).json(messages);
    } catch (error) {
        console.error('Error retrieving messages:', error);
        res.status(500).json({ error: 'An error occurred while retrieving messages' });
    }
});

export default router;