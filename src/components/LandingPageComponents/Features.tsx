// // ─── Icons ─────────────────────────────────────────────────────────────────
// const IconAutomate = () => (
//   <svg
//     width="22"
//     height="22"
//     viewBox="0 0 22 22"
//     fill="none"
//     stroke="white"
//     strokeWidth="1.6"
//     strokeLinecap="round"
//     strokeLinejoin="round"
//   >
//     <rect x="2" y="3" width="18" height="14" rx="2" />
//     <line x1="7" y1="20" x2="15" y2="20" />
//     <line x1="11" y1="17" x2="11" y2="20" />
//     <rect x="5" y="7" width="4" height="3" rx="0.5" />
//     <line x1="12" y1="8" x2="16" y2="8" />
//     <line x1="12" y1="11" x2="14" y2="11" />
//   </svg>
// );
// const IconAddress = () => (
//   <svg
//     width="22"
//     height="22"
//     viewBox="0 0 22 22"
//     fill="none"
//     stroke="white"
//     strokeWidth="1.6"
//     strokeLinecap="round"
//     strokeLinejoin="round"
//   >
//     <rect x="3" y="2" width="16" height="18" rx="2" />
//     <line x1="7" y1="7" x2="15" y2="7" />
//     <line x1="7" y1="11" x2="15" y2="11" />
//     <line x1="7" y1="15" x2="11" y2="15" />
//     <polyline points="13,13 16,16 20,12" />
//   </svg>
// );
// const IconPaycheck = () => (
//   <svg
//     width="22"
//     height="22"
//     viewBox="0 0 22 22"
//     fill="none"
//     stroke="white"
//     strokeWidth="1.6"
//     strokeLinecap="round"
//     strokeLinejoin="round"
//   >
//     <rect x="2" y="5" width="18" height="12" rx="2" />
//     <line x1="2" y1="9" x2="20" y2="9" />
//     <line x1="6" y1="13" x2="9" y2="13" />
//     <line x1="13" y1="13" x2="16" y2="13" />
//   </svg>
// );
// const IconAuth = () => (
//   <svg
//     width="22"
//     height="22"
//     viewBox="0 0 22 22"
//     fill="none"
//     stroke="white"
//     strokeWidth="1.6"
//     strokeLinecap="round"
//     strokeLinejoin="round"
//   >
//     <circle cx="11" cy="7" r="4" />
//     <path d="M3 19c0-4 3.6-7 8-7s8 3 8 7" />
//     <polyline points="14,9 16,11 20,7" />
//   </svg>
// );
// const IconPolicy = () => (
//   <svg
//     width="22"
//     height="22"
//     viewBox="0 0 22 22"
//     fill="none"
//     stroke="white"
//     strokeWidth="1.6"
//     strokeLinecap="round"
//     strokeLinejoin="round"
//   >
//     <path d="M11 2L4 5v6c0 5 3.2 8.5 7 9.8C15 19.5 18 16 18 11V5l-7-3z" />
//     <polyline points="8,11 10,13 14,9" />
//   </svg>
// );
// const IconWorkday = () => (
//   <svg
//     width="22"
//     height="22"
//     viewBox="0 0 22 22"
//     fill="none"
//     stroke="white"
//     strokeWidth="1.6"
//     strokeLinecap="round"
//     strokeLinejoin="round"
//   >
//     <polygon points="13,2 20,6 20,14 13,18 6,14 6,6" />
//     <polyline points="8,10 11,13 15,8" />
//   </svg>
// );

// // ─── Peoplix Logo SVG ──────────────────────────────────────────────────────
// const PeoplixIcon = () => (
//   <svg width="38" height="28" viewBox="0 0 38 28" fill="none">
//     <circle cx="13" cy="14" r="11" fill="white" fillOpacity="0.9" />
//     <circle cx="25" cy="14" r="11" fill="white" fillOpacity="0.6" />
//   </svg>
// );

// // ─── Data ──────────────────────────────────────────────────────────────────
// interface Feature {
//   icon: React.ReactNode;
//   title: string;
//   description: string;
// }

