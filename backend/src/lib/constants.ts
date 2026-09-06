/** Room join codes expire this long after creation (PARTE 7 security). */
export const ROOM_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

export function isRoomExpired(createdAt: Date | number, status: string): boolean {
  if (status === 'ENDED') return false;
  const created = typeof createdAt === 'number' ? createdAt : createdAt.getTime();
  return Date.now() - created > ROOM_TTL_MS;
}
