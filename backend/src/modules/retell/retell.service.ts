import { getCollection, Collections } from '../../infrastructure/database/index.js';
import { ObjectId } from 'mongodb';
import { employeesRepository } from '../employees/employees.repository.js';
import { departmentsRepository } from '../departments/departments.repository.js';
import { logger } from '../../config/logger.js';
import { cache } from '../../infrastructure/cache/memory-cache.js';

interface SearchResult {
  found: boolean;
  message: string | null;
  data: any;
}

function normalizePhoneNumber(phone?: string): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  return digits ? `+${digits}` : null;
}

export class RetellService {

  private async getOrCreatePhoneAssignment(companyId: string, phoneNumber?: string, twilioSid?: string): Promise<{ _id?: any; phone_number?: string } | null> {
    const normalized = normalizePhoneNumber(phoneNumber);
    if (!normalized) return null;

    const existing = await getCollection(Collections.PHONE_ASSIGNMENTS).findOne({
      company_id: companyId,
      normalized_phone_number: normalized,
    });

    if (existing) {
      if (twilioSid && !existing.twilio_sid) {
        await getCollection(Collections.PHONE_ASSIGNMENTS).updateOne(
          { _id: existing._id },
          { $set: { twilio_sid: twilioSid, updated_at: new Date() } }
        );
      }
      return existing;
    }

    const record = {
      company_id: companyId,
      phone_number: phoneNumber,
      normalized_phone_number: normalized,
      twilio_sid: twilioSid || null,
      status: 'assigned',
      assigned_at: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
    };

    const result = await getCollection(Collections.PHONE_ASSIGNMENTS).insertOne(record);
    return { _id: result.insertedId, phone_number: phoneNumber };
  }

  async resolveCompanyFromCall(callId: string): Promise<string | null> {
    const cacheKey = `retell:call:${callId}:company`;
    const cached = await cache.get<string>(cacheKey);
    if (cached) return cached;

    const callLog = await getCollection(Collections.CALL_LOGS).findOne(
      { retell_call_id: callId },
      { projection: { company_id: 1 } }
    );

    if (callLog?.company_id) {
      await cache.set(cacheKey, String(callLog.company_id), 600);
      return String(callLog.company_id);
    }
    return null;
  }

  async resolveCompanyFromAgent(retellAgentId: string): Promise<string | null> {
    const cacheKey = `retell:agent:${retellAgentId}:company`;
    const cached = await cache.get<string>(cacheKey);
    if (cached) return cached;

    const agent = await getCollection(Collections.RETELL_AGENTS).findOne(
      { retell_agent_id: retellAgentId, status: 'active' },
      { projection: { company_id: 1 } }
    );

    if (agent?.company_id) {
      await cache.set(cacheKey, String(agent.company_id), 3600);
      return String(agent.company_id);
    }
    return null;
  }

  async resolvePhoneAssignmentForNumber(phoneNumber?: string): Promise<{ company_id: string; phone_assignment_id: string; phone_number: string } | null> {
    const normalized = normalizePhoneNumber(phoneNumber);
    if (!normalized) return null;

    const assignment = await getCollection(Collections.PHONE_ASSIGNMENTS).findOne(
      { normalized_phone_number: normalized, status: 'assigned' },
      { projection: { _id: 1, company_id: 1, phone_number: 1 } },
    );

    if (!assignment?.company_id || !assignment._id) return null;

    return {
      company_id: String(assignment.company_id),
      phone_assignment_id: String(assignment._id),
      phone_number: assignment.phone_number || phoneNumber || '',
    };
  }

  async resolveCompanyFromPhone(phoneNumber?: string): Promise<string | null> {
    const assignment = await this.resolvePhoneAssignmentForNumber(phoneNumber);
    return assignment?.company_id || null;
  }