// const leftFeatures: Feature[] = [
//   {
//     icon: <IconAutomate />,
//     title: "What Peoplix Can Automate",
//     description:
//       "Peoplix handles high-volume, high-friction employee requests end-to-end resolving them instantly without HR intervention.",
//   },
//   {
//     icon: <IconAddress />,
//     title: "Update my home address",
//     description:
//       "Peoplix verifies identity, updates records directly in Workday, and confirms completion in real time without creating a ticket.",
//   },
//   {
//     icon: <IconPaycheck />,
//     title: "Why is my paycheck lower?",
//     description:
//       "Peoplix analyzes payroll data, reviews deductions, tax changes, or benefit adjustments, applies company policy logic.",
//   },
// ];

// const rightFeatures: Feature[] = [
//   {
//     icon: <IconAuth />,
//     title: "Authenticates Employees",
//     description:
//       "Peoplix securely verifies employee identity before processing any request, using enterprise auth protocols and role-based access controls.",
//   },
//   {
//     icon: <IconPolicy />,
//     title: "Applies HR Policy",
//     description:
//       "Peoplix dynamically interprets and applies company-specific HR policies in real time. Whether it's eligibility rules, accrual logic, payroll conditions.",
//   },
//   {
//     icon: <IconWorkday />,
//     title: "Executes Transactions in Workday",
//     description:
//       "Peoplix doesn't stop at answering questions. It performs real system actions directly inside Workday and other enterprise platforms.",
//   },
// ];

// // ─── Feature Card ──────────────────────────────────────────────────────────
// const FeatureCard = ({ feature }: { feature: Feature }) => (
//   <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col gap-3 w-full hover:shadow-md transition-shadow duration-200">
//     <div className="w-11 h-11 rounded-xl bg-[#0f1f2e] flex items-center justify-center shrink-0">
//       {feature.icon}
//     </div>
//     <div>
//       <h3 className="text-[15px] font-bold text-slate-800 mb-1.5 leading-snug">
//         {feature.title}
//       </h3>
//       <p className="text-[13px] text-slate-500 leading-relaxed">
//         {feature.description}
//       </p>
//     </div>
//   </div>
// );

// // ─── Center Peoplix Box ────────────────────────────────────────────────────
// const PeoplixCenterBox = () => (
//   <div className="flex flex-col items-center justify-center">
//     {/* Outer glow ring */}
//     <div
//       className="relative flex items-center justify-center"
//       style={{
//         filter:
//           "drop-shadow(0 0 32px rgba(6,182,212,0.55)) drop-shadow(0 0 64px rgba(6,182,212,0.25))",
//       }}
//     >
//       {/* Main box */}
//       <div
//         className="w-[100px] h-[100px] rounded-[28px] flex flex-col items-center justify-center gap-2 relative overflow-hidden"
//         style={{
//           background:
//             "linear-gradient(145deg, #0f4f5c  0%, #0d6a7a  45%, #0891b2 100%)",
//           boxShadow:
//             "inset 0 1px 0 rgba(255,255,255,0.25), inset 0 -1px 0 rgba(0,0,0,0.15)",
//         }}
//       >
//         {/* Subtle inner highlight */}
//         <div
//           className="absolute inset-0 rounded-[28px]"
//           style={{
//             background:
//               "radial-gradient(ellipse at 40% 30%, rgba(255,255,255,0.22) 0%, transparent 65%)",
//           }}
//         />
//         <PeoplixIcon />
//         <span className="text-white font-bold text-[15px] tracking-wide relative z-10">
//           Peoplix
//         </span>
//       </div>
//     </div>

//     {/* Bottom glow blob */}
//     <div
//       className="w-28 h-5 rounded-full mt-1"
//       style={{
//         background:
//           "radial-gradient(ellipse, rgba(6,182,212,0.4) 0%, transparent 70%)",
//         filter: "blur(8px)",
//       }}
//     />
//   </div>
// );

// // ─── Connector Dot ─────────────────────────────────────────────────────────
// const ConnectorDot = () => (
//   <div className="w-2 h-2 rounded-full bg-slate-400 border border-slate-300 shrink-0" />
// );

// // ─── Main Component ────────────────────────────────────────────────────────
// const WhatPeoplixCanAutomate = () => {
//   // Card height approx + gap for line positioning
//   const cardHeight = 156; // px — approx rendered height of each card
//   const cardGap = 16; // gap-4 = 16px

