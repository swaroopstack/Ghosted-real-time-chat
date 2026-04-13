import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { io } from "socket.io-client";

const socket = io(import.meta.env.VITE_BACKEND_URL);

// ─── Toast Component ────────────────────────────────────────────────────────
function Toast({ toasts }) {
  return (
    <div style={{
      position: "fixed", top: "20px", right: "20px",
      zIndex: 9999, display: "flex", flexDirection: "column", gap: "10px",
      pointerEvents: "none",
    }}>
      {toasts.map((t) => (
        <div key={t.id} style={{
          display: "flex", alignItems: "center", gap: "10px",
          background: "rgba(10,10,18,0.92)",
          border: `1px solid ${t.type === "success" ? "rgba(124,245,160,0.35)" : t.type === "error" ? "rgba(255,80,100,0.35)" : "rgba(180,178,255,0.3)"}`,
          borderRadius: "8px",
          padding: "10px 16px",
          fontFamily: "'DM Mono', monospace",
          fontSize: "12px",
          color: t.type === "success" ? "#7cf5a0" : t.type === "error" ? "#ff6680" : "#b0aaff",
          backdropFilter: "blur(12px)",
          boxShadow: `0 0 20px ${t.type === "success" ? "rgba(124,245,160,0.1)" : t.type === "error" ? "rgba(255,80,100,0.1)" : "rgba(180,178,255,0.1)"}`,
          animation: "toastIn 0.3s cubic-bezier(0.22,1,0.36,1) both",
          letterSpacing: "0.05em",
          minWidth: "220px",
        }}>
          <span style={{
            width: "7px", height: "7px", borderRadius: "50%", flexShrink: 0,
            background: t.type === "success" ? "#7cf5a0" : t.type === "error" ? "#ff6680" : "#b0aaff",
            boxShadow: `0 0 8px ${t.type === "success" ? "#7cf5a0" : t.type === "error" ? "#ff6680" : "#b0aaff"}`,
          }} />
          {t.message}
        </div>
      ))}
    </div>
  );
}

