import { useCallback, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type MouseEvent, type ReactNode } from "react";
import { gsap } from "gsap";
import "./AccordionGallery.css";

interface AccordionGalleryItem {
  label: string;
  content: ReactNode;
  link?: string;
}

interface AccordionGalleryProps {
  items: AccordionGalleryItem[];
  defaultIndex?: number;
  trigger?: "hover" | "click";
  autoplay?: boolean;
  autoplayDelay?: number;
  height?: number;
  gap?: number;
  radius?: number;
  expandRatio?: number;
  duration?: number;
  ease?: string;
  tilt?: number;
  stagger?: number;
  showLabels?: boolean;
  className?: string;
}

export default function AccordionGallery({
  items,
  defaultIndex = 0,
  trigger = "hover",
  autoplay = false,
  autoplayDelay = 5000,
  height = 360,
  gap = 10,
  radius = 18,
  expandRatio = 0.52,
  duration = 0.6,
  ease = "power3.out",
  tilt = 6,
  stagger = 0.06,
  showLabels = false,
  className = "",
}: AccordionGalleryProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRefs = useRef<(HTMLAnchorElement | HTMLDivElement | null)[]>([]);
  const contentRefs = useRef<(HTMLDivElement | null)[]>([]);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const [active, setActive] = useState(Math.min(Math.max(defaultIndex, 0), Math.max(items.length - 1, 0)));
  const initialActiveRef = useRef(active);

  const applyLayout = useCallback((index: number, animate = true) => {
    const panels = panelRefs.current;
    const count = panels.length;
    if (!count) return;

    const ratio = Math.min(Math.max(expandRatio, 0.2), 0.8);
    const grow = count > 1 ? (ratio * (count - 1)) / (1 - ratio) : 1;
    timelineRef.current?.kill();
    const timeline = gsap.timeline();
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    panels.forEach((panel, panelIndex) => {
      if (!panel) return;
      const isActive = panelIndex === index;
      const rotation = panelIndex < index ? tilt : panelIndex > index ? -tilt : 0;
      timeline.to(panel, {
        flexGrow: isActive ? grow : 1,
        rotateY: rotation,
        y: isActive ? -5 : 0,
        scale: isActive ? 1.01 : 0.985,
        filter: isActive ? "blur(0px) saturate(1)" : "blur(1.8px) saturate(0.55)",
        duration: animate && !reducedMotion ? duration : 0,
        ease,
      }, 0);
      const content = contentRefs.current[panelIndex];
      if (content) {
        timeline.to(content, {
          opacity: isActive ? 1 : 0.58,
          scale: isActive ? 1 : 0.985,
          duration: animate && !reducedMotion ? duration : 0,
          ease,
          delay: isActive && !reducedMotion ? stagger : 0,
        }, 0);
      }
    });
    timelineRef.current = timeline;
  }, [duration, ease, expandRatio, stagger, tilt]);

  useEffect(() => {
    applyLayout(initialActiveRef.current, false);
  }, [applyLayout]);

  useEffect(() => () => {
    timelineRef.current?.kill();
  }, []);

  useEffect(() => {
    if (!autoplay || items.length < 2) return;
    const timer = window.setInterval(() => {
      setActive((current) => {
        const next = (current + 1) % items.length;
        applyLayout(next);
        return next;
      });
    }, autoplayDelay);
    return () => window.clearInterval(timer);
  }, [applyLayout, autoplay, autoplayDelay, items.length]);

  const activate = (index: number) => {
    setActive(index);
    applyLayout(index);
  };

  const handleClick = (index: number, event: MouseEvent<HTMLElement>) => {
    if (index !== active && items[index].link) {
      event.preventDefault();
      activate(index);
    }
  };

  const handleKeyDown = (index: number, event: KeyboardEvent<HTMLAnchorElement | HTMLDivElement>) => {
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      activate((index + 1) % items.length);
    }
    if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      activate((index - 1 + items.length) % items.length);
    }
  };

  return (
    <div
      ref={rootRef}
      className={`accordion-gallery ${className}`.trim()}
      style={{ "--ag-gap": `${gap}px`, "--ag-radius": `${radius}px`, height: `${height}px` } as CSSProperties}
      role="list"
      aria-label="Enterprise operations"
    >
      {items.map((item, index) => {
        const Tag = item.link ? "a" : "div";
        return (
          <Tag
            key={item.label}
            ref={(element: HTMLAnchorElement | HTMLDivElement | null) => { panelRefs.current[index] = element; }}
            className={`ag-panel${active === index ? " ag-panel--active" : ""}`}
            style={{ borderRadius: radius }}
            href={item.link}
            onClick={(event) => {
              if (Tag === "a") handleClick(index, event);
              else if (trigger === "click") activate(index);
            }}
            onMouseEnter={() => trigger === "hover" && activate(index)}
            onFocus={() => activate(index)}
            onKeyDown={(event) => handleKeyDown(index, event)}
            role="listitem"
            tabIndex={0}
            aria-current={active === index ? "true" : undefined}
          >
            <div ref={(element) => { contentRefs.current[index] = element; }} className="ag-panel__content">
              {item.content}
            </div>
            {showLabels && <span className="ag-panel__label">{item.label}</span>}
          </Tag>
        );
      })}
    </div>
  );
}
