import { companiesRepository } from './companies.repository.js';
import { authRepository } from '../auth/auth.repository.js';
import { authService } from '../auth/auth.service.js';
import { invalidateTenantCache } from '../../middleware/tenant.js';
import { ConflictError, NotFoundError } from '../../middleware/errorHandler.js';
import { CompanyStatus, UserRole } from '../../types/index.js';
import { logger } from '../../config/logger.js';
import { config } from '../../config/env.js';
import { getCollection, Collections } from '../../infrastructure/database/index.js';
import { aiConfigRepository } from '../ai-config/ai-config.repository.js';
import { AI_CONFIG_COLLECTION } from '../ai-config/ai-config.types.js';
import { ObjectId } from 'mongodb';

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);
}

export class CompaniesService {

  async list(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const { data, total } = await companiesRepository.findAll(skip, limit);
    const enriched = await Promise.all(data.map(async (company) => {
      const companyId = company._id!.toString();
      const [phoneAssignments, aiConfig, employeeCount] = await Promise.all([
        getCollection(Collections.PHONE_ASSIGNMENTS).find(
          { company_id: companyId, status: 'assigned' },
        ).sort({ assigned_at: -1 }).toArray(),
        aiConfigRepository.findByCompanyId(companyId),
        getCollection(Collections.EMPLOYEES).countDocuments({ company_id: companyId, status: 'active' }),
      ]);

      return {
        id: companyId,
        name: company.name,
        slug: company.slug,
        email: company.email,
        phone: company.phone,
        description: company.description,
        status: company.status,
        subscription_tier: company.subscription_tier,
        billing_due_amount: company.billing_due_amount || 0,
        timezone: company.timezone,
        country: company.country,
        created_at: company.created_at,
        employee_count: employeeCount,
        phone_number: phoneAssignments[0]?.phone_number || '',
        twilio_sid: phoneAssignments[0]?.twilio_sid || '',
        phone_numbers: phoneAssignments.map((assignment) => ({
          id: assignment._id!.toString(),
          phone_number: assignment.phone_number,
          twilio_sid: assignment.twilio_sid || '',
          assigned_at: assignment.assigned_at,
        })),
        retell_agent_id: aiConfig?.retell_agent_id || config.retell.agentId || '',
      };
    }));
    return {
      data: enriched,
      pagination: {
        page, limit, total,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + data.length < total,
      },
    };
  }

  async getById(id: string) {
    const company = await companiesRepository.findById(id);
    if (!company) throw new NotFoundError('Company not found');
    return {
      id: company._id!.toString(),
      name: company.name, slug: company.slug, email: company.email,
      phone: company.phone, website: company.website,
      description: company.description,
      address_line1: company.address_line1, address_line2: company.address_line2,
      city: company.city, state: company.state, country: company.country,
      postal_code: company.postal_code, settings: company.settings,
      timezone: company.timezone, status: company.status,
      subscription_tier: company.subscription_tier,
      billing_due_amount: company.billing_due_amount || 0,
      created_at: company.created_at, updated_at: company.updated_at,
    };
  }

  async create(data: {
    name: string;
    email?: string;
    phone?: string;
    website?: string;
    timezone?: string;
    adminEmail?: string;
    adminPassword?: string;
  }) {
    if (data.adminEmail && await authRepository.existsByEmail(data.adminEmail)) {
      throw new ConflictError('A user with this email already exists');
    }

    let slug = generateSlug(data.name);
    if (await companiesRepository.existsBySlug(slug)) {
      slug = `${slug}-${Date.now()}`;
    }

    const company = await companiesRepository.create({
      name: data.name, slug,
      email: data.email, phone: data.phone, website: data.website,
      timezone: data.timezone || 'UTC', settings: {},
      status: CompanyStatus.ACTIVE,
      subscription_tier: 'basic',
      deleted_at: null,
    });

    const companyId = company._id!.toString();

    if (data.adminEmail && data.adminPassword) {
      try {
        await authService.registerUser({
          email: data.adminEmail,
          password: data.adminPassword,
          role: UserRole.COMPANY_ADMIN,
          companyId,
        });
        logger.info({ companyId, adminEmail: data.adminEmail }, 'Company admin created');
      } catch (error) {
        await companiesRepository.hardDelete(companyId);
        throw error;
      }
    }

    logger.info({ companyId, name: data.name, slug }, 'Company created');
    return { id: companyId, name: company.name, slug: company.slug, status: company.status, created_at: company.created_at };
  }

