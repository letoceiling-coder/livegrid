import { useEffect, useRef } from 'react';
import {
  isMapDebugEnabled,
  recordFpsSample,
  setMapInteractionPhase,
  type MapInteractionPhase,
} from '@/redesign/lib/map-render-observability';

declare global {
  interface Window { ymaps: any; }
}

/**
 * DEV-only rAF FPS sampler during map pan/zoom/selection.
 * Attach to mapInstance from useMapClusterLayer.
 */
export function useMapFpsTracker(
  mapInstance: React.RefObject<any>,
  ready: boolean,
  selectionBurst: boolean,
): void {
  const lastZoomRef = useRef<number | null>(null);
  const phaseRef = useRef<MapInteractionPhase>('idle');
  const phaseUntilRef = useRef(0);

  useEffect(() => {
    if (!isMapDebugEnabled() || !ready) return;
    phaseRef.current = selectionBurst ? 'selection' : phaseRef.current;
    if (selectionBurst) {
      phaseUntilRef.current = performance.now() + 400;
      setMapInteractionPhase('selection');
    }
  }, [ready, selectionBurst]);

  useEffect(() => {
    const map = mapInstance.current;
    if (!isMapDebugEnabled() || !ready || !map?.events) return;

    const markPhase = (phase: MapInteractionPhase, ms = 600) => {
      phaseRef.current = phase;
      phaseUntilRef.current = performance.now() + ms;
      setMapInteractionPhase(phase);
    };

    const onBounds = () => {
      const zoom = map.getZoom?.();
      if (typeof zoom !== 'number') return;
      const prev = lastZoomRef.current;
      lastZoomRef.current = zoom;
      if (prev != null && Math.abs(prev - zoom) >= 0.5) {
        markPhase('zoom', 800);
      } else {
        markPhase('pan', 500);
      }
    };

    map.events.add('boundschange', onBounds);

    let rafId = 0;
    let lastTs = 0;

    const tick = (ts: number) => {
      if (lastTs > 0) {
        const dt = ts - lastTs;
        if (dt > 0 && dt < 200) {
          const fps = 1000 / dt;
          let phase = phaseRef.current;
          if (performance.now() > phaseUntilRef.current) {
            phase = 'idle';
            phaseRef.current = 'idle';
          }
          recordFpsSample(fps, phase);
        }
      }
      lastTs = ts;
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      map.events.remove('boundschange', onBounds);
    };
  }, [mapInstance, ready]);
}
