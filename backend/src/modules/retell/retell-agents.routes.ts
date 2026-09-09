/**
 * Retell Agent Management Routes
 *
 * Allows super admins and company admins to manage per-company Retell agent
 * mappings. This is what allows PEOPLIX to map a Retell agent_id to a specific
 * company — the core of multi-tenant Retell isolation.
 *
 * One Retell agent can serve multiple companies (using dynamic variables),
 * OR each company can have their own dedicated agent — both patterns supported.
 */
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ObjectId } from 'mongodb';
import type { Document } from 'mongodb';
import { getCollection, Collections } from '../../infrastructure/database/index.js';
import { authenticateJWT, requireSuperAdmin, requireAdmin } from '../../middleware/auth.js';
import { resolveTenant, getTenantId } from '../../middleware/tenant.js';
import { NotFoundError, ConflictError, ValidationError } from '../../middleware/errorHandler.js';
import { writeAuditLog } from '../audit/audit.logger.js';

interface RetellAgentDoc extends Document {
  _id?: ObjectId;
  company_id: string;
  retell_agent_id: string;
  retell_llm_id?: string;
  name: string;
  description?: string;
  config?: Record<string, any>;
  status: string;
  created_at: Date;
  updated_at: Date;
}

const createSchema = z.object({
  retell_agent_id: z.string().min(1),
  retell_llm_id:   z.string().optional(),
  name:            z.string().min(1).max(255),
  description:     z.string().optional(),
  config:          z.record(z.any()).optional(),
});

const updateSchema = createSchema.partial().extend({
  status: z.enum(['active', 'inactive']).optional(),
});

export async function retellAgentsRoutes(fastify: FastifyInstance) {
  const col = () => getCollection<RetellAgentDoc>(Collections.RETELL_AGENTS);

  // ── COMPANY ADMIN ROUTES ─────────────────────────────────────────────────

  /** GET /api/retell-agents — list agents for own company */
  fastify.get(
    '/',
    { preHandler: [authenticateJWT, resolveTenant, requireAdmin] },
    async (request, reply) => {
      const tenantId = getTenantId(request);
      const data = await col()
        .find({ company_id: tenantId })
        .sort({ created_at: -1 })
        .toArray();

      return reply.send({
        success: true,
        data: data.map(d => ({
          id: d._id!.toString(),
          retell_agent_id: d.retell_agent_id,
          // Never expose LLM ID to frontend — it's a backend secret
          name: d.name,
          description: d.description,
          status: d.status,
          created_at: d.created_at,
        })),
      });
    }
  );

  /** POST /api/retell-agents — link Retell agent to company */
  fastify.post(
    '/',
    { preHandler: [authenticateJWT, resolveTenant, requireAdmin] },
    async (request, reply) => {
      const tenantId = getTenantId(request);
      const user = (request as any).user;
      const parsed = createSchema.safeParse(request.body);
      if (!parsed.success) throw new ValidationError('Invalid input', parsed.error.errors);

      // One active agent per company (can be changed)
      const existing = await col().countDocuments({
        company_id: tenantId,
        retell_agent_id: parsed.data.retell_agent_id,
      });
      if (existing) throw new ConflictError('This Retell agent is already linked to your company');

      const now = new Date();
      const result = await col().insertOne({
        company_id: tenantId,
        ...parsed.data,
        status: 'active',
        created_at: now,
        updated_at: now,
      } as any);

      writeAuditLog({
        company_id: tenantId,
        user_id: user.id,
        action: 'retell_agent.linked',
        entity_type: 'retell_agent',
        entity_id: result.insertedId.toString(),
        description: `Linked Retell agent: ${parsed.data.name}`,
      });

      return reply.status(201).send({
        success: true,
        data: { id: result.insertedId.toString(), ...parsed.data },
        message: 'Retell agent linked to company',
      });
    }
  );

  /** PATCH /api/retell-agents/:id */
  fastify.patch(
    '/:id',
    { preHandler: [authenticateJWT, resolveTenant, requireAdmin] },
    async (request, reply) => {
      const tenantId = getTenantId(request);
      const { id } = request.params as { id: string };
      const parsed = updateSchema.safeParse(request.body);
      if (!parsed.success) throw new ValidationError('Invalid input', parsed.error.errors);

      const doc = await col().findOneAndUpdate(
        { _id: new ObjectId(id), company_id: tenantId },
        { $set: { ...parsed.data, updated_at: new Date() } },
        { returnDocument: 'after' }
      );
      if (!doc) throw new NotFoundError('Retell agent not found');

      return reply.send({ success: true, data: { id: doc._id!.toString(), name: doc.name, status: doc.status } });
    }
  );

  /** DELETE /api/retell-agents/:id */
  fastify.delete(
    '/:id',
    { preHandler: [authenticateJWT, resolveTenant, requireAdmin] },
    async (request, reply) => {
      const tenantId = getTenantId(request);
      const { id } = request.params as { id: string };

      const result = await col().updateOne(
        { _id: new ObjectId(id), company_id: tenantId },
        { $set: { status: 'inactive', updated_at: new Date() } }
      );
      if (!result.modifiedCount) throw new NotFoundError('Retell agent not found');

      return reply.send({ success: true, message: 'Retell agent unlinked' });
    }
  );

  // ── SUPER ADMIN ROUTES ───────────────────────────────────────────────────

  /** GET /api/retell-agents/admin/all — list all agents across all companies */
  fastify.get(
    '/admin/all',
    { preHandler: [authenticateJWT, requireSuperAdmin] },
    async (request, reply) => {
      const q = request.query as any;
      const filter: any = {};
      if (q.company_id) filter.company_id = q.company_id;

      const data = await col().find(filter).sort({ created_at: -1 }).limit(200).toArray();

      return reply.send({
        success: true,
        data: data.map(d => ({
          id: d._id!.toString(),
          company_id: d.company_id,
          retell_agent_id: d.retell_agent_id,
          retell_llm_id: d.retell_llm_id,
          name: d.name,
          status: d.status,
          created_at: d.created_at,
        })),
      });
    }
  );

  /** POST /api/retell-agents/admin — super admin links agent to any company */
  fastify.post(
    '/admin',
    { preHandler: [authenticateJWT, requireSuperAdmin] },
    async (request, reply) => {
      const body = request.body as any;
      const parsed = createSchema.extend({ company_id: z.string().min(1) }).safeParse(body);
      if (!parsed.success) throw new ValidationError('Invalid input', parsed.error.errors);

      const now = new Date();
      const result = await col().insertOne({
        ...parsed.data,
        status: 'active',
        created_at: now,
        updated_at: now,
      } as any);

      return reply.status(201).send({
        success: true,
        data: { id: result.insertedId.toString(), ...parsed.data },
        message: 'Retell agent linked',
      });
    }
  );
}
