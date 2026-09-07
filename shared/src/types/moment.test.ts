import { describe, expect, it } from 'vitest';
import { createMomentSchema, MomentType } from './moment.js';

const basePoll = {
  type: MomentType.POLL,
  title: 'Caso do jovem rico',
  config: {
    question: 'O que ele deveria fazer?',
    options: [
      { id: 'a', text: 'Seguir Jesus' },
      { id: 'b', text: 'Guardar os bens' },
    ],
  },
};

describe('createMomentSchema — illustrative image', () => {
  it('accepts a moment without any image (image is optional)', () => {
    const parsed = createMomentSchema.parse(basePoll);
    expect(parsed.imageUrl).toBeUndefined();
    expect(parsed.imageAlt).toBeUndefined();
  });

  it('accepts a valid image URL and caption', () => {
    const parsed = createMomentSchema.parse({
      ...basePoll,
      imageUrl: 'https://example.com/tirinha.png',
      imageAlt: 'Tirinha sobre generosidade',
    });
    expect(parsed.imageUrl).toBe('https://example.com/tirinha.png');
    expect(parsed.imageAlt).toBe('Tirinha sobre generosidade');
  });

  it('treats an empty image URL as "no image"', () => {
    const parsed = createMomentSchema.parse({ ...basePoll, imageUrl: '', imageAlt: '' });
    expect(parsed.imageUrl).toBeUndefined();
    expect(parsed.imageAlt).toBeUndefined();
  });

  it('rejects a malformed image URL', () => {
    const result = createMomentSchema.safeParse({ ...basePoll, imageUrl: 'not a url' });
    expect(result.success).toBe(false);
  });
});
