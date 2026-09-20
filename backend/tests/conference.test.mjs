import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createHmac, randomUUID } from 'node:crypto';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Fastify from 'fastify';
import jwt from 'jsonwebtoken';

// Every persistence test uses a disposable local MongoDB, never backend/.env.
let mongo, app, db, service, policy, retell, verifySignature, safeRecordingUrl;
const providerCalls = new Map();
const providerRequests = [];
let createFailure = false;
let stopFailure = false;
let unsafeAgent = false;
const testKey = 'test-retell-key-never-a-production-secret';
const originalFetch = globalThis.fetch;
const importedIntervals = [];

before(async () => {
  mongo = await MongoMemoryServer.create({ instance: { dbName: 'conference_isolated_test' } });
  Object.assign(process.env, {
    NODE_ENV: 'test', DATABASE_URL: mongo.getUri(), MONGODB_URI: mongo.getUri(), DB_NAME: 'conference_isolated_test',
    JWT_SECRET: 'test-only-secret-with-at-least-thirty-two-characters', RETELL_API_KEY: testKey,
    RETELL_AGENT_ID: 'existing-public-agent', CACHE_PROVIDER: 'memory', LOG_LEVEL: 'fatal',
    ADMIN_EMAIL: 'admin@example.test', ADMIN_PASSWORD: 'not-used-in-tests',
  });
  globalThis.fetch = async (url, init = {}) => {
    assert.equal(new URL(url).origin, 'https://api.retellai.com', 'No unexpected external network calls');
    const path = new URL(url).pathname;
    const body = init.body ? JSON.parse(init.body) : undefined;
    providerRequests.push({ path, body, method: init.method });
    if (path.startsWith('/get-agent/')) return Response.json({ agent_id: 'existing-public-agent', agent_name: 'Ava', response_engine: { type: 'retell-llm', llm_id: 'conference-llm' } });
    if (path.startsWith('/get-retell-llm/')) return Response.json({ general_prompt: '{{conference_instructions}}', general_tools: unsafeAgent ? [{ type: 'custom' }] : [], knowledge_base_ids: [], states: [] });
    if (path === '/v2/create-web-call') {
      if (createFailure) return Response.json({ message: 'Secret provider diagnostic' }, { status: 503 });
      const id = `call_${randomUUID()}`;
      providerCalls.set(id, { call_id: id, agent_id: body.agent_id, metadata: body.metadata, call_status: 'registered' });
      return Response.json({ call_id: id, access_token: 'provider-ephemeral-token', agent_id: body.agent_id, call_status: 'registered' });
    }
    if (path.startsWith('/v2/get-call/')) return Response.json(providerCalls.get(path.split('/').at(-1)));
    if (path.startsWith('/v2/stop-call/')) {
      if (stopFailure) return Response.json({ message: 'Transient provider outage' }, { status: 503 });
      const call = providerCalls.get(path.split('/').at(-1));
      call.call_status = 'ended'; call.end_timestamp = Date.now(); call.duration_ms = 180000;
      return new Response(null, { status: 204 });
    }
    throw new Error(`Unmocked provider request: ${path}`);
  };
  db = await import('../src/infrastructure/database/index.ts');
  service = await import('../src/modules/conference/conference.service.ts');
  policy = await import('../src/modules/conference/conference.policy.ts');
  retell = await import('../src/modules/retell/retell.client.ts');
  ({ verifyRetellSignature: verifySignature } = await import('../src/modules/retell/retell.webhook.ts'));
  const routes = await import('../src/modules/conference/conference.routes.ts');
  safeRecordingUrl = routes.safeRecordingUrl;
  await db.connectDatabase(); await db.createIndexes();
  app = Fastify({ logger: false });
  app.removeContentTypeParser('application/json');
  app.addContentTypeParser('application/json', { parseAs: 'string' }, (request, body, done) => {
    request.rawBody = body; try { done(null, JSON.parse(body)); } catch (error) { done(error); }
  });
  await app.register(routes.conferenceRoutes, { prefix: '/api/conference' });
  // The legacy shared memory cache owns a housekeeping interval without a
  // shutdown hook. Track only intervals created during this module import.
  const originalSetInterval = globalThis.setInterval;
  globalThis.setInterval = (...args) => { const timer = originalSetInterval(...args); importedIntervals.push(timer); return timer; };
  let retellRoutes;
  try { ({ retellRoutes } = await import('../src/modules/retell/retell.routes.ts')); }
  finally { globalThis.setInterval = originalSetInterval; }
  await app.register(retellRoutes, { prefix: '/api/retell' });
  await app.ready();
});

