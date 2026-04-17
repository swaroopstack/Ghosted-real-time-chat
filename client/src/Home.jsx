import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

const glitchKeyframes = `
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=DM+Mono:ital,wght@0,300;0,400;1,300&display=swap');

@keyframes flicker {
  0%, 19%, 21%, 23%, 25%, 54%, 56%, 100% { opacity: 1; }
  20%, 24%, 55% { opacity: 0.4; }
}

@keyframes glitch-1 {
  0% { clip-path: inset(40% 0 61% 0); transform: translate(-4px, 0); }
  20% { clip-path: inset(92% 0 1% 0); transform: translate(4px, 0); }
  40% { clip-path: inset(43% 0 1% 0); transform: translate(-2px, 0); }
  60% { clip-path: inset(25% 0 58% 0); transform: translate(2px, 0); }
  80% { clip-path: inset(54% 0 7% 0); transform: translate(-4px, 0); }
  100% { clip-path: inset(58% 0 43% 0); transform: translate(4px, 0); }
}

@keyframes glitch-2 {
  0% { clip-path: inset(24% 0 29% 0); transform: translate(4px, 0); }
  20% { clip-path: inset(54% 0 21% 0); transform: translate(-4px, 0); }
  40% { clip-path: inset(8% 0 80% 0); transform: translate(2px, 0); }
  60% { clip-path: inset(67% 0 6% 0); transform: translate(-2px, 0); }
  80% { clip-path: inset(38% 0 46% 0); transform: translate(4px, 0); }
  100% { clip-path: inset(19% 0 66% 0); transform: translate(-4px, 0); }
}

@keyframes fadeUp {
  from { opacity: 0; transform: translateY(28px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes scanline {
  0%   { transform: translateY(-100%); }
  100% { transform: translateY(100vh); }
}

@keyframes pulse-ring {
  0%   { transform: scale(0.8); opacity: 0.6; }
  100% { transform: scale(2.2); opacity: 0; }
}

@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50%       { transform: translateY(-8px); }
}

@keyframes borderGlow {
  0%, 100% { box-shadow: 0 0 0px rgba(200,200,255,0.15), inset 0 0 0px rgba(200,200,255,0.05); }
  50%       { box-shadow: 0 0 18px rgba(200,200,255,0.25), inset 0 0 8px rgba(200,200,255,0.08); }
}

@keyframes noise {
  0%, 100% { background-position: 0 0; }
  10%       { background-position: -5% -10%; }
  30%       { background-position: 3% 5%; }
  50%       { background-position: 12% -4%; }
  70%       { background-position: -7% 8%; }
  90%       { background-position: 5% -2%; }
}

@keyframes tagDrift {
  0%   { transform: translateX(0) translateY(0); opacity: 0.18; }
  50%  { transform: translateX(6px) translateY(-4px); opacity: 0.28; }
  100% { transform: translateX(0) translateY(0); opacity: 0.18; }
}

@keyframes cursor-blink {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0; }
}
`;

const Particle = ({ style }) => (
  <div style={{
    position: "absolute",
    width: style.size,
    height: style.size,
    borderRadius: "50%",
    background: style.color,
    top: style.top,
    left: style.left,
    opacity: style.opacity,
    animation: `tagDrift ${style.dur}s ease-in-out infinite`,
    animationDelay: style.delay,
    pointerEvents: "none",
  }} />
);

