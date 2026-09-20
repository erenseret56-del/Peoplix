import { randomUUID } from 'node:crypto';
import { config } from '../../config/env.js';
import { logger } from '../../config/logger.js';
import { Collections, getCollection } from '../../infrastructure/database/index.js';
import { AppError } from '../../middleware/errorHandler.js';
import { retellClient, type RetellCallInfo } from '../retell/retell.client.js';
import { createPublicDemoWebCall } from '../site-config/public-demo.service.js';
import { callDeadline, hashToken, MAX_ATTEMPTS, MIN_CALL_MS, newSessionToken, normalizeWorkEmail, SESSION_MS } from './conference.policy.js';
import type { Conference, ConferenceCall } from './conference.types.js';

export const conferences = () => getCollection<Conference>(Collections.CONFERENCE);
const terminalCall = (call?: ConferenceCall) => call?.status === 'ended' || call?.status === 'error';
const terminalSession = (record: Conference) => record.status === 'completed' || record.status === 'expired';
const participated = (record: Conference) => record.calls.some(call => Boolean(call.startTime) || (call.durationMs ?? 0) > 0);

function bearerToken(authorization?: string) {
  return authorization?.match(/^Bearer ([A-Za-z0-9_-]{43})$/)?.[1];
}

function alreadyUsed(record: Conference, now = Date.now()) {
  return participated(record) && (terminalSession(record) || record.expiresAt.getTime() <= now);
}

const alreadyUsedError = () => new AppError(
  'CONFERENCE_ALREADY_USED',
  'This email has already completed the PEOPLIX conference experience.',
  409,
);

function requireConfigured() {
  // Conference intentionally shares the already-working public Ava path.
  // Its own Mongo session is isolation/analytics, not a second provider config.
  if (!config.retell.agentId || !config.retell.apiKey) {
    throw new AppError('AVA_UNAVAILABLE', 'Ava is not available right now. Please try again shortly.', 503);
  }
}

export function visitorView(record: Conference) {
  return {
    sessionId: record.sessionId,
    companyDomain: record.companyDomain,
    status: record.expiresAt.getTime() <= Date.now() ? 'expired' : record.status,
    sessionStart: record.sessionStart,
    expiresAt: record.expiresAt,
    conversationEndsAt: record.conversationEndsAt ?? null,
    callStatus: record.callStatus ?? null,
    canRetry: record.status === 'failed' && !record.stopRequested && record.calls.length < MAX_ATTEMPTS
      && (!record.conversationEndsAt || record.conversationEndsAt.getTime() - Date.now() >= MIN_CALL_MS + 15_000),
    serverNow: new Date(),
  };
}

// Shared, atomic MongoDB limits. No per-process counters; generous IP allowance
// accommodates conference Wi-Fi NAT. Per-address limit prevents trivial repeats.
async function consumeLimit(key: string, max: number, windowMs: number) {
  const bucket = Math.floor(Date.now() / windowMs);
  const col = getCollection(Collections.CONFERENCE_RATE_LIMITS);
  const filter = { key: hashToken(`${key}:${bucket}`) };
  try {
    await col.updateOne(filter, { $setOnInsert: { count: 0, expiresAt: new Date((bucket + 2) * windowMs) } }, { upsert: true });
  } catch (error) {
    if (!(error && typeof error === 'object' && 'code' in error && error.code === 11000)) throw error;
  }
  const result = await col.updateOne({ ...filter, count: { $lt: max } }, { $inc: { count: 1 } });
  if (!result.modifiedCount) throw new AppError('RATE_LIMITED', 'Please wait a little before trying again.', 429);
}

