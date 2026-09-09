import { useEffect, useRef, useState } from "react";
import { FaUserTie, FaUsersGear, FaSitemap, FaBuildingShield, FaHandshake, FaChartLine } from "react-icons/fa6";

interface FloatingCard {
  id: string;
  icon: React.ReactNode;
  side: "left" | "right";
  // Final (spread-out) position
  finalTop: string;
  finalOffset: string;
  // Starting position (center cluster) — top only, horizontal handled via transform
  startTop: string;
  rotation: string;
  delay: number;
}

const floatingCards: FloatingCard[] = [
  // LEFT side — final positions are left-side, start from center
  {
    id: "l1",
    icon: <FaUserTie className="text-3xl text-primary" />,
    side: "left",
    finalTop: "12%",
    finalOffset: "14%",
    startTop: "35%",
    rotation: "-12deg",
    delay: 0,
  },
  {
    id: "l2",
    icon: <FaUsersGear className="text-3xl text-primary" />,
    side: "left",
    finalTop: "38%",
    finalOffset: "7%",
    startTop: "38%",
    rotation: "-8deg",
    delay: 80,
  },
  {
    id: "l3",
    icon: <FaSitemap className="text-3xl text-primary" />,
    side: "left",
    finalTop: "64%",
    finalOffset: "14%",
    startTop: "42%",
    rotation: "-10deg",
    delay: 160,
  },
  // RIGHT side — final positions are right-side, start from center
  {
    id: "r1",
    icon: <FaBuildingShield className="text-3xl text-primary" />,
    side: "right",
    finalTop: "10%",
    finalOffset: "14%",
    startTop: "35%",
    rotation: "10deg",
    delay: 40,
  },
  {
    id: "r2",
    icon: <FaHandshake className="text-3xl text-primary" />,
    side: "right",
    finalTop: "38%",
    finalOffset: "7%",
    startTop: "38%",
    rotation: "6deg",
    delay: 120,
  },
  {
    id: "r3",
    icon: <FaChartLine className="text-3xl text-primary" />,
    side: "right",
    finalTop: "64%",
    finalOffset: "14%",
    startTop: "42%",
    rotation: "9deg",
    delay: 200,
  },
];

const WhoItsFor = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const [triggered, setTriggered] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !triggered) {
          setTriggered(true);
        } else {
          setTriggered(false);
        }
      },
      { threshold: 0.35 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative flex items-center justify-center overflow-hidden bg-white px-5 py-20"
    >
      {/* ── Floating cards ── */}
      {floatingCards.map((card) => {
        const isLeft = card.side === "left";

        /**
         * BEFORE trigger (center state):
         *   - All cards sit at center-ish using left: 50% + translateX(-50%)
         *   - Slight vertical offset per card so they're not all exactly stacked
         *   - No rotation (rotate(0deg)) so they look clean while centered
         *
         * AFTER trigger (spread state):
         *   - Left cards: left = finalOffset, transform = rotate(rotation)
         *   - Right cards: right = finalOffset, transform = rotate(rotation)
         *   - top transitions from startTop → finalTop
         */
        const cardStyle: React.CSSProperties = triggered
          ? {
              // SPREAD OUT — final side positions
              top: card.finalTop,
              [isLeft ? "left" : "right"]: card.finalOffset,
              transform: `rotate(${card.rotation})`,
              opacity: 1,
              transitionDelay: `${card.delay}ms`,
            }
          : {
              // CENTER — all clustered in the middle
              top: card.startTop,
              left: "50%",
              transform: "translateX(-50%) rotate(0deg)",
              opacity: 0.85,
              transitionDelay: "0ms",
            };

        return (
          <div
            key={card.id}
            aria-hidden="true"
            style={cardStyle}
            className={[
              "absolute",
              "w-20 h-20",
              "bg-white",
              "rounded-[20px]",
              "flex items-center justify-center",
              "border border-gray-200",
              "shadow-[0_4px_20px_rgba(0,0,0,0.1)]",
              "will-change-[transform,opacity,top,left,right]",
              "transition-[transform,opacity,top,left,right]",
              "duration-1500",
              "ease-[cubic-bezier(0.34,1.56,0.64,1)]", // spring-like overshoot
              "max-[480px]:hidden",
              "max-[768px]:w-16 max-[768px]:h-16",
            ].join(" ")}
          >
            {card.icon}
          </div>
        );
      })}

      {/* ── Center content ── */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-[800px] w-full">
        {/* Badge */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-4 py-1.5 shadow-sm">
          <span className="h-[7px] w-[7px] shrink-0 rounded-xl bg-cyan-600 animate-pulse" />
          <span className="text-xs font-semibold tracking-wide text-gray-900">
            Who It's For
          </span>
        </div>

        {/* Heading */}
        <h2 className="mb-7 text-[clamp(36px,6vw,64px)] font-semibold leading-[1.15] tracking-tighter text-gray-950">
          Built for HR Operations
          <br />
          &amp; Shared Services
          <br />
          Leaders
        </h2>

        {/* Bullet list */}
        <ul className="flex flex-wrap justify-center gap-x-7 gap-y-2 p-0 m-0 mb-9 list-none">
          {[
            "CHRO",
            "VP HR Operations",
            "Head of Shared Services",
            "CIO / IT Leaders",
          ].map((label) => (
            <li
              key={label}
              className="flex items-center gap-2 text-sm font-semibold text-gray-600"
            >
              <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-600" />
              {label}
            </li>
          ))}
        </ul>

        {/* CTA Button removed */}
      </div>
    </section>
  );
};

export default WhoItsFor;
