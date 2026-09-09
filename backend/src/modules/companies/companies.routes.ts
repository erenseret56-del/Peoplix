import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { companiesService } from './companies.service.js';
import { authenticateJWT, requireSuperAdmin, requireAdmin } from '../../middleware/auth.js';
import { resolveTenant, getTenantId } from '../../middleware/tenant.js';
import { ValidationError } from '../../middleware/errorHandler.js';
import { CompanyStatus } from '../../types/index.js';

const createCompanySchema = z.object({
  name: z.string().min(2).max(255),
  email: z.string().email().optional(),
  phone: z.string().max(50).optional(),
  website: z.string().url().optional(),
  timezone: z.string().max(50).optional(),
  description: z.string().max(10000).optional(),
  adminEmail: z.string().email().optional(),
  adminPassword: z.string().min(8).optional(),
});

const updateCompanySchema = createCompanySchema.partial().extend({
  status: z.nativeEnum(CompanyStatus).optional(),
  subscription_tier: z.string().optional(),
  billing_due_amount: z.coerce.number().min(0).optional(),
});

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export async function companiesRoutes(fastify: FastifyInstance) {

  fastify.get('/', { preHandler: [authenticateJWT, requireSuperAdmin] }, async (request, reply) => {
    const parsed = paginationSchema.safeParse(request.query);
    const { page, limit } = parsed.success ? parsed.data : { page: 1, limit: 20 };
    const result = await companiesService.list(page, limit);
    return reply.send({ success: true, ...result });
  });

  fastify.post('/', { preHandler: [authenticateJWT, requireSuperAdmin] }, async (request, reply) => {
    const parsed = createCompanySchema.safeParse(request.body);
    if (!parsed.success) throw new ValidationError('Invalid input', parsed.error.errors);
    const result = await companiesService.create(parsed.data);
    return reply.status(201).send({ success: true, data: result, message: 'Company created successfully' });
  });

  fastify.get('/my/profile', { preHandler: [authenticateJWT, resolveTenant, requireAdmin] }, async (request, reply) => {
    const tenantId = getTenantId(request);
    const result = await companiesService.getById(tenantId);
    return reply.send({ success: true, data: result });
  });

  fastify.get('/my/stats', { preHandler: [authenticateJWT, resolveTenant, requireAdmin] }, async (request, reply) => {
    const tenantId = getTenantId(request);
    const result = await companiesService.getStats(tenantId);
    return reply.send({ success: true, data: result });
  });

  fastify.patch('/my/profile', { preHandler: [authenticateJWT, resolveTenant, requireAdmin] }, async (request, reply) => {
    const tenantId = getTenantId(request);
    const parsed = updateCompanySchema.omit({ status: true, subscription_tier: true }).safeParse(request.body);
    if (!parsed.success) throw new ValidationError('Invalid input', parsed.error.errors);
    const result = await companiesService.update(tenantId, parsed.data);
    return reply.send({ success: true, data: result });
  });

  fastify.get('/:id', { preHandler: [authenticateJWT, requireSuperAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await companiesService.getById(id);
    return reply.send({ success: true, data: result });
  });

  fastify.patch('/:id', { preHandler: [authenticateJWT, requireSuperAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = updateCompanySchema.safeParse(request.body);
    if (!parsed.success) throw new ValidationError('Invalid input', parsed.error.errors);
    const result = await companiesService.update(id, parsed.data);
    return reply.send({ success: true, data: result, message: 'Company updated successfully' });
  });

  fastify.delete('/:id', { preHandler: [authenticateJWT, requireSuperAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await companiesService.delete(id);
    return reply.send({ success: true, message: 'Company deleted successfully' });
  });
}
