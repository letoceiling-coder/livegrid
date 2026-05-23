import type { ViewportBboxMeta, ViewportResponseMeta } from './viewport-contract.types';

export function bboxAreaDeg2(bbox: ViewportBboxMeta): number {
  const h = Math.max(bbox.ne_lat - bbox.sw_lat, 1e-9);
  const w = Math.max(bbox.ne_lng - bbox.sw_lng, 1e-9);
  return h * w;
}

export function computeDensity(visible: number, bbox: ViewportBboxMeta): number {
  const area = bboxAreaDeg2(bbox);
  return Math.round((visible / area) * 10) / 10;
}

export function bboxFromQuery(q: {
  sw_lat: number;
  sw_lng: number;
  ne_lat: number;
  ne_lng: number;
  zoom?: number;
}): ViewportBboxMeta {
  return {
    sw_lat: q.sw_lat,
    sw_lng: q.sw_lng,
    ne_lat: q.ne_lat,
    ne_lng: q.ne_lng,
  };
}

export function invalidBboxMeta(
  bbox: ViewportBboxMeta,
  zoom?: number,
): ViewportResponseMeta {
  return {
    prototype: true,
    reason: 'invalid_bbox',
    total: 0,
    visible: 0,
    returned: 0,
    hasMore: false,
    cursor: null,
    bbox,
    zoom: zoom ?? null,
    density: 0,
    catalogParity: 'shared-where',
    filtersApplied: false,
    sortApplied: 'name_asc',
    geoComposition: 'catalog_and_bbox',
    visibleExact: true,
  };
}

export function buildViewportMeta(args: {
  bbox: ViewportBboxMeta;
  zoom?: number;
  total: number;
  visible: number;
  returned: number;
  cursor: string | null;
  catalogParity: 'shared-where' | 'id-fallback';
  sortApplied: string;
  visibleExact?: boolean;
}): ViewportResponseMeta {
  const visible = args.visible;
  const returned = args.returned;
  return {
    prototype: true,
    total: args.total,
    visible,
    returned,
    hasMore: visible > returned,
    cursor: args.cursor,
    bbox: args.bbox,
    zoom: args.zoom ?? null,
    density: computeDensity(visible, args.bbox),
    catalogParity: args.catalogParity,
    filtersApplied: true,
    sortApplied: args.sortApplied,
    geoComposition: 'catalog_and_bbox',
    visibleExact: args.visibleExact ?? true,
  };
}

/** Blocks viewport sort — only stable SQL sorts supported in prototype */
export function resolveViewportBlockSort(sort?: string): {
  orderSql: 'name_asc' | 'name_desc';
  applied: string;
  requested: string | null;
} {
  if (sort === 'name_desc') {
    return { orderSql: 'name_desc', applied: 'name_desc', requested: sort };
  }
  if (sort && sort !== 'name_asc') {
    return { orderSql: 'name_asc', applied: 'name_asc', requested: sort };
  }
  return { orderSql: 'name_asc', applied: 'name_asc', requested: sort ?? null };
}

export function blockOrderByClause(order: 'name_asc' | 'name_desc'): string {
  return order === 'name_desc'
    ? 'b.name DESC, b.id DESC'
    : 'b.name ASC, b.id ASC';
}
