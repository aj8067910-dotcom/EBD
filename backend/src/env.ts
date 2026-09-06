import { z } from 'zod';

// Load .env if present (Node >= 20.6). Prisma CLI loads it separately.
try {
  // loadEnvFile is available on Node >= 20.6.
  process.loadEnvFile?.();
} catch {
  // No .env file — rely on the ambient environment.
}

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(8),
  PORT: z.coerce.number().int().positive().default(3333),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  throw new Error('Invalid environment configuration');
}

export const env = parsed.data;

/** Allowed CORS origins as an array (comma-separated in CORS_ORIGIN). */
export const corsOrigins = env.CORS_ORIGIN.split(',').map((o) => o.trim());
