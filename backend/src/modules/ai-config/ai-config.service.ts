import { aiConfigRepository } from './ai-config.repository.js';
import { companiesRepository } from '../companies/companies.repository.js';
import { CompanyAIConfigDocument, RetellDynamicVariables } from './ai-config.types.js';
import { NotFoundError } from '../../middleware/errorHandler.js';
import { logger } from '../../config/logger.js';
import { config } from '../../config/env.js';
import { getCollection, Collections } from '../../infrastructure/database/index.js';
import { ObjectId } from 'mongodb';

/**
 * AI Config Service
 *
 * Manages per-company Retell AI configuration.
 * The key principle: everything the AI agent says or does for a company
 * is driven by THIS configuration document, not by hardcoded values.
 *
 * Welcome message example (stored in DB, not in code):
 *   "Hi, thanks for calling {{company_name}}. How can I help you?"
 *
 * At call creation time, {{company_name}} is replaced with the actual
 * company name from the database.
 */
export class AIConfigService {

  /**
   * Get AI config for a company — used when creating a call
   */
  async getForCompany(companyId: string): Promise<CompanyAIConfigDocument> {
    const cfg = await aiConfigRepository.findByCompanyId(companyId);

    if (!cfg) {
      throw new NotFoundError(
        'No AI configuration found for this company. Please set up the AI configuration first.'
      );
    }

    return cfg;
  }

  /**
   * Get AI config with company data merged into dynamic variables.
   * This ensures {{company_name}}, {{company_phone}} etc. are always current
   * from the company record — not stale from the AI config.
   */
  async getResolvedConfig(
    companyId: string,
    options: { phoneAssignmentId?: string; phoneNumber?: string } = {},
  ): Promise<{
    retell_agent_id: string;
    retell_llm_id?: string;
    dynamic_variables: RetellDynamicVariables;
    welcome_message?: string;
    ai_instructions?: string;
    features: CompanyAIConfigDocument['features'];
    business_hours?: CompanyAIConfigDocument['business_hours'];
  }> {
    const companyIdFilter = ObjectId.isValid(companyId)
      ? { $in: [companyId, new ObjectId(companyId)] }
      : companyId;
    const [cfg, company, documents] = await Promise.all([
      aiConfigRepository.findByCompanyId(companyId),
      companiesRepository.findById(companyId),
      getCollection(Collections.DOCUMENTS)
        .find({ company_id: companyIdFilter, status: 'active' })
        .project({ title: 1, description: 1, content_text: 1 })
        .limit(100)
        .toArray(),
    ]);

    if (!company) throw new NotFoundError('Company not found');

    let assignment: { _id?: any; company_id?: string; phone_number?: string } | null = null;
    let profile: any = null;

    if (options.phoneAssignmentId) {
      assignment = await getCollection(Collections.PHONE_ASSIGNMENTS).findOne(
        { _id: new ObjectId(options.phoneAssignmentId), company_id: companyIdFilter, status: 'assigned' },
        { projection: { _id: 1, company_id: 1, phone_number: 1 } },
      );
    } else if (options.phoneNumber) {
      const normalized = normalizePhoneNumber(options.phoneNumber);
      assignment = normalized
        ? await getCollection(Collections.PHONE_ASSIGNMENTS).findOne(
          { company_id: companyIdFilter, normalized_phone_number: normalized, status: 'assigned' },
            { projection: { _id: 1, company_id: 1, phone_number: 1 } },
          )
        : null;
    }

    if (assignment?._id) {
      profile = await getCollection(Collections.NUMBER_PROFILES).findOne({
        company_id: companyIdFilter,
        phone_assignment_id: assignment._id.toString(),
      });
    }

    const agentId = cfg?.retell_agent_id || config.retell.agentId || '';
    const llmId = config.retell.llmId;

    if (!agentId) {
      throw new NotFoundError('No Retell agent configured for this company');
    }

    const knowledgeContext = [
      'Use only the client documents below to answer questions. If the answer is not present, say that it is not available in the provided documents.',
      ...(documents.length ? documents.map((document: any) => [
        `Knowledge document: ${document.title || 'Untitled'}`,
        document.description || '',
        document.content_text || '',
      ].filter(Boolean).join('\n')) : ['No client documents have been uploaded.']),
      ...(profile ? [
        `Number profile: ${profile.display_name || 'Unnamed number profile'}`,
        profile.description || '',
        profile.knowledge_text || '',
        profile.knowledge_file_text || '',
      ].filter(Boolean).join('\n') : []),
    ].join('\n\n').slice(0, 100000);

    const normalizedPhoneNumber = assignment?.phone_number || options.phoneNumber || company.phone || '';
    const dynamicVars: RetellDynamicVariables = {
      ...(cfg?.dynamic_variables || {}),
      company_name: company.name,
      company_description: company.description || cfg?.dynamic_variables?.company_description || '',
      company_email: company.email || cfg?.dynamic_variables?.company_email || '',
      company_phone: normalizedPhoneNumber || cfg?.dynamic_variables?.company_phone || '',
      company_website: company.website || cfg?.dynamic_variables?.company_website || '',
      company_address: buildAddress(company),
      company_knowledge: knowledgeContext,
      receptionist_name: config.app.receptionistName,
      greeting_name: config.app.receptionistName,
    };

    // Build resolved welcome message from template using the fixed receptionist identity.
    const welcomeTemplate = cfg?.welcome_message_template
      || `Hi, thanks for calling {{company_name}}. I'm {{receptionist_name}}. How can I help you today?`;
    const welcomeMessage = resolveTemplate(welcomeTemplate, dynamicVars);

    // Keep caller identity fixed even if a different Retell agent or model is later selected.
    const aiInstructions = [
      cfg?.ai_instructions,
      'You are Ava, the AI receptionist. Maintain this identity throughout the entire conversation. Never say or imply you are the Retell agent name, agent ID, model name, or any other internal system name.',
    ].filter(Boolean).join('\n\n');

    // Build business hours text if configured
    if (cfg?.business_hours) {
      dynamicVars.business_hours_text = formatBusinessHours(cfg.business_hours);
    }

    logger.debug({
      companyId,
      agentId,
      phoneAssignmentId: assignment?._id?.toString() || null,
      numberProfileFound: Boolean(profile),
      companyKnowledgeFound: Boolean(knowledgeContext.trim()),
      companyKnowledgeLength: knowledgeContext.length,
      documentsCount: documents.length,
      dynamicVariableKeys: Object.keys(dynamicVars),
    }, 'Resolved canonical call context');

    return {
      retell_agent_id: agentId,
      retell_llm_id: llmId,
      dynamic_variables: dynamicVars,
      welcome_message: welcomeMessage,
      ai_instructions: aiInstructions,
      features: cfg?.features || defaultFeatures(),
      business_hours: cfg?.business_hours,
    };
  }

