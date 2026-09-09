import { ObjectId, Filter } from 'mongodb';
import { getCollection, Collections } from '../../infrastructure/database/index.js';

export interface EmployeeDocument {
  _id?: ObjectId;
  company_id: string;        // TENANT ISOLATION - always present
  employee_number: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  date_of_birth?: Date;
  department_id?: string;
  designation_id?: string;
  manager_id?: string;
  hire_date?: Date;
  termination_date?: Date;
  employment_type?: string;
  status: string;
  metadata?: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface EmployeeWithDetails extends EmployeeDocument {
  department?: { _id: ObjectId; name: string; code?: string };
  designation?: { _id: ObjectId; title: string };
  manager?: { _id: ObjectId; first_name: string; last_name: string };
}

export class EmployeesRepository {
  private col() {
    return getCollection<EmployeeDocument>(Collections.EMPLOYEES);
  }

  /**
   * CRITICAL: Every query is scoped to companyId
   */
  async findAll(
    companyId: string,
    opts: { skip?: number; limit?: number; status?: string; departmentId?: string } = {}
  ): Promise<{ data: EmployeeDocument[]; total: number }> {
    const filter: Filter<EmployeeDocument> = {
      company_id: companyId,
      ...(opts.status ? { status: opts.status } : { status: 'active' }),
      ...(opts.departmentId && { department_id: opts.departmentId }),
    };

    const [data, total] = await Promise.all([
      this.col()
        .find(filter)
        .sort({ first_name: 1 })
        .skip(opts.skip ?? 0)
        .limit(opts.limit ?? 20)
        .toArray(),
      this.col().countDocuments(filter),
    ]);

    return { data, total };
  }

  async findById(companyId: string, id: string): Promise<EmployeeDocument | null> {
    return this.col().findOne({
      _id: new ObjectId(id),
      company_id: companyId,  // TENANT ISOLATION
    });
  }

  async findByEmployeeNumber(companyId: string, number: string): Promise<EmployeeDocument | null> {
    return this.col().findOne({
      company_id: companyId,
      employee_number: number,
    });
  }

  /**
   * Full-text search by name - used by Retell AI
   * ALWAYS scoped to companyId
   */
  async searchByName(
    companyId: string,
    query: string,
    limit = 5
  ): Promise<EmployeeDocument[]> {
    const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

    return this.col()
      .find({
        company_id: companyId,  // TENANT ISOLATION
        status: 'active',
        $or: [
          { first_name: regex },
          { last_name: regex },
          { email: regex },
          { employee_number: regex },
        ],
      })
      .limit(limit)
      .toArray();
  }

  /**
   * Search with department + designation join (for Retell AI responses)
   */
  async searchWithDetails(
    companyId: string,
    query: string,
    limit = 3
  ): Promise<EmployeeWithDetails[]> {
    const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

    const pipeline = [
      {
        $match: {
          company_id: companyId,  // TENANT ISOLATION
          status: 'active',
          $or: [
            { first_name: regex },
            { last_name: regex },
            { employee_number: regex },
            { email: regex },
          ],
        },
      },
      { $limit: limit },
      {
        $lookup: {
          from: Collections.DEPARTMENTS,
          let: { dept_id: '$department_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$_id', { $toObjectId: '$$dept_id' }] },
                    { $eq: ['$company_id', companyId] }, // TENANT ISOLATION
                  ],
                },
              },
            },
            { $project: { _id: 1, name: 1, code: 1 } },
          ],
          as: 'department',
        },
      },
      {
        $lookup: {
          from: Collections.DESIGNATIONS,
          let: { desig_id: '$designation_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$_id', { $toObjectId: '$$desig_id' }] },
                    { $eq: ['$company_id', companyId] }, // TENANT ISOLATION
                  ],
                },
              },
            },
            { $project: { _id: 1, title: 1 } },
          ],
          as: 'designation',
        },
      },
      {
        $addFields: {
          department: { $arrayElemAt: ['$department', 0] },
          designation: { $arrayElemAt: ['$designation', 0] },
        },
      },
    ];

    return this.col().aggregate<EmployeeWithDetails>(pipeline).toArray();
  }

  async create(data: Omit<EmployeeDocument, '_id' | 'created_at' | 'updated_at'>): Promise<EmployeeDocument> {
    const now = new Date();
    const doc = { ...data, created_at: now, updated_at: now };
    const result = await this.col().insertOne(doc as any);
    return { ...doc, _id: result.insertedId };
  }

  async update(companyId: string, id: string, data: Partial<EmployeeDocument>): Promise<EmployeeDocument | null> {
    // Remove protected fields
    const { company_id: _, _id: __, ...safeData } = data as any;

    return this.col().findOneAndUpdate(
      { _id: new ObjectId(id), company_id: companyId }, // TENANT ISOLATION
      { $set: { ...safeData, updated_at: new Date() } },
      { returnDocument: 'after' }
    );
  }

  async delete(companyId: string, id: string): Promise<boolean> {
    const result = await this.col().updateOne(
      { _id: new ObjectId(id), company_id: companyId }, // TENANT ISOLATION
      { $set: { status: 'terminated', updated_at: new Date() } }
    );
    return result.modifiedCount > 0;
  }

  async existsByNumber(companyId: string, number: string, excludeId?: string): Promise<boolean> {
    const filter: any = { company_id: companyId, employee_number: number };
    if (excludeId) filter._id = { $ne: new ObjectId(excludeId) };
    return (await this.col().countDocuments(filter)) > 0;
  }

  async countByDepartment(companyId: string, departmentId: string): Promise<number> {
    return this.col().countDocuments({
      company_id: companyId,
      department_id: departmentId,
      status: 'active',
    });
  }
}

export const employeesRepository = new EmployeesRepository();