  async update(id: string, data: {
    name?: string; email?: string; phone?: string; website?: string; timezone?: string;
    description?: string;
    address_line1?: string; address_line2?: string; city?: string; state?: string;
    country?: string; postal_code?: string; settings?: Record<string, any>;
    status?: CompanyStatus; subscription_tier?: string;
  }) {
    const existing = await companiesRepository.findById(id);
    if (!existing) throw new NotFoundError('Company not found');

    let slug = existing.slug;
    if (data.name && data.name !== existing.name) {
      const candidate = generateSlug(data.name);
      slug = await companiesRepository.existsBySlug(candidate, id)
        ? `${candidate}-${Date.now()}`
        : candidate;
    }

    const updated = await companiesRepository.update(id, { ...data, slug });
    if (!updated) throw new NotFoundError('Company not found');

    await invalidateTenantCache(id);
    logger.info({ companyId: id }, 'Company updated');
    return { id: updated._id!.toString(), name: updated.name, slug: updated.slug, status: updated.status, updated_at: updated.updated_at };
  }

  async delete(id: string): Promise<void> {
    const company = await getCollection(Collections.COMPANIES).findOne({ _id: new ObjectId(id) });
    if (!company) throw new NotFoundError('Company not found');

    const companyUsers = await getCollection(Collections.COMPANY_USERS)
      .find({ company_id: id }, { projection: { user_id: 1 } })
      .toArray();
    const callLogs = await getCollection(Collections.CALL_LOGS)
      .find({ company_id: id }, { projection: { _id: 1 } })
      .toArray();

    await Promise.all([
      getCollection(Collections.PHONE_ASSIGNMENTS).updateMany(
        { company_id: id, status: 'assigned' },
        { $set: { company_id: null, status: 'available', released_at: new Date(), updated_at: new Date() } },
      ),
      getCollection(Collections.NUMBER_PROFILES).deleteMany({ company_id: id }),
      getCollection(Collections.COMPANY_USERS).deleteMany({ company_id: id }),
      getCollection(Collections.EMPLOYEES).deleteMany({ company_id: id }),
      getCollection(Collections.DEPARTMENTS).deleteMany({ company_id: id }),
      getCollection(Collections.DESIGNATIONS).deleteMany({ company_id: id }),
      getCollection(Collections.CUSTOMERS).deleteMany({ company_id: id }),
      getCollection(Collections.DOCUMENTS).deleteMany({ company_id: id }),
      getCollection(Collections.FAQS).deleteMany({ company_id: id }),
      getCollection(Collections.POLICIES).deleteMany({ company_id: id }),
      getCollection(Collections.RETELL_AGENTS).deleteMany({ company_id: id }),
      getCollection(AI_CONFIG_COLLECTION).deleteMany({ company_id: id }),
      getCollection(Collections.CALL_LOGS).deleteMany({ company_id: id }),
      getCollection(Collections.AUDIT_LOGS).deleteMany({ company_id: id }),
      getCollection(Collections.USERS).deleteMany({
        _id: { $in: companyUsers.map((user) => user.user_id) },
      }),
      getCollection(Collections.CALL_TRANSCRIPTS).deleteMany({
        call_log_id: { $in: callLogs.map((call) => call._id.toString()) },
      }),
    ]);
    await companiesRepository.hardDelete(id);
    await invalidateTenantCache(id);
    logger.info({ companyId: id }, 'Company and all related records permanently deleted');
  }

  async getStats(companyId: string) {
    const [employees, departments, faqs, policies, callLogs] = await Promise.all([
      getCollection(Collections.EMPLOYEES).countDocuments({ company_id: companyId, status: 'active' }),
      getCollection(Collections.DEPARTMENTS).countDocuments({ company_id: companyId, status: 'active' }),
      getCollection(Collections.FAQS).countDocuments({ company_id: companyId, status: 'active' }),
      getCollection(Collections.POLICIES).countDocuments({ company_id: companyId, status: 'active' }),
      getCollection(Collections.CALL_LOGS).countDocuments({ company_id: companyId }),
    ]);
    return { employees, departments, faqs, policies, callLogs };
  }
}

export const companiesService = new CompaniesService();