after(async () => { await app?.close(); await db?.closeDatabaseConnection(); await mongo?.stop(); importedIntervals.forEach(clearInterval); globalThis.fetch = originalFetch; });
const auth = token => ({ authorization: `Bearer ${token}` });
const adminToken = role => jwt.sign({ userId: 'test-user', role, email: 'admin@example.test' }, process.env.JWT_SECRET, { expiresIn: '1h' });
async function create(email = `visitor-${randomUUID()}@example-corp.test`) {
  const response = await app.inject({ method: 'POST', url: '/api/conference/sessions', payload: { email, consent: true } });
  assert.equal(response.statusCode, 201, response.body);
  return response.json().data;
}
async function start(session) {
  const response = await app.inject({ method: 'POST', url: '/api/conference/call', headers: auth(session.token), payload: {} });
  assert.equal(response.statusCode, 200, response.body);
  return response.json().data;
}
async function webhook(event, call) {
  const payload = JSON.stringify({ event, call });
  const timestamp = String(Date.now());
  const signature = `v=${timestamp},d=${createHmac('sha256', testKey).update(payload + timestamp).digest('hex')}`;
  return app.inject({ method: 'POST', url: '/api/retell/webhook', headers: { 'content-type': 'application/json', 'x-retell-signature': signature }, payload });
}

test('work email normalization rejects personal domains, subdomains, malformed and configured providers', () => {
  assert.deepEqual(policy.normalizeWorkEmail('  Jane.Doe@ACME.TEST  '), { email: 'jane.doe@acme.test', companyDomain: 'acme.test' });
  for (const email of ['a@gmail.com', 'a@icloud.com', 'a@proton.me', 'a@x.gmail.com', 'a@outlook.com', 'a@hotmail.com', 'a@yahoo.co.in']) {
    assert.throws(() => policy.normalizeWorkEmail(email), { code: 'WORK_EMAIL_REQUIRED' });
  }
  for (const email of ['bad', 'a@company', 'a@@company.test', 'a@-company.test', 'a@company.test\r\nBcc: x@y.com']) assert.throws(() => policy.normalizeWorkEmail(email));
  assert.throws(() => policy.normalizeWorkEmail('a@custom.test', 'custom.test'), { code: 'WORK_EMAIL_REQUIRED' });
  assert.equal(policy.normalizeWorkEmail('a@gmail.com.evil.test').companyDomain, 'gmail.com.evil.test');
});

test('server validates email and consent and rejects frontend tenant injection', async () => {
  for (const payload of [{ email: 'a@gmail.com', consent: true }, { email: 'valid@company.test', consent: false }, { email: 'valid@company.test', consent: true, companyId: 'customer-id' }]) {
    const response = await app.inject({ method: 'POST', url: '/api/conference/sessions', payload });
    assert.equal(response.statusCode, 400); assert.equal(response.body.includes('stack'), false);
  }
});

test('sessions have opaque secrets, fixed server expiry and no customer records', async () => {
  const session = await create();
  assert.match(session.token, /^[A-Za-z0-9_-]{43}$/);
  const record = await service.conferences().findOne({ sessionId: session.sessionId });
  assert.equal(record.tokenHash, policy.hashToken(session.token));
  assert.equal(record.expiresAt - record.sessionStart, 300000);
  assert.equal(record.companyId, undefined);
  assert.equal(await db.getCollection(db.Collections.COMPANIES).countDocuments(), 0);
  assert.equal(await db.getCollection(db.Collections.USERS).countDocuments(), 0);
  const publicView = await app.inject({ url: '/api/conference/session', headers: auth(session.token) });
  assert.equal(publicView.statusCode, 200);
  for (const secret of ['tokenHash', 'recordingUrl', 'calls', 'email']) assert.equal(secret in publicView.json().data, false);
  assert.match(publicView.headers['cache-control'], /no-store/);
});

