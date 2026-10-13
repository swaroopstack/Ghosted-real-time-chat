import { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { io } from "socket.io-client";

// ─── Toast Component ────────────────────────────────────────────────────────
function Toast({ toasts, isMobile }) {
  return (
    <div style={{
      position: "fixed", top: isMobile ? "12px" : "20px", right: isMobile ? "12px" : "20px", left: isMobile ? "12px" : "auto",
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
          minWidth: isMobile ? "0" : "220px",
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
  const { roomId: routeRoomId } = useParams();
  const roomId = routeRoomId?.trim();
  const hasValidRoomId = Boolean(roomId) && roomId !== "undefined" && roomId !== "null";
  const location = useLocation();
  const navigate = useNavigate();
  const prefixedUsername = location.state?.username?.trim() || "";

  const [username, setUsername] = useState(prefixedUsername);
  const [nameSet, setNameSet] = useState(Boolean(prefixedUsername));
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [timeLeft, setTimeLeft] = useState(600); // fallback until server expiry loads
  const [roomStatus, setRoomStatus] = useState("checking"); // checking | valid | invalid
  const [expiresAt, setExpiresAt] = useState(null);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);
  const [showParticipants, setShowParticipants] = useState(() => window.innerWidth > 768);

  const bottomRef = useRef(null);
  const destroySoundRef = useRef(null);
  const socketRef = useRef(null);
  const joinedRef = useRef(false);
  const usernameRef = useRef(username);
  const historyLoadedRef = useRef(null);
  usernameRef.current = username;

  const getBackendUrl = () =>
    (import.meta.env.VITE_BACKEND_URL || "").replace(/\/$/, "");

  // ── Toast helper ──
  const showToast = (message, type = "info") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  };

  useEffect(() => {
    if (hasValidRoomId) return;

    navigate("/", { replace: true });
  }, [hasValidRoomId, navigate]);

  // lazy audio init (avoids constructor during render)
  useEffect(() => {
    try {
      destroySoundRef.current = new Audio("/sounds/destroy.mp3");
    } catch {
      destroySoundRef.current = null;
    }
  }, []);

  const justCreated = location.state?.justCreated === true;

  // ── Validate room exists + load server-authoritative expiry ──
  // Create flow passes justCreated: never block the creator — the background
  // POST may still be in flight (or Render cold-starting), so treat as valid
  // immediately and ensure persistence with retries. Join flow stays strict.
  useEffect(() => {
    if (!hasValidRoomId) return;
    const backend = getBackendUrl();
    if (!backend) {
      setRoomStatus("valid");
      return;
    }
    let cancelled = false;

    if (justCreated) {
      // Instant UX: creator goes straight to alias screen with local 10-min timer.
      setExpiresAt(Date.now() + 600 * 1000);
      setTimeLeft(600);
      setRoomStatus("valid");

      // Ensure the room exists server-side (background POST from Home may
      // still be pending). Idempotent — safe to POST again.
      const ensure = async (attempts = 4) => {
        for (let i = 0; i < attempts && !cancelled; i++) {
          try {
            const get = await fetch(`${backend}/api/room/${encodeURIComponent(roomId)}`);
            if (get.ok) {
              const data = await get.json().catch(() => null);
              if (!cancelled && data?.expiresAt) {
                const exp = new Date(data.expiresAt).getTime();
                if (Number.isFinite(exp)) {
                  setExpiresAt(exp);
                  setTimeLeft(Math.max(0, Math.round((exp - Date.now()) / 1000)));
                }
              }
              return;
            }
            await fetch(`${backend}/api/create-room`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ roomId }),
            }).catch(() => null);
          } catch { /* retry */ }
          if (i < attempts - 1) {
            await new Promise((r) => setTimeout(r, 1500));
          }
        }
      };
      ensure();
      return () => {
        cancelled = true;
      };
    }

    setRoomStatus("checking");
    fetch(`${backend}/api/room/${encodeURIComponent(roomId)}`)
      .then((res) => {
        if (cancelled) return;
        if (res.status === 404) {
          setRoomStatus("invalid");
          return;
        }
        if (!res.ok) {
          // transient error: allow chat (socket is source of truth)
          setRoomStatus("valid");
          return;
        }
        return res.json().then((data) => {
          if (cancelled) return;
          if (data?.expiresAt) {
            const exp = new Date(data.expiresAt).getTime();
            if (Number.isFinite(exp)) {
              setExpiresAt(exp);
              setTimeLeft(Math.max(0, Math.round((exp - Date.now()) / 1000)));
            }
          }
          setRoomStatus("valid");
        });
      })
      .catch(() => {
        if (!cancelled) setRoomStatus("valid");
      });
    return () => {
      cancelled = true;
    };
  }, [roomId, hasValidRoomId, justCreated]);

  // ── Countdown timer (server-synced when expiresAt known) ──
  useEffect(() => {
    if (!nameSet || roomStatus !== "valid") return;
    const interval = setInterval(() => {
      if (expiresAt) {
        setTimeLeft(Math.max(0, Math.round((expiresAt - Date.now()) / 1000)));
      } else {
        setTimeLeft((prev) => {
          if (prev <= 1) { clearInterval(interval); return 0; }
          return prev - 1;
        });
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [nameSet, roomStatus, expiresAt]);

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const timerColor = timeLeft <= 60 ? "#ff6680" : timeLeft <= 180 ? "#ffb347" : "#7cf5a0";

  // ── Socket lifecycle: create per-mount, leave + disconnect on cleanup ──
  useEffect(() => {
    if (!nameSet || !hasValidRoomId || roomStatus !== "valid") return;

    const backend = getBackendUrl();
    const sock = io(backend || undefined);
    socketRef.current = sock;
    joinedRef.current = false;

    const doJoin = () => {
      if (joinedRef.current) return;
      joinedRef.current = true;
      sock.emit("join-room", { roomId, username });
    };

    if (sock.connected) doJoin();
    else sock.on("connect", doJoin);

    sock.on("receive-message", (data) => {
      setMessages((prev) => [...prev, {
        type: "received",
        username: data.username,
        text: data.message,
        time: data.time,
      }]);
    });

    // persisted history — refresh-safe + late-joiner sees prior messages
    sock.on("room-history", (history) => {
      if (!Array.isArray(history) || !history.length) return;
      if (historyLoadedRef.current === roomId) return;
      historyLoadedRef.current = roomId;
      const me = usernameRef.current;
      const mapped = history.map((m) => ({
        type: m.username === me ? "sent" : "received",
        username: m.username,
        text: m.message,
        time: m.time,
      }));
      setMessages((prev) => {
        if (!prev.length) return mapped;
        const seen = new Set(prev.map((p) => `${p.username}|${p.text}|${p.time}`));
        const fresh = mapped.filter((m) => !seen.has(`${m.username}|${m.text}|${m.time}`));
        return [...fresh, ...prev];
      });
    });

    sock.on("user-joined", (msg) => {
      setMessages((prev) => [...prev, { type: "system", text: msg }]);
      showToast(msg, "success");
    });

    sock.on("user-left", (msg) => {
      setMessages((prev) => [...prev, { type: "system", text: msg }]);
      showToast(msg, "info");
    });

    sock.on("participants-updated", (users) => {
      setParticipants(users);
    });

    sock.on("room-destroyed", () => {
      try {
        destroySoundRef.current?.play()?.catch(() => {});
      } catch { /* ignore */ }
      showToast("Room destroyed. Redirecting...", "error");
      setTimeout(() => { window.location.href = "/"; }, 2000);
    });

    return () => {
      try {
        sock.emit("leave-room", { roomId });
      } catch { /* ignore */ }
      sock.removeAllListeners();
      sock.disconnect();
      socketRef.current = null;
      joinedRef.current = false;
    };
  }, [roomId, hasValidRoomId, nameSet, username, roomStatus]);

  // ── Auto scroll ──
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const onResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (!mobile) setShowParticipants(true);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const sendMessage = () => {
    if (!input.trim() || !socketRef.current) return;
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    socketRef.current.emit("send-message", { roomId, message: input, username, time });
    setMessages((prev) => [...prev, { type: "sent", text: input, time }]);
    setInput("");
  };

  const copyId = () => {
    if (!hasValidRoomId) return;
    navigator.clipboard.writeText(roomId);
    showToast("Room ID copied!", "success");
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    showToast("Share link copied!", "success");
  };

  const destroyRoom = () => {
    if (!hasValidRoomId || !socketRef.current) return;
    socketRef.current.emit("destroy-room", roomId);
  };

  const leaveChat = () => {
    try {
      socketRef.current?.emit("leave-room", { roomId });
    } catch { /* ignore */ }
    navigate("/");
  };

  const leaveCreateRoom = () => {
    navigate("/");
  };

  // ─── Room checking / invalid screens ────────────────────────────────────
  if (roomStatus === "checking") {
    return (
      <>
        <style>{cssKeyframes}</style>
        <div style={{
          height: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
          background: "#07070d", fontFamily: "'DM Mono', monospace",
          color: "rgba(200,200,230,0.6)", fontSize: "13px", letterSpacing: "0.1em",
        }}>
          CHECKING ROOM…
        </div>
      </>
    );
  }

  if (roomStatus === "invalid") {
    return (
      <>
        <style>{cssKeyframes}</style>
        <Toast toasts={toasts} isMobile={isMobile} />
        <div style={{
          height: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
          background: "#07070d", fontFamily: "'Syne', sans-serif",
          padding: "16px",
        }}>
          <div style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,80,100,0.25)",
            borderRadius: "16px",
            padding: "36px 32px",
            display: "flex", flexDirection: "column", alignItems: "center", gap: "16px",
            maxWidth: "400px", width: "100%", textAlign: "center",
          }}>
            <span style={{ fontSize: "32px" }}>👻</span>
            <h2 style={{ margin: 0, color: "#f1f1ff", fontSize: "18px", letterSpacing: "0.08em" }}>
              ROOM NOT FOUND
            </h2>
            <p style={{ margin: 0, fontFamily: "'DM Mono', monospace", fontSize: "12px", color: "rgba(200,200,230,0.55)", lineHeight: 1.6 }}>
              This room expired or the ID is wrong.<br />Check the ID or create a new room.
            </p>
            <button
              onClick={leaveChat}
              style={{
                width: "100%", padding: "12px",
                background: "linear-gradient(135deg, #6660dd, #9088ee)",
                border: "none", borderRadius: "8px", color: "#fff",
                fontFamily: "'Syne', sans-serif", fontWeight: 700,
                fontSize: "12px", letterSpacing: "0.16em", cursor: "pointer",
              }}
            >
              BACK HOME
            </button>
          </div>
        </div>
      </>
    );
  }

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
          padding: isMobile ? "16px" : "0",
        }}>
          <div style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.09)",
            borderRadius: "16px",
            padding: isMobile ? "30px 20px" : "40px 48px",
            display: "flex", flexDirection: "column", alignItems: "center", gap: "20px",
            backdropFilter: "blur(20px)",
            boxShadow: "0 0 60px rgba(120,100,255,0.08)",
            animation: "fadeUp 0.6s cubic-bezier(0.22,1,0.36,1) both",
            minWidth: isMobile ? "0" : "340px",
            maxWidth: "420px",
            width: isMobile ? "100%" : "auto",
          }}>
            <div style={{ textAlign: "center" }}>
              <h1 style={{
                fontFamily: "'Syne', sans-serif", fontWeight: 800,
                fontSize: isMobile ? "24px" : "28px", margin: "0 0 6px 0",
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

            <button
              type="button"
              onClick={leaveCreateRoom}
              aria-label="Cancel room creation and return home"
              style={{
                width: "100%",
                padding: "11px",
                background: "transparent",
                border: "1px solid rgba(180,178,255,0.18)",
                borderRadius: "8px",
                color: "rgba(220,218,255,0.68)",
                fontFamily: "'Syne', sans-serif",
                fontWeight: 700,
                fontSize: "11px",
                letterSpacing: "0.16em",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.target.style.borderColor = "rgba(180,178,255,0.38)";
                e.target.style.color = "rgba(235,234,255,0.9)";
                e.target.style.background = "rgba(255,255,255,0.04)";
              }}
              onMouseLeave={(e) => {
                e.target.style.borderColor = "rgba(180,178,255,0.18)";
                e.target.style.color = "rgba(220,218,255,0.68)";
                e.target.style.background = "transparent";
              }}
            >
              CANCEL
            </button>

            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: "rgba(180,178,255,0.3)", letterSpacing: "0.05em", margin: 0, textAlign: "center" }}>
              room · <span style={{ color: "rgba(124,245,160,0.6)" }}>{roomId?.slice(0, 8)}…</span>
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
      <Toast toasts={toasts} isMobile={isMobile} />

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
          flexWrap: "wrap",
          gap: isMobile ? "8px 10px" : "0",
          padding: isMobile ? "10px 12px" : "0 20px", minHeight: "56px", flexShrink: 0,
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          background: "rgba(7,7,13,0.85)", backdropFilter: "blur(16px)",
          position: "relative", zIndex: 10,
        }}>
          {/* Left: Room ID */}
          <div style={{ display: "flex", alignItems: "center", gap: isMobile ? "6px" : "10px", flexWrap: "wrap", minWidth: 0 }}>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", letterSpacing: "0.2em", color: "rgba(200,200,230,0.35)", display: isMobile ? "none" : "inline" }}>
              ROOM ID
            </span>
            <div style={{
              background: "rgba(124,245,160,0.08)", border: "1px solid rgba(124,245,160,0.2)",
              borderRadius: "8px", padding: "5px 12px",
              fontFamily: "'DM Mono', monospace", fontSize: isMobile ? "12px" : "13px", color: "#7cf5a0",
              letterSpacing: "0.04em",
            }}>
              {roomId}
            </div>

            <HeaderBtn onClick={copyId} label="COPY ID" title="Copy room ID" compact={isMobile} icon={<CopyIcon />} />
            <HeaderBtn onClick={copyLink} label="SHARE" title="Copy share link" compact={isMobile} icon={<ShareIcon />} />
          </div>

          {/* Center: Timer */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {!isMobile && (
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", letterSpacing: "0.2em", color: "rgba(200,200,230,0.35)" }}>
                SELF-DESTRUCT
              </span>
            )}
            <div title={isMobile ? "Self-destruct timer" : undefined} style={{
              background: `rgba(${timerColor === "#ff6680" ? "255,80,100" : timerColor === "#ffb347" ? "255,179,71" : "124,245,160"},0.1)`,
              border: `1px solid ${timerColor}44`,
              borderRadius: "8px", padding: isMobile ? "5px 12px" : "4px 14px",
              fontFamily: "'DM Mono', monospace", fontSize: isMobile ? "13px" : "15px",
              color: timerColor, fontWeight: 400,
              transition: "all 0.5s",
              boxShadow: `0 0 12px ${timerColor}22`,
              fontVariantNumeric: "tabular-nums",
            }}>
              {isMobile ? `⏳ ${formatTime(timeLeft)}` : formatTime(timeLeft)}
            </div>
          </div>

          {/* Right: Destroy */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {isMobile && (
              <button
                onClick={() => setShowParticipants((v) => !v)}
                aria-expanded={showParticipants}
                title="Toggle participants"
                style={{
                  display: "flex", alignItems: "center", gap: "6px",
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "8px", padding: "7px 10px",
                  fontFamily: "'DM Mono', monospace", fontSize: "10px",
                  letterSpacing: "0.12em",
                  color: "rgba(220,218,255,0.75)", cursor: "pointer",
                }}
              >
                <UsersIcon />
                {participants.length}
                <span style={{ fontSize: "9px", opacity: 0.7 }}>{showParticipants ? "▲" : "▼"}</span>
              </button>
            )}
            <button
              onClick={destroyRoom}
              title="Destroy room for everyone"
              style={{
                display: "flex", alignItems: "center", gap: "7px",
                background: "rgba(255,80,100,0.08)",
                border: "1px solid rgba(255,80,100,0.3)",
                borderRadius: "8px", padding: isMobile ? "7px 10px" : "7px 16px",
                fontFamily: "'Syne', sans-serif", fontWeight: 700,
                fontSize: "11px", letterSpacing: "0.14em",
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
              <DestroyIcon />{isMobile ? "DESTROY" : "DESTROY NOW"}
            </button>
          </div>
        </div>

        <div style={{
          flex: 1,
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          minHeight: 0,
          position: "relative",
          zIndex: 1,
        }}>
          {/* ── PARTICIPANTS ── */}
          <aside style={{
            display: isMobile && !showParticipants ? "none" : "block",
            width: isMobile ? "100%" : "248px",
            minWidth: isMobile ? "auto" : "220px",
            maxWidth: isMobile ? "100%" : "260px",
            maxHeight: isMobile ? "168px" : "none",
            borderRight: isMobile ? "none" : "1px solid rgba(255,255,255,0.07)",
            borderBottom: isMobile ? "1px solid rgba(255,255,255,0.07)" : "none",
            padding: isMobile ? "12px" : "18px 14px",
            background: "rgba(7,7,13,0.6)",
            backdropFilter: "blur(10px)",
            overflowY: "auto",
            scrollbarWidth: "thin",
            scrollbarColor: "rgba(255,255,255,0.08) transparent",
            flexShrink: 0,
          }}>
            <p style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "10px",
              letterSpacing: "0.2em",
              color: "rgba(200,200,230,0.4)",
              margin: "0 0 12px 0",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}>
              <span style={{
                width: "7px", height: "7px", borderRadius: "50%",
                background: "#7cf5a0", boxShadow: "0 0 8px #7cf5a0",
                display: "inline-block",
              }} />
              ONLINE ({participants.length})
            </p>

            <div style={{ display: "flex", flexDirection: isMobile ? "row" : "column", flexWrap: isMobile ? "wrap" : "nowrap", gap: "8px" }}>
              {participants.length === 0 ? (
                <p style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "11px",
                  color: "rgba(200,200,230,0.35)",
                  margin: 0,
                }}>
                  Waiting for people... share the link.
                </p>
              ) : (
                participants.map((person, idx) => {
                  const isMe = person === username;
                  return (
                    <div key={`${person}-${idx}`} style={{
                      display: "flex", alignItems: "center", gap: "9px",
                      padding: "8px 10px",
                      borderRadius: "10px",
                      background: isMe ? "rgba(124,245,160,0.07)" : "rgba(255,255,255,0.04)",
                      border: isMe ? "1px solid rgba(124,245,160,0.22)" : "1px solid rgba(255,255,255,0.07)",
                      fontFamily: "'DM Mono', monospace",
                      fontSize: "12px",
                      color: isMe ? "#7cf5a0" : "rgba(220,220,245,0.85)",
                      letterSpacing: "0.03em",
                    }}>
                      <span style={{
                        width: "24px", height: "24px", borderRadius: "50%", flexShrink: 0,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        background: isMe ? "rgba(124,245,160,0.15)" : "rgba(136,128,255,0.18)",
                        color: isMe ? "#7cf5a0" : "#b0aaff",
                        fontSize: "11px", fontWeight: 700,
                        textTransform: "uppercase",
                      }}>
                        {(person?.[0] || "?").toUpperCase()}
                      </span>
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {person}{isMe ? " (you)" : ""}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </aside>

          {/* ── CHAT COLUMN ── */}
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
            {/* ── MESSAGES ── */}
            <div style={{
              flex: 1, overflowY: "auto", padding: isMobile ? "16px 12px" : "24px 22px",
              display: "flex", flexDirection: "column", gap: "6px",
              scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.08) transparent",
            }}>
              {messages.length === 0 && (
                <div style={{
                  flex: 1, display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center", gap: "12px",
                  color: "rgba(200,200,230,0.55)",
                  textAlign: "center", padding: "24px 12px",
                }}>
                  <span style={{
                    width: "56px", height: "56px", borderRadius: "50%",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: "rgba(136,128,255,0.1)",
                    border: "1px solid rgba(136,128,255,0.25)",
                    color: "#b0aaff",
                  }}>
                    <GhostIcon />
                  </span>
                  <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "16px", margin: 0, color: "#e8e8f0" }}>No messages yet</p>
                  <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "12px", margin: 0, opacity: 0.7, maxWidth: "300px", lineHeight: 1.6 }}>
                    Room history is kept until self-destruct. Say hi — others joining late will see it.
                  </p>
                </div>
              )}

              {messages.map((msg, i) => {
                if (msg.type === "system") {
                  return (
                    <div key={i} style={{
                      display: "flex", alignItems: "center", gap: "12px",
                      margin: "10px 0", justifyContent: "center",
                    }}>
                      <span style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.06)", maxWidth: "90px" }} />
                      <p style={{
                        fontFamily: "'DM Mono', monospace", fontSize: "11px",
                        color: "rgba(180,178,255,0.55)", margin: 0, letterSpacing: "0.06em",
                        background: "rgba(136,128,255,0.08)",
                        border: "1px solid rgba(136,128,255,0.15)",
                        padding: "4px 12px", borderRadius: "999px",
                        textAlign: "center",
                      }}>{msg.text}</p>
                      <span style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.06)", maxWidth: "90px" }} />
                    </div>
                  );
                }

                const isSent = msg.type === "sent";
                return (
                  <div key={i} style={{
                    display: "flex",
                    justifyContent: isSent ? "flex-end" : "flex-start",
                    marginBottom: "4px",
                    animation: "fadeUp 0.25s cubic-bezier(0.22,1,0.36,1) both",
                  }}>
                    <div style={{
                      maxWidth: isMobile ? "85%" : "64%",
                      minWidth: "64px",
                      background: isSent
                        ? "linear-gradient(135deg, #6d64e8 0%, #9a90ff 100%)"
                        : "rgba(255,255,255,0.055)",
                      border: isSent
                        ? "1px solid rgba(255,255,255,0.14)"
                        : "1px solid rgba(255,255,255,0.1)",
                      borderRadius: isSent ? "16px 16px 5px 16px" : "16px 16px 16px 5px",
                      padding: "10px 14px 8px",
                      backdropFilter: "blur(8px)",
                      boxShadow: isSent ? "0 4px 24px rgba(109,100,232,0.28)" : "0 2px 12px rgba(0,0,0,0.25)",
                    }}>
                      {!isSent && (
                        <p style={{
                          fontFamily: "'DM Mono', monospace", fontSize: "10px",
                          color: "#a9a3ff", margin: "0 0 5px 0", letterSpacing: "0.08em",
                          fontWeight: 700,
                        }}>{msg.username}</p>
                      )}
                      <p style={{
                        fontFamily: "'Syne', sans-serif", fontSize: "14px",
                        color: isSent ? "#ffffff" : "rgba(236,236,248,0.95)",
                        margin: "0 0 5px 0", lineHeight: 1.55,
                        overflowWrap: "anywhere", whiteSpace: "pre-wrap",
                      }}>{msg.text}</p>
                      <p style={{
                        fontFamily: "'DM Mono', monospace", fontSize: "10px",
                        color: isSent ? "rgba(255,255,255,0.65)" : "rgba(200,200,230,0.35)", margin: 0, textAlign: "right",
                        letterSpacing: "0.04em", fontVariantNumeric: "tabular-nums",
                      }}>{msg.time}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {/* ── INPUT ── */}
            <div style={{
              padding: isMobile ? "10px 12px calc(12px + env(safe-area-inset-bottom, 0px))" : "16px 20px", flexShrink: 0,
              borderTop: "1px solid rgba(255,255,255,0.07)",
              background: "rgba(7,7,13,0.9)", backdropFilter: "blur(16px)",
              display: "flex", alignItems: "center", gap: "10px",
            }}>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                placeholder="Type a ghost message... 👻"
                maxLength={2000}
                aria-label="Type a message"
                style={{
                  flex: 1, minWidth: 0,
                  background: "rgba(255,255,255,0.055)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "14px", padding: "13px 18px",
                  color: "#e8e8f0", fontFamily: "'Syne', sans-serif", fontSize: "14px",
                  outline: "none", transition: "border-color 0.2s, box-shadow 0.2s",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "rgba(136,128,255,0.45)";
                  e.target.style.boxShadow = "0 0 0 3px rgba(136,128,255,0.1)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "rgba(255,255,255,0.1)";
                  e.target.style.boxShadow = "none";
                }}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim()}
                aria-label="Send message"
                title="Send"
                style={{
                  width: "48px", height: "48px", borderRadius: "14px",
                  background: input.trim()
                    ? "linear-gradient(135deg, #6d64e8, #9a90ff)"
                    : "rgba(255,255,255,0.05)",
                  border: input.trim() ? "1px solid rgba(255,255,255,0.14)" : "1px solid rgba(255,255,255,0.09)",
                  color: input.trim() ? "#fff" : "rgba(255,255,255,0.25)",
                  cursor: input.trim() ? "pointer" : "not-allowed",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.2s", flexShrink: 0,
                  boxShadow: input.trim() ? "0 4px 20px rgba(109,100,232,0.4)" : "none",
                  opacity: input.trim() ? 1 : 0.7,
                }}
              >
                <SendIcon />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Small header button ──────────────────────────────────────────────────────
function HeaderBtn({ onClick, label, title, icon, compact }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      title={title || label}
      aria-label={title || label}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "flex", alignItems: "center", gap: "6px",
        background: hov ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.03)",
        border: "1px solid",
        borderColor: hov ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.09)",
        borderRadius: "8px", padding: compact ? "7px 9px" : "6px 12px",
        fontFamily: "'DM Mono', monospace", fontSize: "10px",
        letterSpacing: "0.14em", color: hov ? "rgba(220,218,255,0.9)" : "rgba(200,200,230,0.55)",
        cursor: "pointer", transition: "all 0.18s",
      }}
    >
      <span style={{ display: "flex" }}>{icon}</span>{compact ? null : label}
    </button>
  );
}

function CopyIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" />
    </svg>
  );
}

function DestroyIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 6h18" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m22 2-7 20-4-9-9-4Z" />
      <path d="M22 2 11 13" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function GhostIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 10h.01M15 10h.01" />
      <path d="M10 15c.5.5 1.5.5 2 0 .5-.5 1.5-.5 2 0" />
      <path d="M5 11a7 7 0 0 1 14 0v9a1 1 0 0 1-1.6.8l-1.9-1.4a1 1 0 0 0-1.2 0l-1.9 1.4a1 1 0 0 1-1.2 0l-1.9-1.4a1 1 0 0 0-1.2 0L6.6 20.8A1 1 0 0 1 5 20Z" />
    </svg>
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
