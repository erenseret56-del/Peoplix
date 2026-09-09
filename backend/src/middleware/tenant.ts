import { FastifyRequest, FastifyReply } from 'fastify';
import { logger } from '../config/logger.js';
import { UserContext, TenantContext, AuthenticatedRequest } from '../types/index.js';
import { getCollection, Collections, toObjectId } from '../infrastructure/database/index.js';
import { cache } from '../infrastructure/cache/memory-cache.js';

export async function resolveTenant(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const user = (request as any).user as UserContext;

  if (!user) {
    return reply.status(401).send({
      success: false,
      error: { code: 'UNAUTHENTICATED', message: 'Authentication required' },
    });
  }

  try {
    if (user.role === 'super_admin') {
      logger.debug({ userId: user.id }, 'Super admin — no default tenant context');
      return;
    }

    if (!user.companyId) {
      const companyUser = await getCollection(Collections.COMPANY_USERS).findOne({
        user_id: user.id,
        status: 'active',
      });

      if (!companyUser) {
        return reply.status(403).send({
          success: false,
          error: { code: 'NO_COMPANY_ACCESS', message: 'User is not associated with any company' },
        });
      }

      user.companyId = String(companyUser.company_id);
    }

    const tenant = await getTenantContext(user.companyId as string);

    if (!tenant) {
      return reply.status(403).send({
        success: false,
        error: { code: 'COMPANY_NOT_FOUND', message: 'Associated company not found' },
      });
    }

    if (tenant.status !== 'active') {
      return reply.status(403).send({
        success: false,
        error: { code: 'COMPANY_INACTIVE', message: 'Company account is inactive' },
      });
    }

    (request as AuthenticatedRequest).tenant = tenant;

    logger.debug({ userId: user.id, tenantId: tenant.id }, 'Tenant context resolved');

  } catch (error) {
    logger.error({ err: error, userId: user.id }, 'Failed to resolve tenant');
    return reply.status(500).send({
      success: false,
      error: { code: 'TENANT_RESOLUTION_FAILED', message: 'Failed to resolve company context' },
    });
  }
}

async function getTenantContext(companyId: string): Promise<TenantContext | null> {
  const cacheKey = `company:${companyId}:context`;
  const cached = await cache.get<TenantContext>(cacheKey);
  if (cached) return cached;

  const col = getCollection(Collections.COMPANIES);
  const company = await col.findOne(
    { _id: toObjectId(companyId), deleted_at: null },
    { projection: { _id: 1, name: 1, slug: 1, status: 1 } }
  );

  if (!company) return null;

  const tenant: TenantContext = {
    id: company._id.toString(),
    name: String(company.name),
    slug: String(company.slug),
    status: String(company.status),
  };

  await cache.set(cacheKey, tenant, 3600);
  return tenant;
}

export function getTenantId(request: FastifyRequest): string {
  const authRequest = request as AuthenticatedRequest;
  if (!authRequest.tenant) {
    throw new Error('Tenant context not found. resolveTenant middleware missing?');
  }
  return String(authRequest.tenant.id);
}

export function getUser(request: FastifyRequest): UserContext {
  const authRequest = request as AuthenticatedRequest;
  if (!authRequest.user) {
    throw new Error('User context not found. authenticateJWT middleware missing?');
  }
  return authRequest.user;
}

export function isSuperAdmin(request: FastifyRequest): boolean {
  const user = (request as AuthenticatedRequest).user;
  return user?.role === 'super_admin';
}

export function isCompanyAdmin(request: FastifyRequest): boolean {
  const user = (request as AuthenticatedRequest).user;
  return user?.role === 'company_admin' || user?.role === 'super_admin';
}

export async function invalidateTenantCache(companyId: string): Promise<void> {
  await cache.delete(`company:${companyId}:context`);
  logger.debug({ companyId }, 'Tenant cache invalidated');
}

export function tenantLogger(request: FastifyRequest) {
  const authRequest = request as AuthenticatedRequest;
  return logger.child({
    requestId: request.id,
    userId: authRequest.user?.id,
    tenantId: authRequest.tenant?.id,
  });
}