//   return (
//     <section className="py-16 px-4 sm:px-6">
//       <div className="max-w-6xl mx-auto">
//         {/* Header */}
//         <div className="text-center mb-12">
//           <div className="inline-flex items-center gap-2 bg-white border border-slate-200 rounded-full px-4 py-1.5 mb-6 shadow-sm">
//             <span className="w-[7px] h-[7px] rounded-full bg-cyan-400 animate-pulse shrink-0" />
//             <span className="text-xs font-semibold text-slate-600 tracking-wide">
//               Features
//             </span>
//           </div>
//           <h2 className="text-[clamp(28px,5vw,52px)] font-bold bg-gradient-to-b from-[#61666A] to-[#292C2E] bg-clip-text text-transparent tracking-tight leading-tight">
//             What Peoplix Can Automate
//           </h2>
//         </div>

//         {/* ── Desktop layout ── */}
//         <div className="hidden lg:block">
//           {/* 3-column grid */}
//           <div className="grid grid-cols-[1fr_180px_1fr] items-center">
//             {/* ── Left cards ── */}
//             <div className="flex flex-col gap-4">
//               {leftFeatures.map((feature, i) => (
//                 <div key={i} className="flex items-center gap-0">
//                   <FeatureCard feature={feature} />
//                   {/* Right connector: line → dot */}
//                   <div className="flex items-center w-12 shrink-0">
//                     <ConnectorDot />
//                     <div className="flex-1 border-t border-dashed border-slate-300" />
//                   </div>
//                 </div>
//               ))}
//             </div>

//             {/* ── Center: vertical line + box + vertical line ── */}
//             <div
//               className="flex flex-col items-center"
//               style={{ height: `${3 * cardHeight + 2 * cardGap}px` }}
//             >
//               {/* Top vertical segment */}
//               <ConnectorDot />
//               <div className="flex-1 border-l border-dashed border-slate-300" />

//               {/* Center box */}
//               <PeoplixCenterBox />

//               {/* Bottom vertical segment */}
//               <div className="flex-1 border-l border-dashed border-slate-300 -mt-5" />
//               <ConnectorDot />
//             </div>

//             {/* ── Right cards ── */}
//             <div className="flex flex-col gap-4">
//               {rightFeatures.map((feature, i) => (
//                 <div key={i} className="flex items-center gap-0">
//                   {/* Left connector: dot → line */}
//                   <div className="flex items-center w-24 shrink-0">
//                     <div className="flex-1 border-t border-dashed border-slate-300" />
//                     <ConnectorDot />
//                   </div>
//                   <FeatureCard feature={feature} />
//                 </div>
//               ))}
//             </div>
//           </div>
//         </div>

//         {/* ── Mobile / Tablet layout ── */}
//         <div className="lg:hidden flex flex-col items-center gap-8">
//           {/* Center box */}
//           <PeoplixCenterBox />

//           {/* All 6 cards */}
//           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
//             {[...leftFeatures, ...rightFeatures].map((feature, i) => (
//               <FeatureCard key={i} feature={feature} />
//             ))}
//           </div>
//         </div>
//       </div>
//     </section>
//   );
// };

// export default WhatPeoplixCanAutomate;

// // ─── PREVIOUS ACTIVE CODE (COMMENTED OUT) ──────────────────────────────────
// import { useEffect, useRef, useState, useCallback } from "react";
// import { motion } from "framer-motion";

