import { useEffect, useRef, useState, useMemo } from 'react';
import { GoDotFill } from "react-icons/go";
import Problem1 from "../../assets/images/v1.png";
import Problem2 from "../../assets/images/v2.png";
import Problem3 from "../../assets/images/v3.png";
import Problem4 from "../../assets/images/v4.png";
import peoplixBackground from "../../assets/images/peoplix-hr-management-background.png";

const problems = [
  {
    img: Problem1,
    text: "HR service desks drowning in repetitive tickets",
    detail: "Teams spend 60–70% of their time answering the same leave, payroll, and policy questions — leaving zero bandwidth for strategic work.",
    tags: ["Repetitive load", "Manual triage", "Agent burnout"],
  },
  {
    img: Problem2,
    text: "Slow response times hurting employee experience",
    detail: "Employees wait hours — sometimes days — for simple answers. Every delay chips away at trust, engagement, and productivity.",
    tags: ["Long SLAs", "Poor CSAT", "Lost productivity"],
  },
  {
    img: Problem3,
    text: "High cost per case",
    detail: "Each HR ticket costs $15–$30 to resolve manually. With thousands of requests a month, the operational overhead is unsustainable.",
    tags: ["$15–30 per case", "Headcount heavy", "Unscalable ops"],
  },
  {
    img: Problem4,
    text: "Burnout across HR operations teams",
    detail: "Skilled HR professionals are stuck in ticket queues instead of driving culture and people strategy. Burnout follows fast.",
    tags: ["High attrition", "Low morale", "Misused talent"],
  },
];

// Each item sits in one quadrant — these are the icon center positions (% of card)
// top-left quadrant: (25%, 38%), top-right: (75%, 38%), bottom-left: (25%, 68%), bottom-right: (75%, 68%)
const ICON_CENTERS = [
  { x: 25, y: 36 },
  { x: 75, y: 36 },
  { x: 25, y: 68 },
  { x: 75, y: 68 },
];

// Each icon flies to its own corner of the card
const CORNER_DESTINATIONS = [
  { top: '16px',  left: '16px',  right: 'auto',  bottom: 'auto'  }, // top-left
  { top: '16px',  left: 'auto',  right: '16px',  bottom: 'auto'  }, // top-right
  { top: 'auto',  left: '16px',  right: 'auto',  bottom: '16px'  }, // bottom-left
  { top: 'auto',  left: 'auto',  right: '16px',  bottom: '16px'  }, // bottom-right
];

