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

const LAST_ROOM_KEY = 'koinonia_last_room';

/** Remember the last room a teacher started (to "reopen last class"). */
export function saveLastRoom(code: string) {
  try {
    localStorage.setItem(LAST_ROOM_KEY, code);
  } catch {
    // ignore
  }
}

export function loadLastRoom(): string | null {
  try {
    return localStorage.getItem(LAST_ROOM_KEY);
  } catch {
    return null;
  }
}