// // ─── Icons ──────────────────────────────────────────────────────────────────
// const IconAutomate = () => (
//   <svg
//     width="22"
//     height="22"
//     viewBox="0 0 22 22"
//     fill="none"
//     stroke="white"
//     strokeWidth="1.6"
//     strokeLinecap="round"
//     strokeLinejoin="round"
//   >
//     <rect x="2" y="3" width="18" height="14" rx="2" />
//     <line x1="11" y1="17" x2="11" y2="20" />
//     <line x1="7" y1="20" x2="15" y2="20" />
//     <rect x="5" y="7" width="4" height="3" rx="0.5" />
//     <line x1="12" y1="8" x2="16" y2="8" />
//     <line x1="12" y1="11" x2="14" y2="11" />
//   </svg>
// );
// const IconAddress = () => (
//   <svg
//     width="22"
//     height="22"
//     viewBox="0 0 22 22"
//     fill="none"
//     stroke="white"
//     strokeWidth="1.6"
//     strokeLinecap="round"
//     strokeLinejoin="round"
//   >
//     <rect x="3" y="2" width="16" height="18" rx="2" />
//     <line x1="7" y1="7" x2="15" y2="7" />
//     <line x1="7" y1="11" x2="15" y2="11" />
//     <line x1="7" y1="15" x2="11" y2="15" />
//     <polyline points="13,13 16,16 20,12" />
//   </svg>
// );
// const IconPaycheck = () => (
//   <svg
//     width="22"
//     height="22"
//     viewBox="0 0 22 22"
//     fill="none"
//     stroke="white"
//     strokeWidth="1.6"
//     strokeLinecap="round"
//     strokeLinejoin="round"
//   >
//     <rect x="2" y="5" width="18" height="12" rx="2" />
//     <line x1="2" y1="9" x2="20" y2="9" />
//     <line x1="6" y1="13" x2="9" y2="13" />
//     <line x1="13" y1="13" x2="16" y2="13" />
//   </svg>
// );
// const IconAuth = () => (
//   <svg
//     width="22"
//     height="22"
//     viewBox="0 0 22 22"
//     fill="none"
//     stroke="white"
//     strokeWidth="1.6"
//     strokeLinecap="round"
//     strokeLinejoin="round"
//   >
//     <circle cx="11" cy="7" r="4" />
//     <path d="M3 19c0-4 3.6-7 8-7s8 3 8 7" />
//     <polyline points="14,9 16,11 20,7" />
//   </svg>
// );
// const IconPolicy = () => (
//   <svg
//     width="22"
//     height="22"
//     viewBox="0 0 22 22"
//     fill="none"
//     stroke="white"
//     strokeWidth="1.6"
//     strokeLinecap="round"
//     strokeLinejoin="round"
//   >
//     <path d="M11 2L4 5v6c0 5 3.2 8.5 7 9.8C15 19.5 18 16 18 11V5l-7-3z" />
//     <polyline points="8,11 10,13 14,9" />
//   </svg>
// );
// const IconWorkday = () => (
//   <svg
//     width="22"
//     height="22"
//     viewBox="0 0 22 22"
//     fill="none"
//     stroke="white"
//     strokeWidth="1.6"
//     strokeLinecap="round"
//     strokeLinejoin="round"
//   >
//     <polygon points="13,2 20,6 20,14 13,18 6,14 6,6" />
//     <polyline points="8,10 11,13 15,8" />
//   </svg>
// );

// const PeoplixIcon = () => (
//   <svg width="36" height="26" viewBox="0 0 36 26" fill="none">
//     <circle cx="12" cy="13" r="10" fill="white" fillOpacity="0.95" />
//     <circle cx="24" cy="13" r="10" fill="white" fillOpacity="0.55" />
//   </svg>
// );

// const PeoplixCenterBox = () => (
//   <div className="flex flex-col items-center">
//     <div
//       style={{
//         filter:
//           "drop-shadow(0 0 28px rgba(6,182,212,0.75)) drop-shadow(0 0 60px rgba(6,182,212,0.4))",
//       }}
//     >
//       <div
//         className="w-[130px] h-[130px] rounded-[28px] flex flex-col items-center justify-center gap-2 relative overflow-hidden"
//         style={{
//           background:
//             "linear-gradient(145deg, #0e7490 0%, #0891b2 50%, #22d3ee 100%)",
//           boxShadow:
//             "inset 0 1px 0 rgba(255,255,255,0.25), inset 0 -1px 0 rgba(0,0,0,0.15)",
//         }}
//       >
//         <div
//           className="absolute inset-0 rounded-[28px]"
//           style={{
//             background:
//               "radial-gradient(ellipse at 40% 25%, rgba(255,255,255,0.25) 0%, transparent 60%)",
//           }}
//         />
//         <PeoplixIcon />
//         <span className="text-white font-bold text-[15px] tracking-wide relative z-10 select-none">
//           Peoplix
//         </span>
//       </div>
//     </div>
//     <div
//       className="w-24 h-4 -mt-1"
//       style={{
//         background:
//           "radial-gradient(ellipse, rgba(6,182,212,0.5) 0%, transparent 70%)",
//         filter: "blur(6px)",
//       }}
//     />
//   </div>
// );

// interface Feature {
//   icon: React.ReactNode;
//   title: string;
//   description: string;
//   side: "left" | "right";
// }