  async getPhoneAssignmentForCall(callId: string): Promise<string | null> {
    const call = await getCollection(Collections.CALL_LOGS).findOne(
      { retell_call_id: callId },
      { projection: { phone_assignment_id: 1 } },
    );
    return call?.phone_assignment_id ? String(call.phone_assignment_id) : null;
  }

  async searchNumberProfile(companyId: string, phoneAssignmentId: string, query: string): Promise<SearchResult> {
    const profile = await getCollection(Collections.NUMBER_PROFILES).findOne({
      company_id: companyId,
      phone_assignment_id: {
        $in: [phoneAssignmentId, ObjectId.isValid(phoneAssignmentId) ? new ObjectId(phoneAssignmentId) : phoneAssignmentId],
      },
    });
    if (!profile) return { found: false, message: null, data: null };
    const searchable = `${profile.display_name || ''}\n${profile.description || ''}\n${profile.knowledge_text || ''}\n${profile.knowledge_file_text || ''}`;
    if (!searchable.trim()) return { found: false, message: null, data: null };
    const queryWords = query.toLowerCase().split(/\s+/).filter(Boolean);
    const matches = queryWords.some((word) => searchable.toLowerCase().includes(word));
    if (!matches) return { found: false, message: null, data: null };
    return { found: true, message: null, data: { number_name: profile.display_name || null, description: profile.description || null, knowledge: profile.knowledge_text || null, pdf_knowledge: profile.knowledge_file_text || null, pdf_file_name: profile.knowledge_file_name || null } };
  }

  async searchEmployee(companyId: string, query: string): Promise<SearchResult> {
    logger.info({ companyId, query }, 'Retell: searching employee');
    const results = await employeesRepository.searchWithDetails(companyId, query, 3);

    if (!results.length) {
      return { found: false, message: "I couldn't find that employee in the company's records.", data: null };
    }

    return {
      found: true,
      message: null,
      data: results.map(e => ({
        employee_number: e.employee_number,
        first_name: e.first_name,
        last_name: e.last_name,
        full_name: `${e.first_name} ${e.last_name}`,
        email: e.email || null,
        phone: e.phone || null,
        department: e.department?.name || null,
        designation: e.designation?.title || null,
        status: e.status,
      })),
    };
  }

  async searchDepartment(companyId: string, query: string): Promise<SearchResult> {
    logger.info({ companyId, query }, 'Retell: searching department');
    const results = await departmentsRepository.searchByName(companyId, query, 3);

    if (!results.length) {
      return { found: false, message: "I couldn't find that department in the company's records.", data: null };
    }

    const dataWithCount = await Promise.all(
      results.map(async d => ({
        name: d.name,
        code: d.code || null,
        description: d.description || null,
        employee_count: await employeesRepository.countByDepartment(companyId, d._id!.toString()),
      }))
    );

    return { found: true, message: null, data: dataWithCount };
  }

  async searchFAQ(companyId: string, query: string): Promise<SearchResult> {
    logger.info({ companyId, query }, 'Retell: searching FAQ');
    const cacheKey = `company:${companyId}:faqs:search:${Buffer.from(query).toString('base64').slice(0, 32)}`;
    const cached = await cache.get<SearchResult>(cacheKey);
    if (cached) return cached;

    const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const results = await getCollection(Collections.FAQS)
      .find({
        company_id: companyId,
        status: 'active',
        $or: [{ question: regex }, { answer: regex }, { category: regex }],
      })
      .sort({ priority: -1 })
      .limit(3)
      .project({ _id: 0, company_id: 0, status: 0, created_at: 0, updated_at: 0, created_by: 0 })
      .toArray();

    const result: SearchResult = results.length
      ? { found: true, message: null, data: results }
      : { found: false, message: "I couldn't find an answer to that in our FAQ database.", data: null };

    await cache.set(cacheKey, result, 300);
    return result;
  }

