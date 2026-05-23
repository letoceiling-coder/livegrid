import type { MapBbox } from '@/redesign/lib/bbox-serialization';

/** Keys forwarded to prototype — aligned with catalog-api-params */
const CATALOG_FILTER_KEYS = [
  'search',
  'district_names',
  'subway_names',
  'builder_names',
  'rooms',
  'status',
  'statuses',
  'price_min',
  'price_max',
  'area_min',
  'area_max',
  'area_total_min',
  'area_total_max',
  'floor_min',
  'floor_max',
  'deadline',
  'finishing',
  'apartment_market',
  'kind',
  'require_active_listings',
  'geo_lat',
  'geo_lng',
  'geo_radius_m',
  'geo_polygon',
  'geo_preset',
] as const;

export type ShadowParityResult = {
  legacyTotal: number;
  legacyInBbox: number;
  viewportCount: number;
  overlapCount: number;
  missingInViewport: number;
  extraInViewport: number;
  parityPct: number;
  bboxCoveragePct: number;
  offscreenLegacy: number;
  visibleRatio: number;
  offscreenRatio: number;
  legacyDensityPerDeg2: number;
  viewportDensityPerDeg2: number;
  missingSample: string[];
  extraSample: string[];
  filterActive: boolean;
  activeFilterKeys: string[];
  filterMismatchWarning: string | null;
  staleLegacyCap: boolean;
  geoFilterActive: boolean;
};

function bboxAreaDeg2(bbox: MapBbox): number {
  const h = Math.max(bbox.neLat - bbox.swLat, 1e-9);
  const w = Math.max(bbox.neLng - bbox.swLng, 1e-9);
  return h * w;
}

function activeFilterKeysFromParams(sp?: URLSearchParams): string[] {
  if (!sp) return [];
  return CATALOG_FILTER_KEYS.filter((k) => {
    const v = sp.get(k);
    return v != null && v !== '';
  });
}

function buildFilterMismatchWarning(
  activeKeys: string[],
  geoActive: boolean,
  extraCount: number,
  missingCount: number,
  source: string,
  staleLegacyCap: boolean,
): string | null {
  if (source === 'client-filter-fallback') {
    return 'fallback: viewport capped at legacy 200-row dataset';
  }
  if (missingCount > 0) {
    return `${missingCount} legacy-in-bbox IDs missing from viewport`;
  }
  if (missingCount === 0 && extraCount === 0) {
    return null;
  }
  if (missingCount === 0 && staleLegacyCap && extraCount > 0) {
    return `${extraCount} viewport IDs beyond legacy page (cap artifact — filter parity OK)`;
  }
  if (extraCount > 0 && geoActive) {
    return `${extraCount} extra viewport IDs — verify geo∩bbox if unexpected`;
  }
  if (extraCount > 0 && activeKeys.length > 0) {
    return `${extraCount} extra viewport IDs with filters active`;
  }
  return null;
}

export function computeShadowParity(args: {
  legacyIds: string[];
  legacyInBboxIds: string[];
  viewportIds: string[];
  bbox: MapBbox;
  filterSearchParams?: URLSearchParams;
  legacyCap?: number;
  source: string;
}): ShadowParityResult {
  const legacySet = new Set(args.legacyInBboxIds);
  const viewportSet = new Set(args.viewportIds);
  const overlap = args.legacyInBboxIds.filter((id) => viewportSet.has(id));
  const missing = args.legacyInBboxIds.filter((id) => !viewportSet.has(id));
  const extra = args.viewportIds.filter((id) => !legacySet.has(id));

  const denom = Math.max(args.legacyInBboxIds.length, args.viewportIds.length, 1);
  const parityPct = Math.round((overlap.length / denom) * 1000) / 10;

  const legacyTotal = args.legacyIds.length;
  const legacyInBbox = args.legacyInBboxIds.length;
  const offscreenLegacy = legacyTotal - legacyInBbox;
  const bboxCoveragePct =
    legacyTotal > 0 ? Math.round((legacyInBbox / legacyTotal) * 1000) / 10 : 0;

  const area = bboxAreaDeg2(args.bbox);
  const legacyDensityPerDeg2 = legacyInBbox / area;
  const viewportDensityPerDeg2 = args.viewportIds.length / area;

  const activeFilterKeys = activeFilterKeysFromParams(args.filterSearchParams);
  const geoFilterActive = activeFilterKeys.some((k) => k.startsWith('geo_'));
  const filterActive = activeFilterKeys.length > 0;

  const staleLegacyCap =
    args.legacyCap != null && legacyTotal >= args.legacyCap;

  const filterMismatchWarning = buildFilterMismatchWarning(
    activeFilterKeys,
    geoFilterActive,
    extra.length,
    missing.length,
    args.source,
    staleLegacyCap,
  );

  return {
    legacyTotal,
    legacyInBbox,
    viewportCount: args.viewportIds.length,
    overlapCount: overlap.length,
    missingInViewport: missing.length,
    extraInViewport: extra.length,
    parityPct,
    bboxCoveragePct,
    offscreenLegacy,
    visibleRatio: legacyTotal > 0 ? legacyInBbox / legacyTotal : 0,
    offscreenRatio: legacyTotal > 0 ? offscreenLegacy / legacyTotal : 0,
    legacyDensityPerDeg2: Math.round(legacyDensityPerDeg2 * 10) / 10,
    viewportDensityPerDeg2: Math.round(viewportDensityPerDeg2 * 10) / 10,
    missingSample: missing.slice(0, 5),
    extraSample: extra.slice(0, 5),
    filterActive,
    activeFilterKeys,
    filterMismatchWarning,
    staleLegacyCap,
    geoFilterActive,
  };
}

export function combinedShadowSignature(bboxSig: string, filterParams?: URLSearchParams): string {
  const filterSig = filterParams?.toString() ?? '';
  return `${bboxSig}|f:${filterSig}`;
}
