import { BIBLE_BOOKS } from '@koinonia/shared';
import { AppError, Errors } from '../errors.js';

const bibleUnavailable = () =>
  new AppError(
    'BIBLE_UNAVAILABLE',
    'Não foi possível buscar o texto agora. Você pode digitar o versículo manualmente.',
    502,
  );

/**
 * Fetches Bible passages from a PUBLIC DOMAIN translation (João Ferreira de
 * Almeida) via bible-api.com. The text is public domain; results are cached in
 * memory to avoid re-fetching. The teacher can always edit the returned text.
 */

const API = 'https://bible-api.com';
const TRANSLATION = 'almeida';
const cache = new Map<string, { reference: string; text: string }>();

function bookByAbbrev(abbrev: string) {
  return BIBLE_BOOKS.find((b) => b.abbrev === abbrev);
}

/** Builds a human reference like "João 3:16" or "João 3:16-18". */
export function formatReference(
  name: string,
  chapter: number,
  verseStart: number,
  verseEnd?: number | null,
): string {
  const range = verseEnd && verseEnd > verseStart ? `${verseStart}-${verseEnd}` : `${verseStart}`;
  return `${name} ${chapter}:${range}`;
}

export const bibleService = {
  books: BIBLE_BOOKS,

  async passage(input: {
    abbrev: string;
    chapter: number;
    verseStart: number;
    verseEnd?: number | null;
  }): Promise<{ reference: string; text: string }> {
    const book = bookByAbbrev(input.abbrev);
    if (!book) throw Errors.validation('Livro inválido');

    const chapter = Number(input.chapter);
    const verseStart = Number(input.verseStart);
    const verseEnd = input.verseEnd ? Number(input.verseEnd) : null;

    if (!Number.isInteger(chapter) || chapter < 1 || chapter > book.chapters.length) {
      throw Errors.validation('Capítulo inválido');
    }
    const versesInChapter = book.chapters[chapter - 1] ?? 0;
    if (!Number.isInteger(verseStart) || verseStart < 1 || verseStart > versesInChapter) {
      throw Errors.validation('Versículo inválido');
    }
    if (verseEnd && (verseEnd < verseStart || verseEnd > versesInChapter)) {
      throw Errors.validation('Intervalo de versículos inválido');
    }

    const reference = formatReference(book.name, chapter, verseStart, verseEnd);
    const cached = cache.get(reference);
    if (cached) return cached;

    const url = `${API}/${encodeURIComponent(reference)}?translation=${TRANSLATION}`;
    let data: { reference?: string; text?: string };
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`status ${res.status}`);
      data = (await res.json()) as { reference?: string; text?: string };
    } catch {
      throw bibleUnavailable();
    }

    const text = (data.text ?? '').replace(/\s+/g, ' ').trim();
    if (!text) throw bibleUnavailable();

    const result = { reference: data.reference ?? reference, text };
    cache.set(reference, result);
    return result;
  },
};
