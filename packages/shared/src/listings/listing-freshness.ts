/** Public-facing freshness labels — positive only; no stale warnings on buyer UI. */

export type FreshnessBadge = {
  label: string;
  tone: 'feed' | 'recent' | 'neutral';
};

const RECENT_DAYS = 7;

export function listingFreshnessBadge(input: {
  dataSource?: string | null;
  lastActivityAt?: Date | string | null;
  updatedAt?: Date | string | null;
}): FreshnessBadge | null {
  if (input.dataSource === 'FEED') {
    return { label: 'Актуально', tone: 'feed' };
  }

  const ts = pickTimestamp(input.lastActivityAt, input.updatedAt);
  if (ts == null) return null;

  const ageMs = Date.now() - ts;
  if (ageMs <= RECENT_DAYS * 24 * 60 * 60 * 1000) {
    return { label: 'Недавно обновлено', tone: 'recent' };
  }

  return null;
}

function pickTimestamp(
  lastActivityAt?: Date | string | null,
  updatedAt?: Date | string | null,
): number | null {
  for (const raw of [lastActivityAt, updatedAt]) {
    if (!raw) continue;
    const ts = typeof raw === 'string' ? Date.parse(raw) : raw.getTime();
    if (Number.isFinite(ts)) return ts;
  }
  return null;
}

export function inventoryAgeBucket(
  lastActivityAt: Date | string | null | undefined,
  now = Date.now(),
): 'fresh' | 'aging' | 'stale' | 'unknown' {
  if (!lastActivityAt) return 'unknown';
  const ts = typeof lastActivityAt === 'string' ? Date.parse(lastActivityAt) : lastActivityAt.getTime();
  if (!Number.isFinite(ts)) return 'unknown';
  const days = (now - ts) / (24 * 60 * 60 * 1000);
  if (days < 30) return 'fresh';
  if (days < 60) return 'aging';
  return 'stale';
}