test('normalized email is the usage identity while different emails remain independent', async () => {
  const email = `One.Use-${randomUUID()}@Example-Corp.Test`;
  const first = await create(email);

  const otherTab = await app.inject({ method: 'POST', url: '/api/conference/sessions', payload: { email: email.toLowerCase(), consent: true } });
  assert.equal(otherTab.statusCode, 409);
  assert.equal(otherTab.json().error.code, 'CONFERENCE_IN_PROGRESS');

  const resumed = await app.inject({ method: 'POST', url: '/api/conference/sessions', headers: auth(first.token), payload: { email: `  ${email.toUpperCase()}  `, consent: true } });
  assert.equal(resumed.statusCode, 201, resumed.body);
  assert.equal(resumed.json().data.sessionId, first.sessionId);
  assert.equal(resumed.json().data.token, first.token);

  const differentEmail = await create();
  assert.notEqual(differentEmail.sessionId, first.sessionId);

  const started = await start(first);
  const provider = providerCalls.get(started.callId);
  await webhook('call_started', { ...provider, call_status: 'ongoing', start_timestamp: Date.now() - 1000 });
  await webhook('call_ended', { ...provider, call_status: 'ended', start_timestamp: Date.now() - 1000, end_timestamp: Date.now(), duration_ms: 1000 });

  for (const usedEmail of [email.toLowerCase(), `  ${email.toUpperCase()}  `]) {
    const used = await app.inject({ method: 'POST', url: '/api/conference/sessions', payload: { email: usedEmail, consent: true } });
    assert.equal(used.statusCode, 409, used.body);
    assert.equal(used.json().error.code, 'CONFERENCE_ALREADY_USED');
  }
});

test('email entry alone is not permanent usage and an expired untouched reservation can restart', async () => {
  const email = `not-started-${randomUUID()}@example-corp.test`;
  const first = await create(email);
  await service.conferences().updateOne({ sessionId: first.sessionId }, { $set: { status: 'expired', expiresAt: new Date(Date.now() - 1), updatedAt: new Date() } });
  const retry = await app.inject({ method: 'POST', url: '/api/conference/sessions', payload: { email, consent: true } });
  assert.equal(retry.statusCode, 201, retry.body);
  assert.notEqual(retry.json().data.sessionId, first.sessionId);
  assert.equal(await service.conferences().countDocuments({ email }), 1);
});

test('simultaneous first-use submissions reserve exactly one session per email', async () => {
  const email = `race-${randomUUID()}@example-corp.test`;
  const responses = await Promise.all(Array.from({ length: 20 }, () => app.inject({
    method: 'POST', url: '/api/conference/sessions', payload: { email, consent: true },
  })));
  assert.equal(responses.filter(response => response.statusCode === 201).length, 1);
  assert.equal(responses.filter(response => response.statusCode === 409).length, 19);
  assert.equal(await service.conferences().countDocuments({ email }), 1);
});

test('admin list, details and recordings reject missing, visitor and company credentials', async () => {
  const session = await create();
  for (const suffix of ['/activity', `/activity/${session.sessionId}`, `/activity/${session.sessionId}/recording/call_test`]) {
    for (const token of ['', session.token, adminToken('company_admin'), adminToken('company_user')]) {
      const response = await app.inject({ url: `/api/conference${suffix}`, headers: token ? auth(token) : {} });
      assert.ok([401, 403].includes(response.statusCode), `${suffix}: ${response.body}`);
    }
  }
  const response = await app.inject({ url: '/api/conference/activity', headers: auth(adminToken('super_admin')) });
  assert.equal(response.statusCode, 200); assert.ok(response.json().pagination.total >= 1);
  assert.equal(response.body.includes('tokenHash'), false);
});

test('atomic start permits only one provider call across 20 simultaneous requests', async () => {
  const session = await create();
  const countBefore = providerRequests.filter(item => item.path === '/v2/create-web-call').length;
  const responses = await Promise.all(Array.from({ length: 20 }, () => app.inject({ method: 'POST', url: '/api/conference/call', headers: auth(session.token), payload: {} })));
  assert.equal(responses.filter(response => response.statusCode === 200).length, 1);
  assert.equal(responses.filter(response => response.statusCode === 409).length, 19);
  assert.equal(providerRequests.filter(item => item.path === '/v2/create-web-call').length - countBefore, 1);
  const request = providerRequests.filter(item => item.path === '/v2/create-web-call').at(-1).body;
  assert.equal(request.agent_id, 'existing-public-agent');
  assert.equal(request.agent_override, undefined);
  assert.equal(request.metadata.company_id, 'public-demo');
  assert.equal(request.metadata.conferenceSessionId, session.sessionId);
  assert.equal(request.retell_llm_dynamic_variables.company_name, 'Peoplix');
  assert.match(request.retell_llm_dynamic_variables.company_knowledge, /Public demo knowledge base/);
});

test('shared Ava creator omits provider diagnostics on failures', async () => {
  const session = await create();
  createFailure = true;
  const failed = await app.inject({ method: 'POST', url: '/api/conference/call', headers: auth(session.token), payload: {} });
  createFailure = false;
  assert.equal(failed.statusCode, 503); assert.equal(failed.body.includes('Secret provider'), false);
});

