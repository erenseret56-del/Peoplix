import { Readable } from 'node:stream';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { Filter } from 'mongodb';
import { z } from 'zod';
import { authenticateJWT, requireSuperAdmin } from '../../middleware/auth.js';
import { AppError } from '../../middleware/errorHandler.js';
import { logger } from '../../config/logger.js';
import { retellClient } from '../retell/retell.client.js';
import { authenticateConference, conferences, createConference, endConference, refreshConference, startConferenceCall, visitorView } from './conference.service.js';
import type { Conference } from './conference.types.js';

const querySchema = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(120).optional(),
  status: z.enum(['created', 'active', 'completed', 'expired', 'failed']).optional(),
  from: z.string().date().optional(), to: z.string().date().optional(),
});

export function conferenceAdminFilter(query: z.infer<typeof querySchema>): Filter<Conference> {
  const filter: Filter<Conference> = {};
  if (query.status) filter.status = query.status;
  if (query.search) {
    const literal = query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const prefix = { $regex: `^${literal}`, $options: 'i' };
    filter.$or = [{ email: prefix }, { companyDomain: prefix }, { callId: query.search }];
  }
  if (query.from || query.to) {
    const start = query.from ? new Date(`${query.from}T00:00:00.000Z`) : undefined;
    const end = query.to ? new Date(new Date(`${query.to}T00:00:00.000Z`).getTime() + 86400000) : undefined;
    if (start && end && start >= end) throw new AppError('INVALID_DATE_RANGE', 'Choose a valid date range.', 400);
    filter.createdAt = { ...(start ? { $gte: start } : {}), ...(end ? { $lt: end } : {}) };
  }
  return filter;
}

export function safeRecordingUrl(value: string) {
  const url = new URL(value);
  const allowed = ['retellai.com', 'retellstorage.com', 'cloudfront.net', 'amazonaws.com'];
  if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443')
      || !allowed.some(host => url.hostname === host || url.hostname.endsWith(`.${host}`))) {
    throw new AppError('RECORDING_UNAVAILABLE', 'The recording is not available right now.', 503);
  }
  return url;
}

