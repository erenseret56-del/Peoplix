import type { FormEvent } from 'react';
import { motion, useIsPresent, useReducedMotion } from 'framer-motion';
import { ArrowRight, Headphones, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';
import logo from '../../assets/images/peoplix-logo.png';

interface ConferenceEntryProps {
  email: string;
  consent: boolean;
  busy: boolean;
  error: string;
  onEmailChange: (value: string) => void;
  onConsentChange: (value: boolean) => void;
  onSubmit: (event: FormEvent) => void;
}

/** The actual email screen stays mounted while its two surfaces open over Ava. */
export default function ConferenceEntry({ email, consent, busy, error, onEmailChange, onConsentChange, onSubmit }: ConferenceEntryProps) {
  const reduced = useReducedMotion();
  const present = useIsPresent();
  const transition = { duration: reduced ? 0.18 : 1.7, ease: [0.45, 0, 0.15, 1] as const };

  return <motion.div className="conf-entry" data-exiting={!present} inert={!present} aria-hidden={!present}
    initial={false} animate="closed" exit="open">
    <div className="conf-entry-layout">
      <motion.header className="conf-entry-brand" variants={{ closed: { y: 0, opacity: 1 }, open: reduced ? { opacity: 0 } : { y: '-115%' } }} transition={transition}>
        <div className="conf-entry-beige" aria-hidden="true"><i className="conf-material-light" /><i className="conf-material-arc conf-material-arc-one" /><i className="conf-material-arc conf-material-arc-two" /><i className="conf-material-arc conf-material-arc-three" /></div>
        <div className="conf-entry-identity">
          <img className="conf-entry-logo" src={logo} alt="" width="240" height="240" />
          <div className="conf-entry-wordmark">Peoplix</div>
          <p className="conf-entry-tagline">A MORE HUMAN KIND OF<br />INTELLIGENCE.</p>
          <span className="conf-entry-divider" aria-hidden="true" />
        </div>
      </motion.header>

      <motion.main className="conf-entry-bottom" aria-labelledby="conf-entry-title"
        variants={{ closed: { y: 0, opacity: 1 }, open: reduced ? { opacity: 0 } : { y: '190%' } }} transition={transition}>
        <div className="conf-entry-ivory" aria-hidden="true">
          <i /><i />
        </div>
        <div className="conf-entry-content">
          <p className="conf-entry-eyebrow">THE HR TECH CONFERENCE EXPERIENCE</p>
          <h1 id="conf-entry-title">Meet Ava.</h1>
          <p className="conf-entry-description">Experience the Peoplix AI HR assistant.<br />Good conversations. Better workplaces.</p>

          <form className="conf-form conf-entry-form" onSubmit={onSubmit} aria-busy={busy}>
            <label className="conf-entry-email-label" htmlFor="conference-email">Enter your work email</label>
            <div className="conf-input-wrap conf-entry-input">
              <Mail size={18} strokeWidth={1.3} aria-hidden="true" />
              <input id="conference-email" name="email" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false}
                placeholder="name@company.com" required maxLength={254} value={email} onChange={event => onEmailChange(event.target.value)}
                aria-invalid={Boolean(error)} aria-describedby={error ? 'conf-entry-error conf-email-note' : 'conf-email-note'} />
            </div>
            <label className="conf-consent"><input type="checkbox" checked={consent} onChange={event => onConsentChange(event.target.checked)} required />
              <span>I agree to this demo being recorded and transcribed, with my work email, for Peoplix conference follow-up. <Link to="/privacy" target="_blank" rel="noreferrer">Privacy policy</Link></span>
            </label>
            {error && <p className="conf-error" id="conf-entry-error" role="alert">{error}</p>}
            <button className="conf-primary conf-entry-submit" type="submit" disabled={busy || !present}>
              <span>{!present ? 'Opening Ava…' : busy ? 'Preparing your experience\u2026' : 'Meet Ava'}</span><ArrowRight size={19} strokeWidth={1.5} aria-hidden="true" />
            </button>
            <p className="conf-entry-headphones"><Headphones size={18} strokeWidth={1.4} aria-hidden="true" />Best with headphones</p>
            <p id="conf-email-note" className="conf-entry-form-note">Work email only &middot; No account needed &middot; Up to 3 minutes with Ava</p>
          </form>

        </div>
      </motion.main>
    </div>
  </motion.div>;
}
