export const setupSocket = (io) => {
    io.on("connection", (socket) => {
        console.log("User connected:", socket.id);

        // join room
        socket.on("join-room", ({ roomId, username }) => {
            socket.join(roomId);

            socket.to(roomId).emit("user-joined", `${username} joined the room`);
        });

        // send message
        socket.on("send-message", ({ roomId, message, username }) => {
            socket.to(roomId).emit("receive-message", {
                message,
                username
            });
        });

        // destroy room
        socket.on("destroy-room", (roomId) => {
            io.to(roomId).emit("room-destroyed");
        });

        socket.on("disconnecting", () => {
            const rooms = Array.from(socket.rooms);

            rooms.forEach((room) => {
                if (room !== socket.id) {
                    socket.to(room).emit("user-left", "A user left the room");
                }
            });
        });
    });
};