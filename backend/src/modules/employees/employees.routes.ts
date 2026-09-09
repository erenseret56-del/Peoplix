import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { employeesService } from './employees.service.js';
import { authenticateJWT } from '../../middleware/auth.js';
import { resolveTenant, getTenantId } from '../../middleware/tenant.js';
import { ValidationError } from '../../middleware/errorHandler.js';

const createEmployeeSchema = z.object({
  employee_number: z.string().min(1).max(50),
  first_name: z.string().min(1).max(100),
  last_name: z.string().min(1).max(100),
  email: z.string().email().optional(),
  phone: z.string().max(50).optional(),
  department_id: z.string().optional(),
  designation_id: z.string().optional(),
  manager_id: z.string().optional(),
  hire_date: z.string().optional(),
  date_of_birth: z.string().optional(),
  employment_type: z.enum(['full-time', 'part-time', 'contract', 'intern']).optional(),
  metadata: z.record(z.any()).optional(),
});

const updateEmployeeSchema = createEmployeeSchema.partial().extend({
  status: z.enum(['active', 'inactive', 'terminated', 'on_leave']).optional(),
});

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.string().optional(),
  department_id: z.string().optional(),
});

export async function employeesRoutes(fastify: FastifyInstance) {
  // All routes require auth + tenant
  const preHandler = [authenticateJWT, resolveTenant];

  /**
   * GET /api/employees
   */
  fastify.get('/', { preHandler }, async (request, reply) => {
    const tenantId = getTenantId(request);
    const parsed = querySchema.safeParse(request.query);
    const q = parsed.success ? parsed.data : { page: 1, limit: 20 };

    const result = await employeesService.list(tenantId, {
      page: q.page,
      limit: q.limit,
      status: q.status,
      departmentId: q.department_id,
    });

    return reply.send({ success: true, ...result });
  });

  /**
   * POST /api/employees
   */
  fastify.post('/', { preHandler }, async (request, reply) => {
    const tenantId = getTenantId(request);
    const parsed = createEmployeeSchema.safeParse(request.body);
    if (!parsed.success) throw new ValidationError('Invalid input', parsed.error.errors);

    const result = await employeesService.create(tenantId, parsed.data);

    return reply.status(201).send({
      success: true,
      data: result,
      message: 'Employee created successfully',
    });
  });

  /**
   * GET /api/employees/:id
   */
  fastify.get('/:id', { preHandler }, async (request, reply) => {
    const tenantId = getTenantId(request);
    const { id } = request.params as { id: string };

    const result = await employeesService.getById(tenantId, id);
    return reply.send({ success: true, data: result });
  });

  /**
   * PATCH /api/employees/:id
   */
  fastify.patch('/:id', { preHandler }, async (request, reply) => {
    const tenantId = getTenantId(request);
    const { id } = request.params as { id: string };
    const parsed = updateEmployeeSchema.safeParse(request.body);
    if (!parsed.success) throw new ValidationError('Invalid input', parsed.error.errors);

    const result = await employeesService.update(tenantId, id, parsed.data);

    return reply.send({ success: true, data: result, message: 'Employee updated' });
  });

  /**
   * DELETE /api/employees/:id
   */
  fastify.delete('/:id', { preHandler }, async (request, reply) => {
    const tenantId = getTenantId(request);
    const { id } = request.params as { id: string };

    await employeesService.delete(tenantId, id);
    return reply.send({ success: true, message: 'Employee deactivated' });
  });
}
