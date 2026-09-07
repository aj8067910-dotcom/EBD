import { describe, expect, it } from 'vitest';
import {
  parseReadingDate,
  readingDateISO,
  todayInTimeZone,
} from '../src/lib/date.js';
import { dailyReadingImageService } from '../src/services/dailyReadingImage/DailyReadingImageService.js';

/**
 * B-07: readingDate is a calendar day and must never drift across timezones.
 */
describe('reading date is timezone-stable (B-07)', () => {
  it('anchors a YYYY-MM-DD at noon UTC and round-trips to the same day', () => {
    const d = parseReadingDate('2026-09-07');
    expect(d.toISOString()).toBe('2026-09-07T12:00:00.000Z');
    expect(readingDateISO(d)).toBe('2026-09-07');
  });

  it('keeps the same calendar day for every viewer timezone', () => {
    const d = parseReadingDate('2026-09-07');
    // A viewer far west (Brazil, UTC-3) still sees Sep 7 (noon UTC = 09:00).
    const label = d.toLocaleDateString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    expect(label).toBe('07/09/2026');
  });

  it('renders the correct day on the art regardless of server clock', () => {
    const svg = dailyReadingImageService.buildSvg({
      title: 'T',
      verse: 'V',
      reference: 'R 1:1',
      readingDate: parseReadingDate('2026-09-07'),
    });
    expect(svg).toContain('7 de setembro de 2026');
  });

  describe('todayInTimeZone (America/Sao_Paulo)', () => {
    it('00:00 boundary — just after UTC midnight is still the previous day in Brazil', () => {
      // 2026-09-07T02:00Z == 2026-09-06 23:00 in São Paulo.
      expect(todayInTimeZone('America/Sao_Paulo', new Date('2026-09-07T02:00:00Z'))).toBe(
        '2026-09-06',
      );
    });
    it('07:00 UTC maps to the same day in Brazil', () => {
      expect(todayInTimeZone('America/Sao_Paulo', new Date('2026-09-07T07:00:00Z'))).toBe(
        '2026-09-07',
      );
    });
    it('23:59 UTC is already the next day only if crossing — stays same in Brazil', () => {
      // 2026-09-07T23:59Z == 2026-09-07 20:59 in São Paulo.
      expect(todayInTimeZone('America/Sao_Paulo', new Date('2026-09-07T23:59:00Z'))).toBe(
        '2026-09-07',
      );
    });
    it('12:00 UTC noon maps to the same day', () => {
      expect(todayInTimeZone('America/Sao_Paulo', new Date('2026-09-07T12:00:00Z'))).toBe(
        '2026-09-07',
      );
    });
  });
});
