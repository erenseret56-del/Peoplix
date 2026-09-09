import { useState } from "react";
import { useInView } from "framer-motion";
import { useRef, useEffect } from "react";

// interface Testimonial {
//   stars: number;
//   quote: string;
//   name: string;
//   role: string;
// }

const CountUp = ({
  end,
  duration = 1.8,
  suffix = "",
}: {
  end: number;
  duration?: number;
  suffix?: string;
}) => {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: false });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isInView) return;

    let start = 0;
    const increment = end / (duration * 60); // 60fps
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        start = end;
        clearInterval(timer);
      }
      setCount(Math.floor(start));
    }, 1000 / 60);

    return () => clearInterval(timer);
  }, [isInView, end, duration]);

  return (
    <span ref={ref}>
      {count}
      {suffix}
    </span>
  );
};

// const testimonials: Testimonial[][] = [
//   [
//     {
//       stars: 5,
//       quote:
//         "We shipped our first copilot in 7 weeks and cut support tickets by 31%. The eval dashboards made every decision obvious.",
//       name: "Elena Ruiz",
//       role: "Canva SaaS's VP Product",
//     },
//     {
//       stars: 4,
//       quote:
//         "We shipped our first copilot in 7 weeks and cut support tickets by 31%. The eval dashboards made every decision obvious.",
//       name: "Elena Ruiz",
//       role: "Canva SaaS's VP Product",
//     },
//     {
//       stars: 5,
//       quote:
//         "We shipped our first copilot in 7 weeks and cut support tickets by 31%. The eval dashboards made every decision obvious.",
//       name: "Elena Ruiz",
//       role: "Canva SaaS's VP Product",
//     },
//   ],
//   [
//     {
//       stars: 5,
//       quote:
//         "Peoplix reduced our HR ticket volume by 70% within the first month. Our team could finally focus on strategic work.",
//       name: "James Park",
//       role: "Siemens HR Operations Lead",
//     },
//     {
//       stars: 5,
//       quote:
//         "The integration with Workday was seamless. Real-time data retrieval changed how we handle employee requests.",
//       name: "Sara Malik",
//       role: "Deloitte VP Shared Services",
//     },
//     {
//       stars: 4,
//       quote:
//         "Compliance and audit trails are built in. Our legal team was impressed from day one.",
//       name: "Tom Nguyen",
//       role: "AIG Chief People Officer",
//     },
//   ],
//   [
//     {
//       stars: 5,
//       quote:
//         "Implementation took 3 weeks. ROI was visible in the first quarter. Remarkable product.",
//       name: "Anya Sobel",
//       role: "Meta HR Automation Lead",
//     },
//     {
//       stars: 5,
//       quote:
//         "The AI handles escalation intelligently. We almost never need manual intervention anymore.",
//       name: "Carlos Reyes",
//       role: "Accenture CIO",
//     },
//     {
//       stars: 4,
//       quote:
//         "24/7 availability meant our global workforce finally had consistent support across time zones.",
//       name: "Priya Nair",
//       role: "Infosys CHRO",
//     },
//   ],
// ];

// const Stars = ({ count }: { count: number }) => (
//   <div className="flex gap-0.5 mb-3">
//     {[1, 2, 3, 4, 5].map((i) => (
//       <svg
//         key={i}
//         width="14"
//         height="14"
//         viewBox="0 0 14 14"
//         fill={i <= count ? "#DEF316" : "none"}
//         stroke="#DEF316"
//         strokeWidth="1.2"
//       >
//         <polygon points="7,1 8.8,5.2 13.5,5.6 10,8.8 11.1,13.4 7,10.8 2.9,13.4 4,8.8 0.5,5.6 5.2,5.2" />
//       </svg>
//     ))}
//   </div>
// );

