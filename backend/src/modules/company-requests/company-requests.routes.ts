import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { Document, ObjectId } from 'mongodb';
import { getCollection, Collections } from '../../infrastructure/database/index.js';
import { authenticateJWT, requireSuperAdmin } from '../../middleware/auth.js';
import { ValidationError } from '../../middleware/errorHandler.js';

interface CompanyRequestDoc extends Document {
  _id?: ObjectId;
  full_name: string;
  company_name: string;
  position_title: string;
  email: string;
  phone?: string;
  status: 'new' | 'contacted' | 'closed';
  created_at: Date;
  updated_at: Date;
}

const createSchema = z.object({
  fullName: z.string().trim().min(2).max(255),
  companyName: z.string().trim().min(2).max(255),
  positionTitle: z.string().trim().min(2).max(255),
  email: z.string().trim().email().max(255),
  phoneNumber: z.string().trim().max(50).optional(),
});

const updateSchema = z.object({
  status: z.enum(['new', 'contacted', 'closed']),
});

export async function companyRequestsRoutes(fastify: FastifyInstance) {
  const col = () => getCollection<CompanyRequestDoc>(Collections.COMPANY_REQUESTS);

  /** POST /api/company-requests - public company inquiry form */
  fastify.post('/', { config: { rateLimit: { max: 5, timeWindow: 10 * 60 * 1000 } } }, async (request, reply) => {
    const parsed = createSchema.safeParse(request.body);
    if (!parsed.success) throw new ValidationError('Please complete all required company request fields with valid values', parsed.error.errors);

    const now = new Date();
    const result = await col().insertOne({
      full_name: parsed.data.fullName,
      company_name: parsed.data.companyName,
      position_title: parsed.data.positionTitle,
      email: parsed.data.email,
      phone: parsed.data.phoneNumber || undefined,
      status: 'new',
      created_at: now,
      updated_at: now,
    } as CompanyRequestDoc);

    return reply.status(201).send({
      success: true,
      data: { id: result.insertedId.toString() },
      message: 'Company request submitted successfully',
    });
  });

  /** GET /api/company-requests - super admin company inquiry inbox */
  fastify.get('/', { preHandler: [authenticateJWT, requireSuperAdmin] }, async (request, reply) => {
    const q = request.query as { page?: string; limit?: string; status?: string };
    const page = Math.max(1, Number.parseInt(q.page || '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(q.limit || '50', 10) || 50));
    const filter: Record<string, unknown> = {};
    if (q.status && ['new', 'contacted', 'closed'].includes(q.status)) filter.status = q.status;

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

  /** PATCH /api/company-requests/:id - update inquiry status */
  fastify.patch('/:id', { preHandler: [authenticateJWT, requireSuperAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = updateSchema.safeParse(request.body);
    if (!parsed.success) throw new ValidationError('Invalid request status', parsed.error.errors);

    const { ObjectId } = await import('mongodb');
    if (!ObjectId.isValid(id)) throw new ValidationError('Invalid company request id');
    const updated = await col().findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { status: parsed.data.status, updated_at: new Date() } },
      { returnDocument: 'after' },
    );
    if (!updated) return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Company request not found' } });

    return reply.send({ success: true, data: { id: updated._id!.toString(), status: updated.status } });
  });

  /** DELETE /api/company-requests - permanently delete selected requests */
  fastify.delete('/', { preHandler: [authenticateJWT, requireSuperAdmin] }, async (request, reply) => {
    const parsed = z.object({ ids: z.array(z.string()).min(1).max(100) }).safeParse(request.body);
    if (!parsed.success) throw new ValidationError('Select at least one company request to delete', parsed.error.errors);

    const { ObjectId } = await import('mongodb');
    if (parsed.data.ids.some((id) => !ObjectId.isValid(id))) throw new ValidationError('Invalid company request id');
    const result = await col().deleteMany({ _id: { $in: parsed.data.ids.map((id) => new ObjectId(id)) } });

    return reply.send({ success: true, data: { deletedCount: result.deletedCount }, message: 'Company requests deleted successfully' });
  });
}