export async function createConference(emailInput: unknown, consent: unknown, ip: string, authorization?: string) {
  const identity = normalizeWorkEmail(emailInput, config.conference.blockedDomains);
  if (consent !== true) throw new AppError('CONSENT_REQUIRED', 'Please agree to the recording notice to continue.', 400);
  requireConfigured();
  await consumeLimit(`ip:${ip}`, config.conference.ipSessionsPerMinute, 60_000);

  // Email is the only usage identity. The browser token can resume its own
  // unfinished reservation, but never decides whether another email may enter.
  const now = new Date();
  const suppliedToken = bearerToken(authorization);
  const suppliedHash = suppliedToken ? hashToken(suppliedToken) : undefined;
  const emailKey = hashToken(`conference-email:${identity.email}`);

  const completed = await conferences().findOne({
    email: identity.email,
    $or: [
      { status: { $in: ['completed', 'expired'] }, 'calls.startTime': { $exists: true } },
      { status: { $in: ['completed', 'expired'] }, 'calls.durationMs': { $gt: 0 } },
      { expiresAt: { $lte: now }, 'calls.startTime': { $exists: true } },
      { expiresAt: { $lte: now }, 'calls.durationMs': { $gt: 0 } },
    ],
  });
  if (completed) throw alreadyUsedError();

  // New records have a unique emailKey. Legacy records are also respected so
  // an older active session cannot be bypassed during rollout.
  const reserved = await conferences().findOne({ emailKey })
    ?? await conferences().findOne({ email: identity.email, status: { $in: ['created', 'active', 'failed'] }, expiresAt: { $gt: now } });
  if (reserved) {
    if (alreadyUsed(reserved, now.getTime())) throw alreadyUsedError();
    if (suppliedHash === reserved.tokenHash && reserved.expiresAt.getTime() > now.getTime() && !terminalSession(reserved)) {
      return { ...visitorView(reserved), token: suppliedToken! };
    }
    const noParticipatingAttempt = reserved.calls.length === 0 || reserved.calls.every(call =>
      !call.startTime && !(call.durationMs && call.durationMs > 0) && call.status === 'error');
    const canRecycle = noParticipatingAttempt
      && (terminalSession(reserved) || reserved.expiresAt.getTime() <= now.getTime());
    if (!canRecycle) {
      throw new AppError('CONFERENCE_IN_PROGRESS', 'A conference session for this email is already in progress.', 409);
    }

    const replacementToken = newSessionToken();
    const replacement = await conferences().findOneAndUpdate({
      _id: reserved._id, updatedAt: reserved.updatedAt, tokenHash: reserved.tokenHash,
    }, {
      $set: {
        ...identity, emailKey, sessionId: randomUUID(), tokenHash: hashToken(replacementToken),
        sessionStart: now, expiresAt: new Date(now.getTime() + SESSION_MS), status: 'created',
        calls: [], agentId: config.retell.agentId!, consentAt: now, consentVersion: 'conference-v1',
        createdAt: now, updatedAt: now,
      },
      $unset: {
        sessionEnd: '', sessionDuration: '', callId: '', callStatus: '', conversationEndsAt: '',
        currentAttemptId: '', nextActionAt: '', leaseUntil: '', leaseOwner: '', stopRequested: '',
      },
    }, { returnDocument: 'after' });
    if (!replacement) throw new AppError('CONFERENCE_IN_PROGRESS', 'A conference session for this email is already in progress.', 409);
    return { ...visitorView(replacement), token: replacementToken };
  }

  const token = newSessionToken();
  const record: Conference = {
    ...identity, emailKey, sessionId: randomUUID(), tokenHash: hashToken(token),
    sessionStart: now, expiresAt: new Date(now.getTime() + SESSION_MS), status: 'created',
    calls: [], agentId: config.retell.agentId!, consentAt: now, consentVersion: 'conference-v1',
    createdAt: now, updatedAt: now,
  };
  try {
    await conferences().insertOne(record);
  } catch (error) {
    if (!(error && typeof error === 'object' && 'code' in error && error.code === 11000)) throw error;
    const winner = await conferences().findOne({ emailKey });
    if (winner && alreadyUsed(winner)) throw alreadyUsedError();
    throw new AppError('CONFERENCE_IN_PROGRESS', 'A conference session for this email is already in progress.', 409);
  }
  return { ...visitorView(record), token };
}

