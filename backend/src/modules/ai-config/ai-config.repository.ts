import { getDatabase } from '../../infrastructure/database/index.js';
import { CompanyAIConfigDocument, AI_CONFIG_COLLECTION } from './ai-config.types.js';
import { cache } from '../../infrastructure/cache/memory-cache.js';
import { logger } from '../../config/logger.js';

/**
 * AI Config Repository
 *
 * Every query is scoped to company_id. There is no way to accidentally
 * fetch another company's AI configuration.
 */
export class AIConfigRepository {
  private col() {
    return getDatabase().collection<CompanyAIConfigDocument>(AI_CONFIG_COLLECTION);
  }

  // ── CACHE HELPERS ───────────────────────────────────────────
  private cacheKey(companyId: string) {
    return `company:${companyId}:ai-config`;
  }

  private async fromCache(companyId: string): Promise<CompanyAIConfigDocument | null> {
    return cache.get<CompanyAIConfigDocument>(this.cacheKey(companyId));
  }

  private async toCache(cfg: CompanyAIConfigDocument): Promise<void> {
    await cache.set(this.cacheKey(cfg.company_id), cfg, 1800); // 30 min TTL
  }

  async invalidateCache(companyId: string): Promise<void> {
    await cache.delete(this.cacheKey(companyId));
  }

  // ── READS ────────────────────────────────────────────────────

  async findByCompanyId(companyId: string): Promise<CompanyAIConfigDocument | null> {
    const cached = await this.fromCache(companyId);
    if (cached) return cached;

    const doc = await this.col().findOne({ company_id: companyId, status: 'active' });
    if (doc) await this.toCache(doc);
    return doc;
  }

  async findAll(skip = 0, limit = 50): Promise<CompanyAIConfigDocument[]> {
    return this.col().find({}).sort({ created_at: -1 }).skip(skip).limit(limit).toArray();
  }

  // ── WRITES ───────────────────────────────────────────────────

  async upsert(companyId: string, data: Omit<CompanyAIConfigDocument, '_id' | 'company_id' | 'created_at' | 'updated_at'>): Promise<CompanyAIConfigDocument> {
    const now = new Date();

    const result = await this.col().findOneAndUpdate(
      { company_id: companyId },
      {
        $set: { ...data, company_id: companyId, updated_at: now },
        $setOnInsert: { created_at: now },
      },
      { upsert: true, returnDocument: 'after' }
    );

    await this.invalidateCache(companyId);
    logger.info({ companyId }, 'AI config upserted');
    return result!;
  }

  async updateDynamicVariables(
    companyId: string,
    variables: Partial<CompanyAIConfigDocument['dynamic_variables']>
  ): Promise<void> {
    const setFields: Record<string, any> = { updated_at: new Date() };
    for (const [k, v] of Object.entries(variables)) {
      setFields[`dynamic_variables.${k}`] = v;
    }

    await this.col().updateOne({ company_id: companyId }, { $set: setFields });
    await this.invalidateCache(companyId);
  }

  async updateFeatures(
    companyId: string,
    features: Partial<CompanyAIConfigDocument['features']>
  ): Promise<void> {
    const setFields: Record<string, any> = { updated_at: new Date() };
    for (const [k, v] of Object.entries(features)) {
      setFields[`features.${k}`] = v;
    }

    await this.col().updateOne({ company_id: companyId }, { $set: setFields });
    await this.invalidateCache(companyId);
  }
}

export const aiConfigRepository = new AIConfigRepository();
