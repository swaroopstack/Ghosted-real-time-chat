import Room from "../models/Room.js";

export const setupSocket = (io) => {
  const users = {}; // socket.id → { username, roomId }
  const emitRoomParticipants = (roomId) => {
    const participants = Object.values(users)
      .filter((user) => user.roomId === roomId)
      .map((user) => user.username);

    io.to(roomId).emit("participants-updated", participants);
  };

  const normalizeRoomId = (value) =>
    typeof value === "string" ? value.trim().toLowerCase() : "";

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // JOIN ROOM
    socket.on("join-room", ({ roomId: rawRoomId, username: rawUsername }) => {
      const roomId = normalizeRoomId(rawRoomId);
      const username = typeof rawUsername === "string" ? rawUsername.trim().slice(0, 30) : "";

      if (!roomId || !username) return;

      // avoid double-join from StrictMode remount
      const existing = users[socket.id];
      if (existing && existing.roomId === roomId && existing.username === username) return;

      // leave previous room if switching
      if (existing && existing.roomId !== roomId) {
        socket.leave(existing.roomId);
        socket.to(existing.roomId).emit("user-left", `${existing.username} left the room`);
        emitRoomParticipants(existing.roomId);
      }

      socket.join(roomId);

      // store user info
      users[socket.id] = { username, roomId };

      socket.to(roomId).emit("user-joined", `${username} joined the room`);
      emitRoomParticipants(roomId);
    });

    // LEAVE ROOM (explicit navigate-away)
    socket.on("leave-room", ({ roomId: rawRoomId } = {}) => {
      const user = users[socket.id];
      if (!user) return;

      const roomId = normalizeRoomId(rawRoomId) || user.roomId;
      socket.leave(roomId);
      socket.to(roomId).emit("user-left", `${user.username} left the room`);
      delete users[socket.id];
      emitRoomParticipants(roomId);
    });

    // SEND MESSAGE (UPDATED WITH TIME)
    socket.on("send-message", ({ roomId: rawRoomId, message, username: rawUsername, time }) => {
      const roomId = normalizeRoomId(rawRoomId);
      const username = typeof rawUsername === "string" ? rawUsername.trim().slice(0, 30) : "";
      if (!roomId || !username || !message) return;
      if (typeof message !== "string" || !message.trim()) return;

      // only allow senders who actually joined this room
      if (users[socket.id]?.roomId !== roomId) return;

      const msgData = {
        message: message.slice(0, 2000),
        username,
        time
      };

      socket.to(roomId).emit("receive-message", msgData);
    });

    // DESTROY ROOM
    socket.on("destroy-room", async (rawRoomId) => {
      const roomId = normalizeRoomId(typeof rawRoomId === "string" ? rawRoomId : rawRoomId?.roomId);
      if (!roomId) return;

      try {
        await Room.deleteOne({ roomId });
      } catch (err) {
        console.log("DESTROY ROOM DB ERROR:", err);
      }

      io.to(roomId).emit("room-destroyed");

      // force all sockets out + drop cached participants
      try {
        const sockets = await io.in(roomId).fetchSockets();
        for (const s of sockets) {
          delete users[s.id];
          s.leave(roomId);
        }
      } catch {
        io.in(roomId).socketsLeave(roomId);
      }
      emitRoomParticipants(roomId);
    });

    // DISCONNECT
    socket.on("disconnect", () => {
      const user = users[socket.id];

      if (user) {
        const { username, roomId } = user;

        socket.to(roomId).emit("user-left", `${username} left the room`);

        delete users[socket.id];
        emitRoomParticipants(roomId);
      }

      console.log("User disconnected:", socket.id);
    });
  });
};