// ─── Main Chat Component ─────────────────────────────────────────────────────
function Chat() {
  const { roomId } = useParams();

  const [username, setUsername] = useState("");
  const [nameSet, setNameSet] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes in seconds

  const bottomRef = useRef(null);
  const destroySoundRef = useRef(new Audio("/sounds/destroy.mp3"));

  // ── Toast helper ──
  const showToast = (message, type = "info") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  };

  // ── Countdown timer ──
  useEffect(() => {
    if (!nameSet) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [nameSet]);

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const timerColor = timeLeft <= 60 ? "#ff6680" : timeLeft <= 180 ? "#ffb347" : "#7cf5a0";

  // ── Socket logic ──
  useEffect(() => {
    if (!nameSet) return;

    socket.emit("join-room", { roomId, username });

    socket.on("receive-message", (data) => {
      setMessages((prev) => [...prev, {
        type: "received",
        username: data.username,
        text: data.message,
        time: data.time,
      }]);
    });

    socket.on("user-joined", (msg) => {
      setMessages((prev) => [...prev, { type: "system", text: msg }]);
      showToast(msg, "success");
    });

    socket.on("user-left", (msg) => {
      setMessages((prev) => [...prev, { type: "system", text: msg }]);
      showToast(msg, "info");
    });

    socket.on("room-destroyed", () => {
      destroySoundRef.current.play().catch(() => {});
      showToast("Room destroyed. Redirecting...", "error");
      setTimeout(() => { window.location.href = "/"; }, 2000);
    });

    return () => {
      socket.off("receive-message");
      socket.off("user-joined");
      socket.off("user-left");
      socket.off("room-destroyed");
    };
  }, [roomId, nameSet, username]);

  // ── Auto scroll ──
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = () => {
    if (!input.trim()) return;
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    socket.emit("send-message", { roomId, message: input, username, time });
    setMessages((prev) => [...prev, { type: "sent", text: input, time }]);
    setInput("");
  };

  const copyId = () => {
    navigator.clipboard.writeText(roomId);
    showToast("Room ID copied!", "success");
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    showToast("Share link copied!", "success");
  };

  const destroyRoom = () => {
    socket.emit("destroy-room", roomId);
  };

  // ─── Username Screen ────────────────────────────────────────────────────
  if (!nameSet) {
    return (
      <>
        <style>{cssKeyframes}</style>
        <div style={{
          height: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
          background: "#07070d", fontFamily: "'Syne', sans-serif",
          backgroundImage: `linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}>
          <div style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.09)",
            borderRadius: "16px",
            padding: "40px 48px",
            display: "flex", flexDirection: "column", alignItems: "center", gap: "20px",
            backdropFilter: "blur(20px)",
            boxShadow: "0 0 60px rgba(120,100,255,0.08)",
            animation: "fadeUp 0.6s cubic-bezier(0.22,1,0.36,1) both",
            minWidth: "340px",
          }}>
            <div style={{ textAlign: "center" }}>
              <h1 style={{
                fontFamily: "'Syne', sans-serif", fontWeight: 800,
                fontSize: "28px", margin: "0 0 6px 0",
                background: "linear-gradient(135deg, #ffffff 0%, #c0bfff 50%, #8880ff 100%)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
              }}>ghosted</h1>
              <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "11px", color: "rgba(180,178,255,0.5)", letterSpacing: "0.18em", margin: 0 }}>
                ENTER TO DISAPPEAR
              </p>
            </div>

            <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "8px" }}>
              <label style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", letterSpacing: "0.2em", color: "rgba(200,200,230,0.4)" }}>
                YOUR ALIAS
              </label>
              <input
                autoFocus
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && username.trim() && setNameSet(true)}
                placeholder="anonymous_ghost"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "8px", padding: "12px 16px",
                  color: "#e8e8f0", fontFamily: "'DM Mono', monospace", fontSize: "14px",
                  outline: "none", width: "100%", boxSizing: "border-box",
                  transition: "border-color 0.2s",
                }}
                onFocus={(e) => e.target.style.borderColor = "rgba(136,128,255,0.5)"}
                onBlur={(e) => e.target.style.borderColor = "rgba(255,255,255,0.1)"}
              />
            </div>

            <button
              onClick={() => { if (!username.trim()) return; setNameSet(true); }}
              style={{
                width: "100%", padding: "13px",
                background: "linear-gradient(135deg, #6660dd, #9088ee)",
                border: "none", borderRadius: "8px",
                color: "#fff", fontFamily: "'Syne', sans-serif",
                fontWeight: 700, fontSize: "12px", letterSpacing: "0.18em",
                cursor: "pointer", transition: "all 0.2s",
                boxShadow: "0 0 20px rgba(136,128,255,0.25)",
              }}
              onMouseEnter={(e) => { e.target.style.boxShadow = "0 0 32px rgba(136,128,255,0.45)"; e.target.style.transform = "translateY(-1px)"; }}
              onMouseLeave={(e) => { e.target.style.boxShadow = "0 0 20px rgba(136,128,255,0.25)"; e.target.style.transform = "none"; }}
            >
              ENTER ROOM
            </button>

            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: "rgba(180,178,255,0.3)", letterSpacing: "0.05em", margin: 0, textAlign: "center" }}>
              room · <span style={{ color: "rgba(124,245,160,0.6)" }}>{roomId.slice(0, 8)}…</span>
            </p>
          </div>
        </div>
      </>
    );
  }

  // ─── Chat Screen ────────────────────────────────────────────────────────
  return (
    <>
      <style>{cssKeyframes}</style>
      <Toast toasts={toasts} />

      <div style={{
        height: "100vh", display: "flex", flexDirection: "column",
        background: "#07070d", fontFamily: "'Syne', sans-serif", color: "#e8e8f0",
        backgroundImage: `linear-gradient(rgba(255,255,255,0.016) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.016) 1px, transparent 1px)`,
        backgroundSize: "60px 60px",
        position: "relative", overflow: "hidden",
      }}>

        {/* Ambient glow */}
        <div style={{
          position: "absolute", width: "600px", height: "300px", borderRadius: "50%",
          background: "radial-gradient(ellipse, rgba(100,80,255,0.05) 0%, transparent 70%)",
          top: "0", left: "50%", transform: "translateX(-50%)",
          pointerEvents: "none", filter: "blur(40px)", zIndex: 0,
        }} />

        {/* ── HEADER ── */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 20px", height: "56px", flexShrink: 0,
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          background: "rgba(7,7,13,0.85)", backdropFilter: "blur(16px)",
          position: "relative", zIndex: 10,
        }}>
          {/* Left: Room ID */}
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", letterSpacing: "0.2em", color: "rgba(200,200,230,0.35)" }}>
              ROOM ID
            </span>
            <div style={{
              background: "rgba(124,245,160,0.08)", border: "1px solid rgba(124,245,160,0.2)",
              borderRadius: "6px", padding: "4px 12px",
              fontFamily: "'DM Mono', monospace", fontSize: "13px", color: "#7cf5a0",
              letterSpacing: "0.04em",
            }}>
              {roomId}
            </div>

            <HeaderBtn onClick={copyId} label="COPY ID" icon="⎘" />
            <HeaderBtn onClick={copyLink} label="SHARE LINK" icon="⊹" />
          </div>

          {/* Center: Timer */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", letterSpacing: "0.2em", color: "rgba(200,200,230,0.35)" }}>
              SELF-DESTRUCT
            </span>
            <div style={{
              background: `rgba(${timerColor === "#ff6680" ? "255,80,100" : timerColor === "#ffb347" ? "255,179,71" : "124,245,160"},0.1)`,
              border: `1px solid ${timerColor}44`,
              borderRadius: "6px", padding: "4px 14px",
              fontFamily: "'DM Mono', monospace", fontSize: "15px",
              color: timerColor, fontWeight: 400,
              transition: "all 0.5s",
              boxShadow: `0 0 12px ${timerColor}22`,
            }}>
              {formatTime(timeLeft)}
            </div>
          </div>

          {/* Right: Destroy */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button
              onClick={destroyRoom}
              style={{
                display: "flex", alignItems: "center", gap: "8px",
                background: "rgba(255,80,100,0.08)",
                border: "1px solid rgba(255,80,100,0.3)",
                borderRadius: "7px", padding: "7px 16px",
                fontFamily: "'Syne', sans-serif", fontWeight: 700,
                fontSize: "11px", letterSpacing: "0.16em",
                color: "#ff6680", cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255,80,100,0.18)";
                e.currentTarget.style.boxShadow = "0 0 20px rgba(255,80,100,0.2)";
                e.currentTarget.style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255,80,100,0.08)";
                e.currentTarget.style.boxShadow = "none";
                e.currentTarget.style.transform = "none";
              }}
            >
              <span style={{ fontSize: "13px" }}>⊗</span> DESTROY NOW
            </button>
          </div>
        </div>

        {/* ── MESSAGES ── */}
        <div style={{
          flex: 1, overflowY: "auto", padding: "24px 20px",
          display: "flex", flexDirection: "column", gap: "4px",
          position: "relative", zIndex: 1,
          scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.08) transparent",
        }}>
          {messages.length === 0 && (
            <div style={{
              flex: 1, display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: "10px",
              color: "rgba(200,200,230,0.2)",
            }}>
              <span style={{ fontSize: "32px", opacity: 0.3 }}>👻</span>
              <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "16px", margin: 0 }}>No messages yet</p>
              <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "12px", margin: 0, opacity: 0.7 }}>Start the conversation by sending a message below.</p>
            </div>
          )}

          {messages.map((msg, i) => {
            if (msg.type === "system") {
              return (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: "12px",
                  margin: "8px 0", justifyContent: "center",
                }}>
                  <span style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.05)", maxWidth: "80px" }} />
                  <p style={{
                    fontFamily: "'DM Mono', monospace", fontSize: "11px",
                    color: "rgba(180,178,255,0.4)", margin: 0, letterSpacing: "0.06em",
                  }}>{msg.text}</p>
                  <span style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.05)", maxWidth: "80px" }} />
                </div>
              );
            }

            const isSent = msg.type === "sent";
            return (
              <div key={i} style={{
                display: "flex",
                justifyContent: isSent ? "flex-end" : "flex-start",
                marginBottom: "6px",
                animation: "fadeUp 0.25s cubic-bezier(0.22,1,0.36,1) both",
              }}>
                <div style={{
                  maxWidth: "62%",
                  background: isSent
                    ? "linear-gradient(135deg, rgba(102,96,221,0.35), rgba(144,136,238,0.25))"
                    : "rgba(255,255,255,0.05)",
                  border: isSent
                    ? "1px solid rgba(136,128,255,0.25)"
                    : "1px solid rgba(255,255,255,0.08)",
                  borderRadius: isSent ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                  padding: "10px 14px",
                  backdropFilter: "blur(8px)",
                  boxShadow: isSent ? "0 0 20px rgba(100,90,200,0.1)" : "none",
                }}>
                  {!isSent && (
                    <p style={{
                      fontFamily: "'DM Mono', monospace", fontSize: "10px",
                      color: "#b0aaff", margin: "0 0 4px 0", letterSpacing: "0.08em",
                    }}>{msg.username}</p>
                  )}
                  <p style={{
                    fontFamily: "'Syne', sans-serif", fontSize: "14px",
                    color: isSent ? "#e8e8f0" : "rgba(230,230,245,0.9)",
                    margin: "0 0 4px 0", lineHeight: 1.5,
                  }}>{msg.text}</p>
                  <p style={{
                    fontFamily: "'DM Mono', monospace", fontSize: "10px",
                    color: "rgba(200,200,230,0.3)", margin: 0, textAlign: "right",
                    letterSpacing: "0.04em",
                  }}>{msg.time}</p>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* ── INPUT ── */}
        <div style={{
          padding: "16px 20px", flexShrink: 0,
          borderTop: "1px solid rgba(255,255,255,0.07)",
          background: "rgba(7,7,13,0.85)", backdropFilter: "blur(16px)",
          position: "relative", zIndex: 10,
          display: "flex", alignItems: "center", gap: "12px",
        }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Type message..."
            style={{
              flex: 1,
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.09)",
              borderRadius: "12px", padding: "13px 20px",
              color: "#e8e8f0", fontFamily: "'Syne', sans-serif", fontSize: "14px",
              outline: "none", transition: "border-color 0.2s, box-shadow 0.2s",
            }}
            onFocus={(e) => {
              e.target.style.borderColor = "rgba(136,128,255,0.4)";
              e.target.style.boxShadow = "0 0 0 3px rgba(136,128,255,0.08)";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "rgba(255,255,255,0.09)";
              e.target.style.boxShadow = "none";
            }}
          />
          <button
            onClick={sendMessage}
            style={{
              width: "46px", height: "46px", borderRadius: "12px",
              background: input.trim()
                ? "linear-gradient(135deg, #6660dd, #9088ee)"
                : "rgba(255,255,255,0.05)",
              border: input.trim() ? "none" : "1px solid rgba(255,255,255,0.09)",
              color: input.trim() ? "#fff" : "rgba(255,255,255,0.25)",
              fontSize: "18px", cursor: input.trim() ? "pointer" : "default",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.2s", flexShrink: 0,
              boxShadow: input.trim() ? "0 0 20px rgba(100,90,200,0.3)" : "none",
            }}
          >
            ↑
          </button>
        </div>
      </div>
    </>
  );
}

// ── Small header button ──────────────────────────────────────────────────────
function HeaderBtn({ onClick, label, icon }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "flex", alignItems: "center", gap: "5px",
        background: hov ? "rgba(255,255,255,0.07)" : "transparent",
        border: "1px solid",
        borderColor: hov ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.08)",
        borderRadius: "6px", padding: "5px 11px",
        fontFamily: "'DM Mono', monospace", fontSize: "10px",
        letterSpacing: "0.14em", color: hov ? "rgba(220,218,255,0.85)" : "rgba(200,200,230,0.45)",
        cursor: "pointer", transition: "all 0.18s",
      }}
    >
      <span>{icon}</span>{label}
    </button>
  );
}

// ── Keyframes ────────────────────────────────────────────────────────────────
const cssKeyframes = `
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=DM+Mono:ital,wght@0,300;0,400;1,300&display=swap');

* { box-sizing: border-box; margin: 0; padding: 0; }

@keyframes fadeUp {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes toastIn {
  from { opacity: 0; transform: translateX(20px); }
  to   { opacity: 1; transform: translateX(0); }
}

::-webkit-scrollbar { width: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 4px; }
`;

export default Chat;
