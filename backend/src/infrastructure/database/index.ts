import { MongoClient, Db, Collection, ObjectId } from 'mongodb';
import type { Document, Filter, UpdateFilter, FindOptions } from 'mongodb';
import { config } from '../../config/env.js';
import { logger } from '../../config/logger.js';
import { AI_CONFIG_COLLECTION } from '../../modules/ai-config/ai-config.types.js';

let client: MongoClient | null = null;
let db: Db | null = null;

/**
 * Get MongoDB client (singleton pattern)
 */
export function getMongoClient(): MongoClient {
  if (!client) {
    throw new Error('MongoDB client not initialized. Call connectDatabase() first.');
  }
  return client;
}

/**
 * Get MongoDB database instance
 */
export function getDatabase(): Db {
  if (!db) {
    throw new Error('MongoDB database not initialized. Call connectDatabase() first.');
  }
  return db;
}

/**
 * Connect to MongoDB
 */
export async function connectDatabase(): Promise<void> {
  try {
    logger.info('Connecting to MongoDB...');

    client = new MongoClient(config.database.url as string, {
      maxPoolSize: 50,
      minPoolSize: 5,
      maxIdleTimeMS: 30000,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      retryWrites: true,
      retryReads: true,
      w: 'majority',
    });

    await client.connect();
    
    db = client.db(config.database.name);

    logger.info({
      database: config.database.name,
    }, 'MongoDB connected successfully');

    // Test connection
    await db.command({ ping: 1 });
    logger.info('MongoDB ping successful');

  } catch (error) {
    logger.error({ err: error }, 'MongoDB connection failed');
    throw error;
  }
}

/**
 * Test database connectivity
 */
export async function testDatabaseConnection(): Promise<boolean> {
  try {
    const database = getDatabase();
    await database.command({ ping: 1 });
    
    const stats = await database.stats();
    logger.info({
      database: stats.db,
      collections: stats.collections,
      dataSize: stats.dataSize,
    }, 'Database connection successful');
    
    return true;
  } catch (error) {
    logger.error({ err: error }, 'Database connection test failed');
    return false;
  }
}

/**
 * Close database connection (for graceful shutdown)
 */
export async function closeDatabaseConnection(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
    logger.info('MongoDB connection closed');
  }
}

/**
 * Get a collection with type safety
 */
export function getCollection<T extends Document = Document>(name: string): Collection<T> {
  const database = getDatabase();
  return database.collection<T>(name);
}

/**
 * Collection names (centralized)
 */
export const Collections = {
  COMPANIES: 'companies',
  USERS: 'users',
  COMPANY_USERS: 'company_users',
  EMPLOYEES: 'employees',
  DEPARTMENTS: 'departments',
  DESIGNATIONS: 'designations',
  CUSTOMERS: 'customers',
  DOCUMENTS: 'company_documents',
  FAQS: 'company_faqs',
  POLICIES: 'company_policies',
  RETELL_AGENTS: 'retell_agents',
  CALL_LOGS: 'call_logs',
  PHONE_ASSIGNMENTS: 'phone_assignments',
  CALL_TRANSCRIPTS: 'call_transcripts',
  AUDIT_LOGS: 'audit_logs',
  DEMO_REQUESTS: 'demo_requests',
  COMPANY_REQUESTS: 'company_requests',
  BILLING_CONFIG: 'billing_config',
  NUMBER_PROFILES: 'number_profiles',
} as const;

/**
 * Create indexes for all collections
 */
