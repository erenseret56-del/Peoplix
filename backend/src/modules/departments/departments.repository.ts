import { ObjectId, Filter } from 'mongodb';
import { getCollection, Collections } from '../../infrastructure/database/index.js';

export interface DepartmentDocument {
  _id?: ObjectId;
  company_id: string;
  name: string;
  code?: string;
  description?: string;
  parent_department_id?: string;
  status: string;
  created_at: Date;
  updated_at: Date;
}

export class DepartmentsRepository {
  private col() {
    return getCollection<DepartmentDocument>(Collections.DEPARTMENTS);
  }

  async findAll(companyId: string, skip = 0, limit = 100): Promise<{ data: DepartmentDocument[]; total: number }> {
    const filter: Filter<DepartmentDocument> = { company_id: companyId, status: 'active' };
    const [data, total] = await Promise.all([
      this.col().find(filter).sort({ name: 1 }).skip(skip).limit(limit).toArray(),
      this.col().countDocuments(filter),
    ]);
    return { data, total };
  }

  async findById(companyId: string, id: string): Promise<DepartmentDocument | null> {
    return this.col().findOne({ _id: new ObjectId(id), company_id: companyId });
  }

  async findByName(companyId: string, name: string): Promise<DepartmentDocument | null> {
    return this.col().findOne({
      company_id: companyId,
      name: new RegExp(`^${name}$`, 'i'),
      status: 'active',
    });
  }

  async create(data: Omit<DepartmentDocument, '_id' | 'created_at' | 'updated_at'>): Promise<DepartmentDocument> {
    const now = new Date();
    const doc = { ...data, created_at: now, updated_at: now };
    const result = await this.col().insertOne(doc as any);
    return { ...doc, _id: result.insertedId };
  }

  async update(companyId: string, id: string, data: Partial<DepartmentDocument>): Promise<DepartmentDocument | null> {
    const { company_id: _, _id: __, ...safeData } = data as any;
    return this.col().findOneAndUpdate(
      { _id: new ObjectId(id), company_id: companyId },
      { $set: { ...safeData, updated_at: new Date() } },
      { returnDocument: 'after' }
    );
  }

  async delete(companyId: string, id: string): Promise<boolean> {
    const result = await this.col().updateOne(
      { _id: new ObjectId(id), company_id: companyId },
      { $set: { status: 'inactive', updated_at: new Date() } }
    );
    return result.modifiedCount > 0;
  }

  async existsByCode(companyId: string, code: string, excludeId?: string): Promise<boolean> {
    const filter: any = { company_id: companyId, code };
    if (excludeId) filter._id = { $ne: new ObjectId(excludeId) };
    return (await this.col().countDocuments(filter)) > 0;
  }

  async searchByName(companyId: string, query: string, limit = 5): Promise<DepartmentDocument[]> {
    const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    return this.col()
      .find({ company_id: companyId, status: 'active', name: regex })
      .limit(limit)
      .toArray();
  }
}

export const departmentsRepository = new DepartmentsRepository();
