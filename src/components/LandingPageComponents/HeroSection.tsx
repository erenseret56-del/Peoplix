import { motion } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import VideoModal from "./VideoModal";
import LogoLoop from "../LogoLoop";
import { useSiteConfig } from "../../hooks/useSiteConfig";
import video from "../../assets/Videos/see-peoplix-in-action.mp4";

const TRUSTED = ["Deloitte", "Google", "Microsoft", "Zapier", "Airbnb", "HubSpot"];

const trustedLogos = TRUSTED.map(name => ({
  node: <span className="font-bold select-none" style={{ fontSize: "20px", color: "#C4B8A6" }}>{name}</span>,
  title: name
}));

// ── Animated waveform bars ─────────────────────────────────────────────────────
const Waveform = () => {
  const bars = [4, 8, 14, 20, 28, 20, 14, 8, 14, 20, 28, 20, 14, 8, 4];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "3px", height: "32px" }}>
      {bars.map((h, i) => (
        <motion.div
          key={i}
          animate={{ scaleY: [1, 1.8, 0.6, 1.4, 1] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.08, ease: "easeInOut" }}
          style={{
            width: "3px",
            height: `${h}px`,
            borderRadius: "2px",
            background: "linear-gradient(to top, #6B5A3E, #C4A882)",
            transformOrigin: "center",
          }}
        />
      ))}
    </div>
  );
};

