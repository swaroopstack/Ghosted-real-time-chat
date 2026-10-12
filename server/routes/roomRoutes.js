import crypto from "crypto";
import express from "express";
import Room from "../models/Room.js";

const router = express.Router();

const ROOM_TTL_SECONDS = 600;
const ROOM_ID_RE = /^[a-z0-9]{6,16}$/;

// generate 8-char lowercase hex id (matches e.g. 9f2a31cd)
const generateRoomId = () => {
  return crypto.randomBytes(4).toString("hex");
};

const normalizeRoomId = (value) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

// create room API — accepts optional client-generated { roomId } for instant nav
router.post("/create-room", async (req, res) => {
  try {
    let roomId = normalizeRoomId(req.body?.roomId);
    if (roomId && !ROOM_ID_RE.test(roomId)) {
      return res.status(400).json({ error: "Invalid room ID format" });
    }
    if (!roomId) roomId = generateRoomId();

    let saved = null;
    // retry on rare ID collision (E11000)
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        saved = await new Room({ roomId }).save();
        break;
      } catch (err) {
        if (err?.code === 11000) {
          roomId = generateRoomId();
          continue;
        }
        throw err;
      }
    }

    if (!saved) {
      return res.status(500).json({ error: "Could not allocate room ID" });
    }

    const createdAt = saved.createdAt ?? new Date();
    const expiresAt = new Date(createdAt.getTime() + ROOM_TTL_SECONDS * 1000);

    res.json({ roomId, expiresAt });
  } catch (error) {
    console.log("CREATE ROOM ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

// existence check — used by join flow to reject typos/expired rooms
router.get("/room/:roomId", async (req, res) => {
  try {
    const roomId = normalizeRoomId(req.params.roomId);
    if (!ROOM_ID_RE.test(roomId)) {
      return res.status(404).json({ error: "Room not found or expired" });
    }

    const room = await Room.findOne({ roomId }).lean();
    if (!room) {
      return res.status(404).json({ error: "Room not found or expired" });
    }

    const createdAt = room.createdAt ?? new Date();
    const expiresAt = new Date(createdAt.getTime() + ROOM_TTL_SECONDS * 1000);
    if (expiresAt.getTime() <= Date.now()) {
      return res.status(404).json({ error: "Room not found or expired" });
    }

    res.json({ roomId, expiresAt, createdAt });
  } catch (error) {
    console.log("GET ROOM ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;