test('signed webhook events bind artifacts idempotently and resist out-of-order regression', async () => {
  const session = await create(); const call = await start(session);
  const provider = providerCalls.get(call.callId);
  Object.assign(provider, { call_status: 'ended', start_timestamp: Date.now() - 10000, end_timestamp: Date.now(), duration_ms: 10000,
    transcript: 'Ava: Welcome to PEOPLIX.', recording_url: 'https://recording.retellai.com/signed.wav?signature=private', call_analysis: { call_summary: 'Discussed HR self-service.' } });
  for (const event of ['call_analyzed', 'call_analyzed', 'call_ended', 'call_started']) {
    const response = await webhook(event, provider); assert.equal(response.statusCode, 200, response.body);
  }
  const record = await service.conferences().findOne({ sessionId: session.sessionId });
  assert.equal(record.status, 'completed'); assert.equal(record.calls.length, 1);
  assert.equal(record.calls[0].transcript, provider.transcript); assert.equal(record.calls[0].summary, provider.call_analysis.call_summary);
  assert.equal(record.calls[0].status, 'ended'); assert.equal(record.calls[0].callId, call.callId);
  assert.equal(await db.getCollection(db.Collections.CALL_LOGS).countDocuments({ retell_call_id: call.callId }), 0);
  const detail = await app.inject({ url: `/api/conference/activity/${session.sessionId}`, headers: auth(adminToken('super_admin')) });
  assert.equal(detail.json().data.calls[0].hasRecording, true); assert.equal(detail.body.includes('signature=private'), false);
});

test('forged signatures and unreserved conference metadata cannot create call records', async () => {
  const call = { call_id: 'call_forged', agent_id: 'conference-agent', metadata: { source: 'conference', conferenceSessionId: randomUUID(), conferenceAttemptId: randomUUID() } };
  const unsigned = await app.inject({ method: 'POST', url: '/api/retell/webhook', payload: { event: 'call_started', call } });
  assert.equal(unsigned.statusCode, 401);
  const unreserved = await webhook('call_started', call); assert.equal(unreserved.statusCode, 500);
  assert.equal(await db.getCollection(db.Collections.CALL_LOGS).countDocuments({ retell_call_id: call.call_id }), 0);
  const stale = String(Date.now() - 600000);
  assert.equal(verifySignature('{}', `v=${stale},d=${createHmac('sha256', testKey).update('{}' + stale).digest('hex')}`), false);
});

test('late analysis keeps an on-time completion and stale started events do not stop ended calls', async () => {
  const session = await create(); const started = await start(session);
  const call = { ...providerCalls.get(started.callId), call_status: 'ended', end_timestamp: Date.now() - 20000, duration_ms: 10000 };
  await service.conferences().updateOne({ sessionId: session.sessionId }, { $set: { expiresAt: new Date(Date.now() - 10000) } });
  assert.equal((await webhook('call_ended', call)).statusCode, 200);
  assert.equal((await webhook('call_analyzed', { ...call, call_analysis: { call_summary: 'Late analysis' } })).statusCode, 200);
  const stops = providerRequests.filter(item => item.path.includes(`/stop-call/${started.callId}`)).length;
  assert.equal((await webhook('call_started', { ...call, call_status: 'ongoing' })).statusCode, 200);
  assert.equal(providerRequests.filter(item => item.path.includes(`/stop-call/${started.callId}`)).length, stops);
  assert.equal((await service.conferences().findOne({ sessionId: session.sessionId })).status, 'completed');
});

test('backend deadline worker stops calls without browser timers, survives failures and replicas', async () => {
  const session = await create(); const call = await start(session);
  await service.conferences().updateOne({ sessionId: session.sessionId }, { $set: { conversationEndsAt: new Date(Date.now() - 1000), nextActionAt: new Date(Date.now() - 1000) } });
  stopFailure = true; await service.processConferenceDeadlines(); stopFailure = false;
  let record = await service.conferences().findOne({ sessionId: session.sessionId });
  assert.ok(record.nextActionAt); assert.equal(providerCalls.get(call.callId).call_status, 'registered');
  await service.conferences().updateOne({ sessionId: session.sessionId }, { $set: { nextActionAt: new Date(Date.now() - 1000) } });
  const before = providerRequests.filter(item => item.path.includes(`/stop-call/${call.callId}`)).length;
  await Promise.all([service.processConferenceDeadlines(), service.processConferenceDeadlines()]);
  assert.equal(providerCalls.get(call.callId).call_status, 'ended');
  assert.equal(providerRequests.filter(item => item.path.includes(`/stop-call/${call.callId}`)).length - before, 1);
  record = await service.conferences().findOne({ sessionId: session.sessionId }); assert.equal(record.leaseOwner, undefined);
});