const ExpandingCard = () => {
  const [progress, setProgress] = useState(0);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const targetProgressRef = useRef(0);
  const currentProgressRef = useRef(0);
  const lastTimeRef = useRef(0);

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          if (!containerRef.current) return;
          const rect = containerRef.current.getBoundingClientRect();
          const windowHeight = window.innerHeight;
          const containerTop = rect.top;
          const startTrigger = windowHeight * 0.6;
          const endTrigger = windowHeight * 0.2;
          let newProgress = 0;
          if (containerTop <= startTrigger && containerTop >= endTrigger) {
            newProgress = Math.min(Math.max((startTrigger - containerTop) / (startTrigger - endTrigger), 0), 1);
          } else if (containerTop < endTrigger) {
            newProgress = 1;
          }
          targetProgressRef.current = newProgress;
          ticking = false;
        });
        ticking = true;
      }
    };

    const animate = (currentTime: number) => {
      const deltaTime = currentTime - lastTimeRef.current;
      lastTimeRef.current = currentTime;
      const smoothFactor = Math.min(0.18 * (deltaTime / (1000 / 120)), 0.25);
      const diff = targetProgressRef.current - currentProgressRef.current;
      if (Math.abs(diff) > 0.0005) {
        currentProgressRef.current += diff * smoothFactor;
        setProgress(currentProgressRef.current);
      } else if (Math.abs(diff) > 0.00001) {
        currentProgressRef.current = targetProgressRef.current;
        setProgress(targetProgressRef.current);
      }
      rafRef.current = requestAnimationFrame(animate);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    rafRef.current = requestAnimationFrame(animate);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const easeOutCubic = useMemo(() => (t: number) => 1 - Math.pow(1 - t, 3), []);
  const easedProgress = easeOutCubic(progress);

  const animations = useMemo(() => {
    const ep = easedProgress;
    return {
      cardWidth: 35 + 65 * ep,
      cardHeight: 45 + 55 * ep,
      borderRadius: 28 * (1 - ep),
      titleOpacity: Math.pow(1 - ep, 2),
      titleScale: 1 - ep * 0.1,
      contentOpacity: Math.pow(ep, 1.5),
      contentTranslateY: 15 * (1 - ep),
      badgeTranslateY: 20 * (1 - Math.pow(ep, 1.5)),
      captionTranslateY: 15 * (1 - Math.pow(ep, 1.5)),
      scrimOpacity: 0.2 + Math.pow(ep, 1.5) * 0.2,
      shadowBlur: 40 + 60 * ep,
      shadowSpread: 10 + 30 * ep,
      shadowOpacity: 0.15 + 0.1 * ep,
    };
  }, [easedProgress, easeOutCubic]);

  const isExpanded = easedProgress > 0.85;

  return (
    <div
      ref={containerRef}
      className="relative w-full max-w-5xl mx-auto"
      style={{ height: '650px', display: 'flex', alignItems: 'center', justifyContent: 'center', contain: 'layout style paint' }}
    >
      <div
        ref={cardRef}
        className="relative overflow-hidden"
        style={{
          width: `${animations.cardWidth}%`,
          height: `${animations.cardHeight}%`,
          borderRadius: `${animations.borderRadius}px`,
          background: 'transparent',
          boxShadow: `0 ${animations.shadowSpread}px ${animations.shadowBlur}px rgba(0,0,0,${animations.shadowOpacity})`,
          willChange: 'width, height, border-radius',
          transform: 'translate3d(0,0,0)',
        }}
      >
        {/* Brightened background image layer */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${peoplixBackground})`,
            filter: 'brightness(1.65)',
          }}
        />

        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black" style={{ opacity: animations.scrimOpacity }} />

        {/* "Peoplix" Title (pre-expand) */}
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ opacity: animations.titleOpacity, pointerEvents: animations.titleOpacity > 0.1 ? 'auto' : 'none', transform: `scale(${animations.titleScale})` }}
        >
          <h2 className="text-white font-bold tracking-tight select-none" style={{ fontSize: 'clamp(40px, 5vw, 72px)', textShadow: '0 2px 20px rgba(0,0,0,0.4)' }}>
            Peoplix
          </h2>
        </div>

        {/* ── Expanded content ─────────────────────────────────────────── */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center p-6 sm:p-10"
          style={{ opacity: animations.contentOpacity, pointerEvents: animations.contentOpacity > 0.5 ? 'auto' : 'none', transform: `translateY(${animations.contentTranslateY}px)` }}
        >
          {/* Badge */}
          <div
            className="absolute top-8 left-1/2 flex items-center gap-2 text-sm text-white py-1.5 px-4 rounded-full border border-white/20 bg-black/20 backdrop-blur-sm"
            style={{ transform: `translate3d(-50%, ${animations.badgeTranslateY}px, 0)` }}
          >
            <GoDotFill className="text-white/70" />
            The Pain
          </div>

          {/* Grid */}
          <div className="relative w-full max-w-3xl grid sm:grid-cols-2 grid-rows-2 gap-6 sm:gap-10 mt-8">
            {/* Dividers */}
            <div className="absolute hidden sm:block top-1/2 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-y-1/2" />
            <div className="hidden sm:block absolute left-1/2 top-0 h-full w-px bg-gradient-to-b from-transparent via-white/30 to-transparent -translate-x-1/2" />

            {problems.map((p, idx) => {
              const isHovered = hoveredIdx === idx;
              return (
                <div
                  key={idx}
                  className="relative p-4 flex flex-col items-center"
                  style={{ minHeight: '150px', cursor: 'pointer' }}
                  onMouseEnter={() => isExpanded && setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                >
                  {/* Icon placeholder — always visible in center, fades when hovered (real icon travels to corner) */}
                  <div
                    className="bg-white/25 backdrop-blur-md rounded-md border border-white/45 shadow-[0_8px_20px_rgba(0,0,0,0.12)] p-3 sm:p-4 flex items-center justify-center mb-3"
                    style={{
                      opacity: isHovered ? 0 : 1,
                      transition: 'opacity 0.2s ease',
                    }}
                  >
                    <img
                      src={p.img}
                      alt={p.text}
                      className="w-6 h-6 sm:w-8 sm:h-8 object-contain brightness-0 invert"
                      loading="eager"
                      decoding="async"
                    />
                  </div>

                  {/* Label — fades out on hover */}
                  <span
                    className="text-xs sm:text-sm font-medium leading-snug text-white drop-shadow-lg text-center"
                    style={{
                      opacity: isHovered ? 0 : 1,
                      transform: isHovered ? 'translateY(6px)' : 'translateY(0)',
                      transition: 'opacity 0.22s ease, transform 0.22s ease',
                    }}
                  >
                    {p.text}
                  </span>

                  {/* Detail text — fades in on hover, sits where the label was */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '0', bottom: '0', left: '0', right: '0',
                      padding: '60px 12px 12px',
                      opacity: isHovered ? 1 : 0,
                      transform: isHovered ? 'translateY(0)' : 'translateY(10px)',
                      transition: 'opacity 0.32s ease 0.2s, transform 0.32s ease 0.2s',
                      pointerEvents: 'none',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    <p style={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.85)', lineHeight: 1.55, margin: 0 }}>
                      {p.detail}
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {p.tags.map(tag => (
                        <span
                          key={tag}
                          style={{
                            fontSize: '10px', fontWeight: 600,
                            padding: '2px 8px', borderRadius: '999px',
                            background: 'rgba(255,255,255,0.15)',
                            color: 'rgba(255,255,255,0.9)',
                            backdropFilter: 'blur(4px)',
                            border: '1px solid rgba(255,255,255,0.2)',
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom caption */}
          <div
            className="absolute bottom-8 left-1/2 text-white/90 font-normal text-xs sm:text-sm max-w-[90%] sm:max-w-lg text-center px-4 drop-shadow-lg"
            style={{ transform: `translate3d(-50%, ${animations.captionTranslateY}px, 0)` }}
          >
            Traditional chatbots and portals haven't solved the problem. They deflect questions but they don't resolve work.
          </div>
        </div>

        {/* ── Flying icon — lives at card level, travels to its own corner ── */}
        {isExpanded && hoveredIdx !== null && (() => {
          const p = problems[hoveredIdx];
          const center = ICON_CENTERS[hoveredIdx];
          const dest = CORNER_DESTINATIONS[hoveredIdx];
          // Build keyframe: from center of quadrant → to corner
          const fromTop  = dest.top    !== 'auto' ? `calc(${center.y}% - 28px)` : 'auto';
          const fromBottom = dest.bottom !== 'auto' ? `calc(${100 - center.y}% - 28px)` : 'auto';
          const fromLeft = dest.left   !== 'auto' ? `calc(${center.x}% - 28px)` : 'auto';
          const fromRight = dest.right  !== 'auto' ? `calc(${100 - center.x}% - 28px)` : 'auto';
          const animName = `flyCorner${hoveredIdx}`;
          return (
            <div
              key={hoveredIdx}
              className="bg-white/25 backdrop-blur-md rounded-md border border-white/45 shadow-[0_8px_20px_rgba(0,0,0,0.12)] p-3 sm:p-4 flex items-center justify-center"
              style={{
                position: 'absolute',
                zIndex: 20,
                top:    dest.top,
                left:   dest.left,
                right:  dest.right,
                bottom: dest.bottom,
                animation: `${animName} 0.52s cubic-bezier(0.22,1,0.36,1) forwards`,
              }}
            >
              <style>{`
                @keyframes ${animName} {
                  from {
                    top: ${fromTop};
                    left: ${fromLeft};
                    right: ${fromRight};
                    bottom: ${fromBottom};
                  }
                  to {
                    top: ${dest.top};
                    left: ${dest.left};
                    right: ${dest.right};
                    bottom: ${dest.bottom};
                  }
                }
              `}</style>
              <img
                src={p.img}
                alt={p.text}
                className="w-6 h-6 sm:w-8 sm:h-8 object-contain brightness-0 invert"
                loading="eager"
                decoding="async"
              />
            </div>
          );
        })()}

        {/* Scroll hint */}
        {progress < 0.1 && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/60 text-xs tracking-wide" style={{ animation: 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite', transform: 'translate3d(-50%,0,0)' }}>
            Scroll to explore
          </div>
        )}
      </div>
    </div>
  );
};

export default ExpandingCard;