// const features: Feature[] = [
//   {
//     side: "left",
//     icon: <IconAutomate />,
//     title: "Enterprise HR Automation in Action",
//     description:
//       "Peoplix handles high-volume, high-friction employee requests end-to-end resolving them instantly without HR intervention.",
//   },
//   {
//     side: "left",
//     icon: <IconAddress />,
//     title: "Update my home address",
//     description:
//       "Peoplix verifies identity, updates records directly in Workday, and confirms completion in real time without creating a ticket.",
//   },
//   {
//     side: "left",
//     icon: <IconPaycheck />,
//     title: "Why is my paycheck lower?",
//     description:
//       "Peoplix analyzes payroll data, reviews deductions, tax changes, or benefit adjustments, applies company policy logic.",
//   },
//   {
//     side: "right",
//     icon: <IconAuth />,
//     title: "Authenticates Employees",
//     description:
//       "Peoplix securely verifies employee identity before processing any request, using enterprise auth protocols and role-based access controls.",
//   },
//   {
//     side: "right",
//     icon: <IconPolicy />,
//     title: "Applies HR Policy",
//     description:
//       "Peoplix dynamically interprets and applies company-specific HR policies in real time. Whether it's eligibility rules, accrual logic, payroll conditions.",
//   },
//   {
//     side: "right",
//     icon: <IconWorkday />,
//     title: "Executes Transactions in Workday",
//     description:
//       "Peoplix doesn't stop at answering questions. It performs real system actions directly inside Workday and other enterprise platforms.",
//   },
// ];

// interface Line {
//   x1: number;
//   y1: number;
//   x2: number;
//   y2: number;
// }

// const WhatPeoplixCanAutomate = () => {
//   const wrapperRef = useRef<HTMLDivElement>(null);
//   const centerRef = useRef<HTMLDivElement>(null);
//   const cardRefs = useRef<(HTMLDivElement | null)[]>(Array(6).fill(null));

//   const [lines, setLines] = useState<Line[]>([]);
//   const [svgSize, setSvgSize] = useState({ w: 0, h: 0 });

//   const recalc = useCallback(() => {
//     const wrapper = wrapperRef.current;
//     const center = centerRef.current;
//     if (!wrapper || !center) return;
//     const wRect = wrapper.getBoundingClientRect();
//     const cRect = center.getBoundingClientRect();
//     const cx = cRect.left - wRect.left + cRect.width / 2;
//     const cy = cRect.top - wRect.top + cRect.height / 2;
//     const newLines: Line[] = [];
//     cardRefs.current.forEach((card, idx) => {
//       if (!card) return;
//       const r = card.getBoundingClientRect();
//       const isLeft = idx < 3;
//       const ex = isLeft ? r.right - wRect.left : r.left - wRect.left;
//       const ey = r.top - wRect.top + r.height / 2;
//       newLines.push({ x1: ex, y1: ey, x2: cx, y2: cy });
//     });
//     setSvgSize({ w: wRect.width, h: wRect.height });
//     setLines(newLines);
//   }, []);

//   useEffect(() => {
//     const t = setTimeout(recalc, 80);
//     window.addEventListener("resize", recalc);
//     let ro: ResizeObserver | null = null;
//     if (wrapperRef.current && typeof ResizeObserver !== "undefined") {
//       ro = new ResizeObserver(recalc);
//       ro.observe(wrapperRef.current);
//     }
//     return () => {
//       clearTimeout(t);
//       window.removeEventListener("resize", recalc);
//       ro?.disconnect();
//     };
//   }, [recalc]);

//   const leftFeatures = features.filter((f) => f.side === "left");
//   const rightFeatures = features.filter((f) => f.side === "right");

