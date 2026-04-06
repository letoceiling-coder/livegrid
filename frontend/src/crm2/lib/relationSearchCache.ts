export type RelationSearchRow = { id: number; label: string };

const store = new Map<string, RelationSearchRow[]>();
const MAX_KEYS = 200;

export function relationSearchCacheKey(
  targetType: string,
  search: string,
  labelField: string | null | undefined,
): string {
  return `${targetType}\u0000${search}\u0000${labelField ?? ''}`;
}

export function getRelationSearchCache(key: string): RelationSearchRow[] | undefined {
  return store.get(key);
}

export function setRelationSearchCache(key: string, rows: RelationSearchRow[]): void {
  store.set(key, rows);
  while (store.size > MAX_KEYS) {
    const first = store.keys().next().value;
    if (first === undefined) break;
    store.delete(first);
  }
}
