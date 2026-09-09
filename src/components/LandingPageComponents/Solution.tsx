import { useState } from "react";
import { GoDotFill } from "react-icons/go";

const services = [
  {
    id: "01",
    title: "Voice-first AI agents",
    description:
      "Natural, conversational AI agents that handle employee requests through secure voice and chat interactions.",
    tags: ["Voice + chat interface", "Secure authentication", "Natural language understanding"],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" width="22" height="22">
        <rect x="9" y="2" width="6" height="12" rx="3" stroke="currentColor" strokeWidth="1.8"/>
        <path d="M5 10a7 7 0 0 0 14 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
        <line x1="12" y1="17" x2="12" y2="21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
        <line x1="9" y1="21" x2="15" y2="21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: "02",
    title: "Policy reasoning engine",
    description:
      "Understands and applies company policies in real-time to give employees accurate, context-aware answers.",
    tags: ["Policy parsing", "Context awareness", "Auto-updates"],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" width="22" height="22">
        <path d="M9 12h6M9 16h6M9 8h6M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: "03",
    title: "Real-time HRIS transactions",
    description:
      "Executes live HR system actions — from leave requests to payroll queries — without human intervention.",
    tags: ["Live sync", "Multi-system support", "Audit trail"],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" width="22" height="22">
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: "04",
    title: "Case orchestration & escalation",
    description:
      "Automatically routes, tracks, and escalates complex cases to the right human at the right time.",
    tags: ["Smart routing", "SLA tracking", "Escalation rules"],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" width="22" height="22">
        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8"/>
        <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z" stroke="currentColor" strokeWidth="1.8"/>
        <path d="M12 9V7M12 17v-2M9 12H7M17 12h-2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: "05",
    title: "Enterprise security & compliance",
    description:
      "Built with enterprise-grade security, role-based access controls, and full compliance reporting.",
    tags: ["SOC 2", "Role-based access", "Compliance logs"],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" width="22" height="22">
        <path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V7L12 2z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
        <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
];

const Solution = () => {
  const [activeId, setActiveId] = useState("01");

  return (
    <div className="py-16 px-4 sm:px-6 lg:px-16 bg-white">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">

        {/* ── LEFT — sticky text + stats ──────────────────────────────────── */}
        <div className="lg:sticky lg:top-24">

          {/* Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-gray-200 bg-gray-50 mb-8">
            <GoDotFill className="text-gray-400" style={{ fontSize: "10px" }} />
            <span className="text-xs font-semibold text-gray-500 tracking-widest uppercase">Solution</span>
          </div>

          {/* Headline */}
          <h2 className="text-4xl lg:text-6xl font-bold text-gray-900 leading-tight tracking-tight mb-6">
            Meet Autonomous<br />AI Agents
          </h2>

          {/* Description */}
          <p className="text-gray-500 text-base leading-relaxed max-w-sm mb-10">
            Peoplix agents don't just answer questions. They understand, decide,
            and act — resolving employee requests end-to-end without human involvement.
          </p>

          {/* Stat pills */}
          <div className="flex flex-wrap gap-4">
            {[
              {
                icon: (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="#6B7280" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ),
                stat: "10x", label: "Faster Resolutions"
              },
              {
                icon: (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="#6B7280" strokeWidth="1.8" strokeLinecap="round"/>
                    <circle cx="9" cy="7" r="4" stroke="#6B7280" strokeWidth="1.8"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke="#6B7280" strokeWidth="1.8" strokeLinecap="round"/>
                  </svg>
                ),
                stat: "Happier", label: "Employees"
              },
              {
                icon: (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V7L12 2z" stroke="#6B7280" strokeWidth="1.8" strokeLinejoin="round"/>
                    <path d="M9 12l2 2 4-4" stroke="#6B7280" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ),
                stat: "Enterprise", label: "Secure & Compliant"
              },
            ].map((s) => (
              <div key={s.stat} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-50 border border-gray-100">
                <div className="flex-shrink-0">{s.icon}</div>
                <div>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: "#111827", lineHeight: 1.2 }}>{s.stat}</div>
                  <div style={{ fontSize: "11px", color: "#9CA3AF", lineHeight: 1.2 }}>{s.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── RIGHT — accordion list ───────────────────────────────────────── */}
        <div className="flex flex-col gap-3">
          {services.map((service) => {
            const isActive = activeId === service.id;

            return (
              <div
                key={service.id}
                onMouseEnter={() => setActiveId(service.id)}
                className="cursor-default rounded-2xl transition-all duration-300 overflow-hidden outline-none select-none"
                style={{
                  background: isActive ? "#F9FAFB" : "#FFFFFF",
                  border: isActive ? "1px solid #D1D5DB" : "1px solid #E5E7EB",
                  boxShadow: isActive ? "0 4px 20px rgba(0,0,0,0.06)" : "none",
                }}
              >
                {/* Header row */}
                <div className="flex items-center justify-between px-5 py-4 gap-4">
                  {/* Left: icon + title */}
                  <div className="flex items-center gap-3">
                    {/* Icon box */}
                    <div style={{
                      width: "38px", height: "38px", borderRadius: "10px", flexShrink: 0,
                      background: isActive ? "#E5E7EB" : "#F3F4F6",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: isActive ? "#374151" : "#6B7280",
                      transition: "all 0.3s",
                    }}>
                      {service.icon}
                    </div>
                    <h3 style={{
                      fontSize: "15px", fontWeight: 600, lineHeight: 1.3,
                      color: isActive ? "#111827" : "#374151",
                      transition: "color 0.3s",
                    }}>
                      {service.title}
                    </h3>
                  </div>

                  {/* Right: number + arrow */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span style={{ fontSize: "12px", color: isActive ? "#9CA3AF" : "#D1D5DB", fontWeight: 500 }}>
                      ({service.id})
                    </span>
                    <div style={{
                      width: "28px", height: "28px", borderRadius: "50%",
                      background: isActive ? "#E5E7EB" : "#F3F4F6",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: isActive ? "#374151" : "#9CA3AF",
                      transition: "all 0.3s",
                    }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Expanded content */}
                <div style={{
                  maxHeight: isActive ? "200px" : "0",
                  opacity: isActive ? 1 : 0,
                  overflow: "hidden",
                  transition: "max-height 0.45s ease, opacity 0.35s ease",
                }}>
                  <div className="px-5 pb-5">
                    <p style={{ fontSize: "13.5px", color: "#6B7280", lineHeight: 1.65, marginBottom: "14px" }}>
                      {service.description}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {service.tags.map((tag) => (
                        <span
                          key={tag}
                          style={{
                            fontSize: "11px", fontWeight: 500,
                            padding: "4px 12px", borderRadius: "999px",
                            border: "1px solid #E5E7EB",
                            color: "#6B7280",
                            background: "#F9FAFB",
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Solution;
