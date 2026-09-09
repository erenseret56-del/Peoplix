import { aiConfigRepository } from './ai-config.repository.js';
import { companiesRepository } from '../companies/companies.repository.js';
import { CompanyAIConfigDocument, RetellDynamicVariables } from './ai-config.types.js';
import { NotFoundError } from '../../middleware/errorHandler.js';
import { logger } from '../../config/logger.js';
import { config } from '../../config/env.js';
import { getCollection, Collections } from '../../infrastructure/database/index.js';

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
  async getResolvedConfig(companyId: string): Promise<{
    retell_agent_id: string;
    retell_llm_id?: string;
    dynamic_variables: RetellDynamicVariables;
    welcome_message?: string;
    ai_instructions?: string;
    features: CompanyAIConfigDocument['features'];
    business_hours?: CompanyAIConfigDocument['business_hours'];
  }> {
    // Fetch both in parallel
    const [cfg, company, documents] = await Promise.all([
      aiConfigRepository.findByCompanyId(companyId),
      companiesRepository.findById(companyId),
      getCollection(Collections.DOCUMENTS)
        .find({ company_id: companyId, status: 'active' })
        .project({ title: 1, description: 1, content_text: 1 })
        .limit(100)
        .toArray(),
    ]);

    if (!company) throw new NotFoundError('Company not found');

    const agentId = cfg?.retell_agent_id || config.retell.agentId || '';
    const llmId = config.retell.llmId;

    if (!agentId) {
      throw new NotFoundError('No Retell agent configured for this company');
    }

    // Build dynamic variables — company DB record takes priority over stored vars
    // This guarantees {{company_name}} always reflects the current company name
    const knowledgeContext = [
      'Use only the client documents below to answer questions. If the answer is not present, say that it is not available in the provided documents.',
      ...(documents.length ? documents.map((document: any) => [
        `Knowledge document: ${document.title || 'Untitled'}`,
        document.description || '',
        document.content_text || '',
      ].filter(Boolean).join('\n')) : ['No client documents have been uploaded.']),
    ].join('\n\n').slice(0, 100000);

    const dynamicVars: RetellDynamicVariables = {
      // Defaults from AI config (custom vars, etc.)
      ...(cfg?.dynamic_variables || {}),

      // Always override with live company data
      company_name: company.name,
      company_description: company.description || cfg?.dynamic_variables?.company_description || '',
      company_email: company.email || cfg?.dynamic_variables?.company_email || '',
      company_phone: company.phone || cfg?.dynamic_variables?.company_phone || '',
      company_website: company.website || cfg?.dynamic_variables?.company_website || '',
      company_address: buildAddress(company),
      company_knowledge: knowledgeContext,
      greeting_name: cfg?.dynamic_variables?.greeting_name || company.name,
    };

    // Build resolved welcome message from template
    const welcomeTemplate = cfg?.welcome_message_template
      || `Hi, thanks for calling ${company.name}. How can I help you today?`;
    const welcomeMessage = resolveTemplate(welcomeTemplate, dynamicVars);

    // Append company-specific instructions to the AI
    const aiInstructions = cfg?.ai_instructions;

    // Build business hours text if configured
    if (cfg?.business_hours) {
      dynamicVars.business_hours_text = formatBusinessHours(cfg.business_hours);
    }

    logger.debug({ companyId, agentId }, 'Resolved AI config for company');

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
