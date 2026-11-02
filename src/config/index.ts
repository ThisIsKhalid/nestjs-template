import * as dotenv from 'dotenv';
import * as path from 'path';
import { z } from 'zod';

// Load .env file
dotenv.config({ path: path.join(process.cwd(), '.env') });

const emptyToUndefined = (val: unknown) => (val === '' ? undefined : val);

export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().default(4000),

  DATABASE_URL: z.string().url(),

  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.preprocess(emptyToUndefined, z.string().optional()),

  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
  AWS_REGION: z.string().default('ap-southeast-2'),
  AWS_S3_BUCKET: z.preprocess(emptyToUndefined, z.string().optional()),
  AWS_S3_PREFIX: z.string().default('media'),
  AWS_ACCESS_KEY_ID: z.preprocess(emptyToUndefined, z.string().optional()),
  AWS_SECRET_ACCESS_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
  AWS_S3_ENDPOINT: z.preprocess(emptyToUndefined, z.string().url().optional()),
  AWS_CLOUDFRONT_URL: z.preprocess(emptyToUndefined, z.string().url().optional()),

  S3_ENDPOINT: z.preprocess(emptyToUndefined, z.string().url().optional()),
  S3_BUCKET: z.preprocess(emptyToUndefined, z.string().optional()),
  S3_ACCESS_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
  S3_SECRET_KEY: z.preprocess(emptyToUndefined, z.string().optional()),

  FRONTEND_URL: z.string().default('http://localhost:3000'),
  ADMIN_URL: z.preprocess(emptyToUndefined, z.string().optional()),
  BACKEND_URL: z.preprocess(emptyToUndefined, z.string().url().optional()),
  UPLOADS_URL: z.preprocess(emptyToUndefined, z.string().url().optional()),
  REVALIDATE_SECRET: z.string().min(16),

  BULL_BOARD_USER: z.string().default('admin'),
  BULL_BOARD_PASSWORD: z.string().min(8),

  SUPERADMIN_EMAIL: z.string().email(),
  SUPERADMIN_PASSWORD: z.string().min(12),
  REFRESH_COOKIE_NAME: z.string().default('refresh_token'),

  COMPANY_NAME: z.string().default('E-Commerce Store'),
  SMTP_SERVICE: z.preprocess(emptyToUndefined, z.string().optional()),
  SMTP_HOST: z.string().default('smtp.gmail.com'),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_SECURE: z
    .preprocess((val) => val === 'true' || val === true, z.boolean())
    .default(false),
  SMTP_USER: z.preprocess(emptyToUndefined, z.string().optional()),
  SMTP_PASS: z.preprocess(emptyToUndefined, z.string().optional()),
  SMTP_SENDER: z.preprocess(emptyToUndefined, z.string().optional()),

  LOG_VERBOSE: z
    .preprocess((val) => val === 'true' || val === true, z.boolean())
    .default(false),

  STEADFAST_BASE_URL: z
    .string()
    .url()
    .default('https://portal.steadfast.com.bd/api/v1'),
  STEADFAST_API_KEY: z.preprocess(emptyToUndefined, z.string().default('mock_api_key')),
  STEADFAST_SECRET_KEY: z.preprocess(emptyToUndefined, z.string().default('mock_secret_key')),
  STEADFAST_MOCK: z
    .preprocess((val) => {
      if (val === undefined || val === '') return true;
      return val === 'true' || val === true;
    }, z.boolean())
    .default(true),
});

export type Env = z.infer<typeof envSchema>;

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Invalid environment variables:', parsedEnv.error.format());
  throw new Error('Invalid environment configuration');
}

const parsed = parsedEnv.data;

/**
 * Global validated config object.
 * Access fields directly (e.g. config.PORT, config.DATABASE_URL)
 * or via camelCase / grouped properties (e.g. config.port, config.jwt.accessSecret).
 */
