const SOURCE_LABELS: Record<string, string> = {
  TELEGRAM_CHANNEL: 'Новости',
  '@trendagent_msk': 'TrendAgent Москва',
  trendagent_msk: 'TrendAgent Москва',
};

/** Human-readable news source label */
export function formatNewsSource(raw: string | null | undefined): string {
  const s = raw?.trim() ?? '';
  if (!s) return 'Новости недвижимости';
  if (SOURCE_LABELS[s]) return SOURCE_LABELS[s];
  if (SOURCE_LABELS[s.toLowerCase()]) return SOURCE_LABELS[s.toLowerCase()];
  if (s.startsWith('@')) {
    const handle = s.slice(1);
    if (handle.includes('trendagent')) return 'TrendAgent Москва';
    return handle.charAt(0).toUpperCase() + handle.slice(1);
  }
  if (/^[A-Z_]+$/.test(s)) return 'Новости недвижимости';
  return s;
}

/** «8 июня 2026 г.» → «8 июня» */
export function formatNewsDateShort(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
}
