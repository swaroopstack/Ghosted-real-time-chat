export const setupSocket = (io) => {
  const users = {}; // socket.id → { username, roomId }

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // JOIN ROOM
    socket.on("join-room", ({ roomId, username }) => {
      socket.join(roomId);

      // store user info
      users[socket.id] = { username, roomId };

      // notify others
      socket.to(roomId).emit("user-joined", `${username} joined the room`);
    });

    // SEND MESSAGE
    socket.on("send-message", ({ roomId, message, username }) => {
      if (!username) return;

      const msgData = {
        message,
        username
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

        delete users[socket.id]; // cleanup
      }

      console.log("User disconnected:", socket.id);
    });
  });
};