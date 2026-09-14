import { ObjectId } from 'mongodb';
import { getCollection, Collections } from '../../infrastructure/database/index.js';
import { NotFoundError } from '../../middleware/errorHandler.js';
import { companiesRepository } from '../companies/companies.repository.js';

const sectionLabels = {
  company_information: 'Company Information',
  hr_policies: 'HR Policies',
  faqs: 'FAQs',
  employee_data: 'Employee Data',
  working_hours: 'Working Hours',
  leave_information: 'Leave Information',
} as const;

type SectionKey = keyof typeof sectionLabels;

export interface AIKnowledgeView {
  status: 'ready' | 'attention';
  last_analyzed_at: Date | null;
  completeness: number;
  sections: Record<SectionKey, boolean>;
  summary: string;
  recommendations: string[];
  counts: { employees: number; departments: number; policies: number; faqs: number; documents: number };
}

function hasText(value?: string): boolean {
  return Boolean(value?.trim());
}

function companyInfoComplete(company: { name: string; description?: string; email?: string; phone?: string; website?: string; address_line1?: string; city?: string; country?: string }): boolean {
  return Boolean(company.name.trim() && (hasText(company.description) || hasText(company.email) || hasText(company.phone) || hasText(company.website) || hasText(company.address_line1) || hasText(company.city) || hasText(company.country)));
}

export class AIKnowledgeService {
  async analyze(companyId: string): Promise<AIKnowledgeView> {
    const company = await companiesRepository.findById(companyId);
    if (!company) throw new NotFoundError('Company not found');

    const companyIdFilter = ObjectId.isValid(companyId) ? { $in: [companyId, new ObjectId(companyId)] } : companyId;
    const [employees, departments, policies, faqs, documents] = await Promise.all([
      getCollection(Collections.EMPLOYEES).countDocuments({ company_id: companyIdFilter, status: 'active' }),
      getCollection(Collections.DEPARTMENTS).countDocuments({ company_id: companyIdFilter, status: 'active' }),
      getCollection(Collections.POLICIES).countDocuments({ company_id: companyIdFilter, status: 'active' }),
      getCollection(Collections.FAQS).countDocuments({ company_id: companyIdFilter, status: 'active' }),
      getCollection(Collections.DOCUMENTS).countDocuments({ company_id: companyIdFilter, status: 'active' }),
    ]);

    const knowledge = company.knowledge_center || {};
    const sections: Record<SectionKey, boolean> = {
      company_information: companyInfoComplete(company),
      hr_policies: hasText(knowledge.hr_policies) || policies > 0,
      faqs: hasText(knowledge.faqs) || faqs > 0,
      employee_data: hasText(knowledge.employee_information) || employees > 0,
      working_hours: hasText(knowledge.working_hours),
      leave_information: hasText(knowledge.leave_information),
    };
    const complete = Object.values(sections).filter(Boolean).length;
    const completeness = Math.round((complete / Object.keys(sections).length) * 100);
    const recommendations = Object.entries(sections)
      .filter(([, available]) => !available)
      .map(([key]) => `${sectionLabels[key as SectionKey]} information is not provided.`);
    const summary = `${company.name} has ${employees} active employee${employees === 1 ? '' : 's'}, ${departments} department${departments === 1 ? '' : 's'}, ${policies} polic${policies === 1 ? 'y' : 'ies'}, and ${faqs} FAQ${faqs === 1 ? '' : 's'} configured. ${company.description?.trim() ? `Business: ${company.description.trim()}` : 'Business: Information not provided.'}`;
    const analysis = {
      status: recommendations.length === 0 ? 'ready' as const : 'attention' as const,
      last_analyzed_at: new Date(),
      completeness,
      sections,
      summary,
      recommendations,
    };

    await companiesRepository.update(companyId, { ai_knowledge: analysis });
    return { ...analysis, counts: { employees, departments, policies, faqs, documents } };
  }

  async get(companyId: string): Promise<AIKnowledgeView> {
    const company = await companiesRepository.findById(companyId);
    if (!company) throw new NotFoundError('Company not found');
    if (company.ai_knowledge) {
      const counts = await this.getCounts(companyId);
      return { ...company.ai_knowledge, counts };
    }
    return this.analyze(companyId);
  }

  private async getCounts(companyId: string) {
    const companyIdFilter = ObjectId.isValid(companyId) ? { $in: [companyId, new ObjectId(companyId)] } : companyId;
    const [employees, departments, policies, faqs, documents] = await Promise.all([
      getCollection(Collections.EMPLOYEES).countDocuments({ company_id: companyIdFilter, status: 'active' }),
      getCollection(Collections.DEPARTMENTS).countDocuments({ company_id: companyIdFilter, status: 'active' }),
      getCollection(Collections.POLICIES).countDocuments({ company_id: companyIdFilter, status: 'active' }),
      getCollection(Collections.FAQS).countDocuments({ company_id: companyIdFilter, status: 'active' }),
      getCollection(Collections.DOCUMENTS).countDocuments({ company_id: companyIdFilter, status: 'active' }),
    ]);
    return { employees, departments, policies, faqs, documents };
  }
}

export const aiKnowledgeService = new AIKnowledgeService();
