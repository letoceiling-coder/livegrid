/** Lightweight session snapshot for return-user UX (no PII). */
export type SessionSnapshot = {
  catalogHref?: string;
  mapHref?: string;
  lastListingHref?: string;
  lastListingTitle?: string;
  updatedAt: string;
};

const STORAGE_KEY = 'lg_session_v1';
const MAX_AGE_MS = 7 * 24 * 3_600_000;

export function readSessionSnapshot(): SessionSnapshot | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SessionSnapshot;
    if (!parsed?.updatedAt) return null;
    if (Date.now() - new Date(parsed.updatedAt).getTime() > MAX_AGE_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function patchSessionSnapshot(patch: Partial<Omit<SessionSnapshot, 'updatedAt'>>): void {
  try {
    const prev = readSessionSnapshot() ?? { updatedAt: new Date().toISOString() };
    const next: SessionSnapshot = {
      ...prev,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* quota */
  }
}

export function clearSessionSnapshot(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

const DISMISS_KEY = 'lg_session_resume_dismissed';

export function isSessionResumeDismissed(): boolean {
  try {
    return sessionStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

export function dismissSessionResume(): void {
  try {
    sessionStorage.setItem(DISMISS_KEY, '1');
  } catch {
    /* ignore */
  }
}

export function resetSessionResumeDismiss(): void {
  try {
    sessionStorage.removeItem(DISMISS_KEY);
  } catch {
    /* ignore */
  }
}
