import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import { ArrowUpRight, Check, Headphones, Mic, MicOff, PhoneOff, Volume2 } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ConferenceError, conferenceRequest, endConferenceOnLeave } from '../../api/conference';
import type { ConferenceSession } from '../../api/conference';
import { useAvaDemoCall } from '../../hooks/useAvaDemoCall';
import logo from '../../assets/images/peoplix-logo.png';
import ConferenceIntro from './ConferenceIntro';
import ConferenceEntry from './ConferenceEntry';
import ConferenceDemoRequest from './ConferenceDemoRequest';
import './conference.css';

type Stage = 'email' | 'restoring' | 'ready' | 'connecting' | 'live' | 'complete' | 'expired' | 'interrupted';
const TOKEN_KEY = 'peoplix_conference_token';
const time = (ms: number) => `${Math.floor(Math.max(0, ms) / 60000).toString().padStart(2, '0')}:${Math.floor(Math.max(0, ms) / 1000 % 60).toString().padStart(2, '0')}`;
function savedToken() { try { return sessionStorage.getItem(TOKEN_KEY) || ''; } catch { return ''; } }
function saveToken(value: string) { try { if (value) sessionStorage.setItem(TOKEN_KEY, value); else sessionStorage.removeItem(TOKEN_KEY); } catch { /* In-memory access still works in private browsing. */ } }

function VoiceSculpture({ active, talking }: { active: boolean; talking: boolean }) {
  return <div className={`conf-sculpture ${active ? 'is-active' : ''} ${talking ? 'is-speaking' : ''}`} aria-hidden="true">
    <div className="conf-orbit conf-orbit-one" /><div className="conf-orbit conf-orbit-two" />
    <div className="conf-signal">{Array.from({ length: 41 }, (_, i) => <i key={i} style={{ '--i': i, '--bar': `${6 + Math.sin(i * .72) ** 2 * (72 - Math.abs(i - 20) * 3)}px` } as CSSProperties} />)}</div>
    <span className="conf-sculpture-label">{active ? talking ? 'AVA IS SPEAKING' : 'LISTENING TO YOU' : 'INTELLIGENCE, WITH A VOICE'}</span>
  </div>;
}

