import crypto from 'crypto';
import { config } from '../../config/env.js';
import { logger } from '../../config/logger.js';

/**
 * Verify Retell webhook signature
 * Prevents arbitrary callers from invoking company data endpoints
 */
export function verifyRetellSignature(
  rawBody: string,
  signature: string | undefined
): boolean {
  if (!signature) return false;

  const apiKey = config.retell.apiKey;
  if (!apiKey) {
    logger.error('RETELL_API_KEY not configured; cannot verify Retell webhook');
    return false;
  }

  try {
    const match = signature.match(/^v=(\d+),d=(.+)$/);
    if (!match) return false;

    const timestamp = match[1];
    const timestampMs = Number(timestamp);
    if (!Number.isFinite(timestampMs) || Math.abs(Date.now() - timestampMs) > 5 * 60 * 1000) return false;

    const expected = crypto.createHmac('sha256', apiKey).update(rawBody + timestamp).digest('hex');

    // Constant-time comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(match[2]),
      Buffer.from(expected)
    );
  } catch {
    return false;
  }
}
