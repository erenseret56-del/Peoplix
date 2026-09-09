import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ObjectId } from 'mongodb';
import { getCollection, Collections } from '../../infrastructure/database/index.js';
import { authenticateJWT } from '../../middleware/auth.js';
import { resolveTenant, getTenantId } from '../../middleware/tenant.js';
import { NotFoundError, ConflictError, ValidationError } from '../../middleware/errorHandler.js';

interface DesignationDoc {
  _id?: ObjectId;
  company_id: string;
  title: string;
  code?: string;
  description?: string;
  level?: string;
  status: string;
  created_at: Date;
  updated_at: Date;
}

const schema = z.object({
  title: z.string().min(1).max(255),
  code: z.string().max(50).optional(),
  description: z.string().optional(),
  level: z.string().max(50).optional(),
});

export async function designationsRoutes(fastify: FastifyInstance) {
  const preHandler = [authenticateJWT, resolveTenant];
  const col = () => getCollection<DesignationDoc>(Collections.DESIGNATIONS);

  fastify.get('/', { preHandler }, async (request, reply) => {
    const tenantId = getTenantId(request);
    const data = await col()
      .find({ company_id: tenantId, status: 'active' })
      .sort({ title: 1 })
      .toArray();

    return reply.send({
      success: true,
      data: data.map(d => ({ id: d._id!.toString(), ...d, _id: undefined })),
    });
  });

  fastify.post('/', { preHandler }, async (request, reply) => {
    const tenantId = getTenantId(request);
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) throw new ValidationError('Invalid input', parsed.error.errors);

    if (parsed.data.code) {
      const exists = await col().countDocuments({ company_id: tenantId, code: parsed.data.code });
      if (exists) throw new ConflictError('Designation code already exists');
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
    });
  });

  fastify.get('/:id', { preHandler }, async (request, reply) => {
    const tenantId = getTenantId(request);
    const { id } = request.params as { id: string };
    const doc = await col().findOne({ _id: new ObjectId(id), company_id: tenantId });
    if (!doc) throw new NotFoundError('Designation not found');
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
    if (!doc) throw new NotFoundError('Designation not found');
    return reply.send({ success: true, data: { id: doc._id!.toString(), ...doc, _id: undefined } });
  });

  fastify.delete('/:id', { preHandler }, async (request, reply) => {
    const tenantId = getTenantId(request);
    const { id } = request.params as { id: string };
    const result = await col().updateOne(
      { _id: new ObjectId(id), company_id: tenantId },
      { $set: { status: 'inactive', updated_at: new Date() } }
    );
    if (!result.modifiedCount) throw new NotFoundError('Designation not found');
    return reply.send({ success: true, message: 'Designation deleted' });
  });
}