  async searchPolicy(companyId: string, query: string): Promise<SearchResult> {
    logger.info({ companyId, query }, 'Retell: searching policy');
    const cacheKey = `company:${companyId}:policies:search:${Buffer.from(query).toString('base64').slice(0, 32)}`;
    const cached = await cache.get<SearchResult>(cacheKey);
    if (cached) return cached;

    const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const results = await getCollection(Collections.POLICIES)
      .find({
        company_id: companyId,
        status: 'active',
        $or: [{ title: regex }, { content: regex }, { category: regex }],
      })
      .limit(2)
      .project({ _id: 0, company_id: 0, status: 0, created_at: 0, updated_at: 0, created_by: 0, approved_by: 0 })
      .toArray();

    const result: SearchResult = results.length
      ? { found: true, message: null, data: results }
      : { found: false, message: "I couldn't find that policy in the company's records.", data: null };

    await cache.set(cacheKey, result, 600);
    return result;
  }

  async searchCompanyInfo(companyId: string, query: string, phoneAssignmentId?: string): Promise<SearchResult> {
    logger.info({ companyId, query }, 'Retell: searching company info');
    const [numberResult, faqResult, policyResult, docResult] = await Promise.all([
      phoneAssignmentId ? this.searchNumberProfile(companyId, phoneAssignmentId, query) : Promise.resolve({ found: false, message: null, data: null }),
      this.searchFAQ(companyId, query),
      this.searchPolicy(companyId, query),
      this.searchDocument(companyId, query),
    ]);

    if (numberResult.found) return numberResult;
    if (faqResult.found)    return faqResult;
    if (policyResult.found) return policyResult;
    if (docResult.found)    return docResult;

    return { found: false, message: "I couldn't find information about that topic in the company's records.", data: null };
  }

  async searchDocument(companyId: string, query: string): Promise<SearchResult> {
    logger.info({ companyId, query }, 'Retell: searching documents');

    const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const results = await getCollection(Collections.DOCUMENTS)
      .find({
        company_id: companyId,  // TENANT ISOLATION
        status: 'active',
        $or: [{ title: regex }, { description: regex }, { content_text: regex }],
      })
      .limit(2)
      .project({ _id: 0, company_id: 0, uploaded_by: 0, storage_path: 0 })
      .toArray();

    if (!results.length) {
      return { found: false, message: null, data: null };
    }

    return { found: true, message: null, data: results };
  }

  async handleCallStarted(payload: {
    call_id: string;
    agent_id: string;
    from_number?: string;
    to_number?: string;
    call_type?: string;
    metadata?: Record<string, any>;
    started_at?: string;
  }): Promise<void> {
    const phoneNumber = payload.to_number || payload.from_number;
    const companyId = payload.metadata?.company_id
      || await this.resolveCompanyFromPhone(phoneNumber);

    if (!companyId) {
      logger.warn({ callId: payload.call_id, agentId: payload.agent_id }, 'Could not resolve company for call');
      return;
    }

    const metadataAssignmentId = payload.metadata?.phone_assignment_id;
    const phoneAssignment = metadataAssignmentId && ObjectId.isValid(metadataAssignmentId)
      ? await getCollection(Collections.PHONE_ASSIGNMENTS).findOne({
        _id: new ObjectId(metadataAssignmentId),
        company_id: companyId,
        status: 'assigned',
      })
      : await this.getOrCreatePhoneAssignment(companyId, phoneNumber, payload.metadata?.twilio_sid || payload.metadata?.phone_sid);

    const now = new Date();
    await getCollection(Collections.CALL_LOGS).insertOne({
      company_id: companyId,
      retell_call_id: payload.call_id,
      retell_agent_id: payload.agent_id,
      caller_phone: payload.from_number,
      from_number: payload.from_number,
      to_number: payload.to_number,
      phone_number: phoneAssignment?.phone_number || payload.to_number || payload.from_number,
      phone_assignment_id: phoneAssignment?._id?.toString() || null,
      call_type: payload.call_type || 'inbound',
      call_status: 'ongoing',
      started_at: payload.started_at ? new Date(payload.started_at) : now,
      metadata: payload.metadata || {},
      created_at: now,
      updated_at: now,
    });

    await cache.set(`retell:call:${payload.call_id}:company`, companyId, 3600);
    logger.info({ callId: payload.call_id, companyId, phoneNumber, phoneAssignmentId: phoneAssignment?._id?.toString() }, 'Call started logged');
  }

