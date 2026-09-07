import { env } from '../../env.js';
import type {
  DailyReadingMessage,
  WhatsAppProvider,
  WhatsAppSendResult,
} from './WhatsAppProvider.js';

/**
 * Production provider using the official WhatsApp Business / Cloud API (Graph
 * API). Credentials live only in the backend environment.
 */
export class WhatsAppCloudProvider implements WhatsAppProvider {
  private endpoint(): string {
    if (!env.WHATSAPP_PHONE_NUMBER_ID) {
      throw new Error('WHATSAPP_PHONE_NUMBER_ID não configurado');
    }
    return `${env.WHATSAPP_API_URL}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
  }

  private async post(body: unknown): Promise<WhatsAppSendResult> {
    if (!env.WHATSAPP_ACCESS_TOKEN) {
      throw new Error('WHATSAPP_ACCESS_TOKEN não configurado');
    }
    const res = await fetch(this.endpoint(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
      },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({}))) as {
      messages?: { id: string }[];
      error?: { message?: string };
    };
    if (!res.ok) {
      throw new Error(`WhatsApp Cloud API: ${data.error?.message ?? res.statusText}`);
    }
    return { providerMessageId: data.messages?.[0]?.id ?? 'unknown' };
  }

  sendText(to: string, message: string): Promise<WhatsAppSendResult> {
    return this.post({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: message },
    });
  }

  sendImage(to: string, imageUrl: string, caption?: string): Promise<WhatsAppSendResult> {
    return this.post({
      messaging_product: 'whatsapp',
      to,
      type: 'image',
      image: { link: imageUrl, caption },
    });
  }

  async sendOtp(to: string, code: string): Promise<WhatsAppSendResult> {
    // The Cloud API can only deliver OTPs proactively via an approved template.
    // Never fall back silently to free text — fail explicitly instead (B-02).
    if (!env.WHATSAPP_OTP_TEMPLATE_NAME) {
      throw new Error(
        'WhatsApp Cloud OTP template is required when WHATSAPP_PROVIDER=cloud',
      );
    }
    return this.post({
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
        name: env.WHATSAPP_OTP_TEMPLATE_NAME,
        language: { code: env.WHATSAPP_TEMPLATE_LANGUAGE },
        components: [
          { type: 'body', parameters: [{ type: 'text', text: code }] },
          {
            type: 'button',
            sub_type: 'url',
            index: '0',
            parameters: [{ type: 'text', text: code }],
          },
        ],
      },
    });
  }

  async sendDailyReading(
    to: string,
    input: DailyReadingMessage,
  ): Promise<WhatsAppSendResult> {
    // Proactive broadcast: an approved template with an image header is
    // mandatory on the Cloud API. No free-text/image fallback (B-02).
    if (!env.WHATSAPP_DAILY_READING_TEMPLATE_NAME) {
      throw new Error(
        'WhatsApp Cloud daily-reading template is required when WHATSAPP_PROVIDER=cloud',
      );
    }
    if (!input.imageUrl || !/^https:\/\//i.test(input.imageUrl)) {
      throw new Error(
        'A imagem da leitura precisa de uma URL pública https:// para o cabeçalho do template',
      );
    }
    return this.post({
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
        name: env.WHATSAPP_DAILY_READING_TEMPLATE_NAME,
        language: { code: env.WHATSAPP_TEMPLATE_LANGUAGE },
        components: [
          {
            type: 'header',
            parameters: [{ type: 'image', image: { link: input.imageUrl } }],
          },
          {
            type: 'body',
            parameters: [{ type: 'text', text: input.caption }],
          },
        ],
      },
    });
  }
}
