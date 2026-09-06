import { customAlphabet } from 'nanoid';
import { ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH } from '@koinonia/shared';

const generate = customAlphabet(ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH);

/** Generate a random 6-char room code from the unambiguous alphabet. */
export function generateRoomCode(): string {
  return generate();
}
