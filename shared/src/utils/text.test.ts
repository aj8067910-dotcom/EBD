import { describe, expect, it } from 'vitest';
import { normalizeWord, sanitizeText, stripHtml } from './text.js';

describe('stripHtml', () => {
  it('removes tags and collapses whitespace', () => {
    expect(stripHtml('<b>Olá</b>   mundo\n\n!')).toBe('Olá mundo !');
  });
});

describe('sanitizeText', () => {
  it('strips HTML tags and clamps length', () => {
    expect(sanitizeText('<b>abcdef</b>', 3)).toBe('abc');
    expect(sanitizeText('<i>olá</i> mundo')).toBe('olá mundo');
  });
});

describe('normalizeWord', () => {
  it('lowercases and removes diacritics so variants merge', () => {
    expect(normalizeWord('Graça')).toBe(normalizeWord('graca'));
    expect(normalizeWord('Perdão')).toBe('perdao');
  });

  it('drops punctuation', () => {
    expect(normalizeWord('Amor!!!')).toBe('amor');
  });
});
