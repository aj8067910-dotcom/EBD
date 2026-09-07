import { parsePhoneNumberFromString } from 'libphonenumber-js';

/** Default region for bare national numbers (Brazil). */
const DEFAULT_REGION = 'BR';

/**
 * Normalize any input format to E.164 (e.g. "+5574999999999"), so the same
 * number is never stored as two different users. Returns null if invalid.
 */
export function normalizePhone(input: string): string | null {
  if (!input) return null;
  const parsed = parsePhoneNumberFromString(input.trim(), DEFAULT_REGION);
  if (!parsed || !parsed.isValid()) return null;
  return parsed.number; // E.164
}

/**
 * Mask a phone number for display/logs — never expose the full number.
 * "+5574999999515" -> "+55 74 *****-9515"
 */
export function maskPhone(e164: string | null | undefined): string {
  if (!e164) return '';
  const parsed = parsePhoneNumberFromString(e164);
  const digits = (parsed?.nationalNumber ?? e164.replace(/\D/g, '')).toString();
  const cc = parsed?.countryCallingCode ? `+${parsed.countryCallingCode}` : '';
  const area = digits.slice(0, 2);
  const last4 = digits.slice(-4);
  return `${cc} ${area} *****-${last4}`.trim();
}