//   return (
//     <section className="py-16 px-4 sm:px-6">
//       <div className="max-w-6xl mx-auto">
//         <div className="text-center mb-12">
//           <div className="inline-flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-1.5 mb-6 shadow-sm">
//             <span className="w-[7px] h-[7px] rounded-full bg-cyan-400 animate-pulse shrink-0" />
//             <span className="text-sm font-semibold text-cyan-400 tracking-wide">
//               Features
//             </span>
//           </div>
//           <h2 className="text-[clamp(28px,5vw,52px)] font-bold text-slate-800 tracking-tight leading-tight">
//             What Peoplix Can Automate
//           </h2>
//         </div>
//         <div className="hidden lg:block">
//           <div ref={wrapperRef} className="relative">
//             {svgSize.w > 0 && (
//               <svg className="absolute inset-0 pointer-events-none z-20" width={svgSize.w} height={svgSize.h}>
//                 <defs>
//                   <marker id="m-dot" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
//                     <circle cx="4" cy="4" r="2.5" fill="white" stroke="#94a3b8" strokeWidth="1.2" />
//                   </marker>
//                 </defs>
//                 {lines.map((l, i) => (
//                   <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="5 4" markerStart="url(#m-dot)" markerEnd="url(#m-dot)" />
//                 ))}
//               </svg>
//             )}
//             <div className="grid grid-cols-[1fr_180px_1fr]">
//               <div className="flex flex-col gap-5 pr-10">
//                 {leftFeatures.map((f, i) => (
//                   <div key={i} ref={(el) => { cardRefs.current[i] = el; }} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-shadow duration-200">
//                     <motion.div className="w-11 h-11 rounded-xl bg-[#0f1f2e] flex items-center justify-center mb-3" initial={{ rotate: 0 }} whileInView={{ rotate: 360 }} transition={{ duration: 0.8, ease: "easeInOut" }} viewport={{ once: false, amount: 0.5 }}>
//                       {f.icon}
//                     </motion.div>
//                     <h3 className="text-[15px] font-bold text-slate-800 mb-1.5 leading-snug">{f.title}</h3>
//                     <p className="text-[13px] text-slate-500 leading-relaxed">{f.description}</p>
//                   </div>
//                 ))}
//               </div>
//               <div className="flex items-center justify-center z-100">
//                 <div ref={centerRef}>
//                   <PeoplixCenterBox />
//                 </div>
//               </div>
//               <div className="flex flex-col gap-5 pl-10">
//                 {rightFeatures.map((f, i) => (
//                   <div key={i} ref={(el) => { cardRefs.current[i + 3] = el; }} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-shadow duration-200">
//                     <motion.div className="w-11 h-11 rounded-xl bg-[#0f1f2e] flex items-center justify-center mb-3" initial={{ rotate: 0 }} whileInView={{ rotate: 360 }} transition={{ duration: 0.8, ease: "easeInOut" }} viewport={{ once: false, amount: 0.5 }}>
//                       {f.icon}
//                     </motion.div>
//                     <h3 className="text-[15px] font-bold text-slate-800 mb-1.5 leading-snug">{f.title}</h3>
//                     <p className="text-[13px] text-slate-500 leading-relaxed">{f.description}</p>
//                   </div>
//                 ))}
//               </div>
//             </div>
//           </div>
//         </div>
//         <div className="lg:hidden flex flex-col items-center gap-8">
//           <PeoplixCenterBox />
//           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
//             {features.map((f, i) => (
//               <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
//                 <div className="w-11 h-11 rounded-xl bg-[#0f1f2e] flex items-center justify-center mb-3">{f.icon}</div>
//                 <h3 className="text-[15px] font-bold text-slate-800 mb-1.5 leading-snug">{f.title}</h3>
//                 <p className="text-[13px] text-slate-500 leading-relaxed">{f.description}</p>
//               </div>
//             ))}
//           </div>
//         </div>
//       </div>
//     </section>
//   );
// };

// export default WhatPeoplixCanAutomate;


// ─── NEW ENHANCED IMPLEMENTATION (ACTIVE) ──────────────────────────────────
import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import logo from "../../assets/images/peoplix-logo.png"

// ─── Icons ──────────────────────────────────────────────────────────────────
const IconAutomate = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
  </svg>
);

const IconAddress = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

const IconPaycheck = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="1" x2="12" y2="23" />
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </svg>
);

const IconAuth = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const IconPolicy = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const IconWorkday = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

// ─── Peoplix Logo ────────────────────────────────────────────────────────────
// const PeoplixIconEnhanced = () => (
//   <svg width="40" height="30" viewBox="0 0 40 30" fill="none">
//     <motion.circle
//       cx="14" cy="15" r="12" fill="white" fillOpacity="0.9"
//       animate={{ scale: [1, 1.05, 1] }}
//       transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
//     />
//     <motion.circle
//       cx="26" cy="15" r="12" fill="white" fillOpacity="0.5"
//       animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.7, 0.5] }}
//       transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
//     />
//   </svg>
// );