export default function Home() {
  const [glitching, setGlitching] = useState(false);
  const [typed, setTyped] = useState("");
  const [starCount, setStarCount] = useState("51");
  const [showJoinPanel, setShowJoinPanel] = useState(false);
  const [joinRoomId, setJoinRoomId] = useState("");
  const [joinUsername, setJoinUsername] = useState("");
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);
  const fullText = "you were never here.";
  const intervalRef = useRef(null);
  const glitchRef = useRef(null);

  const navigate = useNavigate();

  const createRoom = async () => {
    const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/create-room`, { method: "POST" });
    const data = await res.json();
    navigate(`/room/${data.roomId}`);
  };

  const openJoinPanel = () => {
    setShowJoinPanel(true);
  };

  const closeJoinPanel = () => {
    setShowJoinPanel(false);
    setJoinRoomId("");
    setJoinUsername("");
  };

  const joinRoom = () => {
    const trimmedRoomId = joinRoomId.trim();
    const trimmedUsername = joinUsername.trim();

    if (!trimmedRoomId || !trimmedUsername) return;
    navigate(`/room/${trimmedRoomId}`, { state: { username: trimmedUsername } });
    closeJoinPanel();
  };

  // Typewriter effect
  useEffect(() => {
    let i = 0;
    const t = setInterval(() => {
      setTyped(fullText.slice(0, i + 1));
      i++;
      if (i >= fullText.length) clearInterval(t);
    }, 60);
    return () => clearInterval(t);
  }, []);

  // Random glitch trigger
  useEffect(() => {
    const trigger = () => {
      setGlitching(true);
      setTimeout(() => setGlitching(false), 300);
    };
    glitchRef.current = setInterval(trigger, 4500);
    return () => clearInterval(glitchRef.current);
  }, []);

  // GitHub stars
  useEffect(() => {
    const fetchStars = async () => {
      try {
        const response = await fetch("https://api.github.com/repos/swaroopstack/Ghosted-real-time-chat");
        if (!response.ok) return;
        const repo = await response.json();
        if (typeof repo?.stargazers_count === "number") {
          setStarCount(String(repo.stargazers_count));
        }
      } catch {
        // Keep fallback value if request fails.
      }
    };

    fetchStars();
  }, []);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const particles = Array.from({ length: 28 }, (_, i) => ({
    size: `${Math.random() * 4 + 2}px`,
    color: i % 3 === 0 ? "rgba(160,160,255,0.5)" : i % 3 === 1 ? "rgba(255,255,255,0.3)" : "rgba(120,200,255,0.4)",
    top: `${Math.random() * 100}%`,
    left: `${Math.random() * 100}%`,
    opacity: Math.random() * 0.3 + 0.1,
    dur: Math.random() * 5 + 3,
    delay: `${Math.random() * 4}s`,
  }));

  return (
    <>
      <style>{glitchKeyframes}</style>
      <div style={{
        minHeight: "100vh",
        background: "#07070d",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
        fontFamily: "'Syne', sans-serif",
        color: "#e8e8f0",
        padding: isMobile ? "24px 12px 72px" : "0",
      }}>

        {/* Noise overlay */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
          backgroundSize: "200px 200px",
          animation: "noise 0.5s steps(1) infinite",
          opacity: 0.6,
        }} />

        {/* Scanline */}
        <div style={{
          position: "absolute", left: 0, right: 0, height: "2px",
          background: "linear-gradient(to right, transparent, rgba(180,180,255,0.12), transparent)",
          animation: "scanline 8s linear infinite",
          pointerEvents: "none", zIndex: 1,
        }} />

        {/* Vignette */}
        <div style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.85) 100%)",
          pointerEvents: "none", zIndex: 0,
        }} />

        {/* Grid lines subtle */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0,
          backgroundImage: `linear-gradient(rgba(255,255,255,0.022) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.022) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }} />

        {/* Floating particles */}
        {particles.map((p, i) => <Particle key={i} style={p} />)}

        {/* Glow blob */}
        <div style={{
          position: "absolute",
          width: isMobile ? "360px" : "520px", height: isMobile ? "220px" : "320px",
          borderRadius: "50%",
          background: "radial-gradient(ellipse, rgba(120,100,255,0.08) 0%, transparent 70%)",
          top: "30%", left: "50%", transform: "translate(-50%, -50%)",
          pointerEvents: "none", zIndex: 0,
          filter: "blur(40px)",
        }} />

        {/* Main content */}
        <div style={{
          position: "relative", zIndex: 2,
          display: "flex", flexDirection: "column", alignItems: "center",
          gap: "0px",
          animation: "fadeUp 0.9s cubic-bezier(0.22,1,0.36,1) both",
        }}>

          {/* Status pill */}
          <div style={{
            display: "flex", alignItems: "center", gap: "8px",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "999px",
            padding: "5px 14px",
            fontSize: "11px",
            letterSpacing: "0.18em",
            color: "rgba(180,180,255,0.7)",
            fontFamily: "'DM Mono', monospace",
            marginBottom: isMobile ? "24px" : "38px",
            animation: "fadeUp 0.9s 0.1s both",
          }}>
            <span style={{
              width: "6px", height: "6px", borderRadius: "50%",
              background: "#7cf5a0",
              boxShadow: "0 0 8px #7cf5a0",
              display: "inline-block",
              animation: "flicker 3s infinite",
            }} />
            rooms active · no logs · no trace
          </div>

          {/* Logo / Title with glitch */}
          <div style={{ position: "relative", marginBottom: "10px", lineHeight: 1 }}>
            <h1 style={{
              fontSize: "clamp(72px, 13vw, 148px)",
              fontWeight: 800,
              letterSpacing: "-0.04em",
              margin: 0,
              background: "linear-gradient(135deg, #ffffff 0%, #c0bfff 45%, #8880ff 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              userSelect: "none",
              animation: "float 5s ease-in-out infinite",
              position: "relative",
            }}>
              ghosted
            </h1>

            {/* Glitch layers */}
            {glitching && <>
              <h1 aria-hidden="true" style={{
                position: "absolute", top: 0, left: 0,
                fontSize: "clamp(72px, 13vw, 148px)",
                fontWeight: 800,
                letterSpacing: "-0.04em",
                margin: 0,
                color: "#ff4466",
                opacity: 0.7,
                animation: "glitch-1 0.3s steps(1) both",
                pointerEvents: "none",
              }}>ghosted</h1>
              <h1 aria-hidden="true" style={{
                position: "absolute", top: 0, left: 0,
                fontSize: "clamp(72px, 13vw, 148px)",
                fontWeight: 800,
                letterSpacing: "-0.04em",
                margin: 0,
                color: "#44aaff",
                opacity: 0.7,
                animation: "glitch-2 0.3s steps(1) both",
                pointerEvents: "none",
              }}>ghosted</h1>
            </>}
          </div>

          {/* Tagline row */}
          <div style={{
            display: "flex", gap: "10px", alignItems: "center",
            fontFamily: "'DM Mono', monospace",
            fontSize: "clamp(10px, 1.4vw, 13px)",
            letterSpacing: "0.28em",
            color: "rgba(200,200,230,0.45)",
            textTransform: "uppercase",
            marginBottom: isMobile ? "26px" : "36px",
            flexWrap: "wrap",
            justifyContent: "center",
            animation: "fadeUp 0.9s 0.25s both",
          }}>
            <span>VANISHES</span>
            <span style={{ opacity: 0.3 }}>·</span>
            <span>ENCRYPTED</span>
            <span style={{ opacity: 0.3 }}>·</span>
            <span>ANONYMOUS</span>
          </div>

          {/* Description */}
          <p style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: "clamp(13px, 1.6vw, 15px)",
            fontStyle: "italic",
            color: "rgba(200,200,220,0.5)",
            textAlign: "center",
            maxWidth: "440px",
            width: isMobile ? "92vw" : "auto",
            lineHeight: 1.7,
            margin: "0 0 12px 0",
            animation: "fadeUp 0.9s 0.35s both",
          }}>
            Chat rooms that dissolve in 10 minutes.
            <br />No accounts. No history. No proof.
          </p>

          {/* Typewriter line */}
          <div style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: "13px",
            color: "rgba(140,135,255,0.7)",
            letterSpacing: "0.06em",
            marginBottom: isMobile ? "32px" : "52px",
            height: "20px",
            animation: "fadeUp 0.9s 0.45s both",
          }}>
            {typed}
            <span style={{ animation: "cursor-blink 1s infinite", marginLeft: "1px" }}>▌</span>
          </div>

          {/* Buttons */}
          <div style={{
            display: "flex", gap: "12px", flexWrap: "wrap", justifyContent: "center", width: isMobile ? "100%" : "auto",
            animation: "fadeUp 0.9s 0.55s both",
          }}>
            <Button primary label="CREATE ROOM" onClick={createRoom} isMobile={isMobile} />
            <Button label="JOIN ROOM" onClick={openJoinPanel} isMobile={isMobile} />
            <GitHubStarButton
              stars={starCount}
              onClick={() => window.open("https://github.com/swaroopstack/Ghosted-real-time-chat", "_blank")}
              isMobile={isMobile}
            />
          </div>

        </div>

        {/* Bottom label */}
        <div style={{
          position: "absolute", bottom: "28px",
          fontFamily: "'DM Mono', monospace",
          fontSize: "10px", letterSpacing: "0.22em",
          color: "rgba(255,255,255,0.14)",
          alignItems: "center", gap: "14px",
          zIndex: 2,
          animation: "fadeUp 1s 0.8s both",
          display: isMobile ? "none" : "flex",
        }}>
          <span style={{ width: "32px", height: "1px", background: "rgba(255,255,255,0.15)" }} />
          SCROLL TO BEGIN
          <span style={{ width: "32px", height: "1px", background: "rgba(255,255,255,0.15)" }} />
        </div>

      </div>

      {showJoinPanel && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(3, 3, 8, 0.7)",
          backdropFilter: "blur(8px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9,
          padding: "20px",
        }}>
          <div style={{
            width: "100%",
            maxWidth: "420px",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: "14px",
            padding: "26px",
            boxShadow: "0 0 40px rgba(130,120,255,0.16)",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            animation: "fadeUp 0.35s cubic-bezier(0.22,1,0.36,1) both",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
              <div>
                <h3 style={{
                  margin: 0,
                  fontFamily: "'Syne', sans-serif",
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  fontSize: "16px",
                  color: "#f1f1ff",
                }}>
                  JOIN ROOM
                </h3>
                <p style={{
                  margin: "6px 0 0 0",
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "11px",
                  letterSpacing: "0.08em",
                  color: "rgba(185, 182, 235, 0.65)",
                }}>
                  Enter room ID and alias
                </p>
              </div>
              <button
                onClick={closeJoinPanel}
                aria-label="Close join room panel"
                style={{
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "transparent",
                  color: "rgba(230,230,250,0.8)",
                  borderRadius: "8px",
                  width: "34px",
                  height: "34px",
                  cursor: "pointer",
                  fontSize: "16px",
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <label style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "10px",
                letterSpacing: "0.2em",
                color: "rgba(200,200,230,0.48)",
              }}>
                ROOM ID
              </label>
              <input
                autoFocus
                value={joinRoomId}
                onChange={(e) => setJoinRoomId(e.target.value)}
                placeholder="e.g. 9f2a31cd"
                style={joinInputStyle}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <label style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "10px",
                letterSpacing: "0.2em",
                color: "rgba(200,200,230,0.48)",
              }}>
                USERNAME
              </label>
              <input
                value={joinUsername}
                onChange={(e) => setJoinUsername(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && joinRoom()}
                placeholder="anonymous_ghost"
                style={joinInputStyle}
              />
            </div>

            <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
              <button
                onClick={closeJoinPanel}
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: "8px",
                  border: "1px solid rgba(255,255,255,0.15)",
                  background: "transparent",
                  color: "rgba(220,218,255,0.8)",
                  fontFamily: "'Syne', sans-serif",
                  fontSize: "11px",
                  letterSpacing: "0.14em",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                CANCEL
              </button>
              <button
                onClick={joinRoom}
                disabled={!joinRoomId.trim() || !joinUsername.trim()}
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: "8px",
                  border: "none",
                  background: "linear-gradient(135deg, #6660dd, #9088ee)",
                  color: "#fff",
                  fontFamily: "'Syne', sans-serif",
                  fontSize: "11px",
                  letterSpacing: "0.14em",
                  fontWeight: 700,
                  cursor: !joinRoomId.trim() || !joinUsername.trim() ? "not-allowed" : "pointer",
                  opacity: !joinRoomId.trim() || !joinUsername.trim() ? 0.5 : 1,
                  boxShadow: "0 0 20px rgba(136,128,255,0.25)",
                }}
              >
                JOIN
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const joinInputStyle = {
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: "8px",
  padding: "12px 14px",
  color: "#e8e8f0",
  fontFamily: "'DM Mono', monospace",
  fontSize: "13px",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};

