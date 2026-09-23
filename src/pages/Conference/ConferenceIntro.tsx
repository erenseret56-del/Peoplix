import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

const SIGNAL_BARS = 31;
const INTRO_DURATION = 11000;
const SKIP_HANDOFF = 400;

export default function ConferenceIntro() {
  const reduced = useReducedMotion();
  const [visible, setVisible] = useState(true);
  const [skipping, setSkipping] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(false), skipping ? SKIP_HANDOFF : reduced ? 650 : INTRO_DURATION);
    return () => window.clearTimeout(timer);
  }, [reduced, skipping]);

  if (!visible) return null;

  return (
    <motion.div
      className={`conf-intro${reduced ? ' is-reduced' : ''}${skipping ? ' is-skipping' : ''}`}
      initial={reduced ? { opacity: 0 } : false}
      animate={reduced ? { opacity: [0, 1, 1, 0] } : undefined}
      transition={reduced ? { duration: 0.6, times: [0, 0.25, 0.7, 1], ease: 'easeInOut' } : undefined}
    >
      <div className="conf-intro-surface" aria-hidden="true" />
      <div className="conf-intro-art" aria-hidden="true">
        <div className="conf-intro-stage">
          <svg className="conf-intro-mark" viewBox="0 0 500 500" role="presentation" focusable="false">
            <path d="M91 108h161c-50 2-83 46-101 122v-70c0-31-14-47-60-52Z" />
            <path d="M251 108c73 0 121 34 121 86 0 52-37 88-98 93-43 4-65 23-76 57v-46c0-23 26-36 68-40 42-4 65-27 65-67 0-47-32-79-80-83Z" />
            <path d="M151 234c29 1 47 19 47 49v65c0 24 10 35 36 42H116c25-8 35-21 35-45V234Z" />
          </svg>
          <div className="conf-intro-wave-path">
            <div className="conf-intro-wave">
              {Array.from({ length: SIGNAL_BARS }, (_, i) => {
                const centerDistance = Math.abs(i - (SIGNAL_BARS - 1) / 2);
                const envelope = Math.max(0, 1 - centerDistance / 16);
                const height = 10 + (Math.sin(i * 0.73) ** 2 * 42 + Math.cos(i * 0.31) ** 2 * 18) * envelope;
                return <i key={i} style={{ '--i': i, '--bar': `${height.toFixed(1)}px` } as CSSProperties} />;
              })}
            </div>
          </div>
        </div>
        <div className="conf-intro-copy">
          <div className="conf-intro-wordmark"><span>Peoplix</span></div>
          <div className="conf-intro-tagline">A MORE HUMAN KIND OF<br />INTELLIGENCE.</div>
          <span className="conf-intro-divider" />
        </div>
      </div>
      {!reduced && <button className="conf-intro-skip" type="button" onClick={() => setSkipping(true)} disabled={skipping}>
        Skip introduction <span aria-hidden="true">{'\u2197'}</span>
      </button>}
    </motion.div>
  );
}
