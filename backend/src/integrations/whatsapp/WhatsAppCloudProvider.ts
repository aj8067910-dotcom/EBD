import { env } from '../../env.js';
import type { WhatsAppProvider, WhatsAppSendResult } from './WhatsAppProvider.js';

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

  sendOtp(to: string, code: string): Promise<WhatsAppSendResult> {
    // Prefer an approved template when configured; else fall back to text.
    if (env.WHATSAPP_OTP_TEMPLATE_NAME) {
      return this.post({
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: {
          name: env.WHATSAPP_OTP_TEMPLATE_NAME,
          language: { code: 'pt_BR' },
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
    return this.sendText(to, `Seu código de acesso Koinonia é ${code}. Expira em 5 minutos.`);
  }
}
