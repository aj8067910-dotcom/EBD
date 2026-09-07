import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WhatsAppCloudProvider } from '../src/integrations/whatsapp/WhatsAppCloudProvider.js';
import { env } from '../src/env.js';

/**
 * B-02: the Cloud provider must use approved templates for proactive sends
 * (OTP + daily reading) and never fall back silently to free text.
 */

const saved = { ...env };

function setCloudEnv(overrides: Partial<typeof env> = {}) {
  env.WHATSAPP_API_URL = 'https://graph.facebook.com/v20.0';
  env.WHATSAPP_ACCESS_TOKEN = 'test-token';
  env.WHATSAPP_PHONE_NUMBER_ID = '123456';
  env.WHATSAPP_OTP_TEMPLATE_NAME = 'koinonia_otp';
  env.WHATSAPP_DAILY_READING_TEMPLATE_NAME = 'koinonia_daily_reading';
  env.WHATSAPP_TEMPLATE_LANGUAGE = 'pt_BR';
  Object.assign(env, overrides);
}

let fetchMock: ReturnType<typeof vi.fn>;

function okResponse() {
  return {
    ok: true,
    statusText: 'OK',
    json: async () => ({ messages: [{ id: 'wamid.TEST' }] }),
  } as unknown as Response;
}

beforeEach(() => {
  setCloudEnv();
  fetchMock = vi.fn().mockResolvedValue(okResponse());
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  Object.assign(env, saved);
});

function lastBody() {
  return JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);
}

describe('WhatsAppCloudProvider (B-02)', () => {
  const to = '+5574999990000';

  it('OTP uses an approved template (not free text)', async () => {
    const provider = new WhatsAppCloudProvider();
    const res = await provider.sendOtp(to, '123456');
    expect(res.providerMessageId).toBe('wamid.TEST');
    const body = lastBody();
    expect(body.type).toBe('template');
    expect(body.template.name).toBe('koinonia_otp');
    expect(body.template.language.code).toBe('pt_BR');
    expect(JSON.stringify(body)).not.toContain('código de acesso'); // no free text
  });

  it('OTP fails explicitly when the template is not configured', async () => {
    setCloudEnv({ WHATSAPP_OTP_TEMPLATE_NAME: undefined });
    const provider = new WhatsAppCloudProvider();
    await expect(provider.sendOtp(to, '123456')).rejects.toThrow(
      'WhatsApp Cloud OTP template is required when WHATSAPP_PROVIDER=cloud',
    );
    expect(fetchMock).not.toHaveBeenCalled(); // no silent free-text fallback
  });

  it('daily reading uses a template with an image header', async () => {
    const provider = new WhatsAppCloudProvider();
    await provider.sendDailyReading(to, {
      imageUrl: 'https://example.com/daily-readings/abc/art.png',
      title: 'Título',
      verse: 'Versículo',
      reference: 'Ref 1:1',
      message: null,
      caption: 'Título\n\n“Versículo”\n\nRef 1:1',
    });
    const body = lastBody();
    expect(body.type).toBe('template');
    expect(body.template.name).toBe('koinonia_daily_reading');
    const header = body.template.components.find((c: { type: string }) => c.type === 'header');
    expect(header.parameters[0].type).toBe('image');
    expect(header.parameters[0].image.link).toContain('art.png');
  });

  it('daily reading fails explicitly when the template is not configured', async () => {
    setCloudEnv({ WHATSAPP_DAILY_READING_TEMPLATE_NAME: undefined });
    const provider = new WhatsAppCloudProvider();
    await expect(
      provider.sendDailyReading(to, {
        imageUrl: 'https://example.com/art.png',
        title: 't',
        verse: 'v',
        reference: 'r',
        caption: 'c',
      }),
    ).rejects.toThrow('daily-reading template is required');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('daily reading rejects a non-https image URL (no localhost art)', async () => {
    const provider = new WhatsAppCloudProvider();
    await expect(
      provider.sendDailyReading(to, {
        imageUrl: 'http://localhost:3333/daily-readings/x/art.png',
        title: 't',
        verse: 'v',
        reference: 'r',
        caption: 'c',
      }),
    ).rejects.toThrow(/https/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('propagates a Meta API error', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      statusText: 'Bad Request',
      json: async () => ({ error: { message: 'Template not found' } }),
    } as unknown as Response);
    const provider = new WhatsAppCloudProvider();
    await expect(provider.sendOtp(to, '123456')).rejects.toThrow(
      'WhatsApp Cloud API: Template not found',
    );
  });
});