  async handleCallEnded(payload: {
    call_id: string;
    agent_id?: string;
    from_number?: string;
    to_number?: string;
    call_type?: string;
    started_at?: string;
    ended_at?: string;
    duration_ms?: number;
    transcript?: string;
    recording_url?: string;
    call_analysis?: { call_summary?: string; user_sentiment?: string; call_successful?: boolean };
    metadata?: Record<string, any>;
  }): Promise<void> {
    const now = new Date();
    const endedAt = payload.ended_at ? new Date(payload.ended_at) : now;
    const durationSeconds = payload.duration_ms ? Math.round(payload.duration_ms / 1000) : null;
    let recordingSizeBytes = Number(payload.metadata?.recording_size_bytes || 0) || 0;
    if (!recordingSizeBytes && payload.recording_url) {
      try {
        const recordingResponse = await fetch(payload.recording_url, { method: 'HEAD' });
        recordingSizeBytes = Number(recordingResponse.headers.get('content-length') || 0) || 0;
      } catch (error) {
        logger.warn({ err: error, callId: payload.call_id }, 'Could not measure Retell recording size');
      }
    }

    const updated = await getCollection(Collections.CALL_LOGS).findOneAndUpdate(
      { retell_call_id: payload.call_id },
      { $set: {
        call_status: 'completed',
        ended_at: endedAt,
        duration_seconds: durationSeconds,
        recording_url: payload.recording_url || null,
        recording_size_bytes: recordingSizeBytes || null,
        updated_at: now,
      } },
      { returnDocument: 'after' }
    );

    if (!updated) {
      const phoneNumber = payload.to_number || payload.from_number;
      const companyId = payload.metadata?.company_id
        || await this.resolveCompanyFromPhone(phoneNumber);

      if (!companyId) {
        logger.warn({ callId: payload.call_id }, 'Call log not found and company could not be resolved for ended event');
        return;
      }

      const phoneAssignment = await this.getOrCreatePhoneAssignment(companyId, phoneNumber, payload.metadata?.twilio_sid || payload.metadata?.phone_sid);
      await getCollection(Collections.CALL_LOGS).insertOne({
        company_id: companyId,
        retell_call_id: payload.call_id,
        retell_agent_id: payload.agent_id,
        caller_phone: payload.from_number,
        from_number: payload.from_number,
        to_number: payload.to_number,
        phone_number: phoneAssignment?.phone_number || phoneNumber,
        phone_assignment_id: phoneAssignment?._id?.toString() || null,
        call_type: payload.call_type || 'inbound',
        call_status: 'completed',
        started_at: payload.started_at ? new Date(payload.started_at) : endedAt,
        ended_at: endedAt,
        duration_seconds: durationSeconds,
        recording_url: payload.recording_url || null,
        recording_size_bytes: recordingSizeBytes || null,
        metadata: payload.metadata || {},
        created_at: now,
        updated_at: now,
      });
      logger.info({ callId: payload.call_id, companyId }, 'Recovered call log from ended event');
      return;
    }

    if (payload.transcript || payload.call_analysis?.call_summary) {
      await getCollection(Collections.CALL_TRANSCRIPTS).insertOne({
        call_log_id: updated._id.toString(),
        transcript: payload.transcript,
        summary: payload.call_analysis?.call_summary,
        sentiment: payload.call_analysis?.user_sentiment,
        created_at: now,
      });
    }

    await cache.delete(`retell:call:${payload.call_id}:company`);
    logger.info({ callId: payload.call_id, companyId: updated.company_id, durationSeconds }, 'Call ended logged');
  }
}

export const retellService = new RetellService();
