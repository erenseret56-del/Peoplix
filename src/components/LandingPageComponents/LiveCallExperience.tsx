import { useState, useEffect, useMemo } from "react";
import { GoDotFill } from "react-icons/go";
import ActiveCallModal from "./ActiveCallModal";
import toast from "react-hot-toast";
import { RetellWebClient } from "retell-client-js-sdk";
import Spinner from "../Spinner";
import { startPublicDemoCall } from "../../api/api";
import DemoRequestModal from "./DemoRequestModal";
import DemoAccessModal from "./DemoAccessModal";

const LiveCallExperience = () => {
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCallConnected, setIsCallConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [activeAgentName, setActiveAgentName] = useState("Peoplix AI Agent");
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);

  // Initialize Retell SDK
  const sdk = useMemo(() => new RetellWebClient(), []);

  useEffect(() => {
    // Handle call events
    sdk.on("call_started", () => {
      console.log("Call started");
      setIsCallConnected(true);
      setIsLoading(false);
    });

    sdk.on("call_ended", () => {
      console.log("Call ended");
      setIsCallModalOpen(false);
      setIsCallConnected(false);
      setIsMuted(false); // Reset mute state
    });

    sdk.on("error", (error) => {
      console.error("Retell SDK Error:", error);
      toast.error("An error occurred during the call.");
      setIsCallModalOpen(false);
      setIsLoading(false);
    });

    return () => {
      // Cleanup
      sdk.off("call_started");
      sdk.off("call_ended");
      sdk.off("error");
    };
  }, [sdk]);

  const handleStartCall = async () => {
    if (isLoading) return;

    setIsLoading(true);

    try {
      const { access_token, agent_name } = await startPublicDemoCall();
      if (agent_name) setActiveAgentName(agent_name);

      setIsCallModalOpen(true);
      await sdk.startCall({
        accessToken: access_token,
      });
    } catch (error) {
      console.error("Error initiating public demo call:", error);
      toast.error(error instanceof Error ? error.message : "Failed to start call. Please try again.");
      setIsLoading(false);
    }
  };

  const handleDemoRequestSubmitted = () => {
    setIsRequestModalOpen(false);
    toast.success("Request submitted. The call will be available after admin approval.");
  };

  const handleAccessGranted = () => {
    setIsAccessModalOpen(false);
    toast.success("Access confirmed. Starting your live demo call.");
    void handleStartCall();
  };

  const handleEndCall = () => {
    sdk.stopCall();
  };

  const handleToggleMute = () => {
    // Retell SDK uses LiveKit under the hood
    const currentMute = !isMuted;
    try {
      const internalSdk = sdk as any;
      if (internalSdk.room && internalSdk.room.localParticipant) {
        internalSdk.room.localParticipant.setMicrophoneEnabled(!currentMute);
        setIsMuted(currentMute);
      } else {
        console.warn("SDK room not initialized yet.");
      }
    } catch (err) {
      console.error("Error toggling mute:", err);
    }
  };

  return (
    <section id="demo-call" className="relative w-full py-24 overflow-hidden bg-white">
      <div className="container mx-auto px-6 relative z-10 max-w-7xl">

        {/* ── Top two-column row ──────────────────────────────────────────── */}
        <div className="grid lg:grid-cols-2 gap-12 items-center mb-14">

          {/* Left: badge + headline + description */}
          <div className="text-left">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-gray-200 bg-gray-50 mb-6">
              <GoDotFill className="text-green-500 animate-pulse" />
              <span className="text-sm font-semibold text-gray-900 tracking-wide">Live Experience</span>
            </div>

            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight tracking-tight">
              Experience the Power<br />of Autonomous AI in<br />Action
            </h2>

            <p className="text-base text-gray-500 leading-relaxed max-w-md">
              Don't just take our word for it. Experience a live interaction with our AI agent
              right now and witness how it handles complex operations in real-time.
            </p>
          </div>

          {/* Right: waveform visual + CTA */}
          <div className="flex flex-col items-center gap-6">
            {/* Animated waveform card */}
            <div style={{
              width: "160px", height: "120px",
              borderRadius: "20px",
              background: "linear-gradient(135deg, #e8eaf6 0%, #f3f4ff 100%)",
              border: "1px solid rgba(99,102,241,0.12)",
              boxShadow: "0 8px 32px rgba(99,102,241,0.1)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg viewBox="0 0 120 60" width="110" height="55" fill="none">
                {[10,20,30,40,50,60,70,80,90,100,110].map((x, i) => {
                  const h = [14,22,34,28,42,34,28,42,34,22,14][i];
                  return (
                    <rect key={i} x={x - 2} y={30 - h / 2} width="4" height={h}
                      rx="2" fill={`rgba(99,102,241,${0.3 + i * 0.05})`} />
                  );
                })}
              </svg>
            </div>

            {/* CTA button */}
            <button
              onClick={() => setIsRequestModalOpen(true)}
              disabled={isLoading}
              className={`w-full max-w-sm px-10 py-5 font-bold text-base rounded-full
                flex items-center justify-center gap-3 transition-all duration-300 cursor-pointer
                disabled:cursor-not-allowed ${
                  isLoading
                    ? 'bg-gray-100 text-gray-400'
                    : 'bg-gray-900 text-white hover:bg-gray-800 shadow-[0_8px_24px_rgba(0,0,0,0.18)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.25)]'
                }`}
            >
              {isLoading ? (
                <Spinner color="#000000" />
              ) : (
                <>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 00-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-1.23-1.12-1.43-2.31-1.43-3.54 0-.54-.45-.99-.99-.99H4.19c-.54 0-1 .45-1 .99 0 9.39 7.61 17 17 17 .54 0 .99-.45.99-.99v-3.59c0-.54-.45-.99-.99-.99z" />
                  </svg>
                  Start Live Demo Call
                </>
              )}
            </button>

            <p className="text-xs text-gray-400 text-center">
              * Your call starts after a super admin grants access.
            </p>
            <button type="button" onClick={() => setIsAccessModalOpen(true)} className="text-sm font-semibold text-cyan-700 underline decoration-cyan-200 underline-offset-4 transition hover:text-cyan-900">
              I&apos;ve got access
            </button>
          </div>
        </div>

        {/* ── Bottom: 3 feature cards in a row ───────────────────────────── */}
        <div className="grid sm:grid-cols-3 gap-5">
          {[
            {
              title: "Natural Conversations",
              desc: "Speak naturally as the AI understands context and responds intelligently to your requests.",
            },
            {
              title: "Real-Time Processing",
              desc: "Get instant responses powered by advanced AI that handles complex HR operations on the fly.",
            },
            {
              title: "Secure & Compliant",
              desc: "Experience secure identity verification and data handling that meets enterprise standards.",
            },
          ].map((f) => (
            <div key={f.title} style={{
              background: "#F9FAFB",
              border: "1px solid rgba(0,0,0,0.07)",
              borderRadius: "16px",
              padding: "20px 22px",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                <svg className="w-4 h-4 text-gray-700 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span style={{ fontSize: "14px", fontWeight: 600, color: "#111827" }}>{f.title}</span>
              </div>
              <p style={{ fontSize: "13px", color: "#6B7280", lineHeight: 1.6, margin: 0 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <ActiveCallModal
        isOpen={isCallModalOpen}
        isConnected={isCallConnected}
        onClose={handleEndCall}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
        agentName={activeAgentName}
      />
      <DemoRequestModal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        onSubmitted={handleDemoRequestSubmitted}
      />
      <DemoAccessModal
        isOpen={isAccessModalOpen}
        onClose={() => setIsAccessModalOpen(false)}
        onGranted={handleAccessGranted}
      />
    </section>
  );
};

export default LiveCallExperience;
