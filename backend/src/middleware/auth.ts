import { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { logger } from '../config/logger.js';
import { JWTPayload, UserContext } from '../types/index.js';

/**
 * Extract JWT token from Authorization header
 */
function extractToken(request: FastifyRequest): string | null {
  const authHeader = request.headers.authorization;
  
  if (!authHeader) {
    return null;
  }

  // Bearer token format: "Bearer <token>"
  const parts = authHeader.split(' ');
  
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
}

/**
 * Verify JWT token and extract payload
 */
function verifyToken(token: string): JWTPayload {
  try {
    const payload = jwt.verify(token, config.jwt.secret) as JWTPayload;
    return payload;
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('INVALID_TOKEN');
    } else if (error instanceof jwt.TokenExpiredError) {
      throw new Error('TOKEN_EXPIRED');
    }
    throw error;
  }
}

/**
 * Authentication middleware
 * Verifies JWT and attaches user context to request
 */
export async function authenticateJWT(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const token = extractToken(request);

    if (!token) {
      return reply.status(401).send({
        success: false,
        error: {
          code: 'MISSING_TOKEN',
          message: 'Authentication required',
        },
      });
    }

    const payload = verifyToken(token);

    // Attach user context to request
    (request as any).user = {
      id: payload.userId,
      email: payload.email,
      role: payload.role,
      companyId: payload.companyId,
    } as UserContext;

    logger.debug({
      userId: payload.userId,
      role: payload.role,
    }, 'User authenticated');

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid token';
    
    return reply.status(401).send({
      success: false,
      error: {
        code: message === 'TOKEN_EXPIRED' ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN',
        message: message === 'TOKEN_EXPIRED' ? 'Token has expired' : 'Invalid authentication token',
      },
    });
  }
}

/**
 * Optional authentication middleware
 * Attaches user context if token is present, but doesn't fail if missing
 */
export async function optionalAuth(
  request: FastifyRequest,
  _reply: FastifyReply
): Promise<void> {
  try {
    const token = extractToken(request);

    if (token) {
      const payload = verifyToken(token);
      (request as any).user = {
        id: payload.userId,
        email: payload.email,
        role: payload.role,
        companyId: payload.companyId,
      } as UserContext;
    }
  } catch (error) {
    // Silently fail for optional auth
    logger.debug('Optional auth failed, continuing without user context');
  }
}

/**
 * Role-based authorization middleware factory
 * @param allowedRoles - Array of roles that are allowed to access the route
 */
export function requireRole(...allowedRoles: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user as UserContext;

    if (!user) {
      return reply.status(401).send({
        success: false,
        error: {
          code: 'UNAUTHENTICATED',
          message: 'Authentication required',
        },
      });
    }

    if (!allowedRoles.includes(user.role)) {
      logger.warn({
        userId: user.id,
        userRole: user.role,
        requiredRoles: allowedRoles,
      }, 'Insufficient permissions');

      return reply.status(403).send({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Insufficient permissions',
        },
      });
    }
  };
}

/**
 * Super admin only middleware
 */
export const requireSuperAdmin = requireRole('super_admin');

/**
 * Admin (super or company admin) middleware
 */
export const requireAdmin = requireRole('super_admin', 'company_admin');

/**
 * Generate JWT token
 */
export function generateToken(payload: JWTPayload): string {
  return (jwt.sign as Function)(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  }) as string;
}

export function generateRefreshToken(payload: JWTPayload): string {
  if (!config.jwt.refreshSecret) {
    throw new Error('JWT_REFRESH_SECRET not configured');
  }
  return (jwt.sign as Function)(payload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn,
  }) as string;
}

/**
 * Verify refresh token
 */
export function verifyRefreshToken(token: string): JWTPayload {
  if (!config.jwt.refreshSecret) {
    throw new Error('JWT_REFRESH_SECRET not configured');
  }

  try {
    return jwt.verify(token, config.jwt.refreshSecret) as JWTPayload;
  } catch (error) {
    throw new Error('INVALID_REFRESH_TOKEN');
  }
}