export async function authenticateConference(authorization?: string) {
  const token = bearerToken(authorization);
  if (!token) throw new AppError('INVALID_SESSION', 'Please enter your work email to begin.', 401);
  const record = await conferences().findOne({ tokenHash: hashToken(token) });
  if (!record) throw new AppError('INVALID_SESSION', 'Please enter your work email to begin.', 401);
  if (record.expiresAt.getTime() <= Date.now()) {
    throw new AppError('SESSION_EXPIRED', 'Your conference session has ended. Thank you for meeting Ava.', 410);
  }
  return record;
}

export async function startConferenceCall(record: Conference) {
  requireConfigured();
  if (record.agentId !== config.retell.agentId) throw new AppError('AVA_UNAVAILABLE', 'Please begin a new conference session.', 503);
  const now = new Date();
  const deadline = new Date(callDeadline(now.getTime(), record.expiresAt.getTime(), record.conversationEndsAt));
  if (deadline.getTime() - now.getTime() < MIN_CALL_MS + 15_000) {
    throw new AppError('TIME_LIMIT', 'There is not enough time left to start another conversation.', 409);
  }
  const attemptId = randomUUID();
  const attempt: ConferenceCall = { attemptId, status: 'preparing', requestedAt: now };
  const claimed = await conferences().findOneAndUpdate({
    sessionId: record.sessionId, status: { $in: ['created', 'failed'] }, stopRequested: { $ne: true },
    currentAttemptId: record.currentAttemptId ?? { $exists: false },
    expiresAt: { $gt: now }, [`calls.${MAX_ATTEMPTS - 1}`]: { $exists: false },
  }, {
    $set: { status: 'active', callStatus: 'preparing', currentAttemptId: attemptId,
      conversationEndsAt: deadline, updatedAt: now, nextActionAt: new Date(now.getTime() + 30_000) },
    $unset: { callId: '' }, $push: { calls: attempt },
  }, { returnDocument: 'after' });
  if (!claimed) throw new AppError('CALL_IN_PROGRESS', 'This session already has a conversation in progress or has ended.', 409);

  try {
    const durationMs = deadline.getTime() - Date.now();
    if (durationMs < MIN_CALL_MS) throw new Error('Insufficient remaining call time');
    const { webCall: call } = await createPublicDemoWebCall({
      source: 'conference', conferenceSessionId: record.sessionId, conferenceAttemptId: attemptId,
    });
    if (!call.call_id || !call.access_token) throw new Error('Incomplete Retell call registration');
    // Bind the ID before sending the single-use credential. A webhook may have
    // arrived already, so never downgrade an ongoing/terminal call to registered.
    await conferences().updateOne({ sessionId: record.sessionId }, {
      $set: { 'calls.$[attempt].callId': call.call_id, updatedAt: new Date() },
    }, { arrayFilters: [{ 'attempt.attemptId': attemptId }] });
    await conferences().updateOne({ sessionId: record.sessionId, currentAttemptId: attemptId }, {
      $set: { callId: call.call_id, updatedAt: new Date() },
    });
    await conferences().updateOne({ sessionId: record.sessionId, currentAttemptId: attemptId, callStatus: 'preparing' }, {
      $set: { callStatus: 'registered', 'calls.$[attempt].status': 'registered', nextActionAt: deadline },
    }, { arrayFilters: [{ 'attempt.attemptId': attemptId, 'attempt.status': 'preparing' }] });
    const latest = await conferences().findOne({ sessionId: record.sessionId });
    if (!latest || latest.currentAttemptId !== attemptId || latest.callStatus === 'error'
        || latest.status === 'completed' || latest.stopRequested || latest.expiresAt.getTime() <= Date.now() || deadline.getTime() <= Date.now()) {
      await retellClient.stopCall(call.call_id);
      throw new AppError('SESSION_EXPIRED', 'Your conference session has ended.', 410);
    }
    return { ...visitorView(latest), accessToken: call.access_token, callId: call.call_id };
  } catch (error) {
    // No token was returned to the visitor. Only an unbound preparation can be
    // retried; a registered call must first be reconciled/terminated.
    await conferences().updateOne({ sessionId: record.sessionId, currentAttemptId: attemptId, callStatus: 'preparing', callId: { $exists: false } }, {
      $set: { status: 'failed', callStatus: 'error', 'calls.$[attempt].status': 'error', updatedAt: new Date() },
    }, { arrayFilters: [{ 'attempt.attemptId': attemptId }] });
    logger.error({ err: error, sessionId: record.sessionId }, 'Conference call creation failed');
    if (error instanceof AppError) throw error;
    throw new AppError('AVA_UNAVAILABLE', 'Ava could not connect. Please try again while your session is open.', 503);
  }
}