const BusinessImpact = () => {
  // const [slide, setSlide] = useState(0);
  // const totalSlides = testimonials.length;
  // const prev = () => setSlide((s) => (s - 1 + totalSlides) % totalSlides);
  // const next = () => setSlide((s) => (s + 1) % totalSlides);

  return (
    <div className="w-full flex items-center justify-center py-12 px-4">
      {/* ── Outer wrapper: position relative so content overlays the image ── */}
      <div className="relative w-full max-w-305 overflow-hidden rounded-4xl">
        {/* ── Background Gradient & Glow ── */}
        <div
          className="absolute inset-0 w-full h-full z-0 rounded-4xl overflow-hidden pointer-events-none"
          style={{
            background: "#FFFFFF",
          }}
        >
          {/* Main Top Radial Glow */}
          <div
            className="absolute inset-x-0 top-0 h-[120%] pointer-events-none"
            style={{
              background: "radial-gradient(circle at 50% 0%, rgba(55,114,255,0.1) 0%, rgba(55,114,255,0.02) 40%, transparent 70%)"
            }}
          />

          {/* Secondary Bottom Glow */}
          <div
            className="absolute inset-x-0 bottom-0 h-1/2 pointer-events-none opacity-50"
            style={{
              background: "radial-gradient(circle at 50% 100%, rgba(55,114,255,0.05) 0%, transparent 70%)"
            }}
          />

          {/* Subtle border */}
          <div className="absolute inset-0 border border-gray-200 rounded-4xl pointer-events-none" />
        </div>

        {/* ── Content ── */}
        <div className="relative z-10 flex flex-col px-7 pt-14 pb-10 sm:px-10 sm:pt-16 rounded-4xl">
          {/* SECTION 1 — Measurable Business Impact */}
          <section className="mb-16">
            <div className="inline-flex items-center gap-2 border border-gray-200 rounded-full px-3 py-1 mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-pulse" />
              <span className="text-sm font-semibold text-gray-600 tracking-wide">
                Business Value
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-8 sm:gap-6">
              {/* Left heading */}
              <div className="sm:w-2/5 shrink-0">
                <h2 className="text-gray-900 text-[clamp(28px,5vw,38px)] font-semibold leading-[1.15] tracking-tight">
                  Measurable
                  <br />
                  Business
                  <br />
                  Impact
                </h2>
              </div>

              {/* Right stats */}
              <div className="flex-1">
                <div className="grid grid-cols-3 gap-2 mb-2">
                  {[
                    "HR Service Cost Savings",
                    "Faster Response Times",
                    "Employee Support",
                  ].map((label) => (
                    <p
                      key={label}
                      className="text-sm text-gray-400 leading-tight"
                    >
                      {label}
                    </p>
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-2 mb-4">
                  <span className="text-gray-900 text-[clamp(22px,4vw,32px)] font-normal tracking-tight">
                    <CountUp end={50} suffix="%+" />
                  </span>
                  <span className="text-gray-900 text-[clamp(22px,4vw,32px)] font-normal tracking-tight">
                    <CountUp end={5} />
                    <span>x</span>
                  </span>
                  <span className="text-gray-900 text-[clamp(22px,4vw,32px)] font-normal tracking-tight">
                    <CountUp end={24} />
                    /7
                  </span>
                </div>

                <div className="border-t border-gray-200 mb-4" />

                <p className="text-gray-400 text-sm mb-2">
                  Case Volume Reduction
                </p>
                <span className="text-gray-900 text-[clamp(36px,7vw,56px)] font-semibold tracking-tight leading-none">
                  <span className="text-gray-900 text-[clamp(36px,7vw,56px)] font-semibold tracking-tight leading-none">
                    <CountUp end={60} /> -
                    <CountUp end={80} />
                    <span>%</span>
                  </span>
                </span>
              </div>
            </div>
          </section>

          {/* SECTION 2 — What Our Clients Says */}
          {/* <section>
            <div className="inline-flex items-center gap-2 border border-primary/40 rounded-full px-3 py-1 mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <span className="text-sm font-semibold text-primary tracking-wide">
                Testimonials
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-8 sm:gap-6">
              <div className="sm:w-2/5 shrink-0">
                <h2 className="text-white text-[clamp(26px,4.5vw,36px)] font-semibold leading-[1.2] tracking-tight">
                  What Our
                  <br />
                  Clients Says
                </h2>
              </div>

              <div className="flex-1 flex flex-col gap-5">
                {testimonials[slide].map((t, i) => (
                  <div key={i} className="transition-opacity duration-500">
                    <Stars count={t.stars} />
                    <p className="text-text-gray text-sm leading-relaxed mb-3">
                      {t.quote}
                    </p>
                    <div className="flex items-center gap-2">
                      <div className="w-px h-7 bg-white" />
                      <div>
                        <p className="text-white text-sm font-semibold leading-none mb-0.5">
                          {t.name}
                        </p>
                        <p className="text-text-gray text-[10px] leading-none">
                          {t.role}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between mt-8">
              <div className="flex items-center gap-3">
                <button
                  onClick={prev}
                  className="w-9 h-9 rounded-full border border-white/20 flex items-center justify-center text-white hover:border-primary hover:text-primary transition-colors duration-200"
                  aria-label="Previous"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 14 14"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="9,2 4,7 9,12" />
                  </svg>
                </button>
                <button
                  onClick={next}
                  className="w-9 h-9 rounded-full border border-white/20 flex items-center justify-center text-white hover:border-primary hover:text-primary transition-colors duration-200"
                  aria-label="Next"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 14 14"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="5,2 10,7 5,12" />
                  </svg>
                </button>
              </div>

              <p className="text-white text-3xl font-semibold tracking-widest">
                <span>{String(slide + 1).padStart(2, "0")}</span>
                <span className="text-divider">
                  /{String(totalSlides).padStart(2, "0")}
                </span>
              </p>
            </div>
          </section> */}
        </div>
        {/* /content overlay */}
      </div>
      {/* /outer wrapper */}
    </div>
  );
};

export default BusinessImpact;
