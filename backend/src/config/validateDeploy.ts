/**
 * Pure environment validation used by both the deploy-check script (B-16) and
 * its tests. Keeps the fail-fast production/cloud requirements in one place.
 *
 * Returns a list of human-readable errors (empty = OK).
 */
export type EnvLike = Record<string, string | undefined>;

const EXAMPLE_SECRET = /change-me|dev-secret|e2e-secret/;

export function collectEnvErrors(env: EnvLike): string[] {
  const errors: string[] = [];

  if (!env.DATABASE_URL) errors.push('DATABASE_URL ausente');

  const secret = env.JWT_SECRET;
  if (!secret || secret.length < 8) {
    errors.push('JWT_SECRET ausente ou muito curto (mín. 8 caracteres)');
  }
  if (secret && EXAMPLE_SECRET.test(secret)) {
    errors.push('JWT_SECRET parece ser um valor de exemplo — gere um segredo real');
  }

  // B-03: production requires an explicit, absolute HTTPS public base URL.
  if (env.NODE_ENV === 'production') {
    const url = env.PUBLIC_BASE_URL;
    if (!url) {
      errors.push('PUBLIC_BASE_URL é obrigatório em produção');
    } else if (!/^https:\/\//i.test(url)) {
      errors.push('PUBLIC_BASE_URL deve usar https:// em produção');
    } else if (/localhost|127\.0\.0\.1/.test(url)) {
      errors.push('PUBLIC_BASE_URL não pode apontar para localhost em produção');
    }
  }

  // B-16: the Cloud API needs credentials, templates, App Secret and webhook token.
  if (env.WHATSAPP_PROVIDER === 'cloud') {
    const required: [string, string][] = [
      ['WHATSAPP_ACCESS_TOKEN', 'token de acesso'],
      ['WHATSAPP_PHONE_NUMBER_ID', 'phone number ID'],
      ['WHATSAPP_OTP_TEMPLATE_NAME', 'template de OTP'],
      ['WHATSAPP_DAILY_READING_TEMPLATE_NAME', 'template da leitura diária'],
      ['WHATSAPP_APP_SECRET', 'App Secret (validação de webhook)'],
      ['WHATSAPP_WEBHOOK_VERIFY_TOKEN', 'token de verificação de webhook'],
    ];
    for (const [key, label] of required) {
      if (!env[key]) {
        errors.push(`${key} ausente — ${label} obrigatório quando WHATSAPP_PROVIDER=cloud`);
      }
    }
  }

  return errors;
}
