import { useEffect, useMemo, useRef } from 'react';
import {
  isMapDebugEnabled,
  recordShadowLayerRebuild,
  setShadowRenderEnabled,
  type MapLayerKind,
} from '@/redesign/lib/map-render-observability';
import {
  getShadowMarkerLayoutClass,
  shadowLayerSignature,
  type ShadowMarkerKind,
} from '@/redesign/lib/shadow-marker-layout';

declare global {
  interface Window { ymaps: any; }
}

export type ShadowViewportPoint = {
  id: string;
  coords: [number, number];
};

type Options = {
  enabled: boolean;
  mapInstance: React.RefObject<any>;
  ready: boolean;
  layerKind: MapLayerKind;
  /** Viewport prototype markers (slug or listing id) */
  viewportPoints: ShadowViewportPoint[];
  /** Legacy marker ids currently inside bbox */
  legacyInBboxIds: string[];
};

/**
 * DEV-only second cluster layer for visual parity diff.
 * Does NOT modify or replace the legacy cluster from useMapClusterLayer.
 */
export function useShadowViewportRender({
  enabled,
  mapInstance,
  ready,
  layerKind,
  viewportPoints,
  legacyInBboxIds,
}: Options) {
  const clustererRef = useRef<any>(null);
  const prevSignatureRef = useRef('');

  const shadowMarkers = useMemo(() => {
    const legacySet = new Set(legacyInBboxIds);
    return viewportPoints.map((p) => {
      const kind: ShadowMarkerKind = legacySet.has(p.id) ? 'overlap' : 'viewport-only';
      return { ...p, kind };
    });
  }, [viewportPoints, legacyInBboxIds]);

  const layerSignature = useMemo(
    () => shadowLayerSignature(shadowMarkers.map((m) => ({ id: m.id, kind: m.kind }))),
    [shadowMarkers],
  );

  useEffect(() => {
    setShadowRenderEnabled(enabled);
    return () => setShadowRenderEnabled(false);
  }, [enabled]);

  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !ready) return;

    const removeShadowCluster = () => {
      if (clustererRef.current) {
        map.geoObjects.remove(clustererRef.current);
        clustererRef.current = null;
      }
    };

    if (!enabled) {
      removeShadowCluster();
      prevSignatureRef.current = '';
      return;
    }

    if (layerSignature === prevSignatureRef.current && clustererRef.current) {
      return;
    }

    const t0 = isMapDebugEnabled() ? performance.now() : 0;
    removeShadowCluster();

    if (shadowMarkers.length === 0) {
      prevSignatureRef.current = layerSignature;
      if (isMapDebugEnabled()) {
        recordShadowLayerRebuild({
          markerCount: 0,
          overlapRendered: 0,
          viewportOnlyRendered: 0,
          durationMs: performance.now() - t0,
        });
      }
      return;
    }

    const clusterer = new window.ymaps.Clusterer({
      preset: 'islands#invisible',
      groupByCoordinates: false,
      clusterDisableClickZoom: true,
      hasBalloon: false,
      hasHint: false,
      openBalloonOnClick: false,
      zIndex: 650,
    });

    const placemarks = shadowMarkers.map((m) =>
      new window.ymaps.Placemark(
        m.coords,
        {},
        {
          iconLayout: getShadowMarkerLayoutClass(window.ymaps, m.kind),
          iconShape: { type: 'Circle', coordinates: [0, 0], radius: 8 },
          interactivityModel: 'default#silent',
          zIndex: m.kind === 'viewport-only' ? 660 : 650,
        },
      ),
    );

    clusterer.add(placemarks);
    map.geoObjects.add(clusterer);
    clustererRef.current = clusterer;
    prevSignatureRef.current = layerSignature;

    const overlapRendered = shadowMarkers.filter((m) => m.kind === 'overlap').length;
    const viewportOnlyRendered = shadowMarkers.filter((m) => m.kind === 'viewport-only').length;

    if (isMapDebugEnabled()) {
      recordShadowLayerRebuild({
        markerCount: shadowMarkers.length,
        overlapRendered,
        viewportOnlyRendered,
        durationMs: performance.now() - t0,
      });
    }

    void layerKind;

    return removeShadowCluster;
  }, [enabled, ready, mapInstance, layerSignature, shadowMarkers, layerKind]);
}
