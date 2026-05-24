/** Build internal catalog URLs for SEO cross-navigation (district / metro filters). */
export function buildCatalogFilterUrl(
  regionId: number,
  opts?: { district?: string; subway?: string; objectType?: 'apartments' | 'houses' | 'land' | 'commercial' },
): string {
  const params = new URLSearchParams({ region_id: String(regionId) });
  if (opts?.district?.trim()) {
    params.set('district_names', opts.district.trim());
  }
  if (opts?.subway?.trim()) {
    params.set('subway_names', opts.subway.trim());
  }
  const base = opts?.objectType && opts.objectType !== 'apartments' ? `/catalog/${opts.objectType}` : '/catalog';
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}
