import { z } from 'zod';
import { momentPhaseSchema, momentTypeSchema } from './moment.js';

/** Room lifecycle status. */
export const RoomStatus = {
  WAITING: 'WAITING',
  LIVE: 'LIVE',
  ENDED: 'ENDED',
} as const;
export type RoomStatus = (typeof RoomStatus)[keyof typeof RoomStatus];

export const roomStatusSchema = z.nativeEnum(RoomStatus);

/**
 * Room join codes are 6 chars from an unambiguous alphabet
 * (no 0/O, 1/I/L). Shared so client and server validate identically.
 */
export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const ROOM_CODE_LENGTH = 6;
export const roomCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .length(ROOM_CODE_LENGTH)
  .regex(
    new RegExp(`^[${ROOM_CODE_ALPHABET}]{${ROOM_CODE_LENGTH}}$`),
    'Código de sala inválido',
  );

export const nicknameSchema = z
  .string()
  .trim()
  .min(2, 'Apelido muito curto')
  .max(20, 'Apelido muito longo');

/* --------------------------------------------------------------------------
 * DTOs
 * ------------------------------------------------------------------------ */

export const createRoomSchema = z.object({
  lessonId: z.string().min(1),
});
export type CreateRoomDTO = z.infer<typeof createRoomSchema>;

export const joinRoomSchema = z.object({
  code: roomCodeSchema,
  nickname: nicknameSchema,
});
export type JoinRoomDTO = z.infer<typeof joinRoomSchema>;

/** Public (unauthenticated) view of a room, used by the join screen. */
export interface PublicRoomInfo {
  exists: boolean;
  status: RoomStatus | null;
  lessonTitle: string | null;
  teamsEnabled: boolean;
}

/* --------------------------------------------------------------------------
 * Live view models broadcast to clients
 * ------------------------------------------------------------------------ */

export interface TeamView {
  id: string;
  name: string;
  color: string;
  score: number;
}

export interface ParticipantView {
  id: string;
  nickname: string;
  teamId: string | null;
  online: boolean;
}

export interface ActiveMomentView {
  id: string;
  type: z.infer<typeof momentTypeSchema>;
  title: string;
  phase: z.infer<typeof momentPhaseSchema>;
  points: number;
  /** Type-specific presentation config (question, options, prompt, ...). */
  config: unknown;
  /** Optional illustrative image (comic strip / cartoon / picture). */
  imageUrl?: string | null;
  /** Optional caption / alt text for the illustrative image. */
  imageAlt?: string | null;
}

export interface RoomStateView {
  code: string;
  status: RoomStatus;
  lessonTitle: string;
  teams: TeamView[];
  participantCount: number;
  activeMoment: ActiveMomentView | null;
}
