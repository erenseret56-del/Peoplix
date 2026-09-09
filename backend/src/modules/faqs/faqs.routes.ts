import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ObjectId } from 'mongodb';
import { getCollection, Collections } from '../../infrastructure/database/index.js';
import { authenticateJWT } from '../../middleware/auth.js';
import { resolveTenant, getTenantId } from '../../middleware/tenant.js';
import { NotFoundError, ValidationError } from '../../middleware/errorHandler.js';
import { cache } from '../../infrastructure/cache/memory-cache.js';

interface FAQDoc {
  _id?: ObjectId;
  company_id: string;
  question: string;
  answer: string;
  category?: string;
  keywords?: string[];
  priority: number;
  status: string;
  created_by?: string;
  created_at: Date;
  updated_at: Date;
}

const schema = z.object({
  question: z.string().min(5).max(500),
  answer: z.string().min(5),
  category: z.string().max(100).optional(),
  keywords: z.array(z.string()).optional(),
  priority: z.number().int().min(0).max(100).default(0),
});

export async function faqsRoutes(fastify: FastifyInstance) {
  const preHandler = [authenticateJWT, resolveTenant];
  const col = () => getCollection<FAQDoc>(Collections.FAQS);

  fastify.get('/', { preHandler }, async (request, reply) => {
    const tenantId = getTenantId(request);
    const q = request.query as any;
    const page = Math.max(1, parseInt(q.page) || 1);
    const limit = Math.min(100, parseInt(q.limit) || 20);
    const skip = (page - 1) * limit;

    const filter: any = { company_id: tenantId, status: 'active' };
    if (q.category) filter.category = q.category;

    const [data, total] = await Promise.all([
      col().find(filter).sort({ priority: -1, created_at: -1 }).skip(skip).limit(limit).toArray(),
      col().countDocuments(filter),
    ]);

    return reply.send({
      success: true,
      data: data.map(d => ({ id: d._id!.toString(), ...d, _id: undefined })),
      pagination: {
        page, limit, total,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + data.length < total,
      },
    });
  });

  fastify.post('/', { preHandler }, async (request, reply) => {
    const tenantId = getTenantId(request);
    const user = (request as any).user;
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) throw new ValidationError('Invalid input', parsed.error.errors);

    const now = new Date();
    const result = await col().insertOne({
      company_id: tenantId,
      ...parsed.data,
      status: 'active',
      created_by: user.id,
      created_at: now,
      updated_at: now,
    } as any);

    // Invalidate FAQ cache
    await cache.deletePattern(`company:${tenantId}:faqs:*`);

    return reply.status(201).send({
      success: true,
      data: { id: result.insertedId.toString(), ...parsed.data },
      message: 'FAQ created successfully',
    });
  });

  fastify.get('/:id', { preHandler }, async (request, reply) => {
    const tenantId = getTenantId(request);
    const { id } = request.params as { id: string };
    const doc = await col().findOne({ _id: new ObjectId(id), company_id: tenantId });
    if (!doc) throw new NotFoundError('FAQ not found');
    return reply.send({ success: true, data: { id: doc._id!.toString(), ...doc, _id: undefined } });
  });

  fastify.patch('/:id', { preHandler }, async (request, reply) => {
    const tenantId = getTenantId(request);
    const { id } = request.params as { id: string };
    const parsed = schema.partial().safeParse(request.body);
    if (!parsed.success) throw new ValidationError('Invalid input', parsed.error.errors);

    const doc = await col().findOneAndUpdate(
      { _id: new ObjectId(id), company_id: tenantId },
      { $set: { ...parsed.data, updated_at: new Date() } },
      { returnDocument: 'after' }
    );
    if (!doc) throw new NotFoundError('FAQ not found');

    await cache.deletePattern(`company:${tenantId}:faqs:*`);

    return reply.send({ success: true, data: { id: doc._id!.toString(), ...doc, _id: undefined } });
  });

  fastify.delete('/:id', { preHandler }, async (request, reply) => {
    const tenantId = getTenantId(request);
    const { id } = request.params as { id: string };
    const result = await col().updateOne(
      { _id: new ObjectId(id), company_id: tenantId },
      { $set: { status: 'inactive', updated_at: new Date() } }
    );
    if (!result.modifiedCount) throw new NotFoundError('FAQ not found');

    await cache.deletePattern(`company:${tenantId}:faqs:*`);
    return reply.send({ success: true, message: 'FAQ deleted' });
  });
}