export async function endConference(record: Conference) {
  const now = new Date();
  const updated = await conferences().findOneAndUpdate({ sessionId: record.sessionId }, {
    $set: {
      status: record.expiresAt.getTime() <= now.getTime() ? 'expired' : 'completed',
      sessionEnd: new Date(Math.min(now.getTime(), record.expiresAt.getTime())),
      sessionDuration: Math.max(0, Math.min(now.getTime(), record.expiresAt.getTime()) - record.sessionStart.getTime()),
      stopRequested: true, nextActionAt: now, updatedAt: now,
    },
  }, { returnDocument: 'after' });
  // A durable stop request survives crashes/provider failures. The worker owns
  // retrying it; the visitor can immediately disconnect their browser audio.
  return visitorView(updated ?? record);
}

export async function refreshConference(record: Conference) {
  // Only explicit recovery requests check the provider. Normal UI countdowns
  // never poll the API, and the durable worker still enforces all deadlines.
  if (record.status === 'active' && record.callId) {
    const call = await retellClient.getCall(record.callId, 8_000);
    if (['ended', 'error', 'not_connected'].includes(call.call_status)) {
      await handleConferenceEvent(call.call_analysis ? 'call_analyzed' : 'call_ended', call);
      return (await conferences().findOne({ sessionId: record.sessionId }))!;
    }
  }
  return record;
}

