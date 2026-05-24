/** Client mirror of server zoom-aware viewport fetch tiers (Iter 64). */

export type ViewportDetailLevel = 'cluster' | 'summary' | 'detail';

export function zoomToViewportDetailLevel(zoom: number): ViewportDetailLevel {
  if (zoom < 10) return 'cluster';
  if (zoom <= 13) return 'summary';
  return 'detail';
}

export function viewportFetchLimitForZoom(zoom: number): number {
  const level = zoomToViewportDetailLevel(zoom);
  switch (level) {
    case 'cluster':
      return 180;
    case 'summary':
      return 450;
    case 'detail':
      return 900;
    default:
      return 450;
  }
}

/** Min zoom before viewport fetch activates (matches useMapBbox). */
export const VIEWPORT_MIN_ZOOM = 10;
