import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import { setupSocket } from "./socket/socket.js";
import roomRoutes from "./routes/roomRoutes.js";

dotenv.config();

const app = express();
const server = http.createServer(app);

// Socket.IO setup (we’ll use later)
const io = new Server(server, {
  cors: {
    origin: "*"
  }
});
setupSocket(io);

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api", roomRoutes);

// Test route
app.get("/", (req, res) => {
  res.send("Ghosted server running");
});

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.log(err));

// Start server
server.listen(5000, () => {
  console.log("Server running on port 5000");
});