import { employeesRepository } from './employees.repository.js';
import { NotFoundError, ConflictError } from '../../middleware/errorHandler.js';
import { logger } from '../../config/logger.js';
import { cache } from '../../infrastructure/cache/memory-cache.js';

function sanitizeEmployee(e: any) {
  return {
    id: e._id?.toString(),
    company_id: e.company_id,
    employee_number: e.employee_number,
    first_name: e.first_name,
    last_name: e.last_name,
    full_name: `${e.first_name} ${e.last_name}`,
    email: e.email,
    phone: e.phone,
    department_id: e.department_id,
    designation_id: e.designation_id,
    manager_id: e.manager_id,
    hire_date: e.hire_date,
    employment_type: e.employment_type,
    status: e.status,
    created_at: e.created_at,
    updated_at: e.updated_at,
  };
}

export class EmployeesService {

  async list(companyId: string, opts: { page?: number; limit?: number; status?: string; departmentId?: string } = {}) {
    const page = opts.page ?? 1;
    const limit = opts.limit ?? 20;
    const skip = (page - 1) * limit;

    const { data, total } = await employeesRepository.findAll(companyId, {
      skip,
      limit,
      status: opts.status,
      departmentId: opts.departmentId,
    });

    return {
      data: data.map(sanitizeEmployee),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + data.length < total,
      },
    };
  }

  async getById(companyId: string, id: string) {
    const cacheKey = `company:${companyId}:employee:${id}`;
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const employee = await employeesRepository.findById(companyId, id);
    if (!employee) throw new NotFoundError('Employee not found');

    const result = sanitizeEmployee(employee);
    await cache.set(cacheKey, result, 300); // 5 min TTL
    return result;
  }

  async create(companyId: string, data: {
    employee_number: string;
    first_name: string;
    last_name: string;
    email?: string;
    phone?: string;
    department_id?: string;
    designation_id?: string;
    manager_id?: string;
    hire_date?: string;
    employment_type?: string;
    date_of_birth?: string;
    metadata?: Record<string, any>;
  }) {
    // Check unique employee number within this company
    if (await employeesRepository.existsByNumber(companyId, data.employee_number)) {
      throw new ConflictError(`Employee number ${data.employee_number} already exists`);
    }

    const employee = await employeesRepository.create({
      company_id: companyId,
      employee_number: data.employee_number,
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email,
      phone: data.phone,
      department_id: data.department_id,
      designation_id: data.designation_id,
      manager_id: data.manager_id,
      hire_date: data.hire_date ? new Date(data.hire_date) : undefined,
      date_of_birth: data.date_of_birth ? new Date(data.date_of_birth) : undefined,
      employment_type: data.employment_type || 'full-time',
      status: 'active',
      metadata: data.metadata || {},
    });

    logger.info({ companyId, employeeId: employee._id }, 'Employee created');
    return sanitizeEmployee(employee);
  }

  async update(companyId: string, id: string, data: Partial<{
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    department_id: string;
    designation_id: string;
    manager_id: string;
    hire_date: string;
    employment_type: string;
    status: string;
    metadata: Record<string, any>;
  }>) {
    const existing = await employeesRepository.findById(companyId, id);
    if (!existing) throw new NotFoundError('Employee not found');

    const updated = await employeesRepository.update(companyId, id, {
      ...data,
      hire_date: data.hire_date ? new Date(data.hire_date) : undefined,
    });

    if (!updated) throw new NotFoundError('Employee not found');

    // Invalidate cache
    await cache.delete(`company:${companyId}:employee:${id}`);

    logger.info({ companyId, employeeId: id }, 'Employee updated');
    return sanitizeEmployee(updated);
  }

  async delete(companyId: string, id: string): Promise<void> {
    const exists = await employeesRepository.findById(companyId, id);
    if (!exists) throw new NotFoundError('Employee not found');

    await employeesRepository.delete(companyId, id);
    await cache.delete(`company:${companyId}:employee:${id}`);

    logger.info({ companyId, employeeId: id }, 'Employee deactivated');
  }

  /**
   * Search for Retell AI - returns structured data for natural language response
   */
  async searchForRetell(companyId: string, query: string) {
    const results = await employeesRepository.searchWithDetails(companyId, query, 3);

    if (results.length === 0) return null;

    return results.map(e => ({
      employee_number: e.employee_number,
      first_name: e.first_name,
      last_name: e.last_name,
      full_name: `${e.first_name} ${e.last_name}`,
      email: e.email,
      phone: e.phone,
      department: e.department?.name || null,
      designation: e.designation?.title || null,
      status: e.status,
      hire_date: e.hire_date,
    }));
  }
}

export const employeesService = new EmployeesService();
