import { getCollection, Collections } from '../../infrastructure/database/index.js';
import { logger } from '../../config/logger.js';

export interface AuditEvent {
  company_id?: string;
  user_id?: string;
  action: string;             // e.g. 'employee.created', 'company.updated', 'login.failed'
  entity_type?: string;       // e.g. 'employee', 'company', 'faq'
  entity_id?: string;
  description?: string;
  changes?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
}

/**
 * Write a structured audit log entry.
 * Non-blocking — fires and forgets (errors are logged but not thrown).
 *
 * NEVER log passwords, tokens, API keys, or secret values in changes.
 */
export function writeAuditLog(event: AuditEvent): void {
  const col = getCollection(Collections.AUDIT_LOGS);
  const now = new Date();

  col.insertOne({
    ...event,
    created_at: now,
  }).catch(err => {
    // Audit failures should never crash the app
    logger.error({ err, event: event.action }, 'Failed to write audit log');
  });
}

/**
 * Async version for when you need to await the write
 */
export async function writeAuditLogAsync(event: AuditEvent): Promise<void> {
  try {
    const col = getCollection(Collections.AUDIT_LOGS);
    await col.insertOne({ ...event, created_at: new Date() });
  } catch (err) {
    logger.error({ err, event: event.action }, 'Failed to write audit log');
  }
}
