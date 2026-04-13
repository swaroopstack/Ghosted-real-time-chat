import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { io } from "socket.io-client";

const socket = io("http://localhost:5000");

function Chat() {
  const { roomId } = useParams();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);

  const chatRef = useRef(null);

  // join room + listeners
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

  // auto scroll
  useEffect(() => {
    chatRef.current?.scrollTo({
      top: chatRef.current.scrollHeight,
      behavior: "smooth"
    });
  }, [messages]);

  const sendMessage = () => {
    if (!input) return;

    socket.emit("send-message", {
      roomId,
      message: input
    });

    setMessages((prev) => [...prev, input]);
    setInput("");
  };

  const copyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    alert("Room link copied!");
  };

  return (
    <div style={{
      maxWidth: "500px",
      margin: "auto",
      padding: "20px",
      textAlign: "center"
    }}>
      <h2>Room: {roomId}</h2>

      <button onClick={copyLink}>Copy Room Link</button>

      <div
        ref={chatRef}
        style={{
          border: "1px solid black",
          padding: "10px",
          height: "300px",
          overflowY: "scroll",
          marginTop: "10px",
          textAlign: "left"
        }}
      >
        {messages.map((msg, i) => (
          <p key={i}>{msg}</p>
        ))}
      </div>

      <div style={{ marginTop: "10px" }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          style={{ padding: "8px", width: "70%" }}
        />
        <button onClick={sendMessage}>Send</button>
      </div>

      <button
        style={{
          background: "red",
          color: "white",
          marginTop: "10px",
          padding: "8px"
        }}
        onClick={() => socket.emit("destroy-room", roomId)}
      >
        Destroy Room
      </button>
    </div>
  );
}

export default Chat;