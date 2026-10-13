import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    username: { type: String, required: true },
    message: { type: String, required: true },
    time: { type: String, default: "" },
  },
  { _id: false, timestamps: false }
);

const roomSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    unique: true
  },
  messages: {
    type: [messageSchema],
    default: []
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 600
  }
});

export default mongoose.model("Room", roomSchema);