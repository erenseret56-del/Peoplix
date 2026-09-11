import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables
dotenv.config();

const emptyStringAsUndefined = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((value) => (value === '' ? undefined : value), schema);

// Environment validation schema
const envSchema = z.object({
  // App
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('3000'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  TRUST_PROXY: z.string().transform((value) => value !== 'false').default('true'),

  // Database
  DATABASE_URL: z.string().min(10),
  MONGODB_URI: z.string().optional(),
  DB_NAME: z.string().default('Peoplix'),

  // Cloud Cache (optional free tier: Upstash Redis)
  CACHE_PROVIDER: z.enum(['memory', 'upstash']).default('memory'),
  UPSTASH_REDIS_REST_URL: emptyStringAsUndefined(z.string().url().optional()),
  UPSTASH_REDIS_REST_TOKEN: emptyStringAsUndefined(z.string().optional()),

  // JWT & Security
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('24h'),
  JWT_REFRESH_SECRET: z.string().min(32).optional(),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  BCRYPT_ROUNDS: z.string().transform(Number).default('10'),

  // Retell AI
  RETELL_API_KEY: z.string().optional(),
  RETELL_AGENT_ID: z.string().optional(),
  RETELL_LLM_ID: z.string().optional(),
  RETELL_WEBHOOK_SECRET: z.string().optional(),
  RETELL_TWILIO_TERMINATION_URI: emptyStringAsUndefined(z.string().optional()),
  RETELL_INBOUND_WEBHOOK_URL: emptyStringAsUndefined(z.string().url().optional()),

  // Twilio phone numbers
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_SIP_TRUNK_SID: z.string().optional(),
  TWILIO_COUNTRY_CODE: z.string().length(2).default('US'),

  // Admin
  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_PASSWORD: z.string().optional(),

  // CORS & Frontend
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  CORS_ORIGINS: z.string().default('http://localhost:5173'),

  // Rate Limiting
  RATE_LIMIT_MAX: z.string().transform(Number).default('1000'),
  RATE_LIMIT_WINDOW: z.string().transform(Number).default('60000'),
});

// Parse and validate environment
let env: z.infer<typeof envSchema>;

try {
  env = envSchema.parse(process.env);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error('❌ Invalid environment variables:');
    error.errors.forEach(err => {
      console.error(`  - ${err.path.join('.')}: ${err.message}`);
    });
    process.exit(1);
  }
  throw error;
}

// Export typed environment configuration
export const config = {
  app: {
    env: env.NODE_ENV,
    port: env.PORT,
    logLevel: env.LOG_LEVEL,
    trustProxy: env.TRUST_PROXY,
    receptionistName: 'Ava',
    isDevelopment: env.NODE_ENV === 'development',
    isProduction: env.NODE_ENV === 'production',
    isTest: env.NODE_ENV === 'test',
  },

  database: {
    url: env.DATABASE_URL || env.MONGODB_URI,
    name: env.DB_NAME,
  },

  cache: {
    provider: env.CACHE_PROVIDER,
    upstashUrl: env.UPSTASH_REDIS_REST_URL,
    upstashToken: env.UPSTASH_REDIS_REST_TOKEN,
  },

  jwt: {
    secret: env.JWT_SECRET,
    expiresIn: env.JWT_EXPIRES_IN,
    refreshSecret: env.JWT_REFRESH_SECRET,
    refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
  },

  security: {
    bcryptRounds: env.BCRYPT_ROUNDS,
  },

  retell: {
    apiKey: env.RETELL_API_KEY,
    agentId: env.RETELL_AGENT_ID,
    llmId: env.RETELL_LLM_ID,
    webhookSecret: env.RETELL_WEBHOOK_SECRET,
    twilioTerminationUri: env.RETELL_TWILIO_TERMINATION_URI,
    inboundWebhookUrl: env.RETELL_INBOUND_WEBHOOK_URL,
  },

  twilio: {
    accountSid: env.TWILIO_ACCOUNT_SID,
    authToken: env.TWILIO_AUTH_TOKEN,
    sipTrunkSid: env.TWILIO_SIP_TRUNK_SID,
    countryCode: env.TWILIO_COUNTRY_CODE,
  },

  admin: {
    email: env.ADMIN_EMAIL,
    password: env.ADMIN_PASSWORD,
  },

  cors: {
    origin: env.CORS_ORIGINS.split(',').map(o => o.trim()),
    credentials: true,
  },

  rateLimit: {
    max: env.RATE_LIMIT_MAX,
    timeWindow: env.RATE_LIMIT_WINDOW,
  },

  frontend: {
    url: env.FRONTEND_URL,
  },
} as const;

// Validate critical production environment variables
if (config.app.isProduction) {
  const criticalVars = [
    'JWT_SECRET',
    'DATABASE_URL',
    'RETELL_API_KEY',
  ];

  const missing = criticalVars.filter(varName => {
    const value = process.env[varName];
    return !value || value.includes('username:password') || value.includes('your-secret-here') || value.includes('change-this');
  });

  if (missing.length > 0) {
    console.error('❌ Missing or invalid critical environment variables in production:');
    missing.forEach(varName => console.error(`  - ${varName}`));
    process.exit(1);
  }

  if (config.cors.origin.some((origin) => !origin.startsWith('https://'))) {
    console.error('❌ Production CORS_ORIGINS must contain HTTPS origins only.');
    process.exit(1);
  }
}

export type Config = typeof config;
