import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(5000),
  BASE_URL: z.string().url().default('http://localhost:5000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  AI_API_URL: z.string().url(),
  AI_API_KEY: z.string().min(1),
  AI_MODEL: z.string().min(1),
  TELEGRAM_BOT_TOKEN: z.string().min(1),
  TELEGRAM_WEBHOOK_SECRET: z.string().min(1),
  DEFAULT_TIMEZONE: z.string().default('Asia/Kolkata'),
  MONGODB_URI: z.string().min(1),
  MONGODB_DB_NAME: z.string().min(1).default('RemindMeAI'),
  JWT_SECRET: z.string().min(16).default('remindai-dev-jwt-secret-change-me'),
  ADMIN_EMAIL: z.string().email().default('admin@gmail.com'),
  ADMIN_PASSWORD: z.string().min(6).default('Admin@123'),
});

export type EnvConfig = z.infer<typeof envSchema>;

function loadConfig(): EnvConfig {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const formatted = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${formatted}`);
  }

  return parsed.data;
}

export const config = loadConfig();
