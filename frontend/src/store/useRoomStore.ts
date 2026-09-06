import { create } from 'zustand';
import type {
  ActiveMomentView,
  MomentPhase,
  MomentResults,
  RoomStateView,
  SocketError,
  TeamView,
  TimerTick,
  WallItem,
} from '@koinonia/shared';

interface RoomStore {
  connected: boolean;
  roomState: RoomStateView | null;
  activeMoment: ActiveMomentView | null;
  phase: MomentPhase | null;
  answeredCount: number;
  participantCount: number;
  timer: TimerTick | null;
  scores: TeamView[];
  wall: WallItem[];
  results: MomentResults | null;
  myParticipantId: string | null;
  myTeamId: string | null;
  /** momentId:phase -> my submitted answer payload */
  myAnswers: Record<string, unknown>;
  lastError: SocketError | null;

  setConnected: (v: boolean) => void;
  applyRoomState: (s: RoomStateView) => void;
  applyMomentUpdated: (
    moment: ActiveMomentView | null,
    phase: MomentPhase | null,
    answeredCount: number,
    participantCount: number,
  ) => void;
  applyResults: (r: MomentResults) => void;
  applyWall: (items: WallItem[]) => void;
  applyTimer: (t: TimerTick) => void;
  applyScores: (teams: TeamView[]) => void;
  applyParticipants: (count: number, myTeamId: string | null) => void;
  setError: (e: SocketError | null) => void;
  setParticipantId: (id: string) => void;
  recordAnswer: (key: string, answer: unknown) => void;
  reset: () => void;
}

const initial = {
  connected: false,
  roomState: null,
  activeMoment: null,
  phase: null,
  answeredCount: 0,
  participantCount: 0,
  timer: null,
  scores: [] as TeamView[],
  wall: [] as WallItem[],
  results: null,
  myParticipantId: null,
  myTeamId: null,
  myAnswers: {} as Record<string, unknown>,
  lastError: null,
};

export const useRoomStore = create<RoomStore>((set, get) => ({
  ...initial,

  setConnected: (connected) => set({ connected }),

  applyRoomState: (s) =>
    set({
      roomState: s,
      activeMoment: s.activeMoment,
      phase: s.activeMoment?.phase ?? null,
      scores: s.teams,
      participantCount: s.participantCount,
    }),

  applyMomentUpdated: (moment, phase, answeredCount, participantCount) => {
    const prevId = get().activeMoment?.id;
    const changed = moment?.id !== prevId;
    set({
      activeMoment: moment,
      phase,
      answeredCount,
      participantCount,
      // Clear stale results/timer when a different moment takes over.
      results: changed ? null : get().results,
    });
  },

  applyResults: (results) => set({ results }),
  applyWall: (wall) => set({ wall }),
  applyTimer: (timer) => set({ timer }),
  applyScores: (scores) => set({ scores }),

  applyParticipants: (participantCount, myTeamId) =>
    set((state) => ({
      participantCount,
      myTeamId: myTeamId ?? state.myTeamId,
    })),

  setError: (lastError) => set({ lastError }),
  setParticipantId: (myParticipantId) => set({ myParticipantId }),
  recordAnswer: (key, answer) =>
    set((state) => ({ myAnswers: { ...state.myAnswers, [key]: answer } })),

  reset: () => set({ ...initial, myAnswers: {} }),
}));