// ── Hero illustration — 3 cards orbit the mic orb on hover ────────────────────
const HeroIllustration = () => {
  const [resolveRate] = useState(94);
  const [hovered, setHovered]     = useState(false);
  const [rotation, setRotation]   = useState(0);
  const [orbitR, setOrbitR]       = useState(158);   // animated radius

  const angleRef    = useRef(0);
  const rafRef      = useRef<number>(0);
  const radiusRef   = useRef(158);
  const speedRef    = useRef(0);     // current rotation speed (deg/ms), eases in/out

  const BASE_R  = 158;
  const HOVER_R = 215;
  const MAX_SPEED = 0.038; // deg/ms at full speed

  useEffect(() => {
    let lastTime = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(now - lastTime, 50); // cap delta so tab-switch doesn't jump
      lastTime = now;

      // ── Ease radius ────────────────────────────────────────────────────
      const targetR = hovered ? HOVER_R : BASE_R;
      radiusRef.current += (targetR - radiusRef.current) * 0.06;
      if (Math.abs(targetR - radiusRef.current) > 0.2) {
        setOrbitR(radiusRef.current);
      } else if (radiusRef.current !== targetR) {
        radiusRef.current = targetR;
        setOrbitR(targetR);
      }

      // ── Ease rotation speed in/out ─────────────────────────────────────
      const targetSpeed = hovered ? MAX_SPEED : 0;
      speedRef.current += (targetSpeed - speedRef.current) * 0.025;

      if (Math.abs(speedRef.current) > 0.0001) {
        angleRef.current += speedRef.current * dt;
        setRotation(angleRef.current);
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [hovered]); // re-bind when hovered changes so targetSpeed/targetR update

  const toRad = (d: number) => (d * Math.PI) / 180;
  const baseAngles = [-90, 30, 150];
  const angles = baseAngles.map(a => a + rotation);

  const offsets = [
    { w: 95, h: 50 },
    { w: 80, h: 46 },
    { w: 75, h: 46 },
  ];

  const cardTop  = (i: number) => `calc(50% + ${Math.sin(toRad(angles[i])) * orbitR}px - ${offsets[i].h}px)`;
  const cardLeft = (i: number) => `calc(50% + ${Math.cos(toRad(angles[i])) * orbitR}px - ${offsets[i].w}px)`;

  return (
    <div style={{
      position: "relative",
      width: "100%",
      minHeight: "460px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}>

      {/* ── Orbit ring — expands + brightens on hover ───────────────────── */}
      <div
        style={{
          position: "absolute",
          width:   `${orbitR * 2 + 180}px`,
          height:  `${orbitR * 2 + 180}px`,
          borderRadius: "50%",
          border: `1px dashed rgba(0,0,0,${hovered ? 0.15 : 0.08})`,
          pointerEvents: "none",
          transition: "border-color 0.6s ease",
        }}
      />

      {/* ── Central mic orb (the hover target) ──────────────────────────── */}
      <motion.div
        onHoverStart={() => setHovered(true)}
        onHoverEnd={() => setHovered(false)}
        animate={{ scale: hovered ? 1.1 : 1 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        style={{ position: "relative", zIndex: 4, flexShrink: 0, cursor: "pointer" }}
      >
        {/* Pulse rings */}
        {[1, 2, 3].map(i => (
          <motion.div
            key={i}
            animate={{ scale: [1, 1.5 + i * 0.25], opacity: [0.3, 0] }}
            transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.5, ease: "easeOut" }}
            style={{
              position: "absolute",
              borderRadius: "50%",
              border: "1.5px solid rgba(139,115,85,0.35)",
              width: "120px", height: "120px",
              top: "50%", left: "50%",
              transform: "translate(-50%, -50%)",
              pointerEvents: "none",
            }}
          />
        ))}

        {/* Orb body */}
        <div style={{
          width: "120px", height: "120px", borderRadius: "50%",
          background: "linear-gradient(135deg, #2D2416 0%, #5C4A2A 60%, #8B7355 100%)",
          boxShadow: hovered
            ? "0 16px 56px rgba(90,70,40,0.5), inset 0 1px 0 rgba(255,255,255,0.15)"
            : "0 12px 48px rgba(90,70,40,0.35), inset 0 1px 0 rgba(255,255,255,0.12)",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexDirection: "column", gap: "6px",
          transition: "box-shadow 0.35s ease",
        }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <rect x="9" y="2" width="6" height="12" rx="3" fill="white" opacity="0.9"/>
            <path d="M5 10a7 7 0 0 0 14 0" stroke="white" strokeWidth="1.8" strokeLinecap="round" fill="none" opacity="0.7"/>
            <line x1="12" y1="17" x2="12" y2="21" stroke="white" strokeWidth="1.8" strokeLinecap="round" opacity="0.7"/>
            <line x1="9" y1="21" x2="15" y2="21" stroke="white" strokeWidth="1.8" strokeLinecap="round" opacity="0.7"/>
          </svg>
          <Waveform />
        </div>
      </motion.div>

      {/* ── Card 1: Live AI Call ─────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1, top: cardTop(0), left: cardLeft(0) }}
        transition={{ opacity: { duration: 0.5, delay: 0.5 }, scale: { duration: 0.5, delay: 0.5 }, top: { duration: 0 }, left: { duration: 0 } }}
        style={{
          position: "absolute",
          background: "rgba(255,255,255,0.97)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(0,0,0,0.07)",
          borderRadius: "16px",
          padding: "14px 18px",
          boxShadow: "0 8px 28px rgba(0,0,0,0.07)",
          width: "190px",
          zIndex: 3,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
          <motion.div
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.4, repeat: Infinity }}
            style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#22C55E", flexShrink: 0 }}
          />
          <span style={{ fontSize: "12px", fontWeight: 600, color: "#111827" }}>Live AI Call</span>
        </div>
        <div style={{ fontSize: "11.5px", color: "#6B7280", marginBottom: "8px" }}>
          Leave balance query · Workday
        </div>
        <Waveform />
        {/* Hover tags */}
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: hovered ? 1 : 0, height: hovered ? "auto" : 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          style={{ overflow: "hidden", marginTop: hovered ? "10px" : 0 }}
        >
          <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
            {["Voice AI", "Auto-resolve", "Workday native"].map(tag => (
              <span key={tag} style={{
                fontSize: "10px", fontWeight: 500,
                padding: "3px 8px", borderRadius: "999px",
                background: "#F3F4F6", color: "#374151",
              }}>{tag}</span>
            ))}
          </div>
        </motion.div>
      </motion.div>

      {/* ── Card 2: Resolution Rate ──────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1, top: cardTop(1), left: cardLeft(1) }}
        transition={{ opacity: { duration: 0.5, delay: 0.65 }, scale: { duration: 0.5, delay: 0.65 }, top: { duration: 0 }, left: { duration: 0 } }}
        style={{
          position: "absolute",
          background: "rgba(255,255,255,0.97)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(0,0,0,0.07)",
          borderRadius: "16px",
          padding: "14px 18px",
          boxShadow: "0 8px 28px rgba(0,0,0,0.07)",
          width: "160px",
          zIndex: 3,
        }}
      >
        <div style={{ fontSize: "11px", fontWeight: 500, color: "#9CA3AF", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          Resolution Rate
        </div>
        <div style={{ fontSize: "30px", fontWeight: 800, color: "#111827", lineHeight: 1 }}>
          {resolveRate}<span style={{ fontSize: "17px" }}>%</span>
        </div>
        <div style={{ marginTop: "8px", height: "4px", borderRadius: "999px", background: "#E5E7EB", overflow: "hidden" }}>
          <motion.div
            animate={{ width: `${resolveRate}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            style={{ height: "100%", borderRadius: "999px", background: "linear-gradient(90deg, #8B7355, #C4A882)" }}
          />
        </div>
        {/* Hover tags */}
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: hovered ? 1 : 0, height: hovered ? "auto" : 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          style={{ overflow: "hidden", marginTop: hovered ? "10px" : 0 }}
        >
          <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
            {["No escalations", "First call", "End-to-end"].map(tag => (
              <span key={tag} style={{
                fontSize: "10px", fontWeight: 500,
                padding: "3px 8px", borderRadius: "999px",
                background: "#F3F4F6", color: "#374151",
              }}>{tag}</span>
            ))}
          </div>
        </motion.div>
      </motion.div>

      {/* ── Card 3: Zero tickets ─────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1, top: cardTop(2), left: cardLeft(2) }}
        transition={{ opacity: { duration: 0.5, delay: 0.8 }, scale: { duration: 0.5, delay: 0.8 }, top: { duration: 0 }, left: { duration: 0 } }}
        style={{
          position: "absolute",
          background: "rgba(255,255,255,0.97)",
          border: "1px solid rgba(0,0,0,0.07)",
          borderRadius: "16px",
          padding: "14px 18px",
          boxShadow: "0 8px 28px rgba(0,0,0,0.07)",
          width: "150px",
          zIndex: 3,
        }}
      >
        <div style={{ fontSize: "13px", fontWeight: 700, color: "#111827", lineHeight: 1.3 }}>
          Zero tickets.<br />Instant answers.
        </div>
        <div style={{ fontSize: "11px", color: "#6B7280", marginTop: "5px" }}>
          Avg. handle time: 42s
        </div>
        {/* Hover tags */}
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: hovered ? 1 : 0, height: hovered ? "auto" : 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          style={{ overflow: "hidden", marginTop: hovered ? "10px" : 0 }}
        >
          <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
            {["No queue", "Instant", "Zero wait"].map(tag => (
              <span key={tag} style={{
                fontSize: "10px", fontWeight: 500,
                padding: "3px 8px", borderRadius: "999px",
                background: "#F3F4F6", color: "#374151",
              }}>{tag}</span>
            ))}
          </div>
        </motion.div>
      </motion.div>

      {/* ── Dashed connector lines orb → cards ──────────────────────────── */}
      <svg
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 1 }}
        viewBox="0 0 460 460" fill="none" preserveAspectRatio="xMidYMid meet"
      >
        <motion.line x1="230" y1="230" x2="230" y2="105"
          stroke="rgba(0,0,0,0.1)" strokeWidth="1.2" strokeDasharray="5 5"
          animate={{ strokeDashoffset: [0, -20] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }} />
        <motion.line x1="230" y1="230" x2="367" y2="310"
          stroke="rgba(0,0,0,0.1)" strokeWidth="1.2" strokeDasharray="5 5"
          animate={{ strokeDashoffset: [0, -20] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "linear", delay: 0.45 }} />
        <motion.line x1="230" y1="230" x2="93" y2="310"
          stroke="rgba(0,0,0,0.1)" strokeWidth="1.2" strokeDasharray="5 5"
          animate={{ strokeDashoffset: [0, -20] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "linear", delay: 0.9 }} />
      </svg>
    </div>
  );
};

// ── Main component ─────────────────────────────────────────────────────────────
const HeroSection = () => {
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const { config: siteConfig } = useSiteConfig();
  const videoSrc = siteConfig.video_url || video;

  return (
    <section
      className="relative w-full overflow-hidden"
      style={{ background: "#FFFFFF", minHeight: "100vh" }}
    >
      {/* ── Background layers ──────────────────────────────────────────── */}

      {/* ── Two-column layout ────────────────────────────────────────────── */}
      <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-12 px-6 lg:px-16 pt-36 pb-0 max-w-7xl mx-auto w-full">

        {/* Left: text */}
        <div className="flex flex-col items-start text-left flex-1 min-w-0">

          {/* Eyebrow pill */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full mb-8"
            style={{
              background: "rgba(255,255,255,0.9)",
              border: "1px solid rgba(0,0,0,0.08)",
              backdropFilter: "blur(8px)",
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#8B7355" }} />
            <span className="text-[11.5px] font-semibold tracking-[0.14em] uppercase" style={{ color: "#6B5A3E" }}>
              AI Voice Agents for Enterprise
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
            style={{
              fontSize: "clamp(38px, 5vw, 68px)",
              fontFamily: "'Fraunces', Georgia, serif",
              fontWeight: 500,
              lineHeight: 0.98,
              letterSpacing: "-0.015em",
              color: "#1a202c",
              margin: 0,
            }}
          >
            Resolve Every<br />
            Employee<br />
            Request Instantly
          </motion.h1>

          {/* Sub-copy */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-6 text-gray-500 leading-relaxed"
            style={{ fontSize: "clamp(14px, 1.5vw, 17px)", maxWidth: "480px" }}
          >
            Peoplix deploys AI agents that resolve employee requests end-to-end —
            from leave queries to payroll — directly inside Workday. No tickets,
            no wait times, no extra headcount.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-8 flex flex-wrap items-center gap-3"
          >
            <button
              onClick={() => document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" })}
              className="cursor-pointer text-white font-semibold hover:opacity-90 transition-opacity duration-200"
              style={{
                background: "#111827", padding: "12px 28px",
                borderRadius: "999px", fontSize: "14.5px",
                boxShadow: "0 2px 16px rgba(0,0,0,0.16)",
              }}
            >
              Book a Demo →
            </button>
            <button
              onClick={() => setIsVideoModalOpen(true)}
              className="cursor-pointer font-medium text-gray-700 hover:text-gray-900 transition-colors duration-200"
              style={{
                background: "#ffffff", border: "1px solid rgba(0,0,0,0.1)",
                padding: "12px 24px", borderRadius: "999px", fontSize: "14.5px",
              }}
            >
              ▶ See Peoplix in Action
            </button>
          </motion.div>
        </div>

        {/* Right: animated illustration */}
        <motion.div
          initial={{ opacity: 0, x: 48 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="flex-1 min-w-0 w-full lg:max-w-[50%]"
          style={{ padding: "24px 0" }}
        >
          <HeroIllustration />
        </motion.div>
      </div>

      {/* ── Trusted by ────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.7 }}
        className="relative z-10 flex flex-col items-center gap-5 pb-16 pt-16"
      >
        <p className="text-[12px] font-medium tracking-widest uppercase" style={{ color: "#A89880" }}>
          Trusted by forward-thinking enterprises
        </p>
        <div className="w-full overflow-hidden">
          <LogoLoop
            logos={trustedLogos}
            speed={50}
            direction="left"
            logoHeight={24}
            gap={60}
            pauseOnHover={true}
            fadeOut={true}
            fadeOutColor="#ffffff"
            ariaLabel="Trusted companies"
          />
        </div>
      </motion.div>

      <VideoModal isOpen={isVideoModalOpen} onClose={() => setIsVideoModalOpen(false)} videoSrc={videoSrc} />
    </section>
  );
};

export default HeroSection;
