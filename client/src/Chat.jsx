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

  const bottomRef = useRef(null);

  // SOCKET LOGIC
  useEffect(() => {
    if (!nameSet) return;

    socket.emit("join-room", { roomId, username });

    socket.on("receive-message", (data) => {
      setMessages((prev) => [
        ...prev,
        {
          type: "received",
          username: data.username,
          text: data.message,
          time: data.time,
        },
      ]);
    });

    socket.on("user-joined", (msg) => {
      setMessages((prev) => [...prev, { type: "system", text: msg }]);
    });

    socket.on("user-left", (msg) => {
      setMessages((prev) => [...prev, { type: "system", text: msg }]);
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

  // AUTO SCROLL
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = () => {
    if (!input.trim()) return;

    const time = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    const messageData = {
      roomId,
      message: input,
      username,
      time,
    };

    socket.emit("send-message", messageData);

    setMessages((prev) => [
      ...prev,
      { type: "sent", text: input, time },
    ]);

    setInput("");
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    alert("Link copied");
  };

  // USERNAME SCREEN
  if (!nameSet) {
    return (
      <div className="h-screen flex items-center justify-center bg-black text-white">
        <div className="bg-gray-900 p-6 rounded-xl text-center">
          <h2 className="mb-4">Enter Username</h2>
          <input
            className="px-4 py-2 rounded text-black"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <br /><br />
          <button
            onClick={() => {
              if (!username.trim()) return;
              setNameSet(true);
            }}
            className="bg-green-600 px-4 py-2 rounded"
          >
            Join Chat
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-black text-white flex flex-col">

      {/* HEADER */}
      <div className="flex justify-between items-center p-4 border-b border-gray-700">
        <div>
          <p className="text-xs text-gray-400">ROOM ID</p>
          <p className="text-green-400 font-mono">{roomId}</p>
        </div>

        <div className="flex gap-2">
          <button onClick={copyLink} className="bg-gray-800 px-3 py-1 rounded">
            Copy Link
          </button>
          <button
            onClick={() => socket.emit("destroy-room", roomId)}
            className="bg-red-600 px-3 py-1 rounded"
          >
            Destroy
          </button>
        </div>
      </div>

      {/* MESSAGES */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg, i) => {
          if (msg.type === "system") {
            return (
              <p key={i} className="text-center text-gray-400 italic text-sm">
                {msg.text}
              </p>
            );
          }

          const isSent = msg.type === "sent";

          return (
            <div
              key={i}
              className={`flex ${isSent ? "justify-end" : "justify-start"}`}
            >
              <div className={`max-w-xs p-3 rounded-xl ${isSent ? "bg-green-600" : "bg-gray-800"}`}>
                {!isSent && (
                  <p className="text-xs text-green-400">{msg.username}</p>
                )}
                <p>{msg.text}</p>
                <p className="text-[10px] text-gray-400 text-right">{msg.time}</p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef}></div>
      </div>

      {/* INPUT */}
      <div className="p-4 border-t border-gray-700 flex gap-2">
        <input
          className="flex-1 bg-gray-800 px-4 py-2 rounded-full"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Type message..."
        />
        <button onClick={sendMessage} className="bg-gray-700 px-4 rounded-full">
          ↑
        </button>
      </div>

    </div>
  );
}

export default Chat;