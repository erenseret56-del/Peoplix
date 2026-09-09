import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getCollection, Collections } from '../../infrastructure/database/index.js';
import { authenticateJWT, requireAdmin, requireSuperAdmin } from '../../middleware/auth.js';
import { resolveTenant, getTenantId } from '../../middleware/tenant.js';
import { ValidationError } from '../../middleware/errorHandler.js';
import { ObjectId } from 'mongodb';
import type { Document } from 'mongodb';

const BILLING_CONFIG_ID = 'global';
const DEFAULT_RATES = {
  currency: 'USD',
  twilio_monthly_number_rate: 1.15,
  twilio_voice_per_minute: 0.013,
  retell_per_minute: 0.07,
  storage_per_gb_month: 0.02,
  platform_fee_percent: 10,
  tax_percent: 0,
};

interface BillingConfigDoc extends Document {
  _id: string;
  currency: string;
  twilio_monthly_number_rate: number;
  twilio_voice_per_minute: number;
  retell_per_minute: number;
  storage_per_gb_month: number;
  platform_fee_percent: number;
  tax_percent: number;
  updated_at: Date;
  updated_by?: string;
}

const settingsSchema = z.object({
  currency: z.string().trim().length(3).transform((value) => value.toUpperCase()),
  twilio_monthly_number_rate: z.coerce.number().min(0),
  twilio_voice_per_minute: z.coerce.number().min(0),
  retell_per_minute: z.coerce.number().min(0),
  storage_per_gb_month: z.coerce.number().min(0),
  platform_fee_percent: z.coerce.number().min(0).max(100),
  tax_percent: z.coerce.number().min(0).max(100),
});

async function getBillingConfig(): Promise<BillingConfigDoc> {
  const saved = await getCollection<BillingConfigDoc>('billing_config').findOne({ _id: BILLING_CONFIG_ID });
  return saved || {
    _id: BILLING_CONFIG_ID,
    ...DEFAULT_RATES,
    updated_at: new Date(),
  } as BillingConfigDoc;
}

export async function billingRoutes(fastify: FastifyInstance) {
  const configCollection = () => getCollection<BillingConfigDoc>('billing_config');

  fastify.get('/settings', { preHandler: [authenticateJWT, requireSuperAdmin] }, async (_request, reply) => {
    const settings = await getBillingConfig();
    return reply.send({ success: true, data: settings });
  });

  fastify.put('/settings', { preHandler: [authenticateJWT, requireSuperAdmin] }, async (request, reply) => {
    const parsed = settingsSchema.safeParse(request.body);
    if (!parsed.success) throw new ValidationError('Invalid billing settings', parsed.error.errors);
    const user = (request as any).user;
    const updated = { ...parsed.data, updated_at: new Date(), updated_by: user.id };
    await configCollection().updateOne({ _id: BILLING_CONFIG_ID }, { $set: updated }, { upsert: true });
    return reply.send({ success: true, data: { _id: BILLING_CONFIG_ID, ...updated }, message: 'Billing settings saved' });
  });

  fastify.get('/summary', { preHandler: [authenticateJWT, resolveTenant, requireAdmin] }, async (request, reply) => {
    const tenantId = getTenantId(request);
    const company = await getCollection(Collections.COMPANIES).findOne({ _id: new ObjectId(tenantId) });
    if (!company) throw new ValidationError('Company not found');
    return reply.send({
      success: true,
      data: {
        currency: (await getBillingConfig()).currency,
        amount_due: Number(company.billing_due_amount || 0),
      },
    });
  });
}