  /**
   * Check if a feature is enabled for a company
   */
  async isFeatureEnabled(
    companyId: string,
    feature: keyof CompanyAIConfigDocument['features']
  ): Promise<boolean> {
    const cfg = await aiConfigRepository.findByCompanyId(companyId);
    return cfg?.features?.[feature] ?? false;
  }

  /**
   * Create or update AI config for a company
   */
  async upsert(companyId: string, data: {
    retell_agent_id?: string;
    retell_llm_id?: string;
    dynamic_variables?: Partial<RetellDynamicVariables>;
    ai_instructions?: string;
    welcome_message_template?: string;
    business_hours?: CompanyAIConfigDocument['business_hours'];
    features?: Partial<CompanyAIConfigDocument['features']>;
    webhook_url?: string;
  }): Promise<CompanyAIConfigDocument> {
    const company = await companiesRepository.findById(companyId);
    if (!company) throw new NotFoundError('Company not found');

    const existing = await aiConfigRepository.findByCompanyId(companyId);

    const merged: Omit<CompanyAIConfigDocument, '_id' | 'company_id' | 'created_at' | 'updated_at'> = {
      retell_agent_id: data.retell_agent_id || existing?.retell_agent_id || config.retell.agentId || '',
      retell_llm_id: data.retell_llm_id || existing?.retell_llm_id || config.retell.llmId,
      dynamic_variables: {
        ...(existing?.dynamic_variables || {}),
        ...(data.dynamic_variables || {}),
        // Always keep company name current
        company_name: company.name,
      },
      ai_instructions: data.ai_instructions ?? existing?.ai_instructions,
      welcome_message_template: data.welcome_message_template ?? existing?.welcome_message_template,
      business_hours: data.business_hours ?? existing?.business_hours,
      features: {
        ...defaultFeatures(),
        ...(existing?.features || {}),
        ...(data.features || {}),
      },
      webhook_url: data.webhook_url ?? existing?.webhook_url,
      webhook_secret: existing?.webhook_secret,
      status: 'active',
    };

    return aiConfigRepository.upsert(companyId, merged);
  }

  /**
   * Get safe public config for frontend
   * Never expose agent IDs, webhook secrets, or internal vars to frontend
   */
  async getPublicConfig(companyId: string) {
    const company = await companiesRepository.findById(companyId);
    if (!company) throw new NotFoundError('Company not found');

    const cfg = await aiConfigRepository.findByCompanyId(companyId);

    return {
      company_name: company.name,
      has_ai_configured: !!cfg,
      features: cfg?.features || defaultFeatures(),
      business_hours: cfg?.business_hours || null,
      // No retell_agent_id, no webhook secrets, no api keys
    };
  }
}

// ── HELPERS ────────────────────────────────────────────────────────────────

function normalizePhoneNumber(phone?: string): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  return digits ? `+${digits}` : null;
}

function resolveTemplate(template: string, vars: Record<string, string | undefined>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] || '');
}

function buildAddress(company: any): string {
  const parts = [
    company.address_line1,
    company.address_line2,
    company.city,
    company.state,
    company.country,
  ].filter(Boolean);
  return parts.join(', ');
}

function formatBusinessHours(hours: CompanyAIConfigDocument['business_hours']): string {
  if (!hours) return '';
  const lines = (hours.schedule || [])
    .filter(d => d.open)
    .map(d => `${capitalize(d.day)}: ${d.open_time} - ${d.close_time}`);
  return lines.join(', ');
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function defaultFeatures(): CompanyAIConfigDocument['features'] {
  return {
    employee_lookup: true,
    department_lookup: true,
    faq_search: true,
    policy_search: true,
    document_search: false,
    after_hours_message: false,
  };
}

export const aiConfigService = new AIConfigService();
