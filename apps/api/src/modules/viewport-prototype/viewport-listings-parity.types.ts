import type { QueryViewportListingsDto } from './dto/query-viewport-listings.dto';

export type ParityBboxScenario = {
  name: string;
  sw_lat: number;
  sw_lng: number;
  ne_lat: number;
  ne_lng: number;
  zoom?: number;
};

export type ParityFilterScenario = {
  name: string;
  params: Partial<QueryViewportListingsDto>;
};

export type ParityScenarioResult = {
  scenario: string;
  filter: string;
  legacy: {
    catalogTotal: number;
    geoTotal: number;
    legacyCapTotal: number;
    visibleInBbox: number;
    returnedCap200: number;
    payloadEstimateBytes: number | null;
  };
  viewport: {
    total: number;
    visible: number;
    returned: number;
    payloadEstimateBytes: number | null;
  };
  comparison: {
    totalDelta: number;
    visibleDelta: number;
    overlapCount: number;
    missingInViewport: number;
    extraInViewport: number;
    parityPct: number;
    legacyOnlyPct: number;
    viewportOnlyPct: number;
    missingSample: number[];
    extraSample: number[];
  };
  timingMs: {
    legacy: number;
    viewport: number;
  };
};

export type ParityRebaselineReport = {
  rebaseline: true;
  readOnly: true;
  regionId: number;
  generatedAt: string;
  postMaterialization: true;
  iter23Baseline: {
    materializedRows: number;
    viewportListingsMskTotal: number;
    viewportListingsMskVisible: number;
  };
  scenarios: ParityScenarioResult[];
  summary: {
    avgParityPct: number;
    minParityPct: number;
    allTotalMatch: boolean;
    allVisibleMatch: boolean;
  };
  readinessHints: string[];
};

export const DEFAULT_BBOX_SCENARIOS: ParityBboxScenario[] = [
  {
    name: 'moscow_wide',
    sw_lat: 55.6,
    ne_lat: 55.9,
    sw_lng: 37.4,
    ne_lng: 37.9,
    zoom: 11,
  },
  {
    name: 'moscow_center_tight',
    sw_lat: 55.74,
    ne_lat: 55.78,
    sw_lng: 37.58,
    ne_lng: 37.68,
    zoom: 14,
  },
  {
    name: 'high_zoom_tiny',
    sw_lat: 55.751,
    ne_lat: 55.753,
    sw_lng: 37.617,
    ne_lng: 37.62,
    zoom: 16,
  },
  {
    name: 'empty_world',
    sw_lat: -89,
    ne_lat: -88,
    sw_lng: -179,
    ne_lng: -178,
    zoom: 3,
  },
];

export const DEFAULT_FILTER_SCENARIOS: ParityFilterScenario[] = [
  { name: 'none', params: {} },
  { name: 'rooms_2', params: { rooms: '2' } },
  { name: 'price_5_15m', params: { price_min: 5_000_000, price_max: 15_000_000 } },
  {
    name: 'geo_radius_5km',
    params: { geo_lat: 55.751244, geo_lng: 37.618423, geo_radius_m: 5000 },
  },
];

/** Acceptable parity thresholds for production readiness (Iter 24). */
export const PARITY_THRESHOLDS = {
  countParityPct: 99.0,
  idOverlapPct: 98.0,
  totalExactMatch: true,
  visibleExactMatch: true,
  filterDeltaMax: 0,
} as const;
