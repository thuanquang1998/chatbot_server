import express from 'express'
import { Server } from "socket.io"
import path from 'path'
import { fileURLToPath } from 'url'
import cors from 'cors';
import { connectDB } from './db.js'; // Import DB functions
import { User, Message } from './models.js';
import bodyParser from 'body-parser';
import messagesRoute from './routes/messages.js';

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const PORT = process.env.PORT || 3500
const ADMIN = "Admin"

const app = express()

app.use(express.static(path.join(__dirname, "public")))
app.use(express.json());
app.use(cors());
app.use(bodyParser.urlencoded ({
    extended: true
}));
app.use('/api/messages', messagesRoute);



const expressServer = app.listen(PORT, async () => {
    await connectDB(); // Connect to MongoDB
    console.log(`Listening on port ${PORT}`)
})

const io = new Server(expressServer, {
    // cors: {
    //     origin: process.env.NODE_ENV === "production" ? false : ["http://localhost:5500", "http://127.0.0.1:5500", "'http://localhost:3000'"]
    // },
    cors: {
        origin: ['http://localhost:3000', "http://localhost:5500", "http://127.0.0.1:5500", "http://localhost:5173"], // Cho phép domain này
        methods: "*", // Các phương thức được hỗ trợ
    }
})

io.on('connection', socket => {
    console.log(`User ${socket.id} connected`)

    // Upon connection - only to user 
    socket.emit('message', buildMsg(ADMIN, "Welcome to Chat App!"))

    socket.on('enterRoom', async ({ name, room, userId }) => {
        // Lấy phòng trước đó của người dùng
        let existedUser = await getUser(userId);

        if(existedUser) {
            const prevRoom = existedUser ? existedUser.room : null;
            
            // Nếu có phòng trước đó, người dùng sẽ rời khỏi
            if (prevRoom) {
                socket.leave(prevRoom);
                io.to(prevRoom).emit('message', buildMsg(ADMIN, `${name} has left the room`));
            }
            // Cập nhật danh sách người dùng trong phòng trước đó
            if (prevRoom) {
                const usersInPrevRoom = await getUsersInRoom(prevRoom);
                io.to(prevRoom).emit('userList', { users: usersInPrevRoom });
            }

            // Người dùng tham gia phòng mới
            socket.join(existedUser.room);
            // Thông báo cho người dùng đã tham gia
            socket.emit('message', buildMsg(ADMIN, `You have joined the ${existedUser.room} chat room`));
            // Thông báo cho tất cả mọi người khác
            socket.broadcast.to(existedUser.room).emit('message', buildMsg(ADMIN, `${existedUser.name} has joined the room`));
            // Cập nhật danh sách người dùng cho phòng mới
            const usersInNewRoom = await getUsersInRoom(existedUser.room);
            io.to(existedUser.room).emit('userList', { users: usersInNewRoom });
        
            // Cập nhật danh sách phòng cho tất cả mọi người
            const rooms = await getAllActiveRooms();
            io.emit('roomList', { rooms });
    
        } else {
            // Tạo người dùng mới
            const user = await activateUser(userId, name, room);
            // Người dùng tham gia phòng mới
            socket.join(user.room);
            // Thông báo cho người dùng đã tham gia
            socket.emit('message', buildMsg(ADMIN, `You have joined the ${user.room} chat room`));
            // Thông báo cho tất cả mọi người khác
            socket.broadcast.to(user.room).emit('message', buildMsg(ADMIN, `${user.name} has joined the room`));
            // Cập nhật danh sách người dùng cho phòng mới
            const usersInNewRoom = await getUsersInRoom(user.room);
            io.to(user.room).emit('userList', { users: usersInNewRoom });
        
            // Cập nhật danh sách phòng cho tất cả mọi người
            const rooms = await getAllActiveRooms();
            io.emit('roomList', { rooms });
        }
    });

    // When user disconnects - to all others 
    socket.on('disconnect', async () => {
        // Lấy thông tin người dùng từ MongoDB
        const user = await getUser(socket.id);
        
        // Xóa người dùng khỏi cơ sở dữ liệu
        await userLeavesApp(socket.id);
    
        if (user) {
            // Phát thông điệp cho phòng mà người dùng đã rời
            io.to(user.room).emit('message', buildMsg(ADMIN, `${user.name} has left the room`));
    
            // Cập nhật danh sách người dùng trong phòng
            const usersInRoom = await getUsersInRoom(user.room);
            io.to(user.room).emit('userList', { users: usersInRoom });
    
            // Cập nhật danh sách phòng cho tất cả mọi người
            const rooms = await getAllActiveRooms();
            io.emit('roomList', { rooms });
        }
    
        console.log(`User ${socket.id} disconnected`);
    });

    // Listening for a message event 
    socket.on('message', async ({ name, text, userId }) => {
        const user = await getUser(userId);
        const room = user ? user.room : null;
        console.log("room ",room, "userId ", userId);
        
        if (room) {
            // Tạo và phát tin nhắn cho phòng
            io.to(room).emit('message', buildMsg(name, text));
    
            // (Tùy chọn) Lưu tin nhắn vào cơ sở dữ liệu MongoDB
            await saveMessageToDatabase(room, userId, name, text);
        }
    });
    // Listen for activity 
    socket.on('activity', async (name, userId) => {
        console.log("userId ",userId);
        const user = await getUser(userId);
        const room = user ? user.room : null;
        console.log("room ",room);
        
        if (room) {
            // Phát thông báo hoạt động đến phòng
            socket.broadcast.to(room).emit('activity', name);
        }

        // Ghi lại hoạt động của người dùng (Tùy chọn)
        console.log("User activity in room:", room, "by:", name);
    });
})

function buildMsg(name, text) {
    return {
        name,
        text,
        time: new Intl.DateTimeFormat('default', {
            hour: 'numeric',
            minute: 'numeric',
            second: 'numeric'
        }).format(new Date())
    }
}


// userServices
// Activate a user and save to MongoDB
async function activateUser(userId, name, room) {
    console.log("userId, name, room:", userId, name, room);
    const user = { userId, name, room };

    try {
        const updatedUser = await User.findOneAndUpdate(
            { userId, name },
            user,
            { upsert: true, new: true }
        );
        console.log("Updated User:", updatedUser);
        return updatedUser;
    } catch (error) {
        console.error('Error saving or updating user:', error);
        throw error;
    }
}
// Remove a user from MongoDB
async function userLeavesApp(id) {
    console.log("userLeavesApp ", id);
    // await User.deleteOne({ id });
}

// Get a user from MongoDB
async function getUser(userId) {
    return await User.findOne({ userId });
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

async function saveMessageToDatabase(room, userId, userName, message) {
    const msg = new Message({ room, userId, userName, message });
    await msg.save();
}