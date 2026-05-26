import type { RegionRow } from '@/redesign/hooks/useDefaultRegionId';

export function regionLabel(region: RegionRow): string {
  return region.name?.trim() || region.code || `Регион ${region.id}`;
}

export function isBelgorodRegion(region: RegionRow): boolean {
  const code = (region.code ?? '').toLowerCase();
  const name = (region.name ?? '').toLowerCase();
  return code === 'belgorod' || name.includes('белгород');
}

const POPULAR_MATCHERS: { codes: string[]; names: string[] }[] = [
  { codes: ['msk'], names: ['москва'] },
  { codes: ['spb', 'saint-petersburg', 'petersburg'], names: ['санкт-петербург', 'петербург'] },
  { codes: ['kzn'], names: ['казань'] },
  { codes: ['krd', 'krasnodar'], names: ['краснодар'] },
  { codes: ['ekb', 'yekaterinburg'], names: ['екатеринбург'] },
  { codes: ['nsk', 'novosibirsk'], names: ['новосибирск'] },
];

function matchesPopular(region: RegionRow, matcher: (typeof POPULAR_MATCHERS)[number]): boolean {
  const code = (region.code ?? '').toLowerCase();
  const name = (region.name ?? '').toLowerCase();
  if (matcher.codes.some((c) => code === c || code.includes(c))) return true;
  return matcher.names.some((n) => name.includes(n));
}

export function pickPopularRegions(regions: RegionRow[]): RegionRow[] {
  const out: RegionRow[] = [];
  const used = new Set<number>();
  for (const matcher of POPULAR_MATCHERS) {
    const hit = regions.find((r) => !used.has(r.id) && matchesPopular(r, matcher));
    if (hit) {
      used.add(hit.id);
      out.push(hit);
    }
  }
  return out;
}

export function filterRegionsByQuery(regions: RegionRow[], query: string): RegionRow[] {
  const q = query.trim().toLowerCase();
  if (!q) return regions;
  return regions.filter((r) => {
    const label = regionLabel(r).toLowerCase();
    const code = (r.code ?? '').toLowerCase();
    return label.includes(q) || code.includes(q);
  });
}

export type RegionLetterGroup = { letter: string; regions: RegionRow[] };

export function groupRegionsByLetter(regions: RegionRow[]): RegionLetterGroup[] {
  const sorted = [...regions].sort((a, b) =>
    regionLabel(a).localeCompare(regionLabel(b), 'ru'),
  );
  const map = new Map<string, RegionRow[]>();
  for (const r of sorted) {
    const first = regionLabel(r).charAt(0).toUpperCase() || '#';
    const letter = /[A-ZА-ЯЁ]/i.test(first) ? first : '#';
    if (!map.has(letter)) map.set(letter, []);
    map.get(letter)!.push(r);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b, 'ru'))
    .map(([letter, rows]) => ({ letter, regions: rows }));
}

export function orderRegionsWithBelgorodFirst(regions: RegionRow[]): RegionRow[] {
  const belgorod = regions.find(isBelgorodRegion);
  const rest = regions
    .filter((r) => r.id !== belgorod?.id)
    .sort((a, b) => regionLabel(a).localeCompare(regionLabel(b), 'ru'));
  return belgorod ? [belgorod, ...rest] : rest;
}