export async function createIndexes(): Promise<void> {
  logger.info('Creating MongoDB indexes...');
  
  try {
    const database = getDatabase();

    // Companies
    await database.collection(Collections.COMPANIES).createIndexes([
      { key: { slug: 1 }, unique: true },
      { key: { status: 1 } },
      { key: { created_at: -1 } },
    ]);

    // Users
    await database.collection(Collections.USERS).createIndexes([
      { key: { email: 1 }, unique: true },
      { key: { role: 1 } },
      { key: { status: 1 } },
    ]);

    // Company Users
    await database.collection(Collections.COMPANY_USERS).createIndexes([
      { key: { company_id: 1, user_id: 1 }, unique: true },
      { key: { company_id: 1 } },
      { key: { user_id: 1 } },
      { key: { status: 1 } },
    ]);

    // Employees - CRITICAL for tenant isolation
    await database.collection(Collections.EMPLOYEES).createIndexes([
      { key: { company_id: 1, employee_number: 1 }, unique: true },
      { key: { company_id: 1, status: 1 } },
      { key: { company_id: 1, first_name: 1, last_name: 1 } },
      { key: { company_id: 1, email: 1 } },
      { key: { company_id: 1, department_id: 1 } },
      { key: { company_id: 1, designation_id: 1 } },
    ]);

    // Departments
    await database.collection(Collections.DEPARTMENTS).createIndexes([
      { key: { company_id: 1, code: 1 }, unique: true, sparse: true },
      { key: { company_id: 1, name: 1 } },
      { key: { company_id: 1, status: 1 } },
    ]);

    // Designations
    await database.collection(Collections.DESIGNATIONS).createIndexes([
      { key: { company_id: 1, code: 1 }, unique: true, sparse: true },
      { key: { company_id: 1, title: 1 } },
      { key: { company_id: 1, status: 1 } },
    ]);

    // Customers
    await database.collection(Collections.CUSTOMERS).createIndexes([
      { key: { company_id: 1, phone: 1 }, unique: true, sparse: true },
      { key: { company_id: 1, email: 1 } },
      { key: { company_id: 1, status: 1 } },
    ]);

    // Documents
    await database.collection(Collections.DOCUMENTS).createIndexes([
      { key: { company_id: 1, status: 1 } },
      { key: { company_id: 1, type: 1 } },
      { key: { company_id: 1, title: 1 } },
    ]);

    // FAQs
    await database.collection(Collections.FAQS).createIndexes([
      { key: { company_id: 1, status: 1 } },
      { key: { company_id: 1, category: 1 } },
      { key: { company_id: 1, priority: -1 } },
    ]);

    // Policies
    await database.collection(Collections.POLICIES).createIndexes([
      { key: { company_id: 1, code: 1 }, unique: true, sparse: true },
      { key: { company_id: 1, status: 1 } },
      { key: { company_id: 1, category: 1 } },
    ]);

    // Retell Agents
    await database.collection(Collections.RETELL_AGENTS).createIndexes([
      { key: { company_id: 1, retell_agent_id: 1 }, unique: true },
      { key: { retell_agent_id: 1 } },
      { key: { company_id: 1, status: 1 } },
    ]);

    // Call Logs
    await database.collection(Collections.CALL_LOGS).createIndexes([
      { key: { retell_call_id: 1 }, unique: true },
      { key: { company_id: 1, started_at: -1 } },
      { key: { company_id: 1, call_status: 1 } },
      { key: { company_id: 1, customer_id: 1 } },
      { key: { company_id: 1, phone_assignment_id: 1 } },
      { key: { company_id: 1, to_number: 1 } },
    ]);

    // Phone assignments
    await database.collection(Collections.PHONE_ASSIGNMENTS).createIndexes([
      { key: { company_id: 1, normalized_phone_number: 1 }, unique: true },
      // Twilio phone numbers are physical platform resources and cannot be
      // owned by two companies. The migration command creates this index
      // after inspecting/canonicalizing legacy records.
      { key: { normalized_phone_number: 1 }, name: 'normalized_phone_number_1_unique', unique: true },
      { key: { company_id: 1, status: 1 } },
      { key: { phone_number: 1 } },
      { key: { twilio_sid: 1 }, sparse: true },
    ]);

    // AI Config (per-company Retell configuration)
    await database.collection(AI_CONFIG_COLLECTION).createIndexes([
      { key: { company_id: 1 }, unique: true },
      { key: { retell_agent_id: 1 } },
      { key: { status: 1 } },
    ]);

    // Call Transcripts
    await database.collection(Collections.CALL_TRANSCRIPTS).createIndexes([
      { key: { call_log_id: 1 } },
    ]);

    // Audit Logs
    await database.collection(Collections.AUDIT_LOGS).createIndexes([
      { key: { company_id: 1, created_at: -1 } },
      { key: { user_id: 1, created_at: -1 } },
      { key: { entity_type: 1, entity_id: 1 } },
    ]);

    // Public demo requests
    await database.collection(Collections.DEMO_REQUESTS).createIndexes([
      { key: { created_at: -1 } },
      { key: { status: 1, created_at: -1 } },
      { key: { email: 1 } },
    ]);

    // Public company inquiries
    await database.collection(Collections.COMPANY_REQUESTS).createIndexes([
      { key: { created_at: -1 } },
      { key: { status: 1, created_at: -1 } },
      { key: { email: 1 } },
      { key: { company_name: 1 } },
    ]);

    await database.collection(Collections.BILLING_CONFIG).createIndexes([
      { key: { updated_at: -1 } },
    ]);

    await database.collection(Collections.NUMBER_PROFILES).createIndexes([
      { key: { company_id: 1, phone_assignment_id: 1 }, unique: true },
      { key: { company_id: 1, updated_at: -1 } },
    ]);

    logger.info('All MongoDB indexes created successfully');
  } catch (error) {
    logger.error({ err: error }, 'Failed to create indexes');
    throw error;
  }
}

/**
 * Helper to convert string ID to ObjectId
 */
export function toObjectId(id: string): ObjectId {
  try {
    return new ObjectId(id);
  } catch (error) {
    throw new Error(`Invalid ObjectId: ${id}`);
  }
}

/**
 * Helper to check if string is valid ObjectId
 */
export function isValidObjectId(id: string): boolean {
  return ObjectId.isValid(id);
}

/**
 * Helper to generate new ObjectId
 */
export function newObjectId(): ObjectId {
  return new ObjectId();
}

/**
 * Helper to convert ObjectId to string
 */
export function objectIdToString(id: ObjectId): string {
  return id.toString();
}

export { ObjectId, Db, Collection };
export type { Document, Filter, UpdateFilter, FindOptions };
