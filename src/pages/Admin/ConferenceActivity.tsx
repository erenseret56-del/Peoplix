import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowLeft, ArrowUpRight, ChevronLeft, ChevronRight, Headphones, RefreshCw, Search, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import axios from '../../api/axiosInterceptor';
import './ConferenceActivity.css';

interface ActivityCall {
  attemptId?: string; callId?: string; status: string; startTime?: string; endTime?: string;
  durationMs?: number; hasRecording: boolean; hasTranscript?: boolean; hasSummary?: boolean;
  transcript?: string; summary?: string; disconnectReason?: string;
}
interface Activity {
  sessionId: string; email: string; companyDomain: string; companyName?: string;
  sessionStart: string; sessionEnd?: string; sessionDuration?: number;
  status: string; callStatus?: string; callId?: string; calls: ActivityCall[];
}
const date = (value?: string) => value ? new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—';
const duration = (value?: number) => value === undefined ? '—' : `${Math.floor(value / 60000)}m ${Math.floor(value / 1000 % 60)}s`;

function ActivityDetail({ sessionId, close }: { sessionId: string; close: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [record, setRecord] = useState<Activity | null>(null);
  const [error, setError] = useState('');
  const [audio, setAudio] = useState<{ callId: string; url: string } | null>(null);
  const [loadingAudio, setLoadingAudio] = useState('');
  const audioUrl = useRef('');
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true; dialog.current?.showModal();
    void axios.get(`/api/conference/activity/${sessionId}`).then(response => {
      if (mounted.current) setRecord(response.data.data);
    }).catch(err => { if (mounted.current) setError(err.message); });
    return () => { mounted.current = false; if (audioUrl.current) URL.revokeObjectURL(audioUrl.current); };
  }, [sessionId]);
  async function play(callId: string) {
    if (loadingAudio) return;
    setLoadingAudio(callId); setError('');
    try {
      const response = await axios.get(`/api/conference/activity/${sessionId}/recording/${encodeURIComponent(callId)}`, { responseType: 'blob', timeout: 30000 });
      if (!mounted.current) return;
      if (audioUrl.current) URL.revokeObjectURL(audioUrl.current);
      audioUrl.current = URL.createObjectURL(response.data);
      setAudio({ callId, url: audioUrl.current });
    } catch { if (mounted.current) setError('The recording is not available yet. Please try again shortly.'); }
    finally { if (mounted.current) setLoadingAudio(''); }
  }
  return <dialog ref={dialog} className="conf-admin-dialog" onCancel={close} onClick={event => { if (event.target === event.currentTarget) close(); }} aria-labelledby="conference-detail-title">
    <div className="conf-admin-dialog-header"><div><p className="conf-admin-kicker">CONFERENCE VISITOR</p><h2 id="conference-detail-title">{record?.email || 'Loading visitor…'}</h2></div><button onClick={close} aria-label="Close visitor details"><X size={22} /></button></div>
    {error && <p className="conf-admin-error" role="alert">{error}</p>}
    {record && <>
      <dl className="conf-admin-details"><div><dt>Company / domain</dt><dd>{record.companyName || record.companyDomain}</dd></div><div><dt>Session status</dt><dd>{record.status}</dd></div><div><dt>Session started</dt><dd>{date(record.sessionStart)}</dd></div><div><dt>Session duration</dt><dd>{duration(record.sessionDuration)}</dd></div></dl>
      {!record.calls.length && <p className="conf-admin-empty">This visitor has not started a conversation.</p>}
      {record.calls.map((call, index) => <section className="conf-admin-call" key={call.attemptId || index} aria-label={`Conversation attempt ${index + 1}`}>
        <div className="conf-admin-call-heading"><h3>Conversation {index + 1}</h3><span className="conf-admin-status">{call.status}</span></div>
        <p className="conf-admin-call-id">{call.callId || 'Call was not connected'}</p>
        <dl className="conf-admin-details"><div><dt>Started</dt><dd>{date(call.startTime)}</dd></div><div><dt>Ended</dt><dd>{date(call.endTime)}</dd></div><div><dt>Duration</dt><dd>{duration(call.durationMs)}</dd></div><div><dt>End reason</dt><dd>{call.disconnectReason?.replaceAll('_', ' ') || '—'}</dd></div></dl>
        <h4>Recording</h4>
        {audio && audio.callId === call.callId ? <audio controls autoPlay src={audio.url} aria-label={`Recording of conversation ${index + 1}`} />
          : call.hasRecording && call.callId ? <button className="conf-admin-button" onClick={() => void play(call.callId!)} disabled={Boolean(loadingAudio)}><Headphones size={16} />{loadingAudio === call.callId ? 'Loading recording…' : 'Play recording'}</button>
            : <p className="conf-admin-muted">Not available yet.</p>}
        <h4>Summary</h4><p className="conf-admin-text">{call.summary || 'The call summary is not available yet.'}</p>
        <h4>Transcript</h4><div className="conf-admin-transcript" tabIndex={0}>{call.transcript || 'The transcript is not available yet.'}</div>
      </section>)}
    </>}
  </dialog>;
}

