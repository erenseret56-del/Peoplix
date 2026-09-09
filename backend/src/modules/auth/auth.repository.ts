import { ObjectId } from 'mongodb';
import type { Document } from 'mongodb';
import { getCollection, Collections } from '../../infrastructure/database/index.js';
import { UserRole, UserStatus } from '../../types/index.js';

export interface UserDocument extends Document {
  _id?: ObjectId;
  email: string;
  password_hash: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  role: UserRole;
  status: UserStatus;
  email_verified: boolean;
  last_login_at?: Date;
  password_changed_at?: Date;
  failed_login_attempts: number;
  locked_until?: Date;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date | null;
}

export class AuthRepository {
  private col() {
    return getCollection<UserDocument>(Collections.USERS);
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.col().findOne({ email: email.toLowerCase().trim(), deleted_at: null });
  }

  async findById(id: string): Promise<UserDocument | null> {
    return this.col().findOne({ _id: new ObjectId(id), deleted_at: null });
  }

  async create(data: Omit<UserDocument, '_id' | 'created_at' | 'updated_at'>): Promise<UserDocument> {
    const now = new Date();
    const doc = { ...data, email: data.email.toLowerCase().trim(), created_at: now, updated_at: now } as UserDocument;
    const result = await this.col().insertOne(doc as any);
    return { ...doc, _id: result.insertedId };
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.col().updateOne(
      { _id: new ObjectId(id) },
      { $set: { last_login_at: new Date(), failed_login_attempts: 0, updated_at: new Date() } }
    );
  }

  async incrementFailedAttempts(id: string): Promise<number> {
    const result = await this.col().findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $inc: { failed_login_attempts: 1 }, $set: { updated_at: new Date() } },
      { returnDocument: 'after' }
    );
    return result?.failed_login_attempts ?? 0;
  }

  async lockAccount(id: string, until: Date): Promise<void> {
    await this.col().updateOne(
      { _id: new ObjectId(id) },
      { $set: { locked_until: until, updated_at: new Date() } }
    );
  }

  async updatePassword(id: string, passwordHash: string): Promise<void> {
    await this.col().updateOne(
      { _id: new ObjectId(id) },
      { $set: { password_hash: passwordHash, password_changed_at: new Date(), updated_at: new Date() } }
    );
  }

  async existsByEmail(email: string): Promise<boolean> {
    const count = await this.col().countDocuments({ email: email.toLowerCase().trim(), deleted_at: null });
    return count > 0;
  }
}

export const authRepository = new AuthRepository();
