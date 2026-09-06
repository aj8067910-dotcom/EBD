import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { api, setToken } from './client.js';
import type {
  LessonDetail,
  LessonSummary,
  MomentDTO,
  RoomDetail,
  RoomSummary,
  Teacher,
} from './types.js';
import type { MomentDraft } from '../templates/lessonTemplates.js';

/* ------------------------------------------------------------------- auth */

export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: () => api.get<{ teacher: Teacher }>('/auth/me', true),
    retry: false,
  });
}

export function useLogin() {
  return useMutation({
    mutationFn: (input: { email: string; password: string }) =>
      api.post<{ teacher: Teacher; token: string }>('/auth/login', input),
    onSuccess: (data) => setToken(data.token),
  });
}

/* ---------------------------------------------------------------- lessons */

export function useLessons() {
  return useQuery({
    queryKey: ['lessons'],
    queryFn: () => api.get<{ lessons: LessonSummary[] }>('/lessons', true),
  });
}

export function useLesson(id: string | undefined) {
  return useQuery({
    queryKey: ['lesson', id],
    queryFn: () => api.get<{ lesson: LessonDetail }>(`/lessons/${id}`, true),
    enabled: !!id,
  });
}

export function useCreateLesson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { title: string; bibleReference: string; notes?: string }) =>
      api.post<{ lesson: LessonDetail }>('/lessons', input, true),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lessons'] }),
  });
}

export function useUpdateLesson(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<Omit<LessonSummary, 'id' | 'momentCount'>>) =>
      api.put<{ lesson: LessonDetail }>(`/lessons/${id}`, input, true),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lesson', id] });
      qc.invalidateQueries({ queryKey: ['lessons'] });
    },
  });
}

export function useDeleteLesson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del(`/lessons/${id}`, true),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lessons'] }),
  });
}

export function useDuplicateLesson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.post<{ lesson: LessonDetail }>(`/lessons/${id}/duplicate`, undefined, true),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lessons'] }),
  });
}

/* ---------------------------------------------------------------- moments */

export function useCreateMoment(lessonId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (draft: MomentDraft) =>
      api.post<{ moment: MomentDTO }>(`/lessons/${lessonId}/moments`, draft, true),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lesson', lessonId] }),
  });
}

export function useUpdateMoment(lessonId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, draft }: { id: string; draft: MomentDraft }) =>
      api.put<{ moment: MomentDTO }>(`/moments/${id}`, draft, true),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lesson', lessonId] }),
  });
}

export function useDeleteMoment(lessonId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del(`/moments/${id}`, true),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lesson', lessonId] }),
  });
}

export function useReorderMoments(lessonId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (orderedIds: string[]) =>
      api.patch<{ moments: MomentDTO[] }>(
        `/lessons/${lessonId}/moments/reorder`,
        { orderedIds },
        true,
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lesson', lessonId] }),
  });
}

/* ------------------------------------------------------------------ rooms */

export function useCreateRoom() {
  return useMutation({
    mutationFn: (lessonId: string) =>
      api.post<{ room: RoomSummary }>('/rooms', { lessonId }, true),
  });
}

export function useRoomDetail(code: string | undefined) {
  return useQuery({
    queryKey: ['room-detail', code],
    queryFn: () => api.get<RoomDetail>(`/rooms/${code}`, true),
    enabled: !!code,
  });
}

export function useEndRoom() {
  return useMutation({
    mutationFn: (code: string) =>
      api.post(`/rooms/${code}/end`, undefined, true),
  });
}

export function useReport(roomId: string | undefined) {
  return useQuery({
    queryKey: ['report', roomId],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    queryFn: () => api.get<{ report: any }>(`/rooms/${roomId}/report`, true),
    enabled: !!roomId,
  });
}