test('five-minute expiry rejects API access even before cleanup and is persisted without activity', async () => {
  const session = await create();
  await service.conferences().updateOne({ sessionId: session.sessionId }, { $set: { expiresAt: new Date(Date.now() - 1) } });
  for (const [method, path] of [['GET', '/session'], ['POST', '/call']]) {
    const response = await app.inject({ method, url: `/api/conference${path}`, headers: auth(session.token), ...(method === 'POST' ? { payload: {} } : {}) });
    assert.equal(response.statusCode, 410);
  }
  await service.processConferenceDeadlines();
  assert.equal((await service.conferences().findOne({ sessionId: session.sessionId })).status, 'expired');
});

test('provider failures can retry but never reset the original conversation budget', async () => {
  const session = await create(); const first = await start(session);
  const failed = { ...providerCalls.get(first.callId), call_status: 'error', end_timestamp: Date.now() };
  assert.equal((await webhook('call_ended', failed)).statusCode, 200);
  const second = await start(session);
  assert.equal(second.conversationEndsAt, first.conversationEndsAt);
  assert.notEqual(second.callId, first.callId);
  assert.equal((await service.conferences().findOne({ sessionId: session.sessionId })).calls.length, 2);
});

test('late call admission respects session deadline and does not stretch provider minimum duration', async () => {
  const session = await create();
  await service.conferences().updateOne({ sessionId: session.sessionId }, { $set: { expiresAt: new Date(Date.now() + 45000) } });
  const response = await app.inject({ method: 'POST', url: '/api/conference/call', headers: auth(session.token), payload: {} });
  assert.equal(response.statusCode, 409);
});

test('a stale session snapshot cannot reset the call budget after a failed attempt', async () => {
  const session = await create();
  const stale = await service.authenticateConference(`Bearer ${session.token}`);
  const call = await start(session);
  await webhook('call_ended', { ...providerCalls.get(call.callId), call_status: 'error', end_timestamp: Date.now() });
  await assert.rejects(service.startConferenceCall(stale), { code: 'CALL_IN_PROGRESS' });
  assert.equal((await service.conferences().findOne({ sessionId: session.sessionId })).conversationEndsAt.toISOString(), call.conversationEndsAt);
});

test('admin pagination, literal search, date filters and recording URL checks are bounded', async () => {
  const headers = auth(adminToken('super_admin'));
  assert.equal((await app.inject({ url: '/api/conference/activity?limit=-1', headers })).statusCode, 400);
  assert.equal((await app.inject({ url: '/api/conference/activity?from=2026-10-10&to=2026-01-01', headers })).statusCode, 400);
  const literal = await app.inject({ url: '/api/conference/activity?search=' + encodeURIComponent('.*'), headers });
  assert.equal(literal.json().pagination.total, 0);
  const page = await app.inject({ url: '/api/conference/activity?limit=2&page=2', headers });
  assert.equal(page.json().data.length, 2);
  for (const url of ['http://localhost/a', 'https://127.0.0.1/a', 'https://retellai.com.evil.test/a', 'https://name:secret@retellai.com/a']) assert.throws(() => safeRecordingUrl(url));
  assert.equal(safeRecordingUrl('https://recording.retellai.com/audio.wav').protocol, 'https:');
});

test('existing Retell web call payload remains unchanged for customer calls', async () => {
  await retell.retellClient.createWebCall('customer-agent', 'customer-id', { company_name: 'Customer' });
  const request = providerRequests.at(-1).body;
  assert.equal(request.metadata.company_id, 'customer-id'); assert.equal(request.agent_override, undefined);
});

test('300 simultaneous session admissions and mocked call allocations remain isolated', async () => {
  const sessions = await Promise.all(Array.from({ length: 300 }, () => create()));
  assert.equal(new Set(sessions.map(item => item.token)).size, 300);
  const calls = await Promise.all(sessions.map(start));
  assert.equal(new Set(calls.map(item => item.callId)).size, 300);
  const records = await service.conferences().find({ sessionId: { $in: sessions.map(item => item.sessionId) } }).toArray();
  assert.equal(records.length, 300);
  assert.ok(records.every(record => record.calls.length === 1 && record.status === 'active'));
  assert.equal(await db.getCollection(db.Collections.CALL_LOGS).countDocuments(), 0);
});
