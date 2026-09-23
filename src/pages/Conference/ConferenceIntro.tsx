import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import logo from '../../assets/images/peoplix-logo.png';

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
          <div className="conf-intro-trail" />
          <img className="conf-intro-mark" src={logo} alt="" width="160" height="160" />
          <div className="conf-intro-orbit">
            <div className="conf-intro-route">
              <div className="conf-intro-wave">
                  {Array.from({ length: SIGNAL_BARS }, (_, i) => {
                    const centerDistance = Math.abs(i - (SIGNAL_BARS - 1) / 2);
                    const envelope = Math.max(0, 1 - centerDistance / 16);
                    const height = 10 + (Math.sin(i * 0.73) ** 2 * 42 + Math.cos(i * 0.31) ** 2 * 18) * envelope;
                    const angle = i / SIGNAL_BARS * Math.PI * 2;
                    const ringX = Math.cos(angle) * 146 - (i - 15) * 8;
                    const ringY = Math.sin(angle) * 78;
                    return <i key={i} style={{ '--i': i, '--bar': `${height.toFixed(1)}px`, '--ring-x': `${ringX.toFixed(1)}px`, '--ring-y': `${ringY.toFixed(1)}px` } as CSSProperties} />;
                  })}
              </div>
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