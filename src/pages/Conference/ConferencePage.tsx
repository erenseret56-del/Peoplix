import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import { ArrowLeft, ArrowUpRight, Check, Headphones, Mic, MicOff, PhoneOff, Volume2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { RetellWebClient } from 'retell-client-js-sdk';
import { ConferenceError, conferenceRequest, endConferenceOnLeave } from '../../api/conference';
import type { ConferenceSession } from '../../api/conference';
import logo from '../../assets/images/peoplix-logo.png';
import ConferenceIntro from './ConferenceIntro';
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
  const [muted, setMuted] = useState(false);
  const [talking, setTalking] = useState(false);
  const [caption, setCaption] = useState('');
  const [now, setNow] = useState(Date.now);
  const [clockOffset, setClockOffset] = useState(0);
  const sdk = useRef<RetellWebClient | null>(null);
  const busyRef = useRef(false);
  const generation = useRef(0);
  const endedByUser = useRef(false);
  const activeToken = useRef(token);
  const restoreToken = useRef(token);

  const applySession = useCallback((data: ConferenceSession) => {
    setSession(data); setClockOffset(new Date(data.serverNow).getTime() - Date.now());
    setStage(data.status === 'expired' ? 'expired' : data.status === 'completed' ? 'complete'
      : data.status === 'active' ? 'interrupted' : data.status === 'failed' && !data.canRetry ? 'complete' : 'ready');
  }, []);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'Meet Ava · PEOPLIX Conference'; window.scrollTo(0, 0);
    return () => { document.title = previousTitle; };
  }, []);

  useEffect(() => {
    if (!restoreToken.current) return;
    let cancelled = false;
    void conferenceRequest<ConferenceSession>('/session', restoreToken.current).then(data => { if (!cancelled) applySession(data); }).catch(err => {
      if (cancelled) return;
      if (err instanceof ConferenceError && ['SESSION_EXPIRED', 'INVALID_SESSION'].includes(err.code)) {
        setStage(err.code === 'SESSION_EXPIRED' ? 'expired' : 'email'); saveToken('');
      } else { setError(err.message); setStage('interrupted'); }
    });
    return () => { cancelled = true; };
  }, [applySession]);

  useEffect(() => {
    const tick = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(tick);
  }, []);

  useEffect(() => {
    const leave = () => {
      generation.current += 1;
      if (sdk.current) {
        sdk.current.removeAllListeners(); sdk.current.stopCall(); sdk.current = null;
        if (activeToken.current) endConferenceOnLeave(activeToken.current);
      }
    };
    window.addEventListener('pagehide', leave);
    return () => { window.removeEventListener('pagehide', leave); leave(); };
  }, []);

  const finish = useCallback((expired = false) => {
    generation.current += 1; endedByUser.current = true;
    sdk.current?.stopCall(); sdk.current?.removeAllListeners(); sdk.current = null;
    setMuted(false); setTalking(false); setStage(expired ? 'expired' : 'complete');
    setError(''); setBusy(false); busyRef.current = false;
    if (activeToken.current) void conferenceRequest('/end', activeToken.current, {}).catch(() => undefined);
  }, []);

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
      const data = await conferenceRequest<ConferenceSession & { token: string }>('/sessions', undefined, { email, consent });
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
    sdk.current?.removeAllListeners(); sdk.current?.stopCall(); sdk.current = null;
    setCaption(''); setMuted(false);
    let registered = false;
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Please use a browser with microphone access over a secure connection.');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      if (generation.current !== run) return;
      const { RetellWebClient: Client } = await import('retell-client-js-sdk');
      if (generation.current !== run) return;
      const data = await conferenceRequest<ConferenceSession & { accessToken: string; callId: string }>('/call', token, {});
      registered = true;
      if (generation.current !== run) { endConferenceOnLeave(token); return; }
      setSession(data); setClockOffset(new Date(data.serverNow).getTime() - Date.now());
      const client = new Client(); sdk.current = client;
      let connectionFailed = false;
      const failed = () => {
        if (generation.current !== run || endedByUser.current) return;
        connectionFailed = true;
        setStage('interrupted'); setError('The conversation was interrupted. Check your connection, then check your session to continue.');
        setBusy(false); busyRef.current = false; setTalking(false);
      };
      client.on('call_started', () => {
        if (generation.current !== run) { client.stopCall(); return; }
        setStage('live'); setBusy(false); busyRef.current = false;
      });
      client.on('call_ended', () => {
        if (generation.current !== run || endedByUser.current) return;
        setStage(connectionFailed ? 'interrupted' : 'complete'); setTalking(false); setMuted(false); setBusy(false); busyRef.current = false;
        void conferenceRequest<ConferenceSession>('/session', token).then(data => {
          if (generation.current !== run || endedByUser.current) return;
          if (data.status !== 'active' || connectionFailed) applySession(data);
        }).catch(() => { if (connectionFailed) failed(); });
      });
      client.on('error', failed);
      client.on('agent_start_talking', () => setTalking(true));
      client.on('agent_stop_talking', () => setTalking(false));
      client.on('update', (data: { transcript?: { role: string; content: string }[] }) => {
        const last = data.transcript?.at(-1);
        if (last) setCaption(`${last.role === 'agent' ? 'Ava' : 'You'}: ${last.content}`);
      });
      await client.startCall({ accessToken: data.accessToken });
      if (generation.current !== run) { client.stopCall(); return; }
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
  return <div className="conf-page">
    <ConferenceIntro />
    <header className="conf-header">
      <Link to="/" className="conf-brand" aria-label="PEOPLIX home"><img src={logo} width="36" height="36" alt="" /><span>PEOPLIX</span></Link>
      <Link to="/" className="conf-home"><ArrowLeft size={14} aria-hidden="true" /><span>Back to home</span></Link>
    </header>
    <main className="conf-main" id="conference-main">
      <div className="conf-eyebrow"><span />THE CONFERENCE EXPERIENCE</div>
      {done ? <>
        <div className="conf-complete-mark"><Check size={30} strokeWidth={1.3} aria-hidden="true" /></div>
        <h1>{stage === 'expired' ? <>A moment with Ava.<br /><em>A new possibility.</em></> : <>Thanks for experiencing<br /><em>PEOPLIX.</em></>}</h1>
        <p className="conf-description">{stage === 'expired' ? 'Your five-minute conference session has ended.' : 'Meet Ava today. Reimagine how your HR team supports employees.'}</p>
        <a className="conf-primary conf-book" href="/#contact">Book a Demo <ArrowUpRight size={18} aria-hidden="true" /></a>
        <Link className="conf-text-link" to="/">Return to PEOPLIX</Link>
      </> : <>
        <h1>Meet <em>Ava.</em></h1>
        <p className="conf-description">{stage === 'email' ? 'Experience the PEOPLIX AI HR assistant.' : 'Your AI-powered HR voice assistant.'}<br /><span>Good conversations. Better workplaces.</span></p>
        <VoiceSculpture active={stage === 'live'} talking={talking} />
        {stage === 'email' ? <form className="conf-form" onSubmit={enter}>
          <label htmlFor="conference-email">Enter your work email</label>
          <div className="conf-input-wrap"><input id="conference-email" name="email" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false}
            placeholder="name@company.com" required maxLength={254} value={email} onChange={event => { setEmail(event.target.value); setError(''); }}
            aria-invalid={Boolean(error)} aria-describedby={error ? 'conf-error' : 'conf-email-note'} /></div>
          <label className="conf-consent"><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} required />
            <span>I agree to this demo being recorded and transcribed, with my work email, for PEOPLIX conference follow-up. <Link to="/privacy" target="_blank" rel="noreferrer">Privacy policy</Link></span></label>
          <button className="conf-primary" type="submit" disabled={busy}>{busy ? 'Preparing your experience…' : 'Meet Ava'}<ArrowUpRight size={18} aria-hidden="true" /></button>
          <p id="conf-email-note" className="conf-form-note">Work email only · No account needed · Up to 3 minutes with Ava</p>
        </form> : stage === 'restoring' ? <p className="conf-status" role="status">Restoring your conference session…</p> : <div className="conf-conversation">
          <div className="conf-timers"><span>Session <strong>{time(sessionRemaining)}</strong></span><span>Conversation <strong>{time(callRemaining)}</strong></span></div>
          <div className="conf-live-status" role="status">{stage === 'connecting' ? 'Connecting to Ava…' : stage === 'live' ? talking ? 'Ava is speaking' : muted ? 'Microphone muted' : 'Ava is listening' : stage === 'interrupted' ? 'Your session is saved' : 'Ava is ready when you are'}</div>
          {inCall ? <div className="conf-controls">
            <button className="conf-icon-button" onClick={() => { if (muted) sdk.current?.unmute(); else sdk.current?.mute(); setMuted(!muted); }} disabled={stage !== 'live'} aria-label={muted ? 'Unmute microphone' : 'Mute microphone'} aria-pressed={muted}>{muted ? <MicOff size={20} /> : <Mic size={20} />}</button>
            <button className="conf-end" onClick={() => finish()}><PhoneOff size={17} aria-hidden="true" />End conversation</button>
            <button className="conf-icon-button" onClick={() => { void sdk.current?.startAudioPlayback().catch(() => setError('Tap again to enable audio in your browser.')); }} disabled={stage !== 'live'} aria-label="Enable audio playback"><Volume2 size={20} /></button>
          </div> : stage === 'interrupted' ? <div className="conf-recovery"><button className="conf-primary" onClick={() => void refreshSession()} disabled={busy}>{busy ? 'Checking…' : 'Check session'}<ArrowUpRight size={18} /></button><button className="conf-text-link" onClick={() => finish()}>Finish experience</button></div>
            : <button className="conf-primary" onClick={() => void startCall()} disabled={busy}><Mic size={17} aria-hidden="true" />Start Conversation<ArrowUpRight size={18} aria-hidden="true" /></button>}
          {inCall && callRemaining <= 30000 && callRemaining > 0 && <p className="conf-warning" role="status">About 30 seconds left. One last question for Ava?</p>}
          {sessionRemaining <= 30000 && sessionRemaining > 0 && !inCall && <p className="conf-warning" role="status">Your conference session ends in less than 30 seconds.</p>}
          {caption && stage === 'live' && <p className="conf-caption" aria-live="polite" aria-atomic="true">{caption}</p>}
          <p className="conf-form-note">{session?.companyDomain} · This demo is recorded and transcribed.</p>
        </div>}
        {error && <p className="conf-error" id="conf-error" role="alert">{error}</p>}
        <div className="conf-bottom-notes"><span><Headphones size={14} aria-hidden="true" />Best with headphones</span><span>Designed for a real conversation</span></div>
      </>}
    </main>
    <footer className="conf-footer"><span>PEOPLE FIRST. POWERED BY AI.</span><span>PEOPLIX <span aria-hidden="true">©</span> {new Date().getFullYear()}</span></footer>
  </div>;
}
