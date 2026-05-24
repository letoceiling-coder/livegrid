/** Stable viewport prototype response contract (Iter 15) */

export type ViewportBboxMeta = {
  sw_lat: number;
  sw_lng: number;
  ne_lat: number;
  ne_lng: number;
};

export type ViewportDetailLevel = 'cluster' | 'summary' | 'detail';

export type ViewportResponseMeta = {
  prototype: boolean;
  /** Zoom-aware fetch tier */
  detailLevel?: ViewportDetailLevel;
  /** Server query duration ms */
  queryMs?: number;
  /** Catalog filter match count (region + filters, no bbox) */
  total: number;
  /** Bbox ∩ catalog filter count */
  visible: number;
  /** Rows in this response */
  returned: number;
  hasMore: boolean;
  /** Keyset cursor — slug (blocks) or id (listings) for next page; null when exhausted */
  cursor: string | null;
  bbox: ViewportBboxMeta;
  zoom: number | null;
  /** visible objects per square degree (WGS84 bbox area) */
  density: number;
  catalogParity: 'shared-where' | 'id-fallback';
  filtersApplied: boolean;
  sortApplied: string;
  geoComposition: 'catalog_and_bbox';
  /** When visible count used fallback estimation */
  visibleExact: boolean;
  reason?: 'invalid_bbox';
};

export type ViewportListResponse<T> = {
  data: T[];
  meta: ViewportResponseMeta;
};
