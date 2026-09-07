/**
 * Abstract WhatsApp provider. Production uses the official WhatsApp Business
 * Platform / Cloud API — never an automated WhatsApp Web client, Puppeteer,
 * Selenium, personal-QR pairing, or anything that keeps a phone connected.
 */
export interface WhatsAppSendResult {
  providerMessageId: string;
}

export interface WhatsAppProvider {
  sendText(to: string, message: string): Promise<WhatsAppSendResult>;
  sendImage(
    to: string,
    imageUrl: string,
    caption?: string,
  ): Promise<WhatsAppSendResult>;
  sendOtp(to: string, code: string): Promise<WhatsAppSendResult>;
}
