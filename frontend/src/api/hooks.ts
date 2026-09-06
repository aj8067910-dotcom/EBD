import { useQuery } from '@tanstack/react-query';
import type { PublicRoomInfo } from '@koinonia/shared';
import { api } from './client.js';

/** Public room info for the student join screen. */
export function usePublicRoom(code: string | undefined) {
  return useQuery({
    queryKey: ['room-public', code],
    queryFn: () => api.get<PublicRoomInfo>(`/rooms/${code}/public`),
    enabled: !!code && code.length === 6,
    retry: false,
    staleTime: 10_000,
  });
}
