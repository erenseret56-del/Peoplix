import { FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import { logger } from '../config/logger.js';
import { config } from '../config/env.js';
import { ZodError } from 'zod';

/**
 * Custom application errors
 */
export class AppError extends Error {
  constructor(
    public code: string,
    public message: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super('VALIDATION_ERROR', message, 400, details);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super('NOT_FOUND', message, 404);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super('UNAUTHORIZED', message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super('FORBIDDEN', message, 403);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource already exists') {
    super('CONFLICT', message, 409);
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message: string = 'Too many requests') {
    super('TOO_MANY_REQUESTS', message, 429);
  }
}

/**
 * Global error handler
 */
export async function errorHandler(
  error: FastifyError | AppError | Error,
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  // Log error with context
  logger.error({
    err: error,
    requestId: request.id,
    method: request.method,
    url: request.url,
    userAgent: request.headers['user-agent'],
  }, 'Request error');

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    return reply.status(400).send({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        details: error.errors.map(err => ({
          path: err.path.join('.'),
          message: err.message,
        })),
      },
    });
  }

  // Handle application errors
  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        ...(error.details && { details: error.details }),
      },
    });
  }

  // Handle Fastify errors
  if ('statusCode' in error) {
    return reply.status(error.statusCode || 500).send({
      success: false,
      error: {
        code: error.code || 'INTERNAL_ERROR',
        message: error.message,
      },
    });
  }

  // Handle database errors
  if (isDatabaseError(error)) {
    const dbError = parseDatabaseError(error as any);
    return reply.status(dbError.statusCode).send({
      success: false,
      error: {
        code: dbError.code,
        message: dbError.message,
      },
    });
  }

  // Generic error response (don't leak internal details in production)
  return reply.status(500).send({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: config.app.isDevelopment 
        ? error.message 
        : 'An internal error occurred',
      ...(config.app.isDevelopment && { stack: error.stack }),
    },
  });
}

/**
 * Check if error is a database error
 */
function isDatabaseError(error: any): boolean {
  return error.code && (
    error.code.startsWith('23') || // Integrity constraint violations
    error.code.startsWith('42') || // Syntax/access errors
    error.code === '08006' ||      // Connection failure
    error.code === 'ECONNREFUSED'
  );
}

/**
 * Parse database errors into user-friendly messages
 */
function parseDatabaseError(error: any): { code: string; message: string; statusCode: number } {
  // Unique constraint violation
  if (error.code === '23505') {
    return {
      code: 'DUPLICATE_ENTRY',
      message: 'A record with this value already exists',
      statusCode: 409,
    };
  }

  // Foreign key violation
  if (error.code === '23503') {
    return {
      code: 'INVALID_REFERENCE',
      message: 'Referenced record does not exist',
      statusCode: 400,
    };
  }

  // Not null violation
  if (error.code === '23502') {
    return {
      code: 'MISSING_REQUIRED_FIELD',
      message: 'Required field is missing',
      statusCode: 400,
    };
  }

  // Connection error
  if (error.code === '08006' || error.code === 'ECONNREFUSED') {
    return {
      code: 'DATABASE_UNAVAILABLE',
      message: 'Database connection failed',
      statusCode: 503,
    };
  }

  // Generic database error
  return {
    code: 'DATABASE_ERROR',
    message: 'A database error occurred',
    statusCode: 500,
  };
}

/**
 * Not found handler (404)
 */
export async function notFoundHandler(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  return reply.status(404).send({
    success: false,
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: `Route ${request.method} ${request.url} not found`,
    },
  });
}

/**
 * Request timeout handler
 */
export function createTimeoutHandler(timeoutMs: number) {
  return async (_request: FastifyRequest, reply: FastifyReply) => {
    setTimeout(() => {
      if (!reply.sent) {
        reply.status(408).send({
          success: false,
          error: {
            code: 'REQUEST_TIMEOUT',
            message: 'Request timeout',
          },
        });
      }
    }, timeoutMs);
  };
}
