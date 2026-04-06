/** Build query string for entity list API (cursor mode, filters, arrays). */
export function entityListSearchParams(
  entries: Record<string, string | string[] | number | boolean | undefined | null>,
): string {
  const p = new URLSearchParams();

  for (const [key, raw] of Object.entries(entries)) {
    if (raw === undefined || raw === null || raw === '') continue;

    if (Array.isArray(raw)) {
      for (const v of raw) {
        if (v === undefined || v === null || v === '') continue;
        p.append(`${key}[]`, String(v));
      }
      continue;
    }

    p.set(key, String(raw));
  }

  return p.toString();
}
