/**
 * HeroFillCanvas
 * Renders a looping animated aurora/neural-light canvas.
 * Used as the fill texture inside MaskedHeading text.
 * Returns a ref to the canvas element — pass its dataURL as `src` to MaskedHeading,
 * OR use the exported <HeroFillVideo> component which renders directly.
 */

import { useEffect, useRef, forwardRef, useImperativeHandle } from "react";

export interface HeroFillCanvasHandle {
  getDataURL: () => string;
}

interface Props {
  width?: number;
  height?: number;
}

/**
 * Inline animated canvas — used INSIDE MaskedHeading via a portal-like trick:
 * We render a hidden canvas and grab its stream as a <video> srcObject.
 * Simpler approach: just return a styled <canvas> that can be placed as the
 * media child directly via the MaskedHeading `src` workaround.
 *
 * SIMPLEST working approach: render the canvas and use CSS mix-blend-mode
 * on a sibling element. See HeroFillOverlay below.
 */
const HeroFillCanvas = forwardRef<HeroFillCanvasHandle, Props>(
  ({ width = 1200, height = 400 }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const rafRef = useRef<number>(0);

    useImperativeHandle(ref, () => ({
      getDataURL() {
        return canvasRef.current?.toDataURL("image/png") ?? "";
      },
    }));

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      let t = 0;

      const draw = () => {
        t += 0.008;
        ctx.clearRect(0, 0, width, height);

        // Layer 1 — deep base
        const bg = ctx.createLinearGradient(0, 0, width, height);
        bg.addColorStop(0, "#0a0a1a");
        bg.addColorStop(0.5, "#0d1428");
        bg.addColorStop(1, "#07080f");
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, width, height);

        // Layer 2 — aurora blobs
        const blobs = [
          { cx: 0.2 + Math.sin(t * 0.7) * 0.15, cy: 0.5 + Math.cos(t * 0.5) * 0.3, r: 0.38, c1: "rgba(99,102,241,0.55)", c2: "rgba(99,102,241,0)" },
          { cx: 0.6 + Math.cos(t * 0.6) * 0.18, cy: 0.45 + Math.sin(t * 0.8) * 0.25, r: 0.42, c1: "rgba(139,92,246,0.45)", c2: "rgba(139,92,246,0)" },
          { cx: 0.85 + Math.sin(t * 0.4) * 0.1, cy: 0.55 + Math.cos(t * 0.9) * 0.2, r: 0.32, c1: "rgba(56,189,248,0.4)", c2: "rgba(56,189,248,0)" },
          { cx: 0.45 + Math.cos(t * 1.1) * 0.12, cy: 0.3 + Math.sin(t * 0.6) * 0.2, r: 0.28, c1: "rgba(168,85,247,0.35)", c2: "rgba(168,85,247,0)" },
        ];

        blobs.forEach(({ cx, cy, r, c1, c2 }) => {
          const gx = cx * width;
          const gy = cy * height;
          const gr = r * Math.max(width, height);
          const grad = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr);
          grad.addColorStop(0, c1);
          grad.addColorStop(1, c2);
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, width, height);
        });

        // Layer 3 — moving light streak
        const streakX = ((Math.sin(t * 0.5) + 1) / 2) * width;
        const streak = ctx.createLinearGradient(streakX - 200, 0, streakX + 200, height);
        streak.addColorStop(0, "rgba(255,255,255,0)");
        streak.addColorStop(0.5, "rgba(255,255,255,0.06)");
        streak.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = streak;
        ctx.fillRect(0, 0, width, height);

        // Layer 4 — subtle grid dots
        ctx.fillStyle = "rgba(255,255,255,0.04)";
        const spacing = 32;
        for (let x = spacing; x < width; x += spacing) {
          for (let y = spacing; y < height; y += spacing) {
            const pulse = 0.5 + 0.5 * Math.sin(t * 2 + x * 0.02 + y * 0.03);
            ctx.globalAlpha = pulse * 0.08;
            ctx.beginPath();
            ctx.arc(x, y, 1, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.globalAlpha = 1;

        rafRef.current = requestAnimationFrame(draw);
      };

      rafRef.current = requestAnimationFrame(draw);
      return () => cancelAnimationFrame(rafRef.current);
    }, [width, height]);

    return (
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{ display: "block", width: "100%", height: "100%" }}
      />
    );
  }
);

HeroFillCanvas.displayName = "HeroFillCanvas";
export default HeroFillCanvas;