const PeoplixCenterBoxEnhanced = () => (
  <div className="flex flex-col items-center group">
    <div className="relative">
      <motion.div
        className="absolute inset-0 bg-primary blur-2xl opacity-40 rounded-full"
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 4, repeat: Infinity }}
      />
      <motion.div
        className="absolute inset-0 bg-primary/30 blur-[80px] opacity-20 rounded-full"
        animate={{ scale: [1, 1.4, 1] }}
        transition={{ duration: 6, repeat: Infinity }}
      />

      <motion.div
        whileHover={{ scale: 1.05 }}
        className="w-[140px] h-[140px] rounded-[32px] flex flex-col items-center justify-center gap-3 relative z-10 backdrop-blur-xl border border-white/20 shadow-2xl overflow-hidden"
        style={{
          background: "#FFFFFF",
        }}
      >
        <div className="absolute inset-0 bg-linear-to-br from-white/10 to-transparent pointer-events-none" />
        <img src={logo} alt="logo" loading="lazy" className="h-18 object-cover" />
        <motion.div
          className="absolute top-0 left-0 w-full h-[2px] bg-primary/50 blur-[2px]"
          animate={{ top: ["0%", "100%", "0%"] }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        />
      </motion.div>
    </div>

    <motion.div
      className="w-24 h-4 bg-primary/20 blur-md rounded-[100%] mt-4"
      animate={{ width: ["80%", "110%", "80%"], opacity: [0.4, 0.6, 0.4] }}
      transition={{ duration: 4, repeat: Infinity }}
    />
  </div>
);

// ─── Data ────────────────────────────────────────────────────────────────────
interface FeatureEnhanced {
  icon: React.ReactNode;
  title: string;
  description: string;
  side: "left" | "right";
  color: string;
}

const featuresEnhanced: FeatureEnhanced[] = [
  {
    side: "left",
    icon: <IconAutomate />,
    title: "HR Automation",
    description: "Peoplix handles high-volume requests instantly without human intervention.",
    color: "cyan",
  },
  {
    side: "left",
    icon: <IconAddress />,
    title: "Address Updates",
    description: "Verifies identity and updates Workday records in real time.",
    color: "blue",
  },
  {
    side: "left",
    icon: <IconPaycheck />,
    title: "Payroll Logic",
    description: "Analyzes deductions and tax changes relative to company policy.",
    color: "indigo",
  },
  {
    side: "right",
    icon: <IconAuth />,
    title: "Identity Auth",
    description: "Secure verification using enterprise protocols and RBAC.",
    color: "emerald",
  },
  {
    side: "right",
    icon: <IconPolicy />,
    title: "Policy Engine",
    description: "Interprets complex eligibility and accrual rules dynamically.",
    color: "teal",
  },
  {
    side: "right",
    icon: <IconWorkday />,
    title: "System Execution",
    description: "Directly executes transactions within Workday and other platforms.",
    color: "sky",
  },
];

interface LineDataEnhanced {
  id: string;
  path: string;
  side: "left" | "right";
}

