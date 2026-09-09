import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { departmentsRepository } from './departments.repository.js';
import { authenticateJWT } from '../../middleware/auth.js';
import { resolveTenant, getTenantId } from '../../middleware/tenant.js';
import { NotFoundError, ConflictError, ValidationError } from '../../middleware/errorHandler.js';

const schema = z.object({
  name: z.string().min(1).max(255),
  code: z.string().max(50).optional(),
  description: z.string().optional(),
  parent_department_id: z.string().optional(),
});

export async function departmentsRoutes(fastify: FastifyInstance) {
  const preHandler = [authenticateJWT, resolveTenant];

  fastify.get('/', { preHandler }, async (request, reply) => {
    const tenantId = getTenantId(request);
    const q = request.query as any;
    const skip = ((+(q.page || 1)) - 1) * (+(q.limit || 100));
    const { data, total } = await departmentsRepository.findAll(tenantId, skip, +(q.limit || 100));

    return reply.send({
      success: true,
      data: data.map(d => ({ id: d._id!.toString(), ...d, _id: undefined })),
      pagination: { total },
    });
  });

  fastify.post('/', { preHandler }, async (request, reply) => {
    const tenantId = getTenantId(request);
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) throw new ValidationError('Invalid input', parsed.error.errors);

    if (parsed.data.code && await departmentsRepository.existsByCode(tenantId, parsed.data.code)) {
      throw new ConflictError('Department code already exists');
    }

    const doc = await departmentsRepository.create({
      company_id: tenantId,
      ...parsed.data,
      status: 'active',
    });

    return reply.status(201).send({
      success: true,
      data: { id: doc._id!.toString(), ...doc, _id: undefined },
    });
  });

  fastify.get('/:id', { preHandler }, async (request, reply) => {
    const tenantId = getTenantId(request);
    const { id } = request.params as { id: string };
    const doc = await departmentsRepository.findById(tenantId, id);
    if (!doc) throw new NotFoundError('Department not found');
    return reply.send({ success: true, data: { id: doc._id!.toString(), ...doc, _id: undefined } });
  });

  fastify.patch('/:id', { preHandler }, async (request, reply) => {
    const tenantId = getTenantId(request);
    const { id } = request.params as { id: string };
    const parsed = schema.partial().safeParse(request.body);
    if (!parsed.success) throw new ValidationError('Invalid input', parsed.error.errors);

    const doc = await departmentsRepository.update(tenantId, id, parsed.data);
    if (!doc) throw new NotFoundError('Department not found');

    return reply.send({ success: true, data: { id: doc._id!.toString(), ...doc, _id: undefined } });
  });

  fastify.delete('/:id', { preHandler }, async (request, reply) => {
    const tenantId = getTenantId(request);
    const { id } = request.params as { id: string };
    const ok = await departmentsRepository.delete(tenantId, id);
    if (!ok) throw new NotFoundError('Department not found');
    return reply.send({ success: true, message: 'Department deleted' });
  });
}
