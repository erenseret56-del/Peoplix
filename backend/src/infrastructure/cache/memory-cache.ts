import { logger } from '../../config/logger.js';
import { config } from '../../config/env.js';

interface CacheEntry<T = any> {
  value: T;
  expiresAt: number;
}

export class MemoryCache {
  private cache: Map<string, CacheEntry> = new Map();
  private prefix: string;

  constructor(prefix: string = 'cache') {
    this.prefix = prefix;
    this.startCleanupInterval();
  }

  private getPrefixedKey(key: string): string {
    return `${this.prefix}:${key}`;
  }

  async get<T = any>(key: string): Promise<T | null> {
    try {
      const prefixedKey = this.getPrefixedKey(key);
      const entry = this.cache.get(prefixedKey);

      if (!entry) return null;

      if (entry.expiresAt < Date.now()) {
        this.cache.delete(prefixedKey);
        return null;
      }

      return entry.value as T;
    } catch (error) {
      logger.warn({ err: error, key }, 'Cache get error');
      return null;
    }
  }

  async set(key: string, value: any, ttl: number = 3600): Promise<void> {
    try {
      const prefixedKey = this.getPrefixedKey(key);
      this.cache.set(prefixedKey, { value, expiresAt: Date.now() + (ttl * 1000) });
    } catch (error) {
      logger.warn({ err: error, key }, 'Cache set error');
    }
  }

  async delete(key: string): Promise<void> {
    try {
      this.cache.delete(this.getPrefixedKey(key));
    } catch (error) {
      logger.warn({ err: error, key }, 'Cache delete error');
    }
  }

  async deletePattern(pattern: string): Promise<void> {
    try {
      const prefixedPattern = this.getPrefixedKey(pattern);
      const regex = new RegExp(`^${prefixedPattern.replace(/\*/g, '.*')}$`);

      for (const [key] of this.cache) {
        if (regex.test(key)) {
          this.cache.delete(key);
        }
      }
    } catch (error) {
      logger.warn({ err: error, pattern }, 'Cache deletePattern error');
    }
  }

  async clear(): Promise<void> {
    try {
      this.cache.clear();
    } catch (error) {
      logger.warn({ err: error }, 'Cache clear error');
    }
  }

  getSize(): number {
    return this.cache.size;
  }

  private startCleanupInterval(): void {
    setInterval(() => {
      try {
        const now = Date.now();
        let cleanedCount = 0;

        for (const [key, entry] of this.cache) {
          if (entry.expiresAt < now) {
            this.cache.delete(key);
            cleanedCount++;
          }
        }

        if (cleanedCount > 0) {
          logger.debug({ cleanedCount, cacheSize: this.cache.size }, 'Cache cleanup completed');
        }
      } catch (error) {
        logger.warn({ err: error }, 'Cache cleanup error');
      }
    }, 60000);
  }
}

class UpstashCache {
  private readonly prefix: string;
  private readonly url?: string;
  private readonly token?: string;

  constructor(prefix: string = 'cache') {
    this.prefix = prefix;
    this.url = config.cache.upstashUrl;
    this.token = config.cache.upstashToken;
  }

  private key(key: string): string {
    return `${this.prefix}:${key}`;
  }

  private async request<T>(path: string, method: 'GET' | 'POST' | 'DELETE' = 'GET', body?: Record<string, unknown>): Promise<T | null> {
    if (!this.url || !this.token) {
      return null;
    }

    const response = await fetch(`${this.url}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      const text = await response.text();
      logger.warn({ status: response.status, text }, 'Upstash cache request failed');
      return null;
    }

    const data = await response.json();
    return data as T;
  }

  async get<T = any>(key: string): Promise<T | null> {
    if (!this.url || !this.token) return null;

    try {
      const result = await this.request<{ result?: string | null }>(`/get/${encodeURIComponent(this.key(key))}`);
      if (!result || !('result' in result)) return null;

      const raw = result.result;
      if (raw === null || raw === undefined || raw === '') return null;

      return typeof raw === 'string' ? JSON.parse(raw) as T : (raw as T);
    } catch (error) {
      logger.warn({ err: error, key }, 'Upstash cache get error');
      return null;
    }
  }

  async set(key: string, value: any, ttl: number = 3600): Promise<void> {
    if (!this.url || !this.token) return;

    try {
      await this.request(`/set/${encodeURIComponent(this.key(key))}`, 'POST', {
        value: JSON.stringify(value),
        ex: ttl,
      });
    } catch (error) {
      logger.warn({ err: error, key }, 'Upstash cache set error');
    }
  }

  async delete(key: string): Promise<void> {
    if (!this.url || !this.token) return;

    try {
      await this.request(`/del/${encodeURIComponent(this.key(key))}`, 'POST');
    } catch (error) {
      logger.warn({ err: error, key }, 'Upstash cache delete error');
    }
  }

  async deletePattern(pattern: string): Promise<void> {
    if (!this.url || !this.token) return;

    try {
      const matching = await this.request<{ result?: string[] }>(`/keys/${encodeURIComponent(this.key(pattern))}`);
      const keys = matching?.result ?? [];

      if (keys.length > 0) {
        await this.request('/del', 'POST', {
          keys,
        });
      }
    } catch (error) {
      logger.warn({ err: error, pattern }, 'Upstash cache deletePattern error');
    }
  }

  async clear(): Promise<void> {
    if (!this.url || !this.token) return;

    try {
      await this.request('/flushdb', 'POST');
    } catch (error) {
      logger.warn({ err: error }, 'Upstash cache clear error');
    }
  }

  getSize(): number {
    return 0;
  }
}

const fallbackCache = new MemoryCache('cache');
const cloudCache = new UpstashCache('cache');

const isCloudEnabled = Boolean(config.cache.upstashUrl && config.cache.upstashToken && config.cache.provider === 'upstash');

export function getCache() {
  if (isCloudEnabled) {
    logger.info('Using Upstash Redis free tier cache');
    return cloudCache;
  }

  logger.info('Using in-memory cache fallback');
  return fallbackCache;
}

export const cache = getCache();
