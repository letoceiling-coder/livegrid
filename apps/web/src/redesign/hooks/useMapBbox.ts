import { useEffect, useRef, useState } from 'react';
import {
  bboxChangedMeaningfully,
  createBboxDebouncer,
  parseBboxFromYandexBounds,
  VIEWPORT_BBOX_DEBOUNCE_MS,
  type MapBbox,
} from '@/redesign/lib/bbox-serialization';
import { isMapDebugEnabled, recordBboxDeduped } from '@/redesign/lib/map-render-observability';

declare global {
  interface Window { ymaps: any; }
}

/**
 * Throttled map bounds listener for experimental viewport path.
 * Pass mapInstance ref from useMapClusterLayer.
 */
export function useMapBbox(
  mapInstance: React.RefObject<any>,
  ready: boolean,
): MapBbox | null {
  const [bbox, setBbox] = useState<MapBbox | null>(null);
  const debouncerRef = useRef(createBboxDebouncer(VIEWPORT_BBOX_DEBOUNCE_MS));
  const lastBboxRef = useRef<MapBbox | null>(null);

  useEffect(() => {
    const map = mapInstance.current;
    if (!ready || !map?.events) return;

    const handler = () => {
      const bounds = map.getBounds?.();
      const zoom = map.getZoom?.();
      if (typeof zoom !== 'number' || !bounds) return;
      const next = parseBboxFromYandexBounds(bounds, zoom);
      if (!next) return;
      if (lastBboxRef.current && !bboxChangedMeaningfully(lastBboxRef.current, next)) {
        if (isMapDebugEnabled()) recordBboxDeduped();
        return;
      }

      debouncerRef.current.schedule(next, (b) => {
        lastBboxRef.current = b;
        setBbox(b);
      });
    };

    map.events.add('boundschange', handler);
    handler();

    return () => {
      debouncerRef.current.cancel();
      map.events.remove('boundschange', handler);
    };
  }, [mapInstance, ready]);

  return bbox;
}
