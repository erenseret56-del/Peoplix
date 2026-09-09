import { FastifyInstance } from 'fastify';
import { getCollection, Collections } from '../../infrastructure/database/index.js';
import { authenticateJWT, requireSuperAdmin, requireAdmin } from '../../middleware/auth.js';
import { resolveTenant, getTenantId } from '../../middleware/tenant.js';

export async function auditRoutes(fastify: FastifyInstance) {

  /**
   * GET /api/audit
   * Company admin — view audit logs for own company
   */
  fastify.get(
    '/',
    { preHandler: [authenticateJWT, resolveTenant, requireAdmin] },
    async (request, reply) => {
      const tenantId = getTenantId(request);
      const q = request.query as any;
      const page  = Math.max(1, parseInt(q.page)  || 1);
      const limit = Math.min(100, parseInt(q.limit) || 20);
      const skip  = (page - 1) * limit;

      const filter: any = { company_id: tenantId };
      if (q.action)      filter.action      = q.action;
      if (q.entity_type) filter.entity_type = q.entity_type;

      const col = getCollection(Collections.AUDIT_LOGS);
      const [data, total] = await Promise.all([
        col.find(filter)
          .sort({ created_at: -1 })
          .skip(skip)
          .limit(limit)
          .project({ _id: 0, changes: 0 })   // omit raw changes from list
          .toArray(),
        col.countDocuments(filter),
      ]);

      return reply.send({
        success: true,
        data,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    }
  );

  /**
   * GET /api/audit/all
   * Super admin — view audit logs across all companies
   */
  fastify.get(
    '/all',
    { preHandler: [authenticateJWT, requireSuperAdmin] },
    async (request, reply) => {
      const q = request.query as any;
      const page  = Math.max(1, parseInt(q.page)  || 1);
      const limit = Math.min(100, parseInt(q.limit) || 50);
      const skip  = (page - 1) * limit;

      const filter: any = {};
      if (q.company_id)  filter.company_id  = q.company_id;
      if (q.action)      filter.action      = q.action;
      if (q.entity_type) filter.entity_type = q.entity_type;

      const col = getCollection(Collections.AUDIT_LOGS);
      const [data, total] = await Promise.all([
        col.find(filter).sort({ created_at: -1 }).skip(skip).limit(limit).toArray(),
        col.countDocuments(filter),
      ]);

      return reply.send({
        success: true,
        data: data.map(d => ({ id: d._id.toString(), ...d, _id: undefined })),
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    }
  );
}
