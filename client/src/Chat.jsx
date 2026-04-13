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

    useEffect(() => {
        if (!nameSet) return;

        socket.emit("join-room", roomId);

        socket.on("receive-message", (data) => {
            console.log("RECEIVED:", data);
            setMessages((prev) => [...prev, data]);
        });

        socket.on("room-destroyed", () => {
            alert("Room destroyed");
            window.location.href = "/";
        });

        return () => {
            socket.off("receive-message");
            socket.off("room-destroyed");
        };
    }, [roomId, nameSet]);

    // auto scroll
    useEffect(() => {
        chatRef.current?.scrollTo({
            top: chatRef.current.scrollHeight,
            behavior: "smooth"
        });
    }, [messages]);

    const sendMessage = () => {
        if (!input) return;

        const messageData = {
            roomId,
            message: input,
            username
        };

        socket.emit("send-message", messageData);

        setMessages((prev) => [...prev, messageData]);
        setInput("");
    };

    const copyLink = () => {
        navigator.clipboard.writeText(window.location.href);
        alert("Room link copied!");
    };

    // STEP 1: ask username
    if (!nameSet) {
        return (
            <div style={{ textAlign: "center", marginTop: "100px" }}>
                <h2>Enter Username</h2>
                <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                />
                <br /><br />
                <button onClick={() => setNameSet(true)}>Join Chat</button>
            </div>
        );
    }

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
                    <p key={i}>
                        <strong>{msg.username}: </strong>{msg.message}
                    </p>
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