function Button({ label, primary, icon, onClick, isMobile }) {
  const [hovered, setHovered] = useState(false);

  const base = {
    position: "relative",
    padding: isMobile ? "13px 18px" : "14px 32px",
    fontSize: "12px",
    fontFamily: "'Syne', sans-serif",
    fontWeight: 700,
    letterSpacing: "0.18em",
    cursor: "pointer",
    border: "none",
    outline: "none",
    transition: "all 0.25s ease",
    overflow: "hidden",
    display: "flex", alignItems: "center", gap: "8px",
    width: isMobile ? "100%" : "auto",
    justifyContent: "center",
  };

  if (primary) {
    return (
      <button
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={onClick}
        style={{
          ...base,
          background: hovered
            ? "linear-gradient(135deg, #8880ff, #b0aaff)"
            : "linear-gradient(135deg, #6660dd, #9088ee)",
          color: "#ffffff",
          borderRadius: "4px",
          boxShadow: hovered
            ? "0 0 32px rgba(136,128,255,0.45), 0 0 8px rgba(136,128,255,0.3)"
            : "0 0 16px rgba(136,128,255,0.2)",
          transform: hovered ? "translateY(-2px)" : "none",
          animation: "borderGlow 3s ease-in-out infinite",
        }}
      >
        {label}
      </button>
    );
  }

  return (
    <button
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
      style={{
        ...base,
        background: hovered ? "rgba(255,255,255,0.06)" : "transparent",
        color: hovered ? "rgba(220,218,255,0.9)" : "rgba(200,198,240,0.55)",
        border: "1px solid",
        borderColor: hovered ? "rgba(180,178,255,0.4)" : "rgba(255,255,255,0.12)",
        borderRadius: "4px",
        transform: hovered ? "translateY(-2px)" : "none",
        boxShadow: hovered ? "0 0 20px rgba(180,178,255,0.12)" : "none",
      }}
    >
      {label}
    </button>
  );
}

