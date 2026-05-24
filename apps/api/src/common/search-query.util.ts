/** Normalize user search input for catalog/autocomplete (no vector/ES). */
export function normalizeSearchQuery(raw: string): string {
  return raw
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/ё/gi, 'е')
    .replace(/^м\.?\s*/i, '')
    .replace(/[«»"'`]/g, '')
    .slice(0, 120);
}

/** Extra contains variants for typo-tolerant ILIKE (metro names, hyphenated). */
export function searchQueryVariants(raw: string): string[] {
  const base = normalizeSearchQuery(raw);
  if (!base) return [];
  const variants = new Set<string>([base]);
  const noHyphen = base.replace(/[-–—]/g, ' ').replace(/\s+/g, ' ').trim();
  if (noHyphen && noHyphen !== base) variants.add(noHyphen);
  if (base.length >= 4) variants.add(base.replace(/(.)\1+/g, '$1'));
  return [...variants];
}