const WhatPeoplixCanAutomate = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const centerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  const [lines, setLines] = useState<LineDataEnhanced[]>([]);
  const [dimensions, setDimensions] = useState({ w: 0, h: 0 });

  const calculatePaths = useCallback(() => {
    if (!containerRef.current || !centerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const centerRect = centerRef.current.getBoundingClientRect();
    const cx = centerRect.left - containerRect.left + centerRect.width / 2;
    const cy = centerRect.top - containerRect.top + centerRect.height / 2;

    const newLines: LineDataEnhanced[] = cardRefs.current.map((card, i) => {
      if (!card) return { id: `line-${i}`, path: "", side: featuresEnhanced[i].side };
      const cardRect = card.getBoundingClientRect();
      const isLeft = featuresEnhanced[i].side === "left";
      const ex = isLeft ? cardRect.right - containerRect.left : cardRect.left - containerRect.left;
      const ey = cardRect.top - containerRect.top + cardRect.height / 2;
      const horizontalGap = Math.abs(cx - ex);
      const cp1x = isLeft ? ex + horizontalGap * 0.5 : ex - horizontalGap * 0.5;
      const cp2x = isLeft ? cx - horizontalGap * 0.2 : cx + horizontalGap * 0.2;
      return {
        id: `line-${i}`,
        path: `M ${ex} ${ey} C ${cp1x} ${ey}, ${cp2x} ${cy}, ${cx} ${cy}`,
        side: featuresEnhanced[i].side
      };
    });
    setDimensions({ w: containerRect.width, h: containerRect.height });
    setLines(newLines);
  }, []);

  useEffect(() => {
    const timer = setTimeout(calculatePaths, 150);
    window.addEventListener("resize", calculatePaths);
    const observer = new ResizeObserver(calculatePaths);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", calculatePaths);
      observer.disconnect();
    };
  }, [calculatePaths]);

  return (
    <section className="relative overflow-hidden bg-white px-4 py-24 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-20 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="mb-8 inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-5 py-2"
          >
            <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
            <span className="text-sm font-bold uppercase tracking-wider text-gray-900">Capabilities</span>
          </motion.div>

          <h2 className="mb-6 text-4xl font-bold leading-[1.1] tracking-tight text-gray-950 md:text-6xl">
            What Peoplix Can Automate
          </h2>

          <p className="mx-auto max-w-2xl text-lg leading-relaxed text-gray-600">
            Eliminate repetitive tasks and resolve employee requests end-to-end with autonomous AI agents.
          </p>
        </div>

        <div ref={containerRef} className="relative mt-12 min-h-[600px] lg:min-h-0">
          {/* Animated SVG Connections (Desktop Only) */}
          <div className="hidden lg:block absolute inset-0 z-0">
            <svg width={dimensions.w} height={dimensions.h} className="w-full h-full">
              <defs>
                <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#cbd5e1" stopOpacity="0.35" />
                  <stop offset="50%" stopColor="#0891b2" stopOpacity="0.55" />
                  <stop offset="100%" stopColor="#cbd5e1" stopOpacity="0.35" />
                </linearGradient>
              </defs>
              <AnimatePresence>
                {lines.map((l, i) => (
                  <g key={l.id}>
                    <path d={l.path} fill="none" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="4 4" />
                    <motion.path
                      d={l.path}
                      fill="none"
                      stroke="url(#lineGrad)"
                      strokeWidth="3"
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{ pathLength: 1, opacity: 1 }}
                      transition={{ duration: 1.5, delay: i * 0.1 }}
                    />
                    <circle r="3" fill="#0891b2">
                      <animateMotion path={l.path} dur={`${2 + i * 0.5}s`} repeatCount="indefinite" rotate="auto" begin={`${i * 0.3}s`} />
                    </circle>
                  </g>
                ))}
              </AnimatePresence>
            </svg>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_220px_1fr] items-center relative z-10 gap-8 lg:gap-0">
            {/* Left Column Features */}
            <div className="flex flex-col gap-8 lg:pr-12 order-2 lg:order-1">
              {/* <div className="lg:hidden text-xs font-bold text-slate-400 uppercase tracking-widest text-center mb-2">Automated Requests</div> */}
              {featuresEnhanced.filter(f => f.side === "left").map((f, i) => (
                <motion.div
                  key={i}
                  ref={(el) => { cardRefs.current[i] = el; }}
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  whileHover={{ y: -5, scale: 1.02 }}
                  className="rounded-[24px] border border-gray-200 bg-white p-6 shadow-[0_16px_45px_rgba(15,23,42,0.08)] transition-all group"
                >
                  <div className="w-12 h-12 rounded-2xl bg-gray-100 text-primary flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-gray-300/50">
                    {f.icon}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2 leading-tight">{f.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed font-medium">{f.description}</p>
                </motion.div>
              ))}
            </div>

            {/* Center Core */}
            <div className="flex flex-col items-center justify-center relative order-1 lg:order-2">
              <div ref={centerRef}>
                <PeoplixCenterBoxEnhanced />
              </div>
              {/* <div className="hidden lg:block absolute -top-12 text-[10px] font-black text-cyan-500/60 uppercase tracking-[0.3em] font-mono">Autonomous Core</div> */}
            </div>

            {/* Right Column Features */}
            <div className="flex flex-col gap-8 lg:pl-12 order-3 lg:order-3">
              {/* <div className="lg:hidden text-xs font-bold text-slate-400 uppercase tracking-widest text-center mb-2">System Actions</div> */}
              {featuresEnhanced.filter(f => f.side === "right").map((f, i) => (
                <motion.div
                  key={i}
                  ref={(el) => { cardRefs.current[i + 3] = el; }}
                  initial={{ opacity: 0, x: 30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  whileHover={{ y: -5, scale: 1.02 }}
                  className="rounded-[24px] border border-gray-200 bg-white p-6 shadow-[0_16px_45px_rgba(15,23,42,0.08)] transition-all group"
                >
                  <div className="w-12 h-12 rounded-2xl bg-gray-100 text-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-gray-300/50">
                    {f.icon}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2 leading-tight">{f.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed font-medium">{f.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>

    </section>
  );
};

export default WhatPeoplixCanAutomate;
