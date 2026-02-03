const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);

const PORT = process.env.PORT || 3001;

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// --- STATE ---
let waitingQueue = [];
const userUsage = {}; 
const DAILY_LIMIT = 10;

function leaveRoom(socket) {
  const roomID = Array.from(socket.rooms).find((r) => r.startsWith("room_"));

  if (roomID) {

    socket.to(roomID).emit("receive_message", {
      sender: "System",
      message: "The stranger has left the chat. 🚪",
    });
    socket.to(roomID).emit("partner_left"); 

    socket.leave(roomID);
  }
}

io.on("connection", (socket) => {
  console.log(`User Connected: ${socket.id}`);

  socket.on("join_queue", (userData) => {
    const { nickname, gender, genderFilter, deviceId } = userData;

    leaveRoom(socket);

    if (genderFilter !== "Any") {
      const today = new Date().toLocaleDateString();
    
      if (!userUsage[deviceId] || userUsage[deviceId].date !== today) {
        userUsage[deviceId] = { count: 0, date: today };
      }
 
      if (userUsage[deviceId].count >= DAILY_LIMIT) {
        socket.emit("receive_message", {
          sender: "System",
          message:
            "🚫 Daily Limit Reached! You can only use specific gender filters 10 times per day. Try 'Random Match'.",
        });
        return; // Stop here.
      }
      
      userUsage[deviceId].count++;
      console.log(
        `Device ${deviceId} usage: ${userUsage[deviceId].count}/${DAILY_LIMIT}`,
      );
    }


    console.log(`${nickname} (${gender}) joined. Looking for: ${genderFilter}`);

    const matchIndex = waitingQueue.findIndex((user) => {
      const isNotMe = user.id !== socket.id;
      const matchesMyFilter =
        genderFilter === "Any" || user.gender === genderFilter;
      const matchesTheirFilter =
        user.genderFilter === "Any" || user.genderFilter === gender;
      return isNotMe && matchesMyFilter && matchesTheirFilter;
    });

    if (matchIndex !== -1) {

      const partnerSocket = waitingQueue[matchIndex].socket;
      waitingQueue.splice(matchIndex, 1); 

      const roomID = `room_${socket.id}_${partnerSocket.id}`;

      socket.join(roomID);
      partnerSocket.join(roomID);

      io.to(roomID).emit("match_found", { roomID });
      console.log(`Match Created: ${roomID}`);
    } else {

      waitingQueue.push({
        id: socket.id,
        socket: socket,
        nickname,
        gender,
        genderFilter,
      });
    }
  });

  socket.on("report_user", () => {
    console.log(`User ${socket.id} reported their partner.`);
    leaveRoom(socket); 
  });

  socket.on("send_message", (data) => {
    const { roomID, message, sender } = data;
    socket.to(roomID).emit("receive_message", { message, sender });
  });

  socket.on("disconnect", () => {
    console.log("User Disconnected", socket.id);
    leaveRoom(socket);
    waitingQueue = waitingQueue.filter((u) => u.id !== socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`SERVER RUNNING on port ${PORT}`);
});
