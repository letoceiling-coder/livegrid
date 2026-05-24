/** Client-side search normalization — mirrors API `search-query.util.ts`. */
export function normalizeSearchQuery(raw: string): string {
  return raw
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/ё/gi, 'е')
    .replace(/^м\.?\s*/i, '')
    .replace(/[«»"'`]/g, '')
    .slice(0, 120);
}
