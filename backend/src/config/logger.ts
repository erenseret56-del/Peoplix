import pino from 'pino';
import { config } from './env.js';

// Create logger instance
export const logger = pino({
  level: config.app.logLevel,
  transport: config.app.isDevelopment
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
          singleLine: false,
        },
      }
    : undefined,
  
  // Production-friendly structured logging
  ...(config.app.isProduction && {
    formatters: {
      level: (label) => {
        return { level: label };
      },
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  }),

  // Redact sensitive information
  redact: {
    paths: [
      'password',
      'password_hash',
      'token',
      'accessToken',
      'refreshToken',
      'authorization',
      'cookie',
      '*.password',
      '*.token',
      '*.accessToken',
      'req.headers.authorization',
      'req.headers.cookie',
    ],
    remove: true,
  },
});

// Helper to create child loggers with context
export function createChildLogger(context: Record<string, any>) {
  return logger.child(context);
}

// Request logger helper
export function logRequest(method: string, url: string, statusCode: number, duration: number) {
  const log = logger.child({
    type: 'request',
    method,
    url,
    statusCode,
    duration,
  });

  if (statusCode >= 500) {
    log.error('Request completed with server error');
  } else if (statusCode >= 400) {
    log.warn('Request completed with client error');
  } else {
    log.info('Request completed');
  }
}

// Error logger helper
export function logError(error: Error, context?: Record<string, any>) {
  logger.error({
    err: {
      type: error.name,
      message: error.message,
      stack: config.app.isDevelopment ? error.stack : undefined,
    },
    ...context,
  }, 'Error occurred');
}

export default logger;
