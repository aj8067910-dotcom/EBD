import { describe, expect, it } from 'vitest';
import { collectEnvErrors } from '../src/config/validateDeploy.js';

const base = {
  DATABASE_URL: 'postgresql://u:p@db:5432/koinonia',
  JWT_SECRET: 'a-very-long-real-secret-value',
};

describe('deploy-check env validation (B-03, B-16)', () => {
  it('accepts a minimal valid dev config', () => {
    expect(collectEnvErrors(base)).toEqual([]);
  });

  it('flags a missing/short/example JWT secret', () => {
    expect(collectEnvErrors({ ...base, JWT_SECRET: 'short' })).not.toHaveLength(0);
    expect(collectEnvErrors({ ...base, JWT_SECRET: 'change-me-please' })).not.toHaveLength(0);
  });

  describe('production PUBLIC_BASE_URL (B-03)', () => {
    it('requires PUBLIC_BASE_URL in production', () => {
      const errs = collectEnvErrors({ ...base, NODE_ENV: 'production' });
      expect(errs.some((e) => e.includes('PUBLIC_BASE_URL'))).toBe(true);
    });

    it('rejects localhost in production', () => {
      const errs = collectEnvErrors({
        ...base,
        NODE_ENV: 'production',
        PUBLIC_BASE_URL: 'http://localhost:3333',
      });
      expect(errs.some((e) => e.includes('PUBLIC_BASE_URL'))).toBe(true);
    });

    it('rejects non-https in production', () => {
      const errs = collectEnvErrors({
        ...base,
        NODE_ENV: 'production',
        PUBLIC_BASE_URL: 'http://ebd.example.com',
      });
      expect(errs.some((e) => e.includes('https'))).toBe(true);
    });

    it('accepts an https public URL in production', () => {
      const errs = collectEnvErrors({
        ...base,
        NODE_ENV: 'production',
        PUBLIC_BASE_URL: 'https://ebd.example.com',
      });
      expect(errs).toEqual([]);
    });
  });

  describe('cloud provider requirements (B-16)', () => {
    it('requires credentials, templates, app secret and webhook token', () => {
      const errs = collectEnvErrors({ ...base, WHATSAPP_PROVIDER: 'cloud' });
      for (const key of [
        'WHATSAPP_ACCESS_TOKEN',
        'WHATSAPP_PHONE_NUMBER_ID',
        'WHATSAPP_OTP_TEMPLATE_NAME',
        'WHATSAPP_DAILY_READING_TEMPLATE_NAME',
        'WHATSAPP_APP_SECRET',
        'WHATSAPP_WEBHOOK_VERIFY_TOKEN',
      ]) {
        expect(errs.some((e) => e.includes(key))).toBe(true);
      }
    });

    it('accepts a fully configured cloud provider', () => {
      const errs = collectEnvErrors({
        ...base,
        NODE_ENV: 'production',
        PUBLIC_BASE_URL: 'https://ebd.example.com',
        WHATSAPP_PROVIDER: 'cloud',
        WHATSAPP_ACCESS_TOKEN: 'tok',
        WHATSAPP_PHONE_NUMBER_ID: '123',
        WHATSAPP_OTP_TEMPLATE_NAME: 'otp',
        WHATSAPP_DAILY_READING_TEMPLATE_NAME: 'daily',
        WHATSAPP_APP_SECRET: 'secret',
        WHATSAPP_WEBHOOK_VERIFY_TOKEN: 'verify',
      });
      expect(errs).toEqual([]);
    });
  });
});
