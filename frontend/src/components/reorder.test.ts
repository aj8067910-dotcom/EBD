import { describe, expect, it } from 'vitest';
import { reorderIds } from './reorder.js';

describe('reorderIds (editor moment reordering)', () => {
  it('moves an item down to the target position', () => {
    expect(reorderIds(['a', 'b', 'c'], 'a', 'c')).toEqual(['b', 'c', 'a']);
  });

  it('moves an item up', () => {
    expect(reorderIds(['a', 'b', 'c'], 'c', 'a')).toEqual(['c', 'a', 'b']);
  });

  it('is a no-op when source and target are the same', () => {
    expect(reorderIds(['a', 'b', 'c'], 'b', 'b')).toEqual(['a', 'b', 'c']);
  });

  it('ignores unknown ids', () => {
    expect(reorderIds(['a', 'b'], 'x', 'a')).toEqual(['a', 'b']);
  });
});
