import {
  normalizeWord,
  type OptionTally,
  type PollResults,
  type PeerInstructionResults,
  type WordCloudResults,
  type VerseHighlightResults,
  type OpenQuestionResults,
  type OpenAnswerCard,
} from '@koinonia/shared';

/** Tally a list of selected option-id arrays into per-option counts. */
export function tallyOptions(optionIdsList: string[][]): OptionTally[] {
  const counts = new Map<string, number>();
  for (const ids of optionIdsList) {
    for (const id of ids) {
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
  }
  return [...counts.entries()].map(([optionId, count]) => ({ optionId, count }));
}

export function aggregatePoll(optionIdsList: string[][]): PollResults {
  return {
    type: 'POLL',
    totalAnswers: optionIdsList.length,
    tallies: tallyOptions(optionIdsList),
  };
}

/** Fraction of answers whose selected options exactly match the correct set. */
export function accuracyOf(
  optionIdsList: string[][],
  correctOptionIds: string[],
): number {
  if (optionIdsList.length === 0) return 0;
  const correct = new Set(correctOptionIds);
  const hits = optionIdsList.filter((ids) => {
    if (ids.length !== correct.size) return false;
    return ids.every((id) => correct.has(id));
  }).length;
  return hits / optionIdsList.length;
}

export function aggregatePeerInstruction(
  before: string[][],
  after: string[][],
  correctOptionIds: string[],
): PeerInstructionResults {
  const accuracyBefore = accuracyOf(before, correctOptionIds);
  const accuracyAfter = accuracyOf(after, correctOptionIds);
  const result: PeerInstructionResults = {
    type: 'PEER_INSTRUCTION',
    before: tallyOptions(before),
    after: tallyOptions(after),
    totalBefore: before.length,
    totalAfter: after.length,
    correctOptionIds,
    accuracyBefore,
    accuracyAfter,
    gain: accuracyAfter - accuracyBefore,
  };
  // Nudge the teacher to re-explain when the first vote was mostly wrong.
  if (before.length > 0 && accuracyBefore < 0.3) {
    result.suggestion = 'REEXPLAIN';
  }
  return result;
}

export function aggregateWordCloud(words: string[]): WordCloudResults {
  const counts = new Map<string, number>();
  let total = 0;
  for (const raw of words) {
    const word = normalizeWord(raw);
    if (!word) continue;
    total += 1;
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }
  const entries = [...counts.entries()]
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count);
  return { type: 'WORD_CLOUD', totalAnswers: total, words: entries };
}

/**
 * Count taps per word index. `wordCount` bounds the output length so the
 * projector heatmap aligns with the tokenised passage.
 */
export function aggregateVerseHighlight(
  indicesList: number[][],
  wordCount: number,
): VerseHighlightResults {
  const heat = new Array<number>(Math.max(0, wordCount)).fill(0);
  for (const indices of indicesList) {
    for (const i of indices) {
      if (i >= 0 && i < heat.length) heat[i] = (heat[i] ?? 0) + 1;
    }
  }
  return {
    type: 'VERSE_HIGHLIGHT',
    totalAnswers: indicesList.length,
    heat,
  };
}

export function aggregateOpen(
  type: 'OPEN_QUESTION' | 'REFLECTION',
  cards: OpenAnswerCard[],
  onlyApproved: boolean,
): OpenQuestionResults {
  const visible = onlyApproved ? cards.filter((c) => c.approved) : cards;
  return { type, totalAnswers: cards.length, cards: visible };
}

/**
 * Linear speed bonus for a correct quiz answer: full points at t=0, up to
 * +50% removed linearly as time elapses; 1.0 (no bonus) once time is up.
 */
export function quizSpeedMultiplier(
  elapsedMs: number,
  totalMs: number,
): number {
  if (totalMs <= 0) return 1;
  const remaining = Math.max(0, Math.min(totalMs, totalMs - elapsedMs));
  return 1 + 0.5 * (remaining / totalMs);
}

/** Points earned for one quiz answer given base points and timing. */
export function quizPoints(
  basePoints: number,
  correct: boolean,
  elapsedMs: number,
  totalMs: number,
): number {
  if (!correct) return 0;
  return Math.round(basePoints * quizSpeedMultiplier(elapsedMs, totalMs));
}
