import { maskPhone } from '../../lib/phone.js';
import type {
  DailyReadingMessage,
  WhatsAppProvider,
  WhatsAppSendResult,
} from './WhatsAppProvider.js';

interface RecordedMessage {
  to: string;
  kind: 'text' | 'image' | 'otp' | 'daily_reading';
  body: string;
  imageUrl?: string;
}

/**
 * In-memory WhatsApp provider for development and tests. Records what would be
 * sent (masking the number in logs) and exposes the last OTP per number so the
 * OTP never has to leave through the API response.
 */
export class WhatsAppMockProvider implements WhatsAppProvider {
  readonly messages: RecordedMessage[] = [];
  private otps = new Map<string, string>();
  /** When set, the next send fails — used to test FAILED delivery paths. */
  failNext = false;
  /** When set, every send fails until cleared — for all-fail scenarios. */
  failAll = false;
  /** When > 0, that many sends fail then the counter is decremented. */
  failCount = 0;

  private nextId(): string {
    return `mock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  private maybeFail() {
    if (this.failAll) {
      throw new Error('WhatsApp mock: simulated provider failure');
    }
    if (this.failCount > 0) {
      this.failCount -= 1;
      throw new Error('WhatsApp mock: simulated provider failure');
    }
    if (this.failNext) {
      this.failNext = false;
      throw new Error('WhatsApp mock: simulated provider failure');
    }
  }

  async sendText(to: string, message: string): Promise<WhatsAppSendResult> {
    this.maybeFail();
    this.messages.push({ to, kind: 'text', body: message });
    console.log(`[whatsapp:mock] text -> ${maskPhone(to)}: ${message.slice(0, 60)}`);
    return { providerMessageId: this.nextId() };
  }

  async sendImage(to: string, imageUrl: string, caption?: string): Promise<WhatsAppSendResult> {
    this.maybeFail();
    this.messages.push({ to, kind: 'image', body: caption ?? '', imageUrl });
    console.log(`[whatsapp:mock] image -> ${maskPhone(to)} (${imageUrl})`);
    return { providerMessageId: this.nextId() };
  }

  async sendDailyReading(to: string, input: DailyReadingMessage): Promise<WhatsAppSendResult> {
    this.maybeFail();
    this.messages.push({
      to,
      kind: 'daily_reading',
      body: input.caption,
      imageUrl: input.imageUrl,
    });
    console.log(`[whatsapp:mock] daily-reading -> ${maskPhone(to)} (${input.imageUrl})`);
    return { providerMessageId: this.nextId() };
  }

  async sendOtp(to: string, code: string): Promise<WhatsAppSendResult> {
    this.maybeFail();
    this.otps.set(to, code);
    this.messages.push({ to, kind: 'otp', body: '******' });
    console.log(`[whatsapp:mock] OTP -> ${maskPhone(to)} (code hidden; use getLastOtp in tests)`);
    return { providerMessageId: this.nextId() };
  }

  /** Test helper: the last OTP sent to a number. */
  getLastOtp(to: string): string | undefined {
    return this.otps.get(to);
  }

  reset() {
    this.messages.length = 0;
    this.otps.clear();
    this.failNext = false;
    this.failAll = false;
    this.failCount = 0;
  }
}
