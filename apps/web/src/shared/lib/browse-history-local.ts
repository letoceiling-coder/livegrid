export type LocalBrowseRow = {
  entityKind: 'LISTING' | 'BLOCK';
  entityId: number;
  title?: string;
  href: string;
  viewedAt: string;
};

const STORAGE_KEY = 'lg_browse_history_v1';
const MAX_ROWS = 20;

function entityKey(row: Pick<LocalBrowseRow, 'entityKind' | 'entityId'>): string {
  return `${row.entityKind}:${row.entityId}`;
}

export function readLocalBrowseHistory(): LocalBrowseRow[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LocalBrowseRow[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (r) =>
          r &&
          (r.entityKind === 'LISTING' || r.entityKind === 'BLOCK') &&
          Number.isFinite(r.entityId) &&
          typeof r.href === 'string',
      )
      .slice(0, MAX_ROWS);
  } catch {
    return [];
  }
}

export function pushLocalBrowseHistory(row: Omit<LocalBrowseRow, 'viewedAt'>): void {
  try {
    const key = entityKey(row);
    const now = new Date().toISOString();
    const without = readLocalBrowseHistory().filter((r) => entityKey(r) !== key);
    const next: LocalBrowseRow[] = [{ ...row, viewedAt: now }, ...without].slice(0, MAX_ROWS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* quota */
  }
}

export function clearLocalBrowseHistory(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function listingHref(listingId: number, kind?: string, blockSlug?: string | null): string {
  if (kind === 'APARTMENT' && blockSlug) return `/apartment/${listingId}`;
  return `/listing/${listingId}`;
}

export function blockHref(blockId: number, slug?: string | null): string {
  return `/complex/${slug?.trim() || blockId}`;
}
