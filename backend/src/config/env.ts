import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  APP_URL: z.string().default('http://localhost:5173'),
  API_URL: z.string().default('http://localhost:4000'),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 chars'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 chars'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN_DAYS: z.coerce.number().default(30),

  COOKIE_DOMAIN: z.string().optional(),
  ALLOWED_ORIGINS: z.string().default('http://localhost:5173'),

  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),

  MAIL_HOST: z.string().optional(),
  MAIL_PORT: z.coerce.number().optional(),
  MAIL_USERNAME: z.string().optional(),
  MAIL_PASSWORD: z.string().optional(),
  MAIL_FROM: z.string().default('no-reply@example.com'),

  AI_PROVIDER: z.enum(['openai', 'anthropic', 'both', 'none']).default('none'),
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  // Optional: point the "openai" provider slot at any OpenAI-compatible API
  // instead of OpenAI itself — e.g. Groq's free tier: https://api.groq.com/openai/v1
  OPENAI_BASE_URL: z.string().optional(),
  OPENAI_MODEL_FAST: z.string().optional(),
  OPENAI_MODEL_BALANCED: z.string().optional(),
  OPENAI_MODEL_ADVANCED: z.string().optional(),

  STORAGE_PROVIDER: z.enum(['local', 's3']).default('local'),
  STORAGE_BUCKET: z.string().optional(),
  STORAGE_ACCESS_KEY: z.string().optional(),
  STORAGE_SECRET_KEY: z.string().optional(),
  STORAGE_REGION: z.string().optional(),
  LOCAL_UPLOAD_DIR: z.string().default('./uploads'),

  REDIS_URL: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment configuration:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;
