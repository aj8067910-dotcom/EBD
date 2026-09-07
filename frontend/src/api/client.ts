import { API_URL } from '../config.js';

const TOKEN_KEY = 'koinonia_token';

export class ApiError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore storage errors (private mode etc.)
  }
}

/** Log out: clear the httpOnly cookie server-side and drop the local token. */
export async function logout(): Promise<void> {
  try {
    await fetch(`${API_URL}/auth/logout`, { method: 'POST', credentials: 'include' });
  } catch {
    // ignore network errors — clearing the local token below is what matters
  }
  setToken(null);
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  auth?: boolean;
}

/**
 * Fetch wrapper with standardized error handling. Errors from the API arrive
 * as `{ error: { code, message } }` and are re-thrown as ApiError.
 */
export async function apiRequest<T>(
  path: string,
  { method = 'GET', body, auth = false }: RequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      credentials: 'include',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('NETWORK_ERROR', 'Falha de conexão com o servidor', 0);
  }

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const err = data?.error ?? {};
    throw new ApiError(
      err.code ?? 'ERROR',
      err.message ?? 'Erro inesperado',
      res.status,
    );
  }
  return data as T;
}

export const api = {
  get: <T>(path: string, auth = false) => apiRequest<T>(path, { auth }),
  post: <T>(path: string, body?: unknown, auth = false) =>
    apiRequest<T>(path, { method: 'POST', body, auth }),
  put: <T>(path: string, body?: unknown, auth = false) =>
    apiRequest<T>(path, { method: 'PUT', body, auth }),
  patch: <T>(path: string, body?: unknown, auth = false) =>
    apiRequest<T>(path, { method: 'PATCH', body, auth }),
  del: <T>(path: string, auth = false) =>
    apiRequest<T>(path, { method: 'DELETE', auth }),
};
