import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { Document, ObjectId } from 'mongodb';
import { getCollection, Collections } from '../../infrastructure/database/index.js';
import { authenticateJWT, requireSuperAdmin } from '../../middleware/auth.js';
import { ValidationError } from '../../middleware/errorHandler.js';

interface DemoRequestDoc extends Document {
  _id?: ObjectId;
  email: string;
  phone: string;
  address: string;
  status: 'new' | 'contacted' | 'closed' | 'access_granted';
  created_at: Date;
  updated_at: Date;
}

const createSchema = z.object({
  email: z.string().trim().email().max(255),
  phone: z.string().trim().min(7).max(50),
  address: z.string().trim().min(3).max(1000),
});

const updateSchema = z.object({
  status: z.enum(['new', 'contacted', 'closed', 'access_granted']),
});

export async function demoRequestsRoutes(fastify: FastifyInstance) {
  const col = () => getCollection<DemoRequestDoc>(Collections.DEMO_REQUESTS);

  /** POST /api/demo-requests - public demo interest form */
  fastify.post('/', { config: { rateLimit: { max: 5, timeWindow: 10 * 60 * 1000 } } }, async (request, reply) => {
    const parsed = createSchema.safeParse(request.body);
    if (!parsed.success) throw new ValidationError('Please provide a valid email, phone number, and address', parsed.error.errors);

    const now = new Date();
    const result = await col().insertOne({
      ...parsed.data,
      email: parsed.data.email.toLowerCase(),
      status: 'new',
      created_at: now,
      updated_at: now,
    } as DemoRequestDoc);

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
