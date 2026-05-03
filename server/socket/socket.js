export const setupSocket = (io) => {
  const users = {}; // socket.id → { username, roomId }
  const emitRoomParticipants = (roomId) => {
    const participants = Object.values(users)
      .filter((user) => user.roomId === roomId)
      .map((user) => user.username);

    io.to(roomId).emit("participants-updated", participants);
  };

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // JOIN ROOM
    socket.on("join-room", ({ roomId, username }) => {
      socket.join(roomId);

      // store user info
      users[socket.id] = { username, roomId };

      socket.to(roomId).emit("user-joined", `${username} joined the room`);
      emitRoomParticipants(roomId);
    });

    // SEND MESSAGE (UPDATED WITH TIME)
    socket.on("send-message", ({ roomId, message, username, time }) => {
      if (!username || !message) return;

      const msgData = {
        message,
        username,
        time
      };

      socket.to(roomId).emit("receive-message", msgData);
    });

    // DESTROY ROOM
    socket.on("destroy-room", (roomId) => {
      io.to(roomId).emit("room-destroyed");
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
