import { env } from '../../env.js';
import type { WhatsAppProvider } from './WhatsAppProvider.js';
import { WhatsAppMockProvider } from './WhatsAppMockProvider.js';
import { WhatsAppCloudProvider } from './WhatsAppCloudProvider.js';

let provider: WhatsAppProvider | null = null;

/** Singleton WhatsApp provider selected by WHATSAPP_PROVIDER. */
export function getWhatsAppProvider(): WhatsAppProvider {
  if (!provider) {
    provider =
      env.WHATSAPP_PROVIDER === 'cloud'
        ? new WhatsAppCloudProvider()
        : new WhatsAppMockProvider();
  }
  return provider;
}

/** Test-only: access the mock provider (throws if not in mock mode). */
export function getMockProvider(): WhatsAppMockProvider {
  const p = getWhatsAppProvider();
  if (!(p instanceof WhatsAppMockProvider)) {
    throw new Error('WhatsApp provider is not the mock');
  }
  return p;
}

export type { WhatsAppProvider } from './WhatsAppProvider.js';