function GitHubStarButton({ stars, onClick, isMobile }) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "12px 18px",
        background: hovered ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.35)",
        border: "1px solid",
        borderColor: hovered ? "rgba(255,220,180,0.55)" : "rgba(255,220,180,0.22)",
        borderRadius: "4px",
        color: "#f6d3ad",
        fontFamily: "'DM Mono', monospace",
        fontSize: isMobile ? "24px" : "31px",
        lineHeight: 1,
        cursor: "pointer",
        transition: "all 0.2s ease",
        transform: hovered ? "translateY(-2px)" : "none",
        boxShadow: hovered ? "0 0 18px rgba(255,200,140,0.2)" : "none",
      }}
      aria-label={`GitHub repository with ${stars} stars`}
      title="View on GitHub"
    >
      <GitHubIcon />
      <span style={{ fontWeight: 700, fontSize: isMobile ? "24px" : "31px" }}>{stars}</span>
      <StarIcon />
    </button>
  );
}

function GitHubIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .5a12 12 0 0 0-3.79 23.39c.6.11.82-.26.82-.58v-2.2c-3.34.72-4.04-1.6-4.04-1.6-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.74.08-.74 1.2.08 1.84 1.25 1.84 1.25 1.08 1.83 2.82 1.3 3.5.99.1-.78.42-1.3.76-1.6-2.66-.3-5.46-1.33-5.46-5.94 0-1.31.47-2.39 1.24-3.23-.12-.3-.54-1.52.12-3.16 0 0 1.01-.33 3.3 1.23a11.4 11.4 0 0 1 6 0c2.28-1.56 3.3-1.23 3.3-1.23.65 1.64.24 2.86.12 3.16.78.84 1.24 1.92 1.24 3.23 0 4.62-2.81 5.64-5.48 5.94.43.37.82 1.09.82 2.21v3.27c0 .32.22.7.83.58A12 12 0 0 0 12 .5Z" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <path d="m12 3 2.8 5.67 6.26.91-4.53 4.41 1.07 6.23L12 17.27 6.4 20.22l1.07-6.23L2.94 9.58l6.26-.91L12 3Z" />
    </svg>
  );
}