export const config = {
  // Direct env access (e.g. config.PORT, config.DATABASE_URL)
  ...parsed,

  // Ergonomic camelCase & grouped helpers
  nodeEnv: parsed.NODE_ENV,
  isProduction: parsed.NODE_ENV === 'production',
  isDevelopment: parsed.NODE_ENV === 'development',
  isTest: parsed.NODE_ENV === 'test',
  logVerbose: parsed.LOG_VERBOSE,

  port: parsed.PORT,
  databaseUrl: parsed.DATABASE_URL,

  redis: {
    host: parsed.REDIS_HOST,
    port: parsed.REDIS_PORT,
    password: parsed.REDIS_PASSWORD,
  },

  jwt: {
    accessSecret: parsed.JWT_ACCESS_SECRET,
    refreshSecret: parsed.JWT_REFRESH_SECRET,
    accessExpiresIn: parsed.JWT_ACCESS_EXPIRES_IN,
    refreshExpiresIn: parsed.JWT_REFRESH_EXPIRES_IN,
  },

  storageDriver: parsed.STORAGE_DRIVER,
  aws: {
    region: parsed.AWS_REGION,
    bucket: parsed.AWS_S3_BUCKET || parsed.S3_BUCKET || '',
    prefix: (parsed.AWS_S3_PREFIX || 'media').replace(/^\/+|\/+$/g, ''),
    accessKeyId: (parsed.AWS_ACCESS_KEY_ID || parsed.S3_ACCESS_KEY || '').replace(/["']/g, ''),
    secretAccessKey: (parsed.AWS_SECRET_ACCESS_KEY || parsed.S3_SECRET_KEY || '').replace(/["']/g, ''),
    endpoint: parsed.AWS_S3_ENDPOINT || parsed.S3_ENDPOINT,
    cloudFrontUrl: parsed.AWS_CLOUDFRONT_URL,
  },
  s3: {
    endpoint: parsed.AWS_S3_ENDPOINT || parsed.S3_ENDPOINT,
    bucket: parsed.AWS_S3_BUCKET || parsed.S3_BUCKET,
    accessKey: (parsed.AWS_ACCESS_KEY_ID || parsed.S3_ACCESS_KEY || '').replace(/["']/g, ''),
    secretKey: (parsed.AWS_SECRET_ACCESS_KEY || parsed.S3_SECRET_KEY || '').replace(/["']/g, ''),
  },

  frontendUrl: (parsed.FRONTEND_URL.split(',')[0] || 'http://localhost:3000').trim(),
  corsOrigins: [
    ...new Set([
      ...parsed.FRONTEND_URL.split(',').map((s) => s.trim()).filter(Boolean),
      ...(parsed.ADMIN_URL ? parsed.ADMIN_URL.split(',').map((s) => s.trim()).filter(Boolean) : []),
      ...(parsed.NODE_ENV === 'development' ? ['http://localhost:3000', 'http://localhost:5173'] : []),
    ]),
  ],
  backendUrl: parsed.BACKEND_URL || `http://localhost:${parsed.PORT}`,
  url: {
    backend: parsed.BACKEND_URL || `http://localhost:${parsed.PORT}`,
    uploads:
      parsed.UPLOADS_URL ||
      `${parsed.BACKEND_URL || `http://localhost:${parsed.PORT}`}/uploads`,
    stream:
      parsed.UPLOADS_URL ||
      `${parsed.BACKEND_URL || `http://localhost:${parsed.PORT}`}/uploads`,
  },
  revalidateSecret: parsed.REVALIDATE_SECRET,

  bullBoard: {
    user: parsed.BULL_BOARD_USER,
    password: parsed.BULL_BOARD_PASSWORD,
  },

  superadmin: {
    email: parsed.SUPERADMIN_EMAIL,
    password: parsed.SUPERADMIN_PASSWORD,
  },
  refreshCookieName: parsed.REFRESH_COOKIE_NAME,

  company_name: parsed.COMPANY_NAME,
  companyName: parsed.COMPANY_NAME,
  smtp: {
    service: parsed.SMTP_SERVICE,
    host: parsed.SMTP_HOST,
    port: parsed.SMTP_PORT,
    secure: parsed.SMTP_SECURE,
    user: parsed.SMTP_USER,
    pass: parsed.SMTP_PASS,
    sender: parsed.SMTP_SENDER || parsed.SUPERADMIN_EMAIL,
  },
  courier: {
    steadfast: {
      baseUrl: parsed.STEADFAST_BASE_URL,
      apiKey: parsed.STEADFAST_API_KEY,
      secretKey: parsed.STEADFAST_SECRET_KEY,
      isMock: parsed.STEADFAST_MOCK,
    },
  },
};

export type Config = typeof config;
export default config;