export default function ConferencePage() {
  const [token, setToken] = useState(savedToken);
  const [stage, setStage] = useState<Stage>(() => savedToken() ? 'restoring' : 'email');
  const [session, setSession] = useState<ConferenceSession | null>(null);
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [talking, setTalking] = useState(false);
  const [caption, setCaption] = useState('');
  const [view, setView] = useState<'experience' | 'demo' | 'demo-success'>('experience');
  const [now, setNow] = useState(Date.now);
  const [clockOffset, setClockOffset] = useState(0);
  const [entryOpening, setEntryOpening] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    if (!celebrating) return;
    const timer = window.setTimeout(() => setCelebrating(false), 2600);
    return () => window.clearTimeout(timer);
  }, [celebrating]);
  const experienceRef = useRef<HTMLDivElement>(null);
  const focusAfterEntry = useRef(false);
  const busyRef = useRef(false);
  const generation = useRef(0);
  const endedByUser = useRef(false);
  const activeToken = useRef(token);
  const restoreToken = useRef(token);
  const forgetToken = useCallback(() => {
    saveToken(''); activeToken.current = ''; restoreToken.current = ''; setToken('');
  }, []);
  const ava = useAvaDemoCall({
    onStarted: () => { if (!endedByUser.current) { setStage('live'); setBusy(false); busyRef.current = false; } },
    onEnded: () => {
      if (endedByUser.current) return;
      setStage('complete'); setTalking(false); setBusy(false); busyRef.current = false;
      const completedToken = activeToken.current;
      if (completedToken) void conferenceRequest('/end', completedToken, {}).catch(() => undefined);
      forgetToken();
    },
    onError: () => {
      if (endedByUser.current) return;
      setStage('interrupted'); setError('The conversation was interrupted. Check your connection, then check your session to continue.');
      setBusy(false); busyRef.current = false; setTalking(false);
    },
    onTalkingChange: setTalking,
    onTranscript: transcript => {
      const last = transcript.at(-1);
      if (last) setCaption(`${last.role === 'agent' ? 'Ava' : 'You'}: ${last.content}`);
    },
  });
  const avaRef = useRef(ava);
  avaRef.current = ava;

  const applySession = useCallback((data: ConferenceSession) => {
    setSession(data); setClockOffset(new Date(data.serverNow).getTime() - Date.now());
    setStage(data.status === 'expired' ? 'expired' : data.status === 'completed' ? 'complete'
      : data.status === 'active' ? 'interrupted' : data.status === 'failed' && !data.canRetry ? 'complete' : 'ready');
    if (data.status === 'completed' || data.status === 'expired') forgetToken();
  }, [forgetToken]);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'Meet Ava · Peoplix Conference'; window.scrollTo(0, 0);
    return () => { document.title = previousTitle; };
  }, []);

  useEffect(() => {
    if (!restoreToken.current) return;
    let cancelled = false;
    void conferenceRequest<ConferenceSession>('/session', restoreToken.current).then(data => {
      if (cancelled) return;
      // Only an active call restores automatically. Pending sessions return to
      // email entry; their tab token can resume after the same email is checked.
      if (data.status === 'active') applySession(data);
      else {
        setSession(null); setStage('email');
        if (data.status === 'completed' || data.status === 'expired') forgetToken();
      }
    }).catch(err => {
      if (cancelled) return;
      if (err instanceof ConferenceError && ['SESSION_EXPIRED', 'INVALID_SESSION'].includes(err.code)) {
        setStage('email'); forgetToken();
      } else { setError(err.message); setStage('interrupted'); }
    });
    return () => { cancelled = true; };
  }, [applySession, forgetToken]);

  useEffect(() => {
    const tick = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(tick);
  }, []);

  useEffect(() => {
    if (entryOpening || !focusAfterEntry.current) return;
    focusAfterEntry.current = false;
    const action = experienceRef.current?.querySelector<HTMLButtonElement>('.conf-conversation .conf-primary');
    action?.focus({ preventScroll: true });
    const bounds = action?.getBoundingClientRect();
    if (bounds && (bounds.bottom > window.innerHeight || bounds.top < 0)) {
      action?.scrollIntoView({ block: 'center', behavior: reducedMotion ? 'instant' : 'smooth' });
    }
  }, [entryOpening, reducedMotion]);

  useEffect(() => {
    const leave = () => {
      generation.current += 1;
      if (avaRef.current.isConnected) {
        avaRef.current.stop();
        if (activeToken.current) endConferenceOnLeave(activeToken.current);
      }
    };
    window.addEventListener('pagehide', leave);
    return () => { window.removeEventListener('pagehide', leave); leave(); };
  }, []);

  const finish = useCallback((expired = false) => {
    generation.current += 1; endedByUser.current = true;
    avaRef.current.stop();
    setTalking(false); setStage(expired ? 'expired' : 'complete');
    setError(''); setBusy(false); busyRef.current = false;
    const completedToken = activeToken.current;
    if (completedToken) void conferenceRequest('/end', completedToken, {}).catch(() => undefined);
    forgetToken();
  }, [forgetToken]);

  const sessionRemaining = session ? new Date(session.expiresAt).getTime() - now - clockOffset : 0;
  const callRemaining = session?.conversationEndsAt ? new Date(session.conversationEndsAt).getTime() - now - clockOffset : 180000;
  useEffect(() => {
    if (!session || ['email', 'complete', 'expired', 'restoring'].includes(stage)) return;
    if (sessionRemaining <= 0) finish(true);
    else if (session.conversationEndsAt && callRemaining <= 0) finish(false);
  }, [session, stage, sessionRemaining, callRemaining, finish]);

  async function enter(event: FormEvent) {
    event.preventDefault(); if (busyRef.current) return;
    busyRef.current = true; setBusy(true); setError('');
    try {
      const data = await conferenceRequest<ConferenceSession & { token: string }>('/sessions', activeToken.current || undefined, { email, consent });
      setEntryOpening(true);
      focusAfterEntry.current = true;
      activeToken.current = data.token; saveToken(data.token); setToken(data.token); applySession(data);
    } catch (err) { setError(err instanceof Error ? err.message : 'Please try again.'); }
    finally { busyRef.current = false; setBusy(false); }
  }

  async function refreshSession() {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true); setError('');
    try { applySession(await conferenceRequest<ConferenceSession>('/session', token)); }
    catch (err) {
      if (err instanceof ConferenceError && err.code === 'SESSION_EXPIRED') setStage('expired');
      else setError(err instanceof Error ? err.message : 'Please try again.');
    } finally { busyRef.current = false; setBusy(false); }
  }

  async function startCall() {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true); setError(''); setStage('connecting');
    endedByUser.current = false;
    const run = ++generation.current;
    setCaption('');
    let registered = false;
    try {
      const data = await ava.start(async () => {
        const result = await conferenceRequest<ConferenceSession & { accessToken: string; callId: string }>('/call', token, {});
        registered = true;
        return { ...result, access_token: result.accessToken, call_id: result.callId };
      });
      if (generation.current !== run) { endConferenceOnLeave(token); return; }
      if (data) {
        const updated = await conferenceRequest<ConferenceSession>('/session', token);
        if (generation.current === run) { setSession(updated); setClockOffset(new Date(updated.serverNow).getTime() - Date.now()); }
      }
    } catch (err) {
      if (generation.current !== run) return;
      if (err instanceof ConferenceError && err.code === 'SESSION_EXPIRED') setStage('expired');
      else {
        setStage(registered || err instanceof ConferenceError ? 'interrupted' : 'ready');
        setError(err instanceof DOMException && ['NotAllowedError', 'PermissionDeniedError'].includes(err.name)
          ? 'Allow microphone access in your browser, then try again.' : err instanceof Error ? err.message : 'Ava could not connect. Please try again.');
      }
    } finally { if (generation.current === run) { setBusy(false); busyRef.current = false; } }
  }

  const done = stage === 'complete' || stage === 'expired';
  const inCall = stage === 'live' || stage === 'connecting';
  const showEntry = stage === 'email' && view === 'experience';
  return <div className="conf-page conf-experience" data-entry-opening={entryOpening}>
    <ConferenceIntro />
    <AnimatePresence onExitComplete={() => { if (entryOpening) { setEntryOpening(false); if (!reducedMotion) setCelebrating(true); } }}>
      {showEntry && <ConferenceEntry key="email-entry" email={email} consent={consent} busy={busy} error={error}
        onEmailChange={value => { setEmail(value); setError(''); }} onConsentChange={setConsent} onSubmit={enter} />}
    </AnimatePresence>
    {celebrating && <div className="conf-celebration" aria-hidden="true">
      {Array.from({ length: 32 }, (_, i) => <i key={i} style={{
        '--paper-x': `${8 + (i * 47 % 85)}%`,
        '--paper-drift': `${(i * 29 % 101) - 50}px`,
        '--paper-fall': `${190 + (i * 41 % 170)}px`,
        '--paper-turn': `${(i % 2 ? 1 : -1) * (135 + i * 11)}deg`,
        '--paper-delay': `${(i * 7 % 17) * 0.045}s`,
        '--paper-duration': `${1.45 + (i * 13 % 11) * 0.075}s`,
      } as CSSProperties} />)}
    </div>}
    <motion.div ref={experienceRef} className="conf-session-screen" data-entry-visible={showEntry} inert={showEntry || entryOpening} aria-hidden={showEntry || entryOpening}
      initial={false} animate={{ opacity: showEntry ? 0.2 : 1, filter: showEntry && !reducedMotion ? 'blur(14px)' : 'blur(0px)', scale: showEntry && !reducedMotion ? 0.98 : 1 }}
      transition={{ duration: reducedMotion ? 0.18 : 1.35, delay: showEntry || reducedMotion ? 0 : 0.35, ease: [0.22, 1, 0.36, 1] }}>
    <header className="conf-header">
      <div className="conf-brand" aria-label="Peoplix"><img src={logo} width="36" height="36" alt="" /><span>Peoplix</span></div>
    </header>
    <main className="conf-main" id="conference-main">
      <div className="conf-eyebrow"><span />THE CONFERENCE EXPERIENCE</div>
      {view === 'demo' ? <ConferenceDemoRequest initialEmail={email} conferenceSessionId={session?.sessionId} onSubmitted={() => setView('demo-success')} />
      : view === 'demo-success' ? <>
        <div className="conf-complete-mark"><Check size={30} strokeWidth={1.3} aria-hidden="true" /></div>
        <h1>Request <em>received.</em></h1>
        <p className="conf-description">Thank you. Our team will be in touch soon.</p>
        <button className="conf-primary conf-book" type="button" onClick={() => setView('experience')}>Done</button>
      </> : done ? <>
        <div className="conf-complete-mark"><Check size={30} strokeWidth={1.3} aria-hidden="true" /></div>
        <h1>{stage === 'expired' ? <>A moment with Ava.<br /><em>A new possibility.</em></> : <>Thanks for experiencing<br /><em>Peoplix.</em></>}</h1>
        <p className="conf-description">{stage === 'expired' ? 'Your five-minute conference session has ended.' : 'Meet Ava today. Reimagine how your HR team supports employees.'}</p>
        <button className="conf-primary conf-book" type="button" onClick={() => setView('demo')}>Book a Demo <ArrowUpRight size={18} aria-hidden="true" /></button>
      </> : <>
        <h1>Meet <em>Ava.</em></h1>
        <p className="conf-description">{stage === 'email' ? 'Experience the Peoplix AI HR assistant.' : 'Your AI-powered HR voice assistant.'}<br /><span>Good conversations. Better workplaces.</span></p>
        <VoiceSculpture active={stage === 'live'} talking={talking} />
        {stage === 'restoring' ? <p className="conf-status" role="status">Restoring your conference session…</p> : <div className="conf-conversation">
          <div className="conf-timers"><span>Session <strong>{time(sessionRemaining)}</strong></span><span>Conversation <strong>{time(callRemaining)}</strong></span></div>
          <div className="conf-live-status" role="status">{stage === 'connecting' ? 'Connecting to Ava…' : stage === 'live' ? talking ? 'Ava is speaking' : ava.isMuted ? 'Microphone muted' : 'Ava is listening' : stage === 'interrupted' ? 'Your session is saved' : 'Ava is ready when you are'}</div>
          {inCall ? <div className="conf-controls">
            <button className="conf-icon-button" onClick={() => ava.toggleMute()} disabled={stage !== 'live'} aria-label={ava.isMuted ? 'Unmute microphone' : 'Mute microphone'} aria-pressed={ava.isMuted}>{ava.isMuted ? <MicOff size={20} /> : <Mic size={20} />}</button>
            <button className="conf-end" onClick={() => finish()}><PhoneOff size={17} aria-hidden="true" />End conversation</button>
            <button className="conf-icon-button" onClick={() => { void ava.enableAudioPlayback().catch(() => setError('Tap again to enable audio in your browser.')); }} disabled={stage !== 'live'} aria-label="Enable audio playback"><Volume2 size={20} /></button>
          </div> : stage === 'interrupted' ? <div className="conf-recovery"><button className="conf-primary" onClick={() => void refreshSession()} disabled={busy}>{busy ? 'Checking…' : 'Check session'}<ArrowUpRight size={18} /></button><button className="conf-text-link" onClick={() => finish()}>Finish experience</button></div>
            : <button className="conf-primary" onClick={() => void startCall()} disabled={busy}><Mic size={17} aria-hidden="true" />Start Conversation<ArrowUpRight size={18} aria-hidden="true" /></button>}
          {inCall && callRemaining <= 30000 && callRemaining > 0 && <p className="conf-warning" role="status">About 30 seconds left. One last question for Ava?</p>}
          {sessionRemaining <= 30000 && sessionRemaining > 0 && !inCall && <p className="conf-warning" role="status">Your conference session ends in less than 30 seconds.</p>}
          {caption && stage === 'live' && <p className="conf-caption" aria-live="polite" aria-atomic="true">{caption}</p>}
          <p className="conf-form-note">{session?.companyDomain} · This demo is recorded and transcribed.</p>
        </div>}
        {error && !showEntry && <p className="conf-error" id="conf-error" role="alert">{error}</p>}
        <div className="conf-bottom-notes"><span><Headphones size={14} aria-hidden="true" />Best with headphones</span><span>Designed for a real conversation</span></div>
      </>}
    </main>
    <footer className="conf-footer"><span>PEOPLE FIRST. POWERED BY AI.</span><span>Peoplix <span aria-hidden="true">©</span> {new Date().getFullYear()}</span></footer>
    </motion.div>
  </div>;
}
