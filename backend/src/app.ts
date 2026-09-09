import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import multipart from '@fastify/multipart';
import { config } from './config/env.js';
import { logger } from './config/logger.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

// Route imports
import { authRoutes }         from './modules/auth/auth.routes.js';
import { companiesRoutes }    from './modules/companies/companies.routes.js';
import { employeesRoutes }    from './modules/employees/employees.routes.js';
import { departmentsRoutes }  from './modules/departments/departments.routes.js';
import { designationsRoutes } from './modules/designations/designations.routes.js';
import { faqsRoutes }         from './modules/faqs/faqs.routes.js';
import { policiesRoutes }     from './modules/policies/policies.routes.js';
import { retellRoutes }       from './modules/retell/retell.routes.js';
import { retellAgentsRoutes } from './modules/retell/retell-agents.routes.js';
import { callsRoutes }        from './modules/calls/calls.routes.js';
import { aiConfigRoutes }     from './modules/ai-config/ai-config.routes.js';
import { customersRoutes }    from './modules/customers/customers.routes.js';
import { auditRoutes }        from './modules/audit/audit.routes.js';
import { documentsRoutes }    from './modules/documents/documents.routes.js';
import { phoneNumbersRoutes } from './modules/phone-numbers/phone-numbers.routes.js';
import { siteConfigRoutes }  from './modules/site-config/site-config.routes.js';
import { demoRequestsRoutes } from './modules/demo-requests/demo-requests.routes.js';
import { companyRequestsRoutes } from './modules/company-requests/company-requests.routes.js';
import { billingRoutes } from './modules/billing/billing.routes.js';

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: false,
    requestIdHeader: 'x-request-id',
    requestIdLogLabel: 'requestId',
    trustProxy: config.app.trustProxy,
    requestTimeout: 30_000,
    bodyLimit: 5242880, // 5MB (for document uploads)
  });

  app.removeContentTypeParser('application/json');
  app.addContentTypeParser('application/json', { parseAs: 'string' }, (request, body, done) => {
    try {
      (request as any).rawBody = body as string;
      done(null, JSON.parse(body as string));
    } catch (error) {
      done(error as Error, undefined);
    }
  });

  await app.register(multipart, { limits: { fileSize: 20 * 1024 * 1024 } });

  // ── SECURITY PLUGINS ──────────────────────────────────────────────────────
  await app.register(helmet, {
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  });

  await app.register(cors, {
    origin: config.app.isDevelopment
      ? /^https?:\/\/localhost:\d+$/
      : config.cors.origin,
    credentials: config.cors.credentials,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Request-ID',
      'X-Retell-Signature',
    ],
  });

  await app.register(rateLimit, {
    max: config.rateLimit.max,
    timeWindow: config.rateLimit.timeWindow,
    keyGenerator: (request) => request.ip,
    errorResponseBuilder: () => ({
      success: false,
      error: { code: 'TOO_MANY_REQUESTS', message: 'Too many requests. Please slow down.' },
    }),
  });

  // ── HEALTH ────────────────────────────────────────────────────────────────
  app.get('/health', async (_, reply) => reply.send({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    service: 'peoplix-backend',
  }));

  app.get('/health/ready', async (_, reply) => {
    const { testDatabaseConnection } = await import('./infrastructure/database/index.js');

    const dbOk = await testDatabaseConnection();
    return reply.status(dbOk ? 200 : 503).send({
      status: dbOk ? 'ready' : 'degraded',
      timestamp: new Date().toISOString(),
      checks: { database: dbOk ? 'ok' : 'error' },
    });
  });

  // ── API ROUTES ────────────────────────────────────────────────────────────
  await app.register(authRoutes,        { prefix: '/api/auth' });
  await app.register(companiesRoutes,   { prefix: '/api/companies' });
  await app.register(employeesRoutes,   { prefix: '/api/employees' });
  await app.register(departmentsRoutes, { prefix: '/api/departments' });
  await app.register(designationsRoutes,{ prefix: '/api/designations' });
  await app.register(faqsRoutes,        { prefix: '/api/faqs' });
  await app.register(policiesRoutes,    { prefix: '/api/policies' });
  await app.register(retellRoutes,       { prefix: '/api/retell' });
  await app.register(retellAgentsRoutes, { prefix: '/api/retell-agents' });
  await app.register(callsRoutes,        { prefix: '/api/calls' });
  await app.register(aiConfigRoutes,    { prefix: '/api/ai-config' });
  await app.register(customersRoutes,   { prefix: '/api/customers' });
  await app.register(auditRoutes,       { prefix: '/api/audit' });
  await app.register(documentsRoutes,   { prefix: '/api/documents' });
  await app.register(phoneNumbersRoutes, { prefix: '/api/admin/phone-numbers' });
  await app.register(siteConfigRoutes,   { prefix: '/api/site-config' });
  await app.register(demoRequestsRoutes, { prefix: '/api/demo-requests' });
  await app.register(companyRequestsRoutes, { prefix: '/api/company-requests' });
  await app.register(billingRoutes, { prefix: '/api/billing' });

  // ── ERROR HANDLERS ────────────────────────────────────────────────────────
  app.setErrorHandler(errorHandler);
  app.setNotFoundHandler(notFoundHandler);

  // ── REQUEST LOGGING ───────────────────────────────────────────────────────
  app.addHook('onRequest', async (request) => {
    logger.info({
      requestId: request.id,
      method: request.method,
      url: request.url,
      ip: request.ip,
    }, 'Incoming request');
  });

  app.addHook('onResponse', async (request, reply) => {
    logger.info({
      requestId: request.id,
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode,
      duration: reply.elapsedTime,
    }, 'Request completed');
  });

  return app;
}
