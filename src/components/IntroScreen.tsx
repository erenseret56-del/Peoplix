import { useEffect, useRef, useState } from 'react';
import ParticleText, { type ParticleTextHandle } from './ParticleText';

/**
 * Full-screen intro overlay — plays once per session.
 *
 * Timeline:
 *   0        → particles scatter IN and form "Peoplix"  (~1600ms)
 *   1800ms   → fully formed, idle drift                 (~1200ms pause)
 *   3000ms   → scatterOut() called — particles explode back out
 *   3200ms   → screen starts fading to transparent     (800ms CSS fade)
 *   4000ms   → onDone() — overlay unmounts, landing page visible
 */

interface IntroScreenProps {
  onDone: () => void;
}

const IntroScreen = ({ onDone }: IntroScreenProps) => {
  const particleRef = useRef<ParticleTextHandle>(null);
  const [fading, setFading]   = useState(false);
  const doneCalled = useRef(false);

  useEffect(() => {
    // Step 1 — trigger scatter-out after text has been readable for ~1.4s
    const scatterTimer = setTimeout(() => {
      particleRef.current?.scatterOut();
    }, 3000);

    // Step 2 — start CSS fade slightly after scatter begins (particles mid-flight)
    const fadeTimer = setTimeout(() => {
      setFading(true);
    }, 3200);

    // Step 3 — unmount once fade is done
    const doneTimer = setTimeout(() => {
      if (!doneCalled.current) {
        doneCalled.current = true;
        onDone();
      }
    }, 4100);

    return () => {
      clearTimeout(scatterTimer);
      clearTimeout(fadeTimer);
      clearTimeout(doneTimer);
    };
  }, [onDone]);

  return (
    <div
      aria-hidden="true"
      style={{
        position:       'fixed',
        inset:          0,
        zIndex:         999999,
        background:     '#09090f',
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        justifyContent: 'center',
        opacity:    fading ? 0 : 1,
        transition: fading
          ? 'opacity 0.85s cubic-bezier(0.4, 0, 0.2, 1)'
          : 'none',
        pointerEvents: fading ? 'none' : 'auto',
        willChange: 'opacity',
      }}
    >
      {/* Vignette */}
      <div
        style={{
          position:     'absolute',
          inset:        0,
          background:   'radial-gradient(ellipse 70% 60% at 50% 50%, transparent 40%, rgba(0,0,0,0.65) 100%)',
          pointerEvents:'none',
        }}
      />

      {/* Particle canvas — ref gives us scatterOut() without prop changes */}
      <div
        style={{
          width:    '100%',
          maxWidth: 900,
          height:   300,
          position: 'relative',
          zIndex:   1,
        }}
      >
        <ParticleText
          ref={particleRef}
          text="Peoplix"
          particleSize={2.2}
          density={4}
          color="#f8fafc"
          highlightColor="#8b5cf6"
          scatter={190}
          gatherDuration={1600}
          stagger={420}
          pointerRepel={42}
          repelRadius={120}
          idleDrift={0.8}
          trigger="mount"
          fontSize="clamp(3.5rem, 13vw, 9rem)"
          fontWeight={800}
          fontFamily="inherit"
          glow
        />
      </div>

      {/* Tagline */}
      <p
        style={{
          position:      'relative',
          zIndex:        1,
          marginTop:     8,
          color:         'rgba(255,255,255,0.28)',
          fontSize:      'clamp(10px, 1.3vw, 13px)',
          fontWeight:    500,
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          fontFamily:    'inherit',
        }}
      >
        AI Voice Agents for Enterprise
      </p>
    </div>
  );
};

export default IntroScreen;
