import { z } from 'zod';

// Load .env if present (Node >= 20.6). Prisma CLI loads it separately.
// In tests the environment is provided by the test runner; loading .env would
// override it (e.g. point DATABASE_URL back at the dev database).
if (process.env.NODE_ENV !== 'test') {
  try {
    // loadEnvFile is available on Node >= 20.6.
    process.loadEnvFile?.();
  } catch {
    // No .env file — rely on the ambient environment.
  }
}

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(8),
  PORT: z.coerce.number().int().positive().default(3333),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),

  // Public base URL used to build absolute art image URLs for WhatsApp.
  PUBLIC_BASE_URL: z.string().default('http://localhost:3333'),

  // WhatsApp Business / Cloud API (PARTE 10). Defaults to the mock provider.
  WHATSAPP_PROVIDER: z.enum(['mock', 'cloud']).default('mock'),
  WHATSAPP_API_URL: z.string().default('https://graph.facebook.com/v20.0'),
  WHATSAPP_ACCESS_TOKEN: z.string().optional(),
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
  WHATSAPP_BUSINESS_ACCOUNT_ID: z.string().optional(),
  WHATSAPP_OTP_TEMPLATE_NAME: z.string().optional(),
  WHATSAPP_WEBHOOK_VERIFY_TOKEN: z.string().optional(),
  // Comma-separated E.164 numbers allowed to self-register as TEACHER.
  TEACHER_WHATSAPP_ALLOWLIST: z.string().default(''),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  throw new Error('Invalid environment configuration');
}

export const env = parsed.data;

/** Allowed CORS origins as an array (comma-separated in CORS_ORIGIN). */
export const corsOrigins = env.CORS_ORIGIN.split(',').map((o) => o.trim());