export async function handleConferenceEvent(event: string, call: RetellCallInfo): Promise<boolean> {
  if (!call || typeof call.call_id !== 'string' || !call.call_id) return false;
  const sessionId = call.metadata?.conferenceSessionId;
  const attemptId = call.metadata?.conferenceAttemptId;
  const isTagged = call.metadata?.source === 'conference' || typeof sessionId === 'string';
  const record = typeof sessionId === 'string'
    ? await conferences().findOne({ sessionId })
    : await conferences().findOne({ 'calls.callId': call.call_id });
  if (!record) {
    if (isTagged) throw new Error('Conference webhook has no reserved session'); // Provider retries; never create an orphan.
    return false;
  }
  const attempt = record.calls.find(item => item.callId === call.call_id || item.attemptId === attemptId);
  if (call.agent_id !== record.agentId || !attempt || (attempt.callId && attempt.callId !== call.call_id)) {
    throw new Error('Conference webhook identity mismatch');
  }
  if (!['call_started', 'call_ended', 'call_analyzed'].includes(event)) return true;
  const now = new Date();
  const ended = event !== 'call_started';
  const rank = event === 'call_analyzed' ? 3 : ended ? 2 : 1;
  const previousRank = attempt.analyzed ? 3 : terminalCall(attempt) ? 2 : attempt.status === 'ongoing' ? 1 : 0;
  const fields: Record<string, unknown> = { updatedAt: now, 'calls.$[attempt].callId': call.call_id };
  if (rank >= previousRank) {
    fields['calls.$[attempt].status'] = ended ? (call.call_status === 'error' ? 'error' : 'ended') : 'ongoing';
  }
  if (call.start_timestamp) fields['calls.$[attempt].startTime'] = new Date(call.start_timestamp);
  if (call.end_timestamp) fields['calls.$[attempt].endTime'] = new Date(call.end_timestamp);
  if (typeof call.duration_ms === 'number') fields['calls.$[attempt].durationMs'] = call.duration_ms;
  if (call.transcript && (rank >= previousRank || !attempt.transcript)) fields['calls.$[attempt].transcript'] = call.transcript;
  if ((call.recording_url || call.scrubbed_recording_url) && (rank >= previousRank || !attempt.recordingUrl)) fields['calls.$[attempt].recordingUrl'] = call.recording_url || call.scrubbed_recording_url;
  if (call.call_analysis?.call_summary && (rank >= previousRank || !attempt.summary)) fields['calls.$[attempt].summary'] = call.call_analysis.call_summary;
  if (call.disconnection_reason) fields['calls.$[attempt].disconnectReason'] = call.disconnection_reason;
  if (event === 'call_analyzed') fields['calls.$[attempt].analyzed'] = true;
  const current = record.currentAttemptId === attempt.attemptId;
  const failed = call.call_status === 'error' || call.call_status === 'not_connected'
    || call.disconnection_reason?.startsWith('error_') === true;
  if (ended && rank >= previousRank) fields['calls.$[attempt].status'] = failed ? 'error' : 'ended';
  if (current && rank >= previousRank) {
    // An analysis webhook delivered after five minutes must not turn a call
    // that finished on time into an expired visit. Use provider event time.
    const providerEnd = call.end_timestamp ?? attempt.endTime?.getTime();
    const expired = ended
      ? (providerEnd ? providerEnd >= record.expiresAt.getTime() : record.status === 'expired')
      : record.expiresAt.getTime() <= now.getTime();
    fields.callId = call.call_id;
    fields.callStatus = ended ? (failed ? 'error' : 'ended') : 'ongoing';
    fields.status = expired ? 'expired' : ended ? (failed && !record.stopRequested ? 'failed' : 'completed')
      : record.stopRequested ? 'completed' : 'active';
    if (ended) {
      const end = new Date(Math.min(call.end_timestamp || now.getTime(), record.expiresAt.getTime()));
      fields.sessionEnd = end;
      fields.sessionDuration = Math.max(0, end.getTime() - record.sessionStart.getTime());
    }
    fields.nextActionAt = ended ? new Date(now.getTime() + 30_000) : record.conversationEndsAt;
  }
  // Atomic guard against a concurrent analyzed/end event being overwritten by
  // an earlier snapshot. Media enrichment is retried by the signed webhook.
  const updated = await conferences().updateOne({
    sessionId: record.sessionId, updatedAt: record.updatedAt, currentAttemptId: record.currentAttemptId,
    calls: { $elemMatch: { attemptId: attempt.attemptId, status: attempt.status,
      ...(attempt.analyzed ? { analyzed: true } : { analyzed: { $ne: true } }) } },
  }, { $set: fields }, { arrayFilters: [{ 'attempt.attemptId': attempt.attemptId }] });
  if (!updated.matchedCount) throw new Error('Concurrent conference event; retry delivery');
  if (!ended && (!terminalCall(attempt) || !attempt.callId) && (record.stopRequested || record.expiresAt.getTime() <= now.getTime()
      || (record.conversationEndsAt && record.conversationEndsAt.getTime() <= now.getTime()) || !current || terminalCall(attempt))) {
    await retellClient.stopCall(call.call_id);
  }
  return true;
}

