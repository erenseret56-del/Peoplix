import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { Document, ObjectId } from 'mongodb';
import { getCollection, Collections } from '../../infrastructure/database/index.js';
import { authenticateJWT, requireSuperAdmin } from '../../middleware/auth.js';
import { ValidationError } from '../../middleware/errorHandler.js';
import { config } from '../../config/env.js';
import { normalizeWorkEmail } from '../conference/conference.policy.js';

interface DemoRequestDoc extends Document {
  _id?: ObjectId;
  name?: string;
  email: string;
  company?: string;
  jobTitle?: string;
  phone?: string;
  message?: string;
  address?: string;
  source: 'website' | 'conference';
  conferenceSessionId?: string;
  status: 'new' | 'contacted' | 'closed' | 'access_granted';
  created_at: Date;
  updated_at: Date;
}

const websiteCreateSchema = z.object({
  email: z.string().trim().email().max(255),
  phone: z.string().trim().min(7).max(50),
  address: z.string().trim().min(3).max(1000),
  source: z.literal('website').optional(),
}).strict();

const conferenceCreateSchema = z.object({
  source: z.literal('conference'),
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(255),
  company: z.string().trim().min(2).max(160),
  jobTitle: z.string().trim().min(2).max(160),
  phone: z.union([z.string().trim().min(7).max(50), z.literal('')]).optional(),
  message: z.string().trim().max(2000).optional(),
  conferenceSessionId: z.string().uuid().optional(),
}).strict();

const createSchema = z.union([conferenceCreateSchema, websiteCreateSchema]);

const updateSchema = z.object({
  status: z.enum(['new', 'contacted', 'closed', 'access_granted']),
});

export async function demoRequestsRoutes(fastify: FastifyInstance) {
  const col = () => getCollection<DemoRequestDoc>(Collections.DEMO_REQUESTS);

  /** POST /api/demo-requests - public demo interest form */
  fastify.post('/', { config: { rateLimit: { max: 5, timeWindow: 10 * 60 * 1000 } } }, async (request, reply) => {
    const parsed = createSchema.safeParse(request.body);
    if (!parsed.success) throw new ValidationError('Please check the demo request details and try again', parsed.error.errors);

    const now = new Date();
    const data = parsed.data;
    const email = data.source === 'conference'
      ? normalizeWorkEmail(data.email, config.conference.blockedDomains).email
      : data.email.toLowerCase();
    let conferenceSessionId: string | undefined;
    if (data.source === 'conference' && data.conferenceSessionId) {
      const session = await getCollection(Collections.CONFERENCE).findOne({ sessionId: data.conferenceSessionId, email });
      if (session) conferenceSessionId = data.conferenceSessionId;
    }
    const record: DemoRequestDoc = {
      ...(data.source === 'conference' ? {
        name: data.name,
        company: data.company,
        jobTitle: data.jobTitle,
        ...(data.phone ? { phone: data.phone } : {}),
        ...(data.message ? { message: data.message } : {}),
        ...(conferenceSessionId ? { conferenceSessionId } : {}),
      } : { phone: data.phone, address: data.address }),
      email,
      source: data.source === 'conference' ? 'conference' : 'website',
      status: 'new',
      created_at: now,
      updated_at: now,
    };
    const result = await col().insertOne(record);

    return reply.status(201).send({
      success: true,
      data: { id: result.insertedId.toString() },
      message: 'Demo request submitted successfully',
    });
  });

  /** GET /api/demo-requests - super admin request inbox */
  fastify.get('/', { preHandler: [authenticateJWT, requireSuperAdmin] }, async (request, reply) => {
    const q = request.query as { page?: string; limit?: string; status?: string };
    const page = Math.max(1, Number.parseInt(q.page || '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(q.limit || '50', 10) || 50));
    const filter: Record<string, unknown> = {};
    if (q.status && ['new', 'contacted', 'closed', 'access_granted'].includes(q.status)) filter.status = q.status;

    const [data, total] = await Promise.all([
      col().find(filter).sort({ created_at: -1 }).skip((page - 1) * limit).limit(limit).toArray(),
      col().countDocuments(filter),
    ]);

    return reply.send({
      success: true,
      data: data.map((item) => ({ id: item._id!.toString(), ...item, _id: undefined })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  });

  /** POST /api/demo-requests/verify-access - public access check */
  fastify.post('/verify-access', async (request, reply) => {
    const parsed = z.object({ email: z.string().trim().email().max(255) }).safeParse(request.body);
    if (!parsed.success) throw new ValidationError('Please enter a valid email address', parsed.error.errors);

    const requestRecord = await col().findOne({
      email: parsed.data.email.toLowerCase(),
      status: 'access_granted',
    });

    return reply.send({ success: true, data: { granted: Boolean(requestRecord) } });
  });

  /** PATCH /api/demo-requests/:id - update inbox status */
  fastify.patch('/:id', { preHandler: [authenticateJWT, requireSuperAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = updateSchema.safeParse(request.body);
    if (!parsed.success) throw new ValidationError('Invalid request status', parsed.error.errors);

    const { ObjectId } = await import('mongodb');
    if (!ObjectId.isValid(id)) throw new ValidationError('Invalid demo request id');
    const updated = await col().findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { status: parsed.data.status, updated_at: new Date() } },
      { returnDocument: 'after' },
    );
    if (!updated) return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Demo request not found' } });

    return reply.send({ success: true, data: { id: updated._id!.toString(), status: updated.status } });
  });

  /** DELETE /api/demo-requests - permanently delete selected requests */
  fastify.delete('/', { preHandler: [authenticateJWT, requireSuperAdmin] }, async (request, reply) => {
    const parsed = z.object({ ids: z.array(z.string()).min(1).max(100) }).safeParse(request.body);
    if (!parsed.success) throw new ValidationError('Select at least one demo request to delete', parsed.error.errors);

    const { ObjectId } = await import('mongodb');
    if (parsed.data.ids.some((id) => !ObjectId.isValid(id))) throw new ValidationError('Invalid demo request id');
    const result = await col().deleteMany({ _id: { $in: parsed.data.ids.map((id) => new ObjectId(id)) } });

    return reply.send({ success: true, data: { deletedCount: result.deletedCount }, message: 'Demo requests deleted successfully' });
  });
}
