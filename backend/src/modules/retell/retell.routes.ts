import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { retellService } from './retell.service.js';
import { retellClient } from './retell.client.js';
import { verifyRetellSignature } from './retell.webhook.js';
import { authenticateJWT } from '../../middleware/auth.js';
import { resolveTenant, getTenantId } from '../../middleware/tenant.js';
import { logger } from '../../config/logger.js';
import { aiConfigService } from '../ai-config/ai-config.service.js';
import { requireRole, requireSuperAdmin } from '../../middleware/auth.js';
import { getCollection, Collections, ObjectId } from '../../infrastructure/database/index.js';
import { companiesRepository } from '../companies/companies.repository.js';
import { addNumberToSipTrunk } from '../phone-numbers/phone-numbers.service.js';
import { config } from '../../config/env.js';

// ── WEBHOOK AUTH MIDDLEWARE ───────────────────────────────────────────────────
async function requireRetellWebhook(request: FastifyRequest, reply: FastifyReply) {
  const signature = request.headers['x-retell-signature'] as string | undefined;
  const rawBody = (request as any).rawBody || JSON.stringify(request.body);
  if (!verifyRetellSignature(rawBody, signature)) {
    logger.warn({ url: request.url, ip: request.ip }, 'Invalid Retell webhook signature — rejected');
    return reply.status(401).send({
      success: false,
      error: { code: 'INVALID_SIGNATURE', message: 'Unauthorized' },
    });
  }
}

// ── SCHEMA ────────────────────────────────────────────────────────────────────
const callQuerySchema = z.object({
  call_id: z.string().min(1),
  query: z.string().min(1).max(200),
});

// ── HELPERS ───────────────────────────────────────────────────────────────────
function notFoundReply(message: string) {
  return { success: true, data: { found: false, message, data: null } };
}

async function resolveCompany(callId: string, agentId?: string): Promise<string | null> {
  let companyId = await retellService.resolveCompanyFromCall(callId);
  if (!companyId && agentId) {
    companyId = await retellService.resolveCompanyFromAgent(agentId);
  }
  return companyId;
}

