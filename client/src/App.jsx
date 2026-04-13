import { useEffect, useState } from "react";
import { io } from "socket.io-client";

const socket = io("http://localhost:5000");

function App() {
  const [roomId, setRoomId] = useState("");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);

  const createRoom = async () => {
    const res = await fetch("http://localhost:5000/api/create-room", {
      method: "POST"
    });
    const data = await res.json();
    setRoomId(data.roomId);

    socket.emit("join-room", data.roomId);
  };

  const sendMessage = () => {
    socket.emit("send-message", {
      roomId,
      message: input
    });

    setMessages((prev) => [...prev, input]);
    setInput("");
  };

  useEffect(() => {
    socket.on("receive-message", (message) => {
      setMessages((prev) => [...prev, message]);
    });

    socket.on("room-destroyed", () => {
      alert("Room destroyed");
      setRoomId("");
      setMessages([]);
    });

    return () => {
      socket.off("receive-message");
      socket.off("room-destroyed");
    };
  }, []);

  return (
    <div style={{ padding: "20px" }}>
      <h1>Ghosted</h1>

      {!roomId && (
        <button onClick={createRoom}>Create Room</button>
      )}

      {roomId && (
        <>
          <h3>Room: {roomId}</h3>

          <div style={{ border: "1px solid black", padding: "10px", height: "200px", overflowY: "scroll" }}>
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
        </>
      )}
    </div>
  );
}

export default App;