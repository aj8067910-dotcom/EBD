import type { MomentType } from '@koinonia/shared';

export interface Teacher {
  id: string;
  name: string;
  email: string;
}

export interface MomentDTO {
  id: string;
  lessonId: string;
  order: number;
  type: MomentType;
  title: string;
  config: Record<string, unknown>;
  correctOptionIds: string[] | null;
  points: number;
  isPreClass: boolean;
  imageUrl?: string | null;
  imageAlt?: string | null;
}

export interface LessonSummary {
  id: string;
  title: string;
  bibleReference: string;
  date: string | null;
  notes: string | null;
  preClassToken: string;
  momentCount: number;
  createdAt: string;
}

export interface LessonDetail {
  id: string;
  title: string;
  bibleReference: string;
  date: string | null;
  notes: string | null;
  preClassToken: string;
  createdAt: string;
  moments: MomentDTO[];
}

export interface RoomSummary {
  id: string;
  code: string;
  status: string;
  lessonId: string;
  createdAt: string;
}

export interface RoomDetail {
  room: {
    id: string;
    code: string;
    status: string;
    activeMomentId: string | null;
    activePhase: string | null;
    createdAt: string;
  };
  lesson: {
    id: string;
    title: string;
    bibleReference: string;
    moments: MomentDTO[];
  };
  teams: { id: string; name: string; color: string; score: number }[];
}
