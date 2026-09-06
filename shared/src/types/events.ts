import type {
  ActiveMomentView,
  ParticipantView,
  RoomStateView,
  TeamView,
} from './room.js';
import type { MomentPhase, MomentType, SubmitAnswerDTO } from './moment.js';

/* --------------------------------------------------------------------------
 * Aggregated result payloads (never expose individual student answers to
 * other students — only aggregates flow to the room).
 * ------------------------------------------------------------------------ */

export interface OptionTally {
  optionId: string;
  count: number;
}

export interface PollResults {
  type: typeof MomentType.POLL;
  totalAnswers: number;
  tallies: OptionTally[];
}

export interface PeerInstructionResults {
  type: typeof MomentType.PEER_INSTRUCTION;
  /** Tallies for the first vote (VOTE_1 / OPEN phase). */
  before: OptionTally[];
  /** Tallies for the second vote (VOTE_2 / REOPEN phase). */
  after: OptionTally[];
  totalBefore: number;
  totalAfter: number;
  correctOptionIds: string[];
  accuracyBefore: number;
  accuracyAfter: number;
  gain: number;
  /** Present when accuracyBefore < 0.30 to nudge the teacher. */
  suggestion?: 'REEXPLAIN';
}

export interface WordCloudEntry {
  word: string;
  count: number;
}
export interface WordCloudResults {
  type: typeof MomentType.WORD_CLOUD;
  totalAnswers: number;
  words: WordCloudEntry[];
}

export interface QuizTeamResults {
  type: typeof MomentType.QUIZ_TEAM;
  scores: TeamView[];
  /** Per-question option distribution, keyed by question id. */
  perQuestion: Record<string, OptionTally[]>;
}

export interface OpenAnswerCard {
  id: string;
  text: string;
  authorNickname: string | null;
  approved: boolean;
}
export interface OpenQuestionResults {
  type: typeof MomentType.OPEN_QUESTION | typeof MomentType.REFLECTION;
  totalAnswers: number;
  /** Only approved cards are broadcast to the projector when required. */
  cards: OpenAnswerCard[];
}

export interface VerseHighlightResults {
  type: typeof MomentType.VERSE_HIGHLIGHT;
  totalAnswers: number;
  /** Tap count per word index. */
  heat: number[];
}

export type MomentResults =
  | PollResults
  | PeerInstructionResults
  | WordCloudResults
  | QuizTeamResults
  | OpenQuestionResults
  | VerseHighlightResults;

/* --------------------------------------------------------------------------
 * Wall
 * ------------------------------------------------------------------------ */

export interface WallItem {
  id: string;
  text: string;
  upvotes: number;
  answered: boolean;
  displayed: boolean;
  createdAt: string;
}

/* --------------------------------------------------------------------------
 * Misc payloads
 * ------------------------------------------------------------------------ */

export interface TimerTick {
  remaining: number;
  total: number;
  label: string;
  running: boolean;
}

export interface SocketError {
  code: string;
  message: string;
}

export interface MomentUpdatedPayload {
  moment: ActiveMomentView | null;
  phase: MomentPhase | null;
  answeredCount: number;
  participantCount: number;
}

/* --------------------------------------------------------------------------
 * Socket.IO event contracts
 * ------------------------------------------------------------------------ */

export type AckCallback<T> = (response: {
  ok: boolean;
  data?: T;
  error?: SocketError;
}) => void;

export interface ClientToServerEvents {
  'room:join': (
    payload: { code: string; nickname: string },
    ack?: AckCallback<{ participantId: string; state: RoomStateView }>,
  ) => void;
  'room:leave': (payload: { code: string }) => void;
  'moment:answer': (
    payload: { momentId: string; answer: SubmitAnswerDTO },
    ack?: AckCallback<{ accepted: boolean }>,
  ) => void;
  'wall:post': (payload: { text: string }, ack?: AckCallback<WallItem>) => void;
  'wall:upvote': (payload: { id: string }) => void;

  // Host-only events (authenticated via JWT on the socket handshake).
  'host:startMoment': (payload: { momentId: string }) => void;
  'host:advancePhase': (payload: { momentId: string }) => void;
  'host:closeMoment': (payload: { momentId: string }) => void;
  'host:approveAnswer': (payload: {
    answerId: string;
    approved: boolean;
  }) => void;
  'host:startTimer': (payload: { seconds: number; label?: string }) => void;
  'host:assignTeams': (payload: {
    mode: 'random' | 'choose';
    teamCount: number;
    names?: string[];
  }) => void;
}

export interface ServerToClientEvents {
  'room:state': (state: RoomStateView) => void;
  'room:participants': (payload: {
    participants: ParticipantView[];
    count: number;
  }) => void;
  'moment:updated': (payload: MomentUpdatedPayload) => void;
  'moment:results': (payload: MomentResults) => void;
  'wall:updated': (payload: { items: WallItem[] }) => void;
  'timer:tick': (payload: TimerTick) => void;
  'team:scores': (payload: { teams: TeamView[] }) => void;
  error: (payload: SocketError) => void;
}

export interface InterServerEvents {
  ping: () => void;
}

export interface SocketData {
  role: 'host' | 'participant';
  roomCode: string;
  participantId?: string;
  teacherId?: string;
}
