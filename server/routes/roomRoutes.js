import express from "express";
import Room from "../models/Room.js";

const router = express.Router();

// generate random room ID
const generateRoomId = () => {
  return Math.random().toString(36).substring(2, 8);
};

// create room API
router.post("/create-room", async (req, res) => {
  try {
    const roomId = generateRoomId();

    const newRoom = new Room({ roomId });
    await newRoom.save();

    res.json({ roomId });
  } catch (error) {
    res.status(500).json({ error: "Error creating room" });
  }
});

export default router;