import type { MomentResults, OptionTally, TeamView } from '@koinonia/shared';
import { prisma } from '../prisma.js';
import {
  aggregateOpen,
  aggregatePeerInstruction,
  aggregatePoll,
  aggregateVerseHighlight,
  aggregateWordCloud,
  tallyOptions,
} from './aggregators/index.js';
import type { MomentRuntime, RoomRuntime } from './types.js';
import { quizPhase } from './types.js';

function parsePayload(payload: string): Record<string, unknown> {
  try {
    return JSON.parse(payload) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function verseWordCount(config: Record<string, unknown>): number {
  const text = typeof config.text === 'string' ? config.text : '';
  return text.trim().length ? text.trim().split(/\s+/).length : 0;
}

/**
 * Compute the aggregated results for a moment by reading persisted answers.
 * Only aggregates are ever returned — never individual student answers to
 * other students.
 */
export async function computeResults(
  room: RoomRuntime,
  moment: MomentRuntime,
  options: { includeUnapproved?: boolean } = {},
): Promise<MomentResults | null> {
  const answers = await prisma.answer.findMany({
    where: { momentId: moment.id, roomId: room.roomId },
  });

  switch (moment.type) {
    case 'POLL': {
      const list = answers.map(
        (a) => (parsePayload(a.payload).optionIds as string[]) ?? [],
      );
      return aggregatePoll(list);
    }

    case 'PEER_INSTRUCTION': {
      const before = answers
        .filter((a) => a.phase === 'OPEN')
        .map((a) => (parsePayload(a.payload).optionIds as string[]) ?? []);
      const after = answers
        .filter((a) => a.phase === 'REOPEN')
        .map((a) => (parsePayload(a.payload).optionIds as string[]) ?? []);
      return aggregatePeerInstruction(before, after, moment.correctOptionIds ?? []);
    }

    case 'WORD_CLOUD': {
      const words = answers.map((a) => (parsePayload(a.payload).word as string) ?? '');
      return aggregateWordCloud(words);
    }

    case 'VERSE_HIGHLIGHT': {
      const list = answers.map(
        (a) => (parsePayload(a.payload).wordIndices as number[]) ?? [],
      );
      return aggregateVerseHighlight(list, verseWordCount(moment.config));
    }

    case 'OPEN_QUESTION':
    case 'REFLECTION': {
      const anonymous = moment.config.anonymous !== false;
      const requireApproval = moment.config.requireApproval !== false;
      const cards = answers.map((a) => {
        const participant = room.participants.get(a.participantId);
        return {
          id: a.id,
          text: (parsePayload(a.payload).text as string) ?? '',
          authorNickname: anonymous ? null : (participant?.nickname ?? null),
          approved: a.approved,
        };
      });
      // Hosts get every card (for moderation); the room gets only approved
      // ones when approval is required.
      const onlyApproved = requireApproval && !options.includeUnapproved;
      return aggregateOpen(moment.type, cards, onlyApproved);
    }

    case 'QUIZ_TEAM': {
      const questions = (moment.config.questions as { id: string }[]) ?? [];
      const perQuestion: Record<string, OptionTally[]> = {};
      for (const q of questions) {
        const phase = quizPhase(q.id);
        const list = answers
          .filter((a) => a.phase === phase)
          .map((a) => {
            const optionId = parsePayload(a.payload).optionId as string;
            return optionId ? [optionId] : [];
          });
        perQuestion[q.id] = tallyOptions(list);
      }
      const scores: TeamView[] = [...room.teams.values()]
        .map((t) => ({ id: t.id, name: t.name, color: t.color, score: t.score }))
        .sort((a, b) => b.score - a.score);
      return { type: 'QUIZ_TEAM', scores, perQuestion };
    }

    default:
      return null;
  }
}
