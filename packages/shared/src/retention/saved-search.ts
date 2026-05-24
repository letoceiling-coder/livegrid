/** Normalized saved search payload stored in saved_searches.params_json */

export type SavedSearchGeoContext = {
  geo_lat?: number;
  geo_lng?: number;
  geo_radius_m?: number;
  geo_polygon?: string;
  geo_preset?: string;
};

export type SavedSearchParamsJson = {
  /** Catalog URL query params (normalized keys) */
  params: Record<string, string>;
  regionId?: number | null;
  geo?: SavedSearchGeoContext | null;
};

export const SAVED_SEARCH_PARAM_KEYS = [
  'type',
  'market',
  'search',
  'rooms',
  'price_min',
  'price_max',
  'area_min',
  'area_max',
  'land_area_min',
  'land_area_max',
  'distance_min',
  'distance_max',
  'directions',
  'house_location',
  'floor_min',
  'floor_max',
  'deadline',
  'finishing_ids',
  'district_names',
  'subway_names',
  'builder_names',
  'status',
] as const;

/** Stable string for dedupe — sorted keys, trimmed values. */
export function normalizeSavedSearchSignature(
  params: Record<string, string>,
  regionId?: number | null,
): string {
  const parts: string[] = [];
  for (const key of SAVED_SEARCH_PARAM_KEYS) {
    const v = params[key]?.trim();
    if (v) parts.push(`${key}=${v}`);
  }
  if (regionId != null) parts.push(`region_id=${regionId}`);
  return parts.sort().join('&');
}

export function paramsFromUrlSearchParams(sp: { get(key: string): string | null }): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of SAVED_SEARCH_PARAM_KEYS) {
    const v = sp.get(key);
    if (v?.trim()) out[key] = v.trim();
  }
  return out;
}

export function savedSearchParamsToCatalogUrl(params: SavedSearchParamsJson): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(params.params)) {
    if (v) parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
  }
  if (params.regionId != null) parts.push(`region_id=${params.regionId}`);
  const geo = params.geo;
  if (geo?.geo_lat != null) parts.push(`geo_lat=${geo.geo_lat}`);
  if (geo?.geo_lng != null) parts.push(`geo_lng=${geo.geo_lng}`);
  if (geo?.geo_radius_m != null) parts.push(`geo_radius_m=${geo.geo_radius_m}`);
  if (geo?.geo_polygon) parts.push(`geo_polygon=${encodeURIComponent(geo.geo_polygon)}`);
  if (geo?.geo_preset) parts.push(`geo_preset=${encodeURIComponent(geo.geo_preset)}`);
  const qs = parts.join('&');
  return qs ? `/catalog?${qs}` : '/catalog';
}
