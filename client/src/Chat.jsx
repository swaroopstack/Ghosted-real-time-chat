import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { io } from "socket.io-client";

const socket = io("http://localhost:5000");

function Chat() {
  const { roomId } = useParams();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    socket.emit("join-room", roomId);

    socket.on("receive-message", (message) => {
      setMessages((prev) => [...prev, message]);
    });

    socket.on("room-destroyed", () => {
      alert("Room destroyed");
      window.location.href = "/";
    });

    return () => {
      socket.off("receive-message");
      socket.off("room-destroyed");
    };
  }, [roomId]);

  const sendMessage = () => {
    if (!input) return;

    socket.emit("send-message", {
      roomId,
      message: input
    });

    setMessages((prev) => [...prev, input]);
    setInput("");
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>Room: {roomId}</h2>

      <div style={{
        border: "1px solid black",
        padding: "10px",
        height: "200px",
        overflowY: "scroll"
      }}>
        {messages.map((msg, i) => (
          <p key={i}>{msg}</p>
        ))}
      </div>

      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />
      <button onClick={sendMessage}>Send</button>

      <button
        style={{ background: "red", color: "white" }}
        onClick={() => socket.emit("destroy-room", roomId)}
      >
        Destroy Room
      </button>
    </div>
  );
}

export default Chat;