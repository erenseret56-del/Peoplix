import { useEffect, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { INTRO_ANIMATION_ENABLED } from './intro.config';

function WordmarkIntro() {
  const reduced = useReducedMotion();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(false), reduced ? 350 : 3400);
    return () => window.clearTimeout(timer);
  }, [reduced]);

  if (!visible) return null;

  return (
    <div className={`conf-intro${reduced ? ' is-reduced' : ''}`}>
      <div className="conf-intro-art">
        <svg className="conf-intro-wordmark" viewBox="0 0 180 56" role="img" aria-label="Peoplix">
          {/* Stroke animation adapted from Uiverse.io by SelfMadeSystem. */}
          <g aria-hidden="true" textAnchor="middle">
            <text className="conf-intro-stroke" x="90" y="43">Peoplix</text>
            <text className="conf-intro-fill" x="90" y="43">Peoplix</text>
          </g>
        </svg>
        <div className="conf-intro-tagline">A MORE HUMAN KIND OF<br />INTELLIGENCE.</div>
      </div>
    </div>
  );
}

export default function ConferenceIntro() {
  // Do not mount the animation or start its timer when disabled.
  return INTRO_ANIMATION_ENABLED ? <WordmarkIntro /> : null;
}
