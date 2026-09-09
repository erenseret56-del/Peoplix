import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ObjectId } from 'mongodb';
import { getCollection, Collections } from '../../infrastructure/database/index.js';
import { authenticateJWT } from '../../middleware/auth.js';
import { resolveTenant, getTenantId } from '../../middleware/tenant.js';
import { NotFoundError, ConflictError, ValidationError } from '../../middleware/errorHandler.js';
import { cache } from '../../infrastructure/cache/memory-cache.js';

interface PolicyDoc {
  _id?: ObjectId;
  company_id: string;
  title: string;
  code?: string;
  category?: string;
  description?: string;
  content: string;
  version: string;
  effective_date?: Date;
  review_date?: Date;
  status: string;
  created_by?: string;
  approved_by?: string;
  created_at: Date;
  updated_at: Date;
}

const schema = z.object({
  title: z.string().min(2).max(255),
  code: z.string().max(50).optional(),
  category: z.string().max(100).optional(),
  description: z.string().optional(),
  content: z.string().min(10),
  version: z.string().max(20).default('1.0'),
  effective_date: z.string().optional(),
  review_date: z.string().optional(),
  status: z.enum(['draft', 'active', 'archived']).default('draft'),
});

export async function policiesRoutes(fastify: FastifyInstance) {
  const preHandler = [authenticateJWT, resolveTenant];
  const col = () => getCollection<PolicyDoc>(Collections.POLICIES);

  fastify.get('/', { preHandler }, async (request, reply) => {
    const tenantId = getTenantId(request);
    const q = request.query as any;
    const page = Math.max(1, parseInt(q.page) || 1);
    const limit = Math.min(100, parseInt(q.limit) || 20);
    const skip = (page - 1) * limit;

    const filter: any = { company_id: tenantId };
    if (q.status) filter.status = q.status;
    else filter.status = 'active';
    if (q.category) filter.category = q.category;

    const [data, total] = await Promise.all([
      col().find(filter).sort({ created_at: -1 }).skip(skip).limit(limit).toArray(),
      col().countDocuments(filter),
    ]);

    return reply.send({
      success: true,
      data: data.map(d => ({
        id: d._id!.toString(),
        company_id: d.company_id,
        title: d.title,
        code: d.code,
        category: d.category,
        version: d.version,
        status: d.status,
        effective_date: d.effective_date,
        created_at: d.created_at,
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  });

  fastify.post('/', { preHandler }, async (request, reply) => {
    const tenantId = getTenantId(request);
    const user = (request as any).user;
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) throw new ValidationError('Invalid input', parsed.error.errors);

    // Unique code per company
    if (parsed.data.code) {
      const exists = await col().countDocuments({ company_id: tenantId, code: parsed.data.code });
      if (exists) throw new ConflictError('Policy code already exists');
    }

    const now = new Date();
    const result = await col().insertOne({
      company_id: tenantId,
      ...parsed.data,
      effective_date: parsed.data.effective_date ? new Date(parsed.data.effective_date) : undefined,
      review_date: parsed.data.review_date ? new Date(parsed.data.review_date) : undefined,
      created_by: user.id,
      created_at: now,
      updated_at: now,
    } as any);

    await cache.deletePattern(`company:${tenantId}:policies:*`);

    return reply.status(201).send({
      success: true,
      data: { id: result.insertedId.toString(), title: parsed.data.title, status: parsed.data.status },
      message: 'Policy created successfully',
    });
  });

  fastify.get('/:id', { preHandler }, async (request, reply) => {
    const tenantId = getTenantId(request);
    const { id } = request.params as { id: string };
    const doc = await col().findOne({ _id: new ObjectId(id), company_id: tenantId });
    if (!doc) throw new NotFoundError('Policy not found');
    return reply.send({ success: true, data: { id: doc._id!.toString(), ...doc, _id: undefined } });
  });

  fastify.patch('/:id', { preHandler }, async (request, reply) => {
    const tenantId = getTenantId(request);
    const { id } = request.params as { id: string };
    const user = (request as any).user;
    const parsed = schema.partial().safeParse(request.body);
    if (!parsed.success) throw new ValidationError('Invalid input', parsed.error.errors);

    const updateData: any = { ...parsed.data, updated_at: new Date() };
    if (parsed.data.effective_date) updateData.effective_date = new Date(parsed.data.effective_date);
    if (parsed.data.review_date) updateData.review_date = new Date(parsed.data.review_date);
    if (parsed.data.status === 'active') updateData.approved_by = user.id;

    const doc = await col().findOneAndUpdate(
      { _id: new ObjectId(id), company_id: tenantId },
      { $set: updateData },
      { returnDocument: 'after' }
    );
    if (!doc) throw new NotFoundError('Policy not found');

    await cache.deletePattern(`company:${tenantId}:policies:*`);
    return reply.send({ success: true, data: { id: doc._id!.toString(), ...doc, _id: undefined } });
  });

  fastify.delete('/:id', { preHandler }, async (request, reply) => {
    const tenantId = getTenantId(request);
    const { id } = request.params as { id: string };
    const result = await col().updateOne(
      { _id: new ObjectId(id), company_id: tenantId },
      { $set: { status: 'archived', updated_at: new Date() } }
    );
    if (!result.modifiedCount) throw new NotFoundError('Policy not found');
    await cache.deletePattern(`company:${tenantId}:policies:*`);
    return reply.send({ success: true, message: 'Policy archived' });
  });
}
