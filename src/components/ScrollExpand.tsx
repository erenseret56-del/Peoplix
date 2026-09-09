import { useCallback, useEffect, useRef, memo } from 'react';
import './ScrollExpand.css';

const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);

const smoothstep = (edge0: number, edge1: number, x: number) => {
  const t = clamp((x - edge0) / (edge1 - edge0 || 1e-6), 0, 1);
  return t * t * (3 - 2 * t);
};

interface ScrollExpandProps {
  src?: string;
  mediaType?: 'image' | 'video';
  poster?: string;
  alt?: string;
  title?: string;
  scrollHint?: string;
  startWidth?: number;
  startHeight?: number;
  startRadius?: number;
  endRadius?: number;
  mediaZoom?: number;
  scrollDistance?: number;
  holdDistance?: number;
  smoothing?: number;
  overlayScrim?: number;
  useWindowScroll?: boolean;
  enabled?: boolean;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

const ScrollExpandComponent = ({
  src = '',
  mediaType = 'image',
  poster = '',
  alt = '',
  title = '',
  scrollHint = '',
  startWidth = 42,
  startHeight = 58,
  startRadius = 24,
  endRadius = 0,
  mediaZoom = 1.35,
  scrollDistance = 1.2,
  holdDistance = 0.35,
  smoothing = 0.1,
  overlayScrim = 0.45,
  useWindowScroll = false,
  enabled = true,
  children,
  className = '',
  style,
  ...rest
}: ScrollExpandProps) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const mediaRef = useRef<HTMLVideoElement | HTMLImageElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const scrimRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);
  
  const propsRef = useRef<any>({});
  propsRef.current = {
    startWidth,
    startHeight,
    startRadius,
    endRadius,
    mediaZoom,
    scrollDistance,
    holdDistance,
    smoothing,
    overlayScrim,
    useWindowScroll,
    enabled,
  };

  const applyProgress = useCallback((p: number) => {
    const frame = frameRef.current;
    const media = mediaRef.current;
    if (!frame || !media) return;

    const c = propsRef.current;
    const e = smoothstep(0, 1, p);

    const w = c.startWidth + (100 - c.startWidth) * e;
    const h = c.startHeight + (100 - c.startHeight) * e;
    const ix = Math.max(0, (100 - w) / 2);
    const iy = Math.max(0, (100 - h) / 2);
    const r = c.startRadius + (c.endRadius - c.startRadius) * e;

    // Use will-change for better performance
    frame.style.clipPath = `inset(${iy.toFixed(2)}% ${ix.toFixed(2)}% ${iy.toFixed(2)}% ${ix.toFixed(2)}% round ${r.toFixed(1)}px)`;
    media.style.transform = `scale(${(c.mediaZoom + (1 - c.mediaZoom) * e).toFixed(3)})`;

    if (scrimRef.current) {
      scrimRef.current.style.opacity = (c.overlayScrim * e).toFixed(3);
    }

    if (titleRef.current) {
      // Title visible at start (p=0), fades out as expansion begins
      const out = smoothstep(0.15, 0.6, p);
      titleRef.current.style.opacity = (1 - out).toFixed(3);
      titleRef.current.style.transform = `translate3d(0, ${(-28 * out).toFixed(1)}px, 0) scale(${(1 + 0.06 * out).toFixed(3)})`;
    }

    if (hintRef.current) {
      // Hint visible at start, fades quickly
      const gone = smoothstep(0, 0.2, p);
      hintRef.current.style.opacity = (1 - gone).toFixed(3);
      hintRef.current.style.transform = `translate3d(0, ${(8 * gone).toFixed(1)}px, 0)`;
    }

    if (overlayRef.current) {
      // Content fades in as frame expands
      const inn = smoothstep(0.4, 1, p);
      overlayRef.current.style.opacity = inn.toFixed(3);
      overlayRef.current.style.transform = `translate3d(0, ${(18 * (1 - inn)).toFixed(1)}px, 0)`;
    }
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    const track = trackRef.current;
    const stage = stageRef.current;
    if (!root || !track || !stage) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    let current = 0;
    let target = 0;
    let stageH = 0;
    let running = false;

    const measure = () => {
      const c = propsRef.current;
      stageH = c.useWindowScroll ? window.innerHeight : root.clientHeight;
      if (stageH <= 0) return;
      stage.style.height = `${stageH}px`;
      
      // Calculate proper track height for scroll-triggered expansion
      // Make track taller to allow for full expansion animation
      const totalDistance = Math.max(0, c.scrollDistance) + Math.max(0, c.holdDistance);
      const trackHeight = stageH * (1 + totalDistance * 2); // Doubled for more scroll space
      track.style.height = `${trackHeight}px`;
      
      const w = root.clientWidth || stageH;
      stage.style.setProperty('--se-title-size', `${clamp(w * 0.075, 20, 84)}px`);
    };

    const readProgress = () => {
      const c = propsRef.current;
      if (!c.enabled) return 0;
      
      if (c.useWindowScroll) {
        if (!track) return 0;
        const rect = track.getBoundingClientRect();
        const windowHeight = window.innerHeight;
        
        // Simple approach: 
        // progress = 0 when top of element is at bottom of screen
        // progress = 1 when top of element is past top of screen by animationDistance
        const animationDistance = windowHeight * 1.5;
        const scrolledPast = windowHeight - rect.top;
        const progress = clamp(scrolledPast / animationDistance, 0, 1);
        
        return progress;
      }
      
      const span = stageH * Math.max(0.01, c.scrollDistance);
      return clamp(root.scrollTop / span, 0, 1);
    };

    const tick = () => {
      const c = propsRef.current;
      const k = c.smoothing <= 0 ? 1 : 1 - Math.exp(-1 / (60 * c.smoothing));
      current += (target - current) * k;
      if (Math.abs(target - current) < 0.001) {
        current = target;
        running = false;
      }
      applyProgress(current);
      if (running) raf = requestAnimationFrame(tick);
    };

    const kick = () => {
      if (running) return;
      running = true;
      if (!raf) raf = requestAnimationFrame(tick);
    };

    const onScroll = () => {
      target = readProgress();
      if (propsRef.current.smoothing <= 0 || reduceMotion) {
        current = target;
        applyProgress(current);
        return;
      }
      kick();
    };

    const onResize = () => {
      measure();
      target = readProgress();
      current = target;
      applyProgress(current);
    };

    measure();
    // Force initial state to collapsed (progress = 0)
    target = 0;
    current = 0;
    applyProgress(0);

    const scroller = useWindowScroll ? window : root;
    
    // Throttle scroll events for better performance
    let scrollTimeout: number | null = null;
    const throttledScroll = () => {
      if (scrollTimeout) return;
      scrollTimeout = window.setTimeout(() => {
        onScroll();
        scrollTimeout = null;
      }, 16); // ~60fps
    };
    
    scroller.addEventListener('scroll', throttledScroll, { passive: true });
    window.addEventListener('resize', onResize, { passive: true });
    const ro = new ResizeObserver(onResize);
    ro.observe(root);
    
    // Preload image for smoother experience
    if (mediaRef.current && mediaRef.current instanceof HTMLImageElement) {
      const img = mediaRef.current;
      if (!img.complete) {
        img.loading = 'eager';
      }
    }

    return () => {
      if (raf) cancelAnimationFrame(raf);
      if (scrollTimeout) clearTimeout(scrollTimeout);
      scroller.removeEventListener('scroll', throttledScroll);
      window.removeEventListener('resize', onResize);
      ro.disconnect();
    };
  }, [applyProgress, useWindowScroll]);

  const media =
    mediaType === 'video' ? (
      <video
        ref={mediaRef as React.RefObject<HTMLVideoElement>}
        className="scroll-expand__media"
        src={src}
        poster={poster}
        autoPlay
        muted
        loop
        playsInline
      />
    ) : (
      <img
        ref={mediaRef as React.RefObject<HTMLImageElement>}
        className="scroll-expand__media"
        src={src}
        alt={alt}
        draggable={false}
      />
    );

  return (
    <div
      ref={rootRef}
      className={`scroll-expand ${useWindowScroll ? '' : 'scroll-expand--scroller'} ${className}`.trim()}
      style={style}
      {...rest}
    >
      <div ref={trackRef} className="scroll-expand__track">
        <div ref={stageRef} className="scroll-expand__stage">
          <div ref={frameRef} className="scroll-expand__frame">
            {media}
            <div ref={scrimRef} className="scroll-expand__scrim" />
            {children ? (
              <div ref={overlayRef} className="scroll-expand__overlay">
                {children}
              </div>
            ) : null}
          </div>
          {title ? (
            <div ref={titleRef} className="scroll-expand__title">
              {title}
            </div>
          ) : null}
          {scrollHint ? (
            <div ref={hintRef} className="scroll-expand__hint">
              {scrollHint}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

const ScrollExpand = memo(ScrollExpandComponent);
ScrollExpand.displayName = 'ScrollExpand';

export default ScrollExpand;
