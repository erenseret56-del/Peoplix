import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ObjectId } from 'mongodb';
import type { Document } from 'mongodb';
import { getCollection, Collections } from '../../infrastructure/database/index.js';
import { authenticateJWT } from '../../middleware/auth.js';
import { resolveTenant, getTenantId } from '../../middleware/tenant.js';
import { NotFoundError, ConflictError, ValidationError } from '../../middleware/errorHandler.js';

interface CustomerDoc extends Document {
  _id?: ObjectId;
  company_id: string;       // TENANT isolation — always required
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  metadata?: Record<string, any>;
  status: string;
  created_at: Date;
  updated_at: Date;
}

const createSchema = z.object({
  first_name: z.string().max(100).optional(),
  last_name:  z.string().max(100).optional(),
  email:  z.string().email().optional(),
  phone:  z.string().max(50).optional(),
  metadata: z.record(z.any()).optional(),
});

const updateSchema = createSchema.partial().extend({
  status: z.enum(['active', 'inactive']).optional(),
});

export async function customersRoutes(fastify: FastifyInstance) {
  const preHandler = [authenticateJWT, resolveTenant];
  const col = () => getCollection<CustomerDoc>(Collections.CUSTOMERS);

  /** GET /api/customers */
  fastify.get('/', { preHandler }, async (request, reply) => {
    const tenantId = getTenantId(request);
    const q = request.query as any;
    const page  = Math.max(1, parseInt(q.page)  || 1);
    const limit = Math.min(100, parseInt(q.limit) || 20);
    const skip  = (page - 1) * limit;

    const filter: any = { company_id: tenantId, status: 'active' };
    if (q.search) {
      const rx = new RegExp(q.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ first_name: rx }, { last_name: rx }, { email: rx }, { phone: rx }];
    }

    const [data, total] = await Promise.all([
      col().find(filter).sort({ created_at: -1 }).skip(skip).limit(limit).toArray(),
      col().countDocuments(filter),
    ]);

    return reply.send({
      success: true,
      data: data.map(d => ({ id: d._id!.toString(), ...d, _id: undefined })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit), hasMore: skip + data.length < total },
    });
  });

  /** POST /api/customers */
  fastify.post('/', { preHandler }, async (request, reply) => {
    const tenantId = getTenantId(request);
    const parsed = createSchema.safeParse(request.body);
    if (!parsed.success) throw new ValidationError('Invalid input', parsed.error.errors);

    // Unique phone per company
    if (parsed.data.phone) {
      const exists = await col().countDocuments({ company_id: tenantId, phone: parsed.data.phone });
      if (exists) throw new ConflictError('A customer with this phone number already exists');
    }

    const now = new Date();
    const result = await col().insertOne({
      company_id: tenantId,
      ...parsed.data,
      status: 'active',
      created_at: now,
      updated_at: now,
    } as any);

    return reply.status(201).send({
      success: true,
      data: { id: result.insertedId.toString(), ...parsed.data },
      message: 'Customer created',
    });
  });

  /** GET /api/customers/:id */
  fastify.get('/:id', { preHandler }, async (request, reply) => {
    const tenantId = getTenantId(request);
    const { id } = request.params as { id: string };
    const doc = await col().findOne({ _id: new ObjectId(id), company_id: tenantId });
    if (!doc) throw new NotFoundError('Customer not found');
    return reply.send({ success: true, data: { id: doc._id!.toString(), ...doc, _id: undefined } });
  });

  /** PATCH /api/customers/:id */
  fastify.patch('/:id', { preHandler }, async (request, reply) => {
    const tenantId = getTenantId(request);
    const { id } = request.params as { id: string };
    const parsed = updateSchema.safeParse(request.body);
    if (!parsed.success) throw new ValidationError('Invalid input', parsed.error.errors);

    const doc = await col().findOneAndUpdate(
      { _id: new ObjectId(id), company_id: tenantId },
      { $set: { ...parsed.data, updated_at: new Date() } },
      { returnDocument: 'after' }
    );
    if (!doc) throw new NotFoundError('Customer not found');
    return reply.send({ success: true, data: { id: doc._id!.toString(), ...doc, _id: undefined } });
  });

  /** DELETE /api/customers/:id */
  fastify.delete('/:id', { preHandler }, async (request, reply) => {
    const tenantId = getTenantId(request);
    const { id } = request.params as { id: string };
    const result = await col().updateOne(
      { _id: new ObjectId(id), company_id: tenantId },
      { $set: { status: 'inactive', updated_at: new Date() } }
    );
    if (!result.modifiedCount) throw new NotFoundError('Customer not found');
    return reply.send({ success: true, message: 'Customer deactivated' });
  });
}
