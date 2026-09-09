import { ObjectId, Filter } from 'mongodb';
import type { Document } from 'mongodb';
import { getCollection, Collections } from '../../infrastructure/database/index.js';
import { CompanyStatus } from '../../types/index.js';

export interface CompanyDocument extends Document {
  _id?: ObjectId;
  name: string;
  slug: string;
  email?: string;
  phone?: string;
  description?: string;
  website?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  settings: Record<string, any>;
  timezone: string;
  status: CompanyStatus;
  subscription_tier: string;
  billing_due_amount?: number;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date | null;
}

export class CompaniesRepository {
  private col() {
    return getCollection<CompanyDocument>(Collections.COMPANIES);
  }

  async findAll(skip = 0, limit = 20): Promise<{ data: CompanyDocument[]; total: number }> {
    const filter: Filter<CompanyDocument> = { deleted_at: null } as any;
    const [data, total] = await Promise.all([
      this.col().find(filter).sort({ created_at: -1 }).skip(skip).limit(limit).toArray(),
      this.col().countDocuments(filter),
    ]);
    return { data, total };
  }

  async findById(id: string): Promise<CompanyDocument | null> {
    return this.col().findOne({ _id: new ObjectId(id), deleted_at: null } as any);
  }

  async findBySlug(slug: string): Promise<CompanyDocument | null> {
    return this.col().findOne({ slug, deleted_at: null } as any);
  }

  async create(data: Omit<CompanyDocument, '_id' | 'created_at' | 'updated_at'>): Promise<CompanyDocument> {
    const now = new Date();
    const doc = { ...data, created_at: now, updated_at: now } as CompanyDocument;
    const result = await this.col().insertOne(doc as any);
    return { ...doc, _id: result.insertedId };
  }

  async update(id: string, data: Partial<CompanyDocument>): Promise<CompanyDocument | null> {
    return this.col().findOneAndUpdate(
      { _id: new ObjectId(id), deleted_at: null } as any,
      { $set: { ...data, updated_at: new Date() } },
      { returnDocument: 'after' }
    );
  }

  async hardDelete(id: string): Promise<boolean> {
    const result = await this.col().deleteOne({ _id: new ObjectId(id) } as any);
    return result.deletedCount > 0;
  }

  async existsBySlug(slug: string, excludeId?: string): Promise<boolean> {
    const filter: any = { slug, deleted_at: null };
    if (excludeId) filter._id = { $ne: new ObjectId(excludeId) };
    return (await this.col().countDocuments(filter)) > 0;
  }

  async count(): Promise<number> {
    return this.col().countDocuments({ deleted_at: null } as any);
  }
}

export const companiesRepository = new CompaniesRepository();
