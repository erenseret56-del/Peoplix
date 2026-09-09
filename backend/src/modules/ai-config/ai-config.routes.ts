import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { aiConfigService } from './ai-config.service.js';
import { authenticateJWT, requireSuperAdmin, requireAdmin } from '../../middleware/auth.js';
import { resolveTenant, getTenantId } from '../../middleware/tenant.js';
import { ValidationError } from '../../middleware/errorHandler.js';

// ── SCHEMAS ──────────────────────────────────────────────────────────────────

const businessHoursDaySchema = z.object({
  day: z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']),
  open: z.boolean(),
  open_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  close_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
});

const businessHoursSchema = z.object({
  timezone: z.string().default('UTC'),
  schedule: z.array(businessHoursDaySchema),
});

const featuresSchema = z.object({
  employee_lookup: z.boolean().optional(),
  department_lookup: z.boolean().optional(),
  faq_search: z.boolean().optional(),
  policy_search: z.boolean().optional(),
  document_search: z.boolean().optional(),
  after_hours_message: z.boolean().optional(),
});

const upsertSchema = z.object({
  retell_agent_id: z.string().min(1).optional(),
  retell_llm_id: z.string().optional(),
  dynamic_variables: z.record(z.string()).optional(),
  ai_instructions: z.string().max(5000).optional(),
  welcome_message_template: z.string().max(500).optional(),
  business_hours: businessHoursSchema.optional(),
  features: featuresSchema.optional(),
  webhook_url: z.string().url().optional(),
});

// ── ROUTES ───────────────────────────────────────────────────────────────────

export async function aiConfigRoutes(fastify: FastifyInstance) {

  // ──────────────────────────────────────────────────────────────────────────
  // COMPANY ADMIN ROUTES — manage own company's AI config
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * GET /api/ai-config/my
   * Company admin — get own company AI config (safe view, no secrets)
   */
  fastify.get(
    '/my',
    { preHandler: [authenticateJWT, resolveTenant, requireAdmin] },
    async (request, reply) => {
      const tenantId = getTenantId(request);
      const result = await aiConfigService.getPublicConfig(tenantId);
      return reply.send({ success: true, data: result });
    }
  );

  /**
   * PUT /api/ai-config/my
   * Company admin — create/update own AI config
   */
  fastify.put(
    '/my',
    { preHandler: [authenticateJWT, resolveTenant, requireAdmin] },
    async (request, reply) => {
      const tenantId = getTenantId(request);
      const parsed = upsertSchema.safeParse(request.body);
      if (!parsed.success) throw new ValidationError('Invalid input', parsed.error.errors);

      const result = await aiConfigService.upsert(tenantId, parsed.data);

      // Return safe view (exclude webhook_secret etc.)
      return reply.send({
        success: true,
        data: {
          retell_agent_id: result.retell_agent_id,
          ai_instructions: result.ai_instructions,
          welcome_message_template: result.welcome_message_template,
          features: result.features,
          business_hours: result.business_hours,
          dynamic_variables: sanitizeDynamicVars(result.dynamic_variables),
          updated_at: result.updated_at,
        },
        message: 'AI configuration updated',
      });
    }
  );

  /**
   * GET /api/ai-config/my/public
   * Any authenticated user — safe public AI config (for UI display)
   */
  fastify.get(
    '/my/public',
    { preHandler: [authenticateJWT, resolveTenant] },
    async (request, reply) => {
      const tenantId = getTenantId(request);
      const result = await aiConfigService.getPublicConfig(tenantId);
      return reply.send({ success: true, data: result });
    }
  );

  // ──────────────────────────────────────────────────────────────────────────
  // SUPER ADMIN ROUTES — manage any company's AI config
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * GET /api/ai-config/company/:companyId
   * Super admin — get any company's AI config
   */
  fastify.get(
    '/company/:companyId',
    { preHandler: [authenticateJWT, requireSuperAdmin] },
    async (request, reply) => {
      const { companyId } = request.params as { companyId: string };
      const result = await aiConfigService.getPublicConfig(companyId);
      return reply.send({ success: true, data: result });
    }
  );

  /**
   * PUT /api/ai-config/company/:companyId
   * Super admin — create/update any company's AI config
   */
  fastify.put(
    '/company/:companyId',
    { preHandler: [authenticateJWT, requireSuperAdmin] },
    async (request, reply) => {
      const { companyId } = request.params as { companyId: string };
      const parsed = upsertSchema.safeParse(request.body);
      if (!parsed.success) throw new ValidationError('Invalid input', parsed.error.errors);

      const result = await aiConfigService.upsert(companyId, parsed.data);

      return reply.send({
        success: true,
        data: {
          company_id: result.company_id,
          retell_agent_id: result.retell_agent_id,
          retell_llm_id: result.retell_llm_id,
          ai_instructions: result.ai_instructions,
          welcome_message_template: result.welcome_message_template,
          features: result.features,
          business_hours: result.business_hours,
          dynamic_variables: result.dynamic_variables,
          status: result.status,
          updated_at: result.updated_at,
        },
        message: 'AI configuration updated',
      });
    }
  );
}

// ── HELPERS ──────────────────────────────────────────────────────────────────

/**
 * Remove any potentially sensitive keys from dynamic variables
 * before returning them to a company admin
 */
function sanitizeDynamicVars(vars: Record<string, any>): Record<string, any> {
  const unsafe = ['api_key', 'secret', 'token', 'password', 'webhook'];
  const result: Record<string, any> = {};
  for (const [k, v] of Object.entries(vars)) {
    if (!unsafe.some(u => k.toLowerCase().includes(u))) {
      result[k] = v;
    }
  }
  return result;
}
