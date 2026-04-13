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
  const fullText = "you were never here.";
  const intervalRef = useRef(null);
  const glitchRef = useRef(null);

  const navigate = useNavigate();

  const createRoom = async () => {
    const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/create-room`, { method: "POST" });
    const data = await res.json();
    navigate(`/room/${data.roomId}`);
  };

  const joinRoom = () => {
    const roomId = prompt("Enter Room ID");
    if (roomId) navigate(`/room/${roomId}`);
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
          width: "520px", height: "320px",
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
            marginBottom: "38px",
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
            marginBottom: "36px",
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
            marginBottom: "52px",
            height: "20px",
            animation: "fadeUp 0.9s 0.45s both",
          }}>
            {typed}
            <span style={{ animation: "cursor-blink 1s infinite", marginLeft: "1px" }}>▌</span>
          </div>

          {/* Buttons */}
          <div style={{
            display: "flex", gap: "16px", flexWrap: "wrap", justifyContent: "center",
            animation: "fadeUp 0.9s 0.55s both",
          }}>
            <Button primary label="CREATE ROOM" onClick={createRoom} />
            <Button label="JOIN ROOM" onClick={joinRoom} />
            <Button icon label="⬡  GITHUB" onClick={() => window.open("https://github.com/swaroopstack/Ghosted-real-time-chat", "_blank")} />
          </div>

        </div>

        {/* Bottom label */}
        <div style={{
          position: "absolute", bottom: "28px",
          fontFamily: "'DM Mono', monospace",
          fontSize: "10px", letterSpacing: "0.22em",
          color: "rgba(255,255,255,0.14)",
          display: "flex", alignItems: "center", gap: "14px",
          zIndex: 2,
          animation: "fadeUp 1s 0.8s both",
        }}>
          <span style={{ width: "32px", height: "1px", background: "rgba(255,255,255,0.15)" }} />
          SCROLL TO BEGIN
          <span style={{ width: "32px", height: "1px", background: "rgba(255,255,255,0.15)" }} />
        </div>

      </div>
    </>
  );
}

function Button({ label, primary, icon, onClick }) {
  const [hovered, setHovered] = useState(false);

  const base = {
    position: "relative",
    padding: "14px 32px",
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
