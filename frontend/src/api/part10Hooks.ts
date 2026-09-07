import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, setToken } from './client.js';
import { API_URL } from '../config.js';

/* --------------------------------------------------------- WhatsApp auth */

export interface PublicUser {
  id: string;
  name: string;
  role: string;
  whatsappNumberMasked: string;
}

export function useWhatsappRequest() {
  return useMutation({
    mutationFn: (whatsappNumber: string) =>
      api.post<{ whatsappNumberMasked: string }>('/auth/whatsapp/request', {
        whatsappNumber,
      }),
  });
}

export function useWhatsappRegister() {
  return useMutation({
    mutationFn: (input: { name: string; whatsappNumber: string }) =>
      api.post<{ whatsappNumberMasked: string }>('/auth/whatsapp/register', input),
  });
}

export function useWhatsappVerify() {
  return useMutation({
    mutationFn: (input: { whatsappNumber: string; code: string }) =>
      api.post<{ user: PublicUser; token: string }>('/auth/whatsapp/verify', input),
    onSuccess: (data) => setToken(data.token),
  });
}

/* -------------------------------------------------------------- profile */

export interface Profile {
  id: string;
  name: string;
  role: string;
  isActive: boolean;
  whatsappNumberMasked: string;
  preferences: { enabled: boolean; dailyReadingEnabled: boolean };
}

export function useProfile() {
  return useQuery({
    queryKey: ['profile'],
    queryFn: () => api.get<{ profile: Profile }>('/profile', true),
    retry: false,
  });
}

export function useUpdatePreferences() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (prefs: {
      name?: string;
      enabled?: boolean;
      dailyReadingEnabled?: boolean;
    }) => api.put<{ profile: Profile }>('/profile/preferences', prefs, true),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profile'] }),
  });
}

/* --------------------------------------------------------- daily readings */

export interface DailyReading {
  id: string;
  title: string;
  verse: string;
  reference: string;
  message: string | null;
  readingDate: string;
  scheduledAt: string | null;
  imageUrl: string | null;
  status: string;
  publishedAt: string | null;
  sentAt: string | null;
  createdAt: string;
  sentCount?: number;
  failedCount?: number;
}

export interface ReadingInput {
  title: string;
  verse: string;
  reference: string;
  message?: string | null;
  readingDate: string;
  scheduledAt?: string | null;
}

export function useDailyReadings() {
  return useQuery({
    queryKey: ['daily-readings'],
    queryFn: () =>
      api.get<{ today: DailyReading[]; upcoming: DailyReading[]; past: DailyReading[] }>(
        '/daily-readings',
        true,
      ),
  });
}

export function useRecipientsCount() {
  return useQuery({
    queryKey: ['daily-readings', 'recipients-count'],
    queryFn: () =>
      api.get<{ total: number; teachers: number; students: number }>(
        '/daily-readings/recipients/count',
        true,
      ),
  });
}

export function useReadingRecipients() {
  return useQuery({
    queryKey: ['daily-readings', 'recipients'],
    queryFn: () =>
      api.get<{ users: { id: string; name: string; role: string }[] }>(
        '/daily-readings/recipients',
        true,
      ),
  });
}

function invalidate(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['daily-readings'] });
}

export function useCreateReading() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ReadingInput) =>
      api.post<{ reading: DailyReading }>('/daily-readings', input, true),
    onSuccess: () => invalidate(qc),
  });
}

export function useUpdateReading() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<ReadingInput> }) =>
      api.put<{ reading: DailyReading }>(`/daily-readings/${id}`, input, true),
    onSuccess: () => invalidate(qc),
  });
}

export function useDeleteReading() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del(`/daily-readings/${id}`, true),
    onSuccess: () => invalidate(qc),
  });
}

export function usePublishReading() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.post<{ reading: DailyReading }>(`/daily-readings/${id}/publish`, undefined, true),
    onSuccess: () => invalidate(qc),
  });
}

export function useSendReading() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      audience,
      userIds,
    }: {
      id: string;
      audience: 'ALL' | 'TEACHERS' | 'STUDENTS' | 'SELECTION';
      userIds?: string[];
    }) =>
      api.post<{ recipientCount: number }>(
        `/daily-readings/${id}/send`,
        { audience, userIds },
        true,
      ),
    onSuccess: () => invalidate(qc),
  });
}

/* --------------------------------------------------------------- bible */

export interface BiblePassage {
  reference: string;
  text: string;
}

/** Fetches a public-domain passage for a book/chapter/verse selection. */
export function fetchBiblePassage(input: {
  abbrev: string;
  chapter: number;
  verseStart: number;
  verseEnd?: number | null;
}): Promise<BiblePassage> {
  const params = new URLSearchParams({
    abbrev: input.abbrev,
    chapter: String(input.chapter),
    verseStart: String(input.verseStart),
  });
  if (input.verseEnd) params.set('verseEnd', String(input.verseEnd));
  return api.get<BiblePassage>(`/bible/passage?${params.toString()}`, true);
}

export function readingArtPng(id: string): string {
  return `${API_URL}/daily-readings/${id}/art.png`;
}
export function readingArtSvg(id: string): string {
  return `${API_URL}/daily-readings/${id}/art.svg`;
}
