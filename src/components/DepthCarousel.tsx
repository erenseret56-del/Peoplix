import { useCallback, useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import './DepthCarousel.css';

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

interface CarouselItem {
  image?: string;
  alt?: string;
  content?: React.ReactNode;
}

interface DepthCarouselProps {
  items: CarouselItem[];
  cardWidth?: number;
  cardHeight?: number;
  radius?: number;
  tint?: string;
  depth?: number;
  spread?: number;
  tilt?: number;
  tiltDirection?: 'left' | 'right';
  perspective?: number;
  visibleCards?: number;
  falloff?: number;
  blur?: number;
  duration?: number;
  ease?: string;
  autoplay?: boolean;
  autoplayDelay?: number;  loop?: boolean;
  showControls?: boolean;
  showIndicators?: boolean;
  hoverExpand?: boolean;
  onChange?: (index: number, item: CarouselItem) => void;
  className?: string;
}

const DepthCarousel = ({
  items = [],
  cardWidth = 300,
  cardHeight = 380,
  radius = 18,
  tint = '#05060a',
  depth = 220,
  spread = 90,
  tilt = 22,
  tiltDirection = 'right',
  perspective = 1400,
  visibleCards = 4,
  falloff = 0.2,
  blur = 6,
  duration = 700,
  ease = 'power3.out',
  loop = true,
  showControls = true,
  showIndicators = true,
  hoverExpand = false,
  onChange,
  className = ''
}: DepthCarouselProps) => {
  const count = items.length;
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const overlayRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const posRef = useRef(0);
  const focusRef = useRef(0);
  const tweenRef = useRef<gsap.core.Tween | null>(null);
  const scaleRef = useRef(1);
  const cfgRef = useRef<any>({});
  const onChangeRef = useRef(onChange);
  const dragRef = useRef<any>(null);
  const wheelTimerRef = useRef<number | null>(null);
  const autoTimerRef = useRef<number | null>(null);
  const reducedRef = useRef(false);
  const [active, setActive] = useState(0);
  const hoverRef = useRef<number | null>(null);

  onChangeRef.current = onChange;
  cfgRef.current = {
    count,
    depth,
    spread,
    tilt,
    tiltDirection,
    visibleCards,
    falloff,
    blur,
    duration,
    ease,
    loop,
    cardWidth,
    autoplayDelay: 3200,
    hoverExpand,
  };

  const layout = useCallback((pos: number) => {
    const cfg = cfgRef.current;
    const n = cfg.count;
    if (!n) return;

    const dir = cfg.tiltDirection === 'left' ? -1 : 1;
    const sc = scaleRef.current;

    for (let i = 0; i < n; i++) {
      const el = cardRefs.current[i];
      if (!el) continue;

      let d = i - pos;
      if (cfg.hoverExpand) {
        const center = (n - 1) / 2;
        const offset = i - center;
        const hovered = hoverRef.current === i;
        el.style.transform = `translate(-50%, -50%) translateX(${(offset * (cfg.cardWidth + 24)).toFixed(2)}px) translateZ(${hovered ? 80 : 0}px) scale(${hovered ? 1.08 : 0.94})`;
        el.style.opacity = hovered || hoverRef.current === null ? '1' : '0.82';
        el.style.filter = hovered || hoverRef.current === null ? 'none' : 'brightness(0.96)';
        el.style.zIndex = String(hovered ? 2100 : 2000 - Math.abs(offset));
        el.style.pointerEvents = 'auto';
        const ov = overlayRefs.current[i];
        if (ov) ov.style.opacity = '0';
        continue;
      }
      if (cfg.loop && n > 1) {
        d = ((d % n) + n) % n;
        if (d > n / 2) d -= n;
      }

      const back = Math.max(0, d);
      const az = Math.abs(d);
      const shown = az <= cfg.visibleCards + 0.5;
      const tz = -cfg.depth * d;
      const tx = dir * cfg.spread * d;
      const ry = dir * cfg.tilt * clamp(d, 0, 1);

      let opacity = d < 0 ? Math.max(0, 1 + d) : 1;
      if (!shown) opacity = 0;

      const brightness = Math.max(0.15, 1 - back * cfg.falloff);
      const blurPx = cfg.blur > 0 ? Math.min(cfg.blur, (back / Math.max(1, cfg.visibleCards)) * cfg.blur) : 0;
      const zi = Math.round(2000 - d * 20);

      el.style.transform = `translate(-50%, -50%) scale(${sc}) translateX(${tx.toFixed(2)}px) translateZ(${tz.toFixed(2)}px) rotateY(${ry.toFixed(3)}deg)`;
      el.style.opacity = opacity.toFixed(3);
      el.style.filter = `brightness(${brightness.toFixed(3)}) blur(${blurPx.toFixed(2)}px)`;
      el.style.zIndex = String(zi);
      el.style.pointerEvents = shown && opacity > 0.05 ? 'auto' : 'none';

      const ov = overlayRefs.current[i];
      if (ov) ov.style.opacity = clamp(back * cfg.falloff * 1.25, 0, 0.86).toFixed(3);
    }
  }, []);

  const notify = useCallback((idx: number) => {
    setActive(idx);
    onChangeRef.current?.(idx, items[idx]);
  }, [items]);

  const tweenTo = useCallback((target: number, animate: boolean) => {
    tweenRef.current?.kill();
    const cfg = cfgRef.current;
    const proxy = { p: posRef.current };
    const dur = animate && !reducedRef.current ? cfg.duration / 1000 : 0;

    tweenRef.current = gsap.to(proxy, {
      p: target,
      duration: dur,
      ease: cfg.ease,
      onUpdate: () => {
        posRef.current = proxy.p;
        layout(proxy.p);
      },
      onComplete: () => {
        const n = cfg.count;
        if (n > 0) posRef.current = ((posRef.current % n) + n) % n;
        layout(posRef.current);
      }
    });
  }, [layout]);

  const setFocus = useCallback((rawIndex: number, animate = true) => {
    const cfg = cfgRef.current;
    const n = cfg.count;
    if (!n) return;

    const idx = cfg.loop ? ((rawIndex % n) + n) % n : clamp(rawIndex, 0, n - 1);
    let delta = idx - posRef.current;

    if (cfg.loop && n > 1) {
      delta = ((delta % n) + n) % n;
      if (delta > n / 2) delta -= n;
    }

    tweenTo(posRef.current + delta, animate);

    if (idx !== focusRef.current) {
      focusRef.current = idx;
      notify(idx);
    }
  }, [tweenTo, notify]);

  const navigateBy = useCallback((step: number) => setFocus(focusRef.current + step, true), [setFocus]);

  const onCardClick = useCallback((index: number) => {
    if (dragRef.current?.moved) return;
    setFocus(index, true);
  }, [setFocus]);

  useEffect(() => {
    layout(posRef.current);
  }, [layout]);

  useEffect(() => {
    return () => {
      tweenRef.current?.kill();
      if (wheelTimerRef.current) clearTimeout(wheelTimerRef.current);
      if (autoTimerRef.current) clearInterval(autoTimerRef.current);
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className={`depth-carousel ${className}`.trim()}
      style={{ '--dc-perspective': `${perspective}px` } as React.CSSProperties}
      role="group"
      aria-roledescription="carousel"
      aria-label="Depth carousel"
      tabIndex={0}
    >
      <div className="depth-carousel__stage" ref={stageRef}>
        {items.map((item, i) => (
          <div
            key={i}
            className="depth-carousel__card"
            ref={el => { cardRefs.current[i] = el; }}
            style={{ width: cardWidth, height: cardHeight, borderRadius: radius }}
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${count}`}
            aria-hidden={hoverExpand ? false : active !== i}
            onClick={() => onCardClick(i)}
            onMouseEnter={() => {
              if (!hoverExpand) return;
              hoverRef.current = i;
              layout(posRef.current);
            }}
            onMouseLeave={() => {
              if (!hoverExpand) return;
              hoverRef.current = null;
              layout(posRef.current);
            }}
          >
            {item.image && (
              <img className="depth-carousel__img" src={item.image} alt={item.alt || ''} draggable={false} />
            )}
            {item.content && (
              <div className="depth-carousel__content">{item.content}</div>
            )}
            <span
              className="depth-carousel__tint"
              ref={el => { overlayRefs.current[i] = el; }}
              style={{ background: tint }}
            />
          </div>
        ))}
      </div>

      {showControls && count > 1 && (
        <>
          <button
            type="button"
            className="depth-carousel__arrow depth-carousel__arrow--prev"
            aria-label="Previous slide"
            onClick={() => navigateBy(-1)}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path
                d="M15 5l-7 7 7 7"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <button
            type="button"
            className="depth-carousel__arrow depth-carousel__arrow--next"
            aria-label="Next slide"
            onClick={() => navigateBy(1)}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path
                d="M9 5l7 7-7 7"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </>
      )}

      {showIndicators && count > 1 && (
        <div className="depth-carousel__dots" role="tablist" aria-label="Slides">
          {items.map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={active === i}
              aria-label={`Go to slide ${i + 1}`}
              className={`depth-carousel__dot${active === i ? ' is-active' : ''}`}
              onClick={() => setFocus(i, true)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default DepthCarousel;
