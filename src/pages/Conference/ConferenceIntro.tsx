import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import logo from '../../assets/images/peoplix-logo.png';

const SIGNAL_BARS = 31;

export default function ConferenceIntro() {
  const reduced = useReducedMotion();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(false), reduced ? 650 : 6800);
    return () => window.clearTimeout(timer);
  }, [reduced]);

  if (!visible) return null;

  return (
    <motion.div
      className={`conf-intro${reduced ? ' is-reduced' : ''}`}
      initial={reduced ? { opacity: 0 } : false}
      animate={reduced ? { opacity: [0, 1, 1, 0] } : undefined}
      transition={reduced ? { duration: 0.6, times: [0, 0.25, 0.7, 1], ease: 'easeInOut' } : undefined}
    >
      <div className="conf-intro-surface" aria-hidden="true" />
      <div className="conf-intro-layers" aria-hidden="true">
        <i className="conf-intro-layer conf-intro-layer-beige" />
        <i className="conf-intro-layer conf-intro-layer-cream" />
        <i className="conf-intro-layer conf-intro-layer-white" />
      </div>

      <div className="conf-intro-art" aria-hidden="true">
        <div className="conf-intro-wave">
          {Array.from({ length: SIGNAL_BARS }, (_, i) => {
            const centerDistance = Math.abs(i - (SIGNAL_BARS - 1) / 2);
            const envelope = Math.max(0, 1 - centerDistance / 16);
            const height = 10 + (Math.sin(i * 0.73) ** 2 * 42 + Math.cos(i * 0.31) ** 2 * 18) * envelope;
            return <i key={i} style={{ '--i': i, '--bar': `${height.toFixed(1)}px` } as CSSProperties} />;
          })}
        </div>

        <img className="conf-intro-mark" src={logo} alt="" width="124" height="124" />
        <div className="conf-intro-copy">
          <div className="conf-intro-wordmark"><span>Peoplix</span></div>
          <div className="conf-intro-tagline">A more human kind of intelligence.</div>
        </div>
      </div>

      <button className="conf-intro-skip" type="button" onClick={() => setVisible(false)}>
        Skip introduction <span aria-hidden="true">{'\u2197'}</span>
      </button>
    </motion.div>
  );
}
