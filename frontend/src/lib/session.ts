/** Persist the student's {code, nickname} in sessionStorage for reconnection. */
const KEY = 'koinonia_session';

export interface StudentSession {
  code: string;
  nickname: string;
}

export function saveSession(session: StudentSession) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(session));
  } catch {
    // ignore
  }
}

export function loadSession(): StudentSession | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as StudentSession) : null;
  } catch {
    return null;
  }
}

export function clearSession() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