export async function conferenceRoutes(app: FastifyInstance) {
  // Safe errors even in development; visitor responses never include stack traces.
  app.setErrorHandler(async (error: Error, request, reply) => {
    logger.error({ err: error, requestId: request.id }, 'Conference request failed');
    const known = error instanceof AppError;
    return reply.status(known ? error.statusCode : error instanceof z.ZodError ? 400 : 503).send({
      success: false, error: {
        code: known ? error.code : error instanceof z.ZodError ? 'INVALID_INPUT' : 'UNAVAILABLE',
        message: known ? error.message : error instanceof z.ZodError ? 'Please check the information and try again.' : 'We could not connect right now. Please try again shortly.',
      },
    });
  });
  app.addHook('onSend', async (_request, reply) => {
    reply.header('Cache-Control', 'private, no-store');
    reply.header('Referrer-Policy', 'no-referrer');
  });
  // Use distributed limits in the session service rather than the global local
  // IP limit, which would penalize hundreds of visitors behind conference Wi-Fi.
  const publicOptions = { config: { rateLimit: false }, bodyLimit: 2048 } as const;
  app.post('/sessions', publicOptions, async (request, reply) => {
    const body = z.object({ email: z.string().max(254), consent: z.literal(true) }).strict().parse(request.body);
    return reply.status(201).send({ success: true, data: await createConference(body.email, body.consent, request.ip, request.headers.authorization) });
  });
  app.get('/session', publicOptions, async (request, reply) => {
    return reply.send({ success: true, data: visitorView(await refreshConference(await authenticateConference(request.headers.authorization))) });
  });
  app.post('/call', publicOptions, async (request, reply) => {
    const session = await authenticateConference(request.headers.authorization);
    return reply.send({ success: true, data: await startConferenceCall(session) });
  });
  app.post('/end', publicOptions, async (request, reply) => {
    return reply.send({ success: true, data: await endConference(await authenticateConference(request.headers.authorization)) });
  });

  const adminOptions = { preHandler: [authenticateJWT, requireSuperAdmin] };
  app.get('/activity', adminOptions, async (request, reply) => {
    const query = querySchema.parse(request.query);
    const filter = conferenceAdminFilter(query);
    const [data, total] = await Promise.all([
      conferences().aggregate([
        { $match: filter }, { $sort: { createdAt: -1, _id: -1 } },
        { $skip: (query.page - 1) * query.limit }, { $limit: query.limit },
        { $project: {
          _id: 0, sessionId: 1, email: 1, companyDomain: 1, companyName: 1, sessionStart: 1,
          sessionEnd: 1, sessionDuration: 1, status: 1, callId: 1, callStatus: 1, createdAt: 1,
          calls: { $map: { input: '$calls', as: 'call', in: {
            callId: '$$call.callId', status: '$$call.status', durationMs: '$$call.durationMs',
            hasRecording: { $ne: [{ $ifNull: ['$$call.recordingUrl', ''] }, ''] },
            hasTranscript: { $ne: [{ $ifNull: ['$$call.transcript', ''] }, ''] },
            hasSummary: { $ne: [{ $ifNull: ['$$call.summary', ''] }, ''] },
          } } },
        } },
      ], { maxTimeMS: 5000 }).toArray(),
      conferences().countDocuments(filter, { maxTimeMS: 5000 }),
    ]);
    return reply.send({ success: true, data, pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) } });
  });

  async function adminRecord(request: FastifyRequest) {
    const params = z.object({ sessionId: z.string().uuid() }).passthrough().parse(request.params);
    const record = await conferences().findOne({ sessionId: params.sessionId });
    if (!record) throw new AppError('NOT_FOUND', 'Conference session not found.', 404);
    return record;
  }
  app.get('/activity/:sessionId', adminOptions, async (request, reply) => {
    const record = await adminRecord(request);
    return reply.send({ success: true, data: {
      sessionId: record.sessionId, email: record.email, companyDomain: record.companyDomain,
      companyName: record.companyName, sessionStart: record.sessionStart, sessionEnd: record.sessionEnd,
      sessionDuration: record.sessionDuration, expiresAt: record.expiresAt, status: record.status,
      callId: record.callId, callStatus: record.callStatus, consentAt: record.consentAt,
      consentVersion: record.consentVersion, createdAt: record.createdAt, updatedAt: record.updatedAt,
      calls: record.calls.map(({ recordingUrl, ...call }) => ({ ...call, hasRecording: Boolean(recordingUrl) })),
    } });
  });
  app.get('/activity/:sessionId/recording/:callId', adminOptions, async (request, reply) => {
    const record = await adminRecord(request);
    const { callId } = z.object({ callId: z.string().min(1).max(200) }).passthrough().parse(request.params);
    if (!record.calls.some(call => call.callId === callId)) throw new AppError('NOT_FOUND', 'Recording not found.', 404);
    // Refresh provider-signed URLs on demand; never return them in public/admin JSON.
    const call = await retellClient.getCall(callId, 8000);
    if (call.agent_id !== record.agentId || call.metadata?.conferenceSessionId !== record.sessionId) {
      throw new AppError('NOT_FOUND', 'Recording not found.', 404);
    }
    const url = call.recording_url || call.scrubbed_recording_url;
    if (!url) throw new AppError('NOT_FOUND', 'Recording is still processing or is no longer retained.', 404);
    const response = await fetch(safeRecordingUrl(url), { redirect: 'error', signal: AbortSignal.timeout(20_000) });
    if (!response.ok || !response.body) throw new AppError('RECORDING_UNAVAILABLE', 'Recording is temporarily unavailable.', 503);
    const type = response.headers.get('content-type') || 'audio/wav';
    reply.header('Content-Type', type.startsWith('audio/') ? type : 'application/octet-stream');
    reply.header('X-Content-Type-Options', 'nosniff');
    return reply.send(Readable.fromWeb(response.body as Parameters<typeof Readable.fromWeb>[0]));
  });
}
