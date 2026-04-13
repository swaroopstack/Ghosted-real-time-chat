import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { io } from "socket.io-client";

const socket = io("http://localhost:5000");

function Chat() {
  const { roomId } = useParams();

  const [username, setUsername] = useState("");
  const [nameSet, setNameSet] = useState(false);

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);

  const chatRef = useRef(null);

  // JOIN + LISTENERS
  useEffect(() => {
    if (!nameSet) return;

    socket.emit("join-room", { roomId, username });

    socket.on("receive-message", (data) => {
      setMessages((prev) => [...prev, data]);
    });

    socket.on("user-joined", (msg) => {
      setMessages((prev) => [
        ...prev,
        { system: true, message: msg }
      ]);
    });

    socket.on("user-left", (msg) => {
      setMessages((prev) => [
        ...prev,
        { system: true, message: msg }
      ]);
    });

    socket.on("room-destroyed", () => {
      alert("Room destroyed");
      window.location.href = "/";
    });

    return () => {
      socket.off("receive-message");
      socket.off("user-joined");
      socket.off("user-left");
      socket.off("room-destroyed");
    };
  }, [roomId, nameSet, username]);

  // CLEAR MESSAGES ON ROOM CHANGE
  useEffect(() => {
    setMessages([]);
  }, [roomId]);

  // AUTO SCROLL
  useEffect(() => {
    chatRef.current?.scrollTo({
      top: chatRef.current.scrollHeight,
      behavior: "smooth"
    });
  }, [messages]);

  const sendMessage = () => {
    if (!input.trim()) return;

    const messageData = {
      roomId,
      message: input,
      username,
      time: new Date().toLocaleTimeString()
    };

    socket.emit("send-message", messageData);

    setMessages((prev) => [...prev, messageData]);
    setInput("");
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    alert("Room link copied!");
  };

  // USERNAME SCREEN
  if (!nameSet) {
    return (
      <div style={{ textAlign: "center", marginTop: "100px" }}>
        <h2>Enter Username</h2>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <br /><br />
        <button
          onClick={() => {
            if (!username.trim()) return;
            setNameSet(true);
          }}
        >
          Join Chat
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: "500px",
        margin: "auto",
        padding: "20px",
        textAlign: "center",
        background: "#f5f5f5",
        borderRadius: "10px"
      }}
    >
      <h2>Room: {roomId}</h2>

      <button onClick={copyLink}>Copy Room Link</button>

      <div
        ref={chatRef}
        style={{
          border: "1px solid #ccc",
          padding: "10px",
          height: "300px",
          overflowY: "scroll",
          marginTop: "10px",
          textAlign: "left",
          background: "white",
          borderRadius: "8px"
        }}
      >
        {messages.map((msg, i) => (
          <p key={i}>
            {msg.system ? (
              <em>{msg.message}</em>
            ) : (
              <>
                <strong>{msg.username}</strong>: {msg.message}
                <span style={{ fontSize: "10px", marginLeft: "6px" }}>
                  {msg.time}
                </span>
              </>
            )}
          </p>
        ))}
      </div>

      <div style={{ marginTop: "10px" }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") sendMessage();
          }}
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