// One indexed scan per tick, with MongoDB leases for multiple backend replicas.
// This is durable deadline enforcement, not a timer owned by a visitor/tab.
export async function processConferenceDeadlines() {
  const now = new Date();
  await conferences().updateMany({ expiresAt: { $lte: now }, status: { $in: ['created', 'active', 'failed'] } }, [
    { $set: { status: 'expired', sessionEnd: '$expiresAt', sessionDuration: SESSION_MS, updatedAt: now } },
  ]);
  const due = await conferences().find({ nextActionAt: { $lte: now }, $or: [{ leaseUntil: { $exists: false } }, { leaseUntil: { $lte: now } }] })
    .project({ sessionId: 1 }).limit(100).toArray();
  for (let offset = 0; offset < due.length; offset += 10) {
    await Promise.all(due.slice(offset, offset + 10).map(async item => {
      const owner = randomUUID();
      const record = await conferences().findOneAndUpdate({ sessionId: item.sessionId,
        nextActionAt: { $lte: new Date() },
        $or: [{ leaseUntil: { $exists: false } }, { leaseUntil: { $lte: new Date() } }],
      }, { $set: { leaseUntil: new Date(Date.now() + 30_000), leaseOwner: owner } }, { returnDocument: 'after' });
      if (!record) return;
      let nextActionAt: Date | undefined;
      try {
        const attempt = record.calls.find(call => call.attemptId === record.currentAttemptId);
        const deadline = record.conversationEndsAt?.getTime() ?? record.expiresAt.getTime();
        if (attempt?.callId) {
          const shouldStop = record.stopRequested || Date.now() >= deadline || Date.now() >= record.expiresAt.getTime();
          const call = await retellClient.getCall(attempt.callId, 8_000);
          if (call.call_status === 'ended' || call.call_status === 'error' || call.call_status === 'not_connected') {
            if (call.call_status === 'not_connected') call.call_status = 'error';
            await handleConferenceEvent(call.call_analysis ? 'call_analyzed' : 'call_ended', call);
            if ((!call.call_analysis || !call.recording_url) && Date.now() < record.expiresAt.getTime() + 10 * 60_000) {
              nextActionAt = new Date(Date.now() + 30_000);
            }
          } else {
            if (shouldStop) await retellClient.stopCall(attempt.callId);
            nextActionAt = new Date(shouldStop ? Date.now() + 2_000 : deadline);
          }
        } else if (attempt?.status === 'preparing') {
          await conferences().updateOne({ sessionId: record.sessionId, callStatus: 'preparing', callId: { $exists: false } }, {
            $set: { status: record.expiresAt.getTime() <= Date.now() ? 'expired' : 'failed', callStatus: 'error',
              'calls.$[attempt].status': 'error', updatedAt: new Date() },
          }, { arrayFilters: [{ 'attempt.attemptId': attempt.attemptId }] });
        } else if (record.stopRequested && !attempt) {
          await conferences().updateOne({ sessionId: record.sessionId }, { $set: {
            status: 'completed', sessionEnd: new Date(), sessionDuration: Date.now() - record.sessionStart.getTime(), updatedAt: new Date(),
          } });
        }
      } catch (error) {
        logger.error({ err: error, sessionId: record.sessionId }, 'Conference reconciliation will retry');
        nextActionAt = new Date(Date.now() + 5_000);
      } finally {
        // Never clear a stop request or retry scheduled by a concurrent request.
        await conferences().updateOne({ sessionId: record.sessionId, leaseOwner: owner,
          stopRequested: record.stopRequested ?? { $ne: true }, currentAttemptId: record.currentAttemptId,
        }, {
          ...(nextActionAt ? { $set: { nextActionAt } } : {}),
          $unset: { leaseUntil: '', leaseOwner: '', ...(!nextActionAt ? { nextActionAt: '' } : {}) },
        });
        await conferences().updateOne({ sessionId: record.sessionId, leaseOwner: owner }, { $unset: { leaseUntil: '', leaseOwner: '' } });
      }
    }));
  }
}
