import { describe, expect, it } from 'vitest';
import {
  accuracyOf,
  aggregateOpen,
  aggregatePeerInstruction,
  aggregatePoll,
  aggregateVerseHighlight,
  aggregateWordCloud,
  quizPoints,
  quizSpeedMultiplier,
  tallyOptions,
} from './index.js';

describe('tallyOptions / aggregatePoll', () => {
  it('counts option selections', () => {
    const poll = aggregatePoll([['a'], ['a'], ['b']]);
    expect(poll.totalAnswers).toBe(3);
    expect(poll.tallies).toContainEqual({ optionId: 'a', count: 2 });
    expect(poll.tallies).toContainEqual({ optionId: 'b', count: 1 });
  });

  it('supports multiple selections per answer', () => {
    expect(tallyOptions([['a', 'b'], ['b']])).toContainEqual({
      optionId: 'b',
      count: 2,
    });
  });
});

describe('accuracyOf', () => {
  it('requires an exact match of the correct set', () => {
    expect(accuracyOf([['b'], ['a'], ['b']], ['b'])).toBeCloseTo(2 / 3);
    expect(accuracyOf([['a', 'b']], ['b'])).toBe(0);
    expect(accuracyOf([], ['b'])).toBe(0);
  });
});

describe('aggregatePeerInstruction', () => {
  it('computes before/after accuracy and gain', () => {
    const res = aggregatePeerInstruction(
      [['a'], ['a'], ['b'], ['c']], // 25% correct
      [['b'], ['b'], ['b'], ['a']], // 75% correct
      ['b'],
    );
    expect(res.accuracyBefore).toBeCloseTo(0.25);
    expect(res.accuracyAfter).toBeCloseTo(0.75);
    expect(res.gain).toBeCloseTo(0.5);
    expect(res.suggestion).toBe('REEXPLAIN'); // before < 0.30
  });

  it('omits the REEXPLAIN suggestion when the first vote is good', () => {
    const res = aggregatePeerInstruction([['b'], ['b']], [['b'], ['b']], ['b']);
    expect(res.suggestion).toBeUndefined();
  });
});

describe('aggregateWordCloud', () => {
  it('normalizes accents/case and counts frequency', () => {
    const res = aggregateWordCloud(['Graça', 'graca', 'GRAÇA', 'Amor']);
    const graca = res.words.find((w) => w.word === 'graca');
    expect(graca?.count).toBe(3);
    expect(res.totalAnswers).toBe(4);
    expect(res.words[0]?.word).toBe('graca'); // sorted by count desc
  });
});

describe('aggregateVerseHighlight', () => {
  it('counts taps per word index within bounds', () => {
    const res = aggregateVerseHighlight([[0, 1], [1], [5]], 3);
    expect(res.heat).toEqual([1, 2, 0]); // index 5 is out of bounds
    expect(res.totalAnswers).toBe(3);
  });
});

describe('aggregateOpen', () => {
  const cards = [
    { id: '1', text: 'a', authorNickname: null, approved: true },
    { id: '2', text: 'b', authorNickname: 'Ana', approved: false },
  ];
  it('filters to approved when required', () => {
    expect(aggregateOpen('OPEN_QUESTION', cards, true).cards).toHaveLength(1);
    expect(aggregateOpen('OPEN_QUESTION', cards, false).cards).toHaveLength(2);
    expect(aggregateOpen('OPEN_QUESTION', cards, true).totalAnswers).toBe(2);
  });
});

describe('quiz scoring', () => {
  it('gives up to +50% for an instant correct answer, decaying to 0 bonus', () => {
    expect(quizSpeedMultiplier(0, 1000)).toBeCloseTo(1.5);
    expect(quizSpeedMultiplier(1000, 1000)).toBeCloseTo(1.0);
    expect(quizSpeedMultiplier(500, 1000)).toBeCloseTo(1.25);
  });

  it('awards no points for a wrong answer', () => {
    expect(quizPoints(100, false, 0, 1000)).toBe(0);
    expect(quizPoints(100, true, 0, 1000)).toBe(150);
    expect(quizPoints(100, true, 1000, 1000)).toBe(100);
  });
});
