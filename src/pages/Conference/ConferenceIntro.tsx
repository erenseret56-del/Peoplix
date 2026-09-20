import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import logo from '../../assets/images/peoplix-logo.png';

export default function ConferenceIntro() {
  const reduced = useReducedMotion();
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(false), reduced ? 180 : 2550);
    return () => window.clearTimeout(timer);
  }, [reduced]);
  if (!visible) return null;
  return <motion.div className="conf-intro" initial={{ opacity: 1 }} animate={{ opacity: 0 }}
    transition={{ delay: reduced ? 0 : 2.15, duration: reduced ? .15 : .35 }}>
    <div className="conf-intro-art" aria-hidden="true">
      <div className="conf-intro-wave">{Array.from({ length: 25 }, (_, i) => <i key={i} style={{ '--i': i, '--bar': `${12 + Math.sin(i * .8) ** 2 * (70 - Math.abs(i - 12) * 4)}px` } as CSSProperties} />)}</div>
      <img className="conf-intro-mark" src={logo} alt="" width="112" height="112" />
      <div className="conf-intro-copy">
        <div className="conf-intro-wordmark">PEOPLIX</div>
        <div className="conf-intro-tagline">A more human kind of intelligence.</div>
      </div>
    </div>
    <button className="conf-intro-skip" onClick={() => setVisible(false)}>Skip introduction <span aria-hidden="true">↗</span></button>
  </motion.div>;
}
