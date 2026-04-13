export const setupSocket = (io) => {
  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // join room
    socket.on("join-room", (roomId) => {
      socket.join(roomId);
      console.log(`User ${socket.id} joined room ${roomId}`);
    });

    // send message
    socket.on("send-message", ({ roomId, message }) => {
      socket.to(roomId).emit("receive-message", message);
    });

    // destroy room
    socket.on("destroy-room", (roomId) => {
      io.to(roomId).emit("room-destroyed");
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });
};