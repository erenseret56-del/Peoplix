import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticateJWT, requireRole, requireSuperAdmin } from '../../middleware/auth.js';
import { resolveTenant, getTenantId } from '../../middleware/tenant.js';
import { getCollection, Collections } from '../../infrastructure/database/index.js';
import { ValidationError } from '../../middleware/errorHandler.js';
import { retellClient } from '../retell/retell.client.js';
import { config } from '../../config/env.js';
import { phoneNumbersService, syncNumbersToSipTrunk } from './phone-numbers.service.js';
import { ObjectId } from 'mongodb';
import { OfficeParser } from 'officeparser';

const countrySchema = z.object({ countryCode: z.string().length(2).optional() });

export async function phoneNumbersRoutes(fastify: FastifyInstance) {
  const preHandler = [authenticateJWT, requireSuperAdmin];

  fastify.get('/available', { preHandler }, async (request, reply) => {
    const parsed = countrySchema.safeParse(request.query);
    const numbers = await phoneNumbersService.listAvailable(parsed.success ? parsed.data.countryCode : undefined);
    return reply.send({ success: true, data: numbers });
  });

  fastify.get('/reserved', { preHandler }, async (_request, reply) => {
    const numbers = await phoneNumbersService.listReserved();
    return reply.send({ success: true, data: numbers });
  });

  fastify.get('/available-owned', { preHandler }, async (_request, reply) => {
    const numbers = await phoneNumbersService.listAvailableInventory();
    return reply.send({ success: true, data: numbers });
  });

  fastify.post('/sync-trunk', { preHandler }, async (_request, reply) => {
    const result = await syncNumbersToSipTrunk();
    return reply.send({ success: true, data: result, message: 'Twilio numbers synchronized with the SIP trunk' });
  });

  fastify.post('/assign/:companyId', { preHandler }, async (request, reply) => {
    const { companyId } = request.params as { companyId: string };
    const parsed = countrySchema.safeParse(request.body || {});
    const number = await phoneNumbersService.purchaseAndAssign(
      companyId,
      parsed.success ? parsed.data.countryCode : undefined,
    );
    return reply.status(201).send({ success: true, data: number, message: 'Twilio number purchased and assigned' });
  });

  fastify.post('/assign-existing/:companyId', { preHandler }, async (request, reply) => {
    const { companyId } = request.params as { companyId: string };
    const parsed = z.object({ twilioSid: z.string().min(1) }).safeParse(request.body || {});
    if (!parsed.success) throw new ValidationError('A Twilio SID from available inventory is required', parsed.error.errors);
    const number = await phoneNumbersService.assignExisting(companyId, parsed.data.twilioSid);
    return reply.status(201).send({ success: true, data: number, message: 'Available Twilio number assigned' });
  });

  fastify.get('/company/:companyId', { preHandler }, async (request, reply) => {
    const { companyId } = request.params as { companyId: string };
    const assignments = await getCollection(Collections.PHONE_ASSIGNMENTS).find({ company_id: companyId, status: 'assigned' }).sort({ assigned_at: -1 }).toArray();
    return reply.send({ success: true, data: assignments.map((assignment) => ({ id: assignment._id.toString(), ...assignment, _id: undefined })) });
  });

  const companyPreHandler = [authenticateJWT, resolveTenant, requireRole('company_admin')];

  fastify.get('/my', { preHandler: companyPreHandler }, async (request, reply) => {
    const companyId = getTenantId(request);
    const assignments = await getCollection(Collections.PHONE_ASSIGNMENTS).find({ company_id: companyId, status: 'assigned' }).sort({ assigned_at: -1 }).toArray();
    const profiles = await getCollection(Collections.NUMBER_PROFILES).find({ company_id: companyId }).toArray();
    const profilesByNumber = new Map(profiles.map((profile) => [profile.phone_assignment_id, profile]));
    return reply.send({
      success: true,
      data: assignments.map((assignment) => ({
        id: assignment._id.toString(),
        phone_number: assignment.phone_number,
        twilio_sid: assignment.twilio_sid,
        assigned_at: assignment.assigned_at,
        profile: profilesByNumber.get(assignment._id.toString()) ? { ...profilesByNumber.get(assignment._id.toString()), knowledge_file_text: undefined } : null,
      })),
    });
  });

  fastify.put('/my/:assignmentId/profile', { preHandler: companyPreHandler }, async (request, reply) => {
    const companyId = getTenantId(request);
    const { assignmentId } = request.params as { assignmentId: string };
    const parsed = z.object({
      display_name: z.string().trim().max(255).default(''),
      retell_agent_id: z.string().trim().max(255).default(''),
      description: z.string().max(100000).default(''),
      knowledge_text: z.string().max(100000).default(''),
    }).safeParse(request.body);
    if (!parsed.success) throw new ValidationError('Invalid phone-specific company data', parsed.error.errors);
    const assignment = await getCollection(Collections.PHONE_ASSIGNMENTS).findOne({ _id: new ObjectId(assignmentId), company_id: companyId, status: 'assigned' });
    if (!assignment) throw new ValidationError('Phone number does not belong to this company');
    let bindingWarning: string | null = null;
    if (parsed.data.retell_agent_id) {
      if (!config.retell.agentId || parsed.data.retell_agent_id !== config.retell.agentId) {
        throw new ValidationError('Only the configured demo Retell agent can be used for live calls');
      }
      const model = await retellClient.getAgent(config.retell.agentId);
      if (!model?.agent_id) throw new ValidationError('Selected Retell model was not found');
      if (!config.retell.twilioTerminationUri) {
        bindingWarning = 'Phone data saved, but Retell phone binding is not configured yet.';
      } else {
        try {
          const nickname = `${assignment.phone_number} - ${model.agent_name}`;
          if (await retellClient.getPhoneNumber(assignment.phone_number)) {
            await retellClient.updatePhoneNumber(assignment.phone_number, config.retell.twilioTerminationUri, config.retell.agentId, nickname);
          } else {
            await retellClient.importPhoneNumber(assignment.phone_number, config.retell.twilioTerminationUri, config.retell.agentId, nickname);
          }
        } catch (error) {
          if (retellClient.isPhoneNumberAlreadyExistsError(error)) {
            await retellClient.updatePhoneNumber(assignment.phone_number, config.retell.twilioTerminationUri, config.retell.agentId, `${assignment.phone_number} - ${model.agent_name}`);
          } else {
            throw error;
          }
        }
      }
    }
    const now = new Date();
    await getCollection(Collections.NUMBER_PROFILES).updateOne(
      { company_id: companyId, phone_assignment_id: assignmentId },
      { $set: { ...parsed.data, company_id: companyId, phone_assignment_id: assignmentId, updated_at: now }, $setOnInsert: { created_at: now } },
      { upsert: true },
    );
    return reply.send({ success: true, data: { ...parsed.data, phone_assignment_id: assignmentId, updated_at: now }, warning: bindingWarning });
  });

  fastify.post('/my/:assignmentId/profile/pdf', { preHandler: companyPreHandler }, async (request, reply) => {
    const companyId = getTenantId(request);
    const { assignmentId } = request.params as { assignmentId: string };
    if (!ObjectId.isValid(assignmentId)) throw new ValidationError('Invalid phone assignment');
    const assignment = await getCollection(Collections.PHONE_ASSIGNMENTS).findOne({ _id: new ObjectId(assignmentId), company_id: companyId, status: 'assigned' });
    if (!assignment) throw new ValidationError('Phone number does not belong to this company');

    const part = await request.file();
    if (!part || (!part.filename.toLowerCase().endsWith('.pdf') && part.mimetype !== 'application/pdf')) {
      throw new ValidationError('A PDF file is required');
    }
    const buffer = await part.toBuffer();
    const contentText = (await OfficeParser.parseOffice(buffer)).toText().slice(0, 10_000_000);
    const now = new Date();
    await getCollection(Collections.NUMBER_PROFILES).updateOne(
      { company_id: companyId, phone_assignment_id: assignmentId },
      { $set: { company_id: companyId, phone_assignment_id: assignmentId, knowledge_file_name: part.filename, knowledge_file_type: part.mimetype, knowledge_file_size: buffer.length, knowledge_file_text: contentText, updated_at: now }, $setOnInsert: { display_name: '', retell_agent_id: '', description: '', knowledge_text: '', created_at: now } },
      { upsert: true },
    );
    return reply.send({ success: true, data: { knowledge_file_name: part.filename, extracted_characters: contentText.length } });
  });
}