export default function ConferenceActivity() {
  const [items, setItems] = useState<Activity[]>([]);
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [status, setStatus] = useState('');
  const [query, setQuery] = useState({ search: '', from: '', to: '', status: '', page: 1, revision: 0 });
  const [pagination, setPagination] = useState({ total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState('');
  useEffect(() => {
    let cancelled = false;
    const params = Object.fromEntries(Object.entries({ ...query, limit: 20 }).filter(([key, value]) => key !== 'revision' && value !== ''));
    void axios.get('/api/conference/activity', { params }).then(response => {
      if (!cancelled) { setItems(response.data.data); setPagination(response.data.pagination); }
    }).catch(err => { if (!cancelled) setError(err.message); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [query]);
  const load = (page = 1) => { setError(''); setLoading(true); setQuery(previous => ({ search, from, to, status, page, revision: previous.revision + 1 })); };
  const filter = (event: FormEvent) => { event.preventDefault(); load(); };
  return <div className="conf-admin">
    <header className="conf-admin-header"><Link to="/admin/portal"><ArrowLeft size={16} />Back to Portal</Link><span>SUPER ADMIN</span></header>
    <main className="conf-admin-main">
      <div className="conf-admin-heading"><div><p className="conf-admin-kicker">PEOPLIX LIVE</p><h1>Conference Activity</h1><p>Every visitor. Every conversation. One clear view.</p></div><button className="conf-admin-button" onClick={() => load(query.page)} disabled={loading}><RefreshCw size={15} />Refresh</button></div>
      <form className="conf-admin-filters" onSubmit={filter}>
        <label className="conf-admin-search">Search visitors<div><Search size={16} aria-hidden="true" /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Email, domain or exact call ID" maxLength={120} /></div></label>
        <label>From (UTC)<input type="date" value={from} onChange={event => setFrom(event.target.value)} /></label>
        <label>To (UTC)<input type="date" value={to} min={from} onChange={event => setTo(event.target.value)} /></label>
        <label>Session status<select value={status} onChange={event => setStatus(event.target.value)}><option value="">All statuses</option>{['created', 'active', 'completed', 'expired', 'failed'].map(item => <option key={item} value={item}>{item[0].toUpperCase() + item.slice(1)}</option>)}</select></label>
        <button className="conf-admin-button conf-admin-apply" type="submit" disabled={loading}>Apply filters</button>
      </form>
      {error && <p className="conf-admin-error" role="alert">{error}</p>}
      <div className="conf-admin-table-wrap" role="region" aria-label="Conference visitors" tabIndex={0} aria-busy={loading}>
        <table><caption className="sr-only">Conference visitors, sessions and voice call artifacts</caption><thead><tr>{['Visitor Email', 'Company', 'Domain', 'Session Start', 'Duration', 'Call Status', 'Call ID', 'Recording', 'Transcript', 'Summary'].map(column => <th key={column} scope="col">{column}</th>)}</tr></thead>
          <tbody>{loading ? <tr><td colSpan={10} className="conf-admin-empty">Loading conference activity…</td></tr> : !items.length ? <tr><td colSpan={10} className="conf-admin-empty">{error ? 'Conference activity could not be loaded.' : 'No conference visitors match these filters.'}</td></tr> : items.map(item => <tr key={item.sessionId}>
            <td><button className="conf-admin-visitor" onClick={() => setSelected(item.sessionId)}>{item.email}<ArrowUpRight size={13} /></button><span className="conf-admin-row-note">{item.status}</span></td>
            <td>{item.companyName || item.companyDomain}</td><td>{item.companyDomain}</td><td>{date(item.sessionStart)}</td><td>{duration(item.sessionDuration)}</td>
            <td><span className="conf-admin-status">{item.callStatus || 'Not started'}</span></td><td className="conf-admin-call-id">{item.callId || '—'}</td>
            {(['hasRecording', 'hasTranscript', 'hasSummary'] as const).map((key, index) => <td key={key}>{item.calls.some(call => call[key]) ? <button className="conf-admin-artifact" onClick={() => setSelected(item.sessionId)} aria-label={`${['Play recording', 'View transcript', 'View summary'][index]} for ${item.email}`}>{index === 0 ? 'Play' : 'View'}</button> : <span className="conf-admin-muted">—</span>}</td>)}
          </tr>)}</tbody>
        </table>
      </div>
      <div className="conf-admin-pagination"><p>{pagination.total} visitor{pagination.total === 1 ? '' : 's'} · Page {query.page} of {Math.max(1, pagination.totalPages)}</p><div><button className="conf-admin-button" disabled={loading || query.page <= 1} onClick={() => load(query.page - 1)} aria-label="Previous page"><ChevronLeft size={16} /></button><button className="conf-admin-button" disabled={loading || query.page >= pagination.totalPages} onClick={() => load(query.page + 1)} aria-label="Next page"><ChevronRight size={16} /></button></div></div>
      <p className="conf-admin-muted conf-admin-footnote">Recordings, transcripts and summaries may appear shortly after a conversation ends. Refresh to see updates.</p>
    </main>
    {selected && <ActivityDetail key={selected} sessionId={selected} close={() => setSelected('')} />}
  </div>;
}
