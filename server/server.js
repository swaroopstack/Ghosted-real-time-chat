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

// CORS for frontend (update after deployment)
const allowedOrigins = [
  "http://localhost:5173",
  "https://ghostedchat.vercel.app"
];

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  }
});

setupSocket(io);

// Middleware
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
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

// IMPORTANT: Use dynamic PORT for deployment
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});