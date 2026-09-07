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
  // Approved template used for the proactive daily-reading broadcast (with an
  // image header). Required when WHATSAPP_PROVIDER=cloud — a free-text message
  // is not a valid proactive-send mechanism on the Cloud API.
  WHATSAPP_DAILY_READING_TEMPLATE_NAME: z.string().optional(),
  // BCP-47 template language code (e.g. pt_BR, en_US).
  WHATSAPP_TEMPLATE_LANGUAGE: z.string().default('pt_BR'),
  WHATSAPP_WEBHOOK_VERIFY_TOKEN: z.string().optional(),
  // Meta App Secret used to validate inbound webhook signatures (B-10).
  WHATSAPP_APP_SECRET: z.string().optional(),
  // Comma-separated E.164 numbers allowed to self-register as TEACHER.
  TEACHER_WHATSAPP_ALLOWLIST: z.string().default(''),

  // Optional first-admin bootstrap. When both ADMIN_EMAIL and ADMIN_PASSWORD
  // are set, a teacher account is created on startup if it does not yet exist
  // (idempotent). Lets a fresh production deploy come up with a ready login
  // without shipping a known demo password.
  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_PASSWORD: z.string().min(8).optional(),
  ADMIN_NAME: z.string().optional(),
}).superRefine((cfg, ctx) => {
  // B-03: production must use an explicit, absolute HTTPS public base URL —
  // never the localhost development fallback.
  if (cfg.NODE_ENV === 'production') {
    const url = cfg.PUBLIC_BASE_URL;
    if (!url || /localhost|127\.0\.0\.1/.test(url) || !/^https:\/\//i.test(url)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['PUBLIC_BASE_URL'],
        message:
          'PUBLIC_BASE_URL é obrigatório em produção e deve ser uma URL https:// pública (não localhost).',
      });
    }
  }

  // B-02: the Cloud API needs approved templates and credentials — never a
  // silent free-text fallback for OTP or the proactive daily reading.
  if (cfg.WHATSAPP_PROVIDER === 'cloud') {
    if (!cfg.WHATSAPP_OTP_TEMPLATE_NAME) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['WHATSAPP_OTP_TEMPLATE_NAME'],
        message: 'WhatsApp Cloud OTP template is required when WHATSAPP_PROVIDER=cloud',
      });
    }
    if (!cfg.WHATSAPP_DAILY_READING_TEMPLATE_NAME) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['WHATSAPP_DAILY_READING_TEMPLATE_NAME'],
        message:
          'WhatsApp Cloud daily-reading template is required when WHATSAPP_PROVIDER=cloud',
      });
    }
    if (!cfg.WHATSAPP_ACCESS_TOKEN) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['WHATSAPP_ACCESS_TOKEN'],
        message: 'WHATSAPP_ACCESS_TOKEN is required when WHATSAPP_PROVIDER=cloud',
      });
    }
    if (!cfg.WHATSAPP_PHONE_NUMBER_ID) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['WHATSAPP_PHONE_NUMBER_ID'],
        message: 'WHATSAPP_PHONE_NUMBER_ID is required when WHATSAPP_PROVIDER=cloud',
      });
    }
    if (!cfg.WHATSAPP_APP_SECRET) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['WHATSAPP_APP_SECRET'],
        message: 'WHATSAPP_APP_SECRET is required when WHATSAPP_PROVIDER=cloud (webhook signature validation)',
      });
    }
  }
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  throw new Error('Invalid environment configuration');
}

export const env = parsed.data;

/** Allowed CORS origins as an array (comma-separated in CORS_ORIGIN). */
export const corsOrigins = env.CORS_ORIGIN.split(',').map((o) => o.trim());
