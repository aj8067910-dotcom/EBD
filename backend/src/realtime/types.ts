import type { MomentPhase, MomentType } from '@koinonia/shared';

/** In-memory view of a moment (config already parsed). */
export interface MomentRuntime {
  id: string;
  type: MomentType;
  title: string;
  points: number;
  config: Record<string, unknown>;
  correctOptionIds: string[] | null;
}

export interface ParticipantRuntime {
  id: string;
  nickname: string;
  teamId: string | null;
  socketId: string | null;
  online: boolean;
  joinedAt: number;
  lastSeen: number;
}

export interface TeamRuntime {
  id: string;
  name: string;
  color: string;
  score: number;
}

export interface TimerRuntime {
  total: number;
  remaining: number;
  label: string;
  running: boolean;
  handle: NodeJS.Timeout | null;
}

export interface QuizRuntime {
  questionIndex: number;
  questionOpenedAt: number;
}

export interface RoomRuntime {
  code: string;
  roomId: string;
  lessonId: string;
  teacherId: string;
  lessonTitle: string;
  status: 'WAITING' | 'LIVE' | 'ENDED';
  createdAt: number;
  moments: Map<string, MomentRuntime>;
  momentOrder: string[];
  participants: Map<string, ParticipantRuntime>;
  teams: Map<string, TeamRuntime>;
  activeMomentId: string | null;
  activePhase: MomentPhase | null;
  timer: TimerRuntime | null;
  quiz: QuizRuntime | null;
  /** Socket ids of connected hosts (teachers) — receive full moderation data. */
  hostSocketIds: Set<string>;
}

/** Phase used to persist a quiz answer for a specific question. */
export function quizPhase(questionId: string): string {
  return `Q:${questionId}`;
}
