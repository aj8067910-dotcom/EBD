/**
 * Abstract WhatsApp provider. Production uses the official WhatsApp Business
 * Platform / Cloud API — never an automated WhatsApp Web client, Puppeteer,
 * Selenium, personal-QR pairing, or anything that keeps a phone connected.
 */
export interface WhatsAppSendResult {
  providerMessageId: string;
}

/** Content for the proactive daily-reading broadcast. */
export interface DailyReadingMessage {
  imageUrl: string;
  title: string;
  verse: string;
  reference: string;
  message?: string | null;
  /** Human-readable caption fallback (mock/dev and single-variable templates). */
  caption: string;
}

export interface WhatsAppProvider {
  sendText(to: string, message: string): Promise<WhatsAppSendResult>;
  sendImage(
    to: string,
    imageUrl: string,
    caption?: string,
  ): Promise<WhatsAppSendResult>;
  sendOtp(to: string, code: string): Promise<WhatsAppSendResult>;
  /**
   * Proactive daily-reading send. On the Cloud API this MUST use an approved
   * template (with an image header) — a free-text/image message is not a valid
   * proactive mechanism outside the 24h customer-service window.
   */
  sendDailyReading(to: string, input: DailyReadingMessage): Promise<WhatsAppSendResult>;
}
