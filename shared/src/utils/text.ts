/**
 * Remove HTML tags and collapse whitespace. Answers are plain text only.
 */
export function stripHtml(input: string): string {
  return input
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Sanitize free-text answers: strip HTML and clamp to a maximum length.
 */
export function sanitizeText(input: string, maxLength = 280): string {
  return stripHtml(input).slice(0, maxLength);
}

/**
 * Normalize a single word for word-cloud frequency counting:
 * lower-cased and stripped of diacritics so "Graça" and "graca" merge.
 */
export function normalizeWord(word: string): string {
  return stripHtml(word)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\- ]/g, '')
    .trim();
}