// ── ROUTES ────────────────────────────────────────────────────────────────────
export async function retellRoutes(fastify: FastifyInstance) {

  fastify.get('/my/models', { preHandler: [authenticateJWT, resolveTenant, requireRole('company_admin')] }, async (request, reply) => {
    const tenantId = getTenantId(request);
    const { assignment_id: assignmentId } = request.query as { assignment_id?: string };
    const agentId = config.retell.agentId;
    if (!agentId) {
      return reply.status(503).send({ success: false, error: { code: 'NOT_CONFIGURED', message: 'The shared demo Retell agent is not configured.' } });
    }
    if (assignmentId) {
      if (!ObjectId.isValid(assignmentId)) {
        return reply.status(400).send({ success: false, error: { code: 'INVALID_INPUT', message: 'Invalid phone assignment' } });
      }
      const assignment = await getCollection(Collections.PHONE_ASSIGNMENTS).findOne({ _id: new ObjectId(assignmentId), company_id: tenantId, status: 'assigned' });
      if (!assignment) {
        return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Phone number does not belong to this company' } });
      }
    }
    const model = await retellClient.getAgent(agentId);
    const models = model?.agent_id ? [model] : [];
    return reply.send({ success: true, data: models });
  });

  /** GET /api/retell/models - live Retell agents available to super admins */
  fastify.get('/models', { preHandler: [authenticateJWT, requireSuperAdmin] }, async (_request, reply) => {
    const [model, assignments] = await Promise.all([
      config.retell.agentId ? retellClient.getAgent(config.retell.agentId) : Promise.resolve(null),
      getCollection(Collections.PHONE_ASSIGNMENTS).find({ status: 'assigned' }).sort({ assigned_at: -1 }).toArray(),
    ]);
    const profiles = await getCollection(Collections.NUMBER_PROFILES).find({}).toArray();
    const profilesByAssignment = new Map(profiles.map((profile) => [profile.phone_assignment_id, profile]));
    const numbers = await Promise.all(assignments.map(async (assignment) => {
      const company = await companiesRepository.findById(String(assignment.company_id));
      const profile = profilesByAssignment.get(assignment._id.toString());
      return {
        assignment_id: assignment._id.toString(),
        company_id: assignment.company_id,
        company_name: company?.name || 'Unknown company',
        phone_number: assignment.phone_number,
        retell_agent_id: profile?.retell_agent_id || null,
      };
    }));
    return reply.send({ success: true, data: { models: model?.agent_id ? [model] : [], numbers } });
  });

  fastify.post('/inbound-call', { preHandler: [requireRetellWebhook] }, async (request, reply) => {
    const body = request.body as any;
    const inbound = body.call_inbound || {};
    const destinationNumber = inbound.to_number || inbound.destination_number;
    const assignment = await retellService.resolvePhoneAssignmentForNumber(destinationNumber);

    if (!assignment) {
      logger.warn({
        callId: inbound.call_id || null,
        destinationNumber: destinationNumber || null,
        reason: 'NO_COMPANY_FOR_PHONE',
      }, 'Inbound call rejected: no company assignment for destination number');
      return reply.send({ call_inbound: { reject: true, reason: 'NO_COMPANY_FOR_PHONE' } });
    }

    const resolvedConfig = await aiConfigService.getResolvedConfig(assignment.company_id, {
      phoneAssignmentId: assignment.phone_assignment_id,
      phoneNumber: assignment.phone_number || destinationNumber,
    });
    const inboundKnowledge = resolvedConfig.dynamic_variables.company_knowledge || '';

    logger.info({
      callId: inbound.call_id || null,
      destinationNumber: assignment.phone_number || destinationNumber,
      phoneAssignmentId: assignment.phone_assignment_id,
      companyId: assignment.company_id,
      companyName: resolvedConfig.dynamic_variables.company_name,
      agentId: resolvedConfig.retell_agent_id,
      numberProfileFound: inboundKnowledge.includes('Number profile:'),
      companyKnowledgeFound: Boolean(inboundKnowledge.trim()),
      companyKnowledgeLength: inboundKnowledge.length,
      dynamicVariableKeys: Object.keys(resolvedConfig.dynamic_variables),
    }, 'Inbound call context resolved');

    return reply.send({
      call_inbound: {
        override_agent_id: resolvedConfig.retell_agent_id,
        dynamic_variables: resolvedConfig.dynamic_variables,
        welcome_message: resolvedConfig.welcome_message,
        metadata: {
          company_id: assignment.company_id,
          phone_assignment_id: assignment.phone_assignment_id,
          phone_number: assignment.phone_number || destinationNumber,
          agent_id: resolvedConfig.retell_agent_id,
        },
      },
    });
  });

  /** POST /api/retell/models/assign - assign one live Retell agent to one number */
  fastify.post('/models/assign', { preHandler: [authenticateJWT, requireSuperAdmin] }, async (request, reply) => {
    const body = request.body as { assignment_id?: string; retell_agent_id?: string };
    if (!body.assignment_id || !body.retell_agent_id || !ObjectId.isValid(body.assignment_id)) {
      return reply.status(400).send({ success: false, error: { code: 'INVALID_INPUT', message: 'Assignment ID and Retell agent ID are required' } });
    }
    if (!config.retell.agentId || body.retell_agent_id !== config.retell.agentId) {
      return reply.status(400).send({ success: false, error: { code: 'INVALID_AGENT', message: 'Only the configured demo Retell agent can be assigned.' } });
    }
    const assignment = await getCollection(Collections.PHONE_ASSIGNMENTS).findOne({ _id: new ObjectId(body.assignment_id), status: 'assigned' });
    if (!assignment) return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Assigned phone number not found' } });
    const model = await retellClient.getAgent(body.retell_agent_id);
    if (!model?.agent_id) return reply.status(404).send({ success: false, error: { code: 'MODEL_NOT_FOUND', message: 'Retell agent not found' } });
    if (!config.retell.twilioTerminationUri) {
      return reply.status(503).send({ success: false, error: { code: 'RETELL_TERMINATION_URI_MISSING', message: 'Configure RETELL_TWILIO_TERMINATION_URI before binding production phone numbers to Retell.' } });
    }
    await addNumberToSipTrunk(assignment.twilio_sid);
    await retellClient.importPhoneNumber(
      assignment.phone_number,
      config.retell.twilioTerminationUri,
      body.retell_agent_id,
      `${assignment.phone_number} - ${model.agent_name}`,
      config.retell.inboundWebhookUrl,
    );
    const now = new Date();
    await getCollection(Collections.NUMBER_PROFILES).updateOne(
      { company_id: assignment.company_id, phone_assignment_id: body.assignment_id },
      { $set: { company_id: assignment.company_id, phone_assignment_id: body.assignment_id, retell_agent_id: body.retell_agent_id, updated_at: now }, $setOnInsert: { display_name: '', knowledge_text: '', created_at: now } },
      { upsert: true },
    );
    return reply.send({ success: true, data: { assignment_id: body.assignment_id, retell_agent_id: body.retell_agent_id, model_name: model.agent_name }, message: 'Retell model assigned to number' });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // WEBHOOKS  (called directly by Retell AI)
  // ────────────────────────────────────────────────────────────────────────────

  fastify.post('/webhook', { preHandler: [requireRetellWebhook] }, async (request, reply) => {
    const body = request.body as any;
    const event = body.event || body.event_type;
    const call = body.call || body;

    if (event === 'call_started') {
      await retellService.handleCallStarted({
        call_id: call.call_id,
        agent_id: call.agent_id,
        from_number: call.from_number,
        to_number: call.to_number,
        call_type: call.call_type,
        metadata: call.metadata,
        started_at: call.started_timestamp,
      });
    } else if (event === 'call_ended') {
      await retellService.handleCallEnded({
        call_id: call.call_id,
        agent_id: call.agent_id,
        from_number: call.from_number,
        to_number: call.to_number,
        call_type: call.call_type,
        started_at: call.start_timestamp ? new Date(call.start_timestamp).toISOString() : undefined,
        ended_at: call.end_timestamp,
        duration_ms: call.duration_ms,
        transcript: call.transcript,
        recording_url: call.recording_url,
        call_analysis: call.call_analysis,
        metadata: call.metadata,
      });
    }

    return reply.status(200).send({ success: true });
  });

  fastify.post('/webhook/call-started', { preHandler: [requireRetellWebhook] }, async (request, reply) => {
    const body = request.body as any;
    await retellService.handleCallStarted({
      call_id: body.call_id,
      agent_id: body.agent_id,
      from_number: body.from_number,
      to_number: body.to_number,
      call_type: body.call_type,
      // company_id lives in metadata — placed there by create-web-call
      metadata: body.metadata,
      started_at: body.started_timestamp,
    });
    return reply.status(200).send({ success: true });
  });

  fastify.post('/webhook/call-ended', { preHandler: [requireRetellWebhook] }, async (request, reply) => {
    const body = request.body as any;
    await retellService.handleCallEnded({
      call_id: body.call_id,
      agent_id: body.agent_id,
      from_number: body.from_number,
      to_number: body.to_number,
      call_type: body.call_type,
      started_at: body.start_timestamp ? new Date(body.start_timestamp).toISOString() : undefined,
      ended_at: body.end_timestamp,
      duration_ms: body.duration_ms,
      transcript: body.transcript,
      recording_url: body.recording_url,
      call_analysis: body.call_analysis,
      metadata: body.metadata,
    });
    return reply.status(200).send({ success: true });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // AI FUNCTION CALLS  (called by Retell LLM during a voice call)
  // company is resolved from the call_id → NEVER from user-supplied input
  // ────────────────────────────────────────────────────────────────────────────

  fastify.post('/functions/search-employee', { preHandler: [requireRetellWebhook] }, async (request, reply) => {
    const parsed = callQuerySchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send(notFoundReply("I couldn't process that request."));

    const { call_id, query } = parsed.data;
    const companyId = await resolveCompany(call_id, (request.body as any).agent_id);
    if (!companyId) return reply.send(notFoundReply("I'm unable to access company information for this call."));

    // Guard: check feature flag from DB
    const enabled = await aiConfigService.isFeatureEnabled(companyId, 'employee_lookup');
    if (!enabled) return reply.send(notFoundReply("Employee lookup is not enabled for this company."));

    const result = await retellService.searchEmployee(companyId, query);
    return reply.send({ success: true, data: result });
  });

  fastify.post('/functions/search-department', { preHandler: [requireRetellWebhook] }, async (request, reply) => {
    const parsed = callQuerySchema.safeParse(request.body);
    if (!parsed.success) return reply.send(notFoundReply("I couldn't process that request."));

    const { call_id, query } = parsed.data;
    const companyId = await resolveCompany(call_id, (request.body as any).agent_id);
    if (!companyId) return reply.send(notFoundReply("I'm unable to access company information."));

    const enabled = await aiConfigService.isFeatureEnabled(companyId, 'department_lookup');
    if (!enabled) return reply.send(notFoundReply("Department lookup is not enabled for this company."));

    const result = await retellService.searchDepartment(companyId, query);
    return reply.send({ success: true, data: result });
  });

  fastify.post('/functions/search-faq', { preHandler: [requireRetellWebhook] }, async (request, reply) => {
    const parsed = callQuerySchema.safeParse(request.body);
    if (!parsed.success) return reply.send(notFoundReply("I couldn't process that request."));

    const { call_id, query } = parsed.data;
    const companyId = await resolveCompany(call_id, (request.body as any).agent_id);
    if (!companyId) return reply.send(notFoundReply("I'm unable to access company information."));

    const enabled = await aiConfigService.isFeatureEnabled(companyId, 'faq_search');
    if (!enabled) return reply.send(notFoundReply("FAQ search is not enabled for this company."));

    const result = await retellService.searchFAQ(companyId, query);
    return reply.send({ success: true, data: result });
  });

  fastify.post('/functions/search-policy', { preHandler: [requireRetellWebhook] }, async (request, reply) => {
    const parsed = callQuerySchema.safeParse(request.body);
    if (!parsed.success) return reply.send(notFoundReply("I couldn't process that request."));

    const { call_id, query } = parsed.data;
    const companyId = await resolveCompany(call_id, (request.body as any).agent_id);
    if (!companyId) return reply.send(notFoundReply("I'm unable to access company information."));

    const enabled = await aiConfigService.isFeatureEnabled(companyId, 'policy_search');
    if (!enabled) return reply.send(notFoundReply("Policy search is not enabled for this company."));

    const result = await retellService.searchPolicy(companyId, query);
    return reply.send({ success: true, data: result });
  });

  fastify.post('/functions/search-company-info', { preHandler: [requireRetellWebhook] }, async (request, reply) => {
    const parsed = callQuerySchema.safeParse(request.body);
    if (!parsed.success) return reply.send(notFoundReply("I couldn't process that request."));

    const { call_id, query } = parsed.data;
    const companyId = await resolveCompany(call_id, (request.body as any).agent_id);
    if (!companyId) return reply.send(notFoundReply("I'm unable to access company information."));

    const phoneAssignmentId = await retellService.getPhoneAssignmentForCall(call_id);
    const result = await retellService.searchCompanyInfo(companyId, query, phoneAssignmentId || undefined);
    return reply.send({ success: true, data: result });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // FRONTEND — authenticated web call creation
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * POST /api/retell/create-web-call
   *
   * The frontend calls this endpoint. The backend:
   * 1. Resolves company from authenticated JWT (never from request body)
   * 2. Loads company's AI config from DB
   * 3. Builds company-specific dynamic variables (company_name, phone, etc.)
   * 4. Creates Retell web call with those variables
   * 5. Returns ONLY the access_token to the frontend — never the API key
   *
   * This means {{company_name}} in the Retell prompt will say
   * "Acme Corp" for one company and "Beta Inc" for another —
   * without any code changes, purely driven by DB config.
   */
  fastify.post(
    '/create-web-call',
    { preHandler: [authenticateJWT, resolveTenant] },
    async (request, reply) => {
      const tenantId = getTenantId(request);
      const parsed = z.object({ assignment_id: z.string().optional() }).safeParse(request.body || {});
      if (!parsed.success) {
        return reply.status(400).send({ success: false, error: { code: 'INVALID_INPUT', message: 'Invalid phone assignment' } });
      }

      // Load company and number-specific data via the same canonical config resolver
      let phoneAssignmentId: string | undefined;
      if (parsed.data.assignment_id) {
        if (!ObjectId.isValid(parsed.data.assignment_id)) {
          return reply.status(400).send({ success: false, error: { code: 'INVALID_INPUT', message: 'Invalid phone assignment' } });
        }
        const assignment = await getCollection(Collections.PHONE_ASSIGNMENTS).findOne({
          _id: new ObjectId(parsed.data.assignment_id),
          company_id: tenantId,
          status: 'assigned',
        });
        if (!assignment) {
          return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Phone number does not belong to this company' } });
        }
        phoneAssignmentId = parsed.data.assignment_id;
      }

      const resolvedConfig = await aiConfigService.getResolvedConfig(tenantId, {
        phoneAssignmentId,
        phoneNumber: phoneAssignmentId ? (await getCollection(Collections.PHONE_ASSIGNMENTS).findOne({ _id: new ObjectId(phoneAssignmentId), company_id: tenantId, status: 'assigned' }, { projection: { phone_number: 1 } }))?.phone_number : undefined,
      });
      const agentId = config.retell.agentId;
      if (!agentId) {
        return reply.status(503).send({ success: false, error: { code: 'NOT_CONFIGURED', message: 'The shared demo Retell agent is not configured.' } });
      }
      const dynamicVariables = resolvedConfig.dynamic_variables;
      const webKnowledge = dynamicVariables.company_knowledge || '';

      // Create the call with company-specific dynamic variables
      const webCall = await retellClient.createWebCall(
        agentId,
        tenantId,
        dynamicVariables,
        {
          welcome_message: resolvedConfig.welcome_message,
          ...(phoneAssignmentId ? { phone_assignment_id: phoneAssignmentId } : {}),
        }
      );

      // Log the call start
      await retellService.handleCallStarted({
        call_id: webCall.call_id,
        agent_id: agentId,
        call_type: 'web',
        metadata: { company_id: tenantId, ...(phoneAssignmentId ? { phone_assignment_id: phoneAssignmentId } : {}) },
      });

      logger.info({
        tenantId,
        callId: webCall.call_id,
        agentId,
        companyName: resolvedConfig.dynamic_variables.company_name,
        phoneAssignmentId: phoneAssignmentId || null,
        companyKnowledgeFound: Boolean(webKnowledge.trim()),
        companyKnowledgeLength: webKnowledge.length,
        dynamicVariableKeys: Object.keys(resolvedConfig.dynamic_variables),
      }, 'Web call created');

      // Return ONLY the access token — never the Retell API key
      return reply.send({
        success: true,
        data: {
          access_token: webCall.access_token,
          call_id: webCall.call_id,
        },
      });
    }
  );

  /**
   * GET /api/retell/config
   * Frontend can fetch safe (non-secret) AI config for UI display
   */
  fastify.get(
    '/config',
    { preHandler: [authenticateJWT, resolveTenant] },
    async (request, reply) => {
      const tenantId = getTenantId(request);
      const result = await aiConfigService.getPublicConfig(tenantId);
      return reply.send({ success: true, data: result });
    }
  );
}
