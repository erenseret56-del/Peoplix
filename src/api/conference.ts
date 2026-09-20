export interface ConferenceSession {
  sessionId: string;
  companyDomain: string;
  status: 'created' | 'active' | 'completed' | 'expired' | 'failed';
  sessionStart: string;
  expiresAt: string;
  conversationEndsAt: string | null;
  callStatus: string | null;
  canRetry: boolean;
  serverNow: string;
}

export class ConferenceError extends Error {
  code: string;
  constructor(message: string, code: string) { super(message); this.code = code; }
}

const base = (import.meta.env.VITE_BASE_URL as string | undefined)?.replace(/\/$/, '') || window.location.origin;
export async function conferenceRequest<T>(path: string, token?: string, body?: unknown): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 30_000);
  try {
    const response = await fetch(`${base}/api/conference${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      cache: 'no-store', signal: controller.signal,
    });
    const json = await response.json();
    if (!response.ok || !json.success) throw new ConferenceError(json.error?.message || 'We could not connect. Please try again.', json.error?.code || 'UNAVAILABLE');
    return json.data as T;
  } catch (error) {
    if (error instanceof ConferenceError) throw error;
    throw new ConferenceError('We could not connect. Check your connection and try again.', 'NETWORK');
  } finally { window.clearTimeout(timeout); }
}

export function endConferenceOnLeave(token: string) {
  void fetch(`${base}/api/conference/end`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: '{}', keepalive: true,
  }).catch(() => undefined);
}

export interface ConferenceDemoRequestInput {
  source: 'conference';
  name: string;
  email: string;
  company: string;
  jobTitle: string;
  phone?: string;
  message?: string;
  conferenceSessionId?: string;
}

export async function submitConferenceDemoRequest(body: ConferenceDemoRequestInput) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 30_000);
  try {
    const response = await fetch(`${base}/api/demo-requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
      signal: controller.signal,
    });
    const json = await response.json();
    if (!response.ok || !json.success) throw new ConferenceError(json.error?.message || 'We could not submit your request. Please try again.', json.error?.code || 'UNAVAILABLE');
    return json.data as { id: string };
  } catch (error) {
    if (error instanceof ConferenceError) throw error;
    throw new ConferenceError('We could not submit your request. Check your connection and try again.', 'NETWORK');
  } finally { window.clearTimeout(timeout); }
}
