/** DEV-only shadow diff marker colors (Iter 11) */
export const SHADOW_OVERLAP_GREEN = '#22c55e';
export const SHADOW_VIEWPORT_ORANGE = '#f97316';

export type ShadowMarkerKind = 'overlap' | 'viewport-only';

export function buildShadowMarkerLayoutHtml(kind: ShadowMarkerKind): string {
  const color = kind === 'overlap' ? SHADOW_OVERLAP_GREEN : SHADOW_VIEWPORT_ORANGE;
  const size = kind === 'overlap' ? 11 : 13;
  const opacity = kind === 'overlap' ? 0.75 : 0.85;
  const ring = kind === 'viewport-only' ? '2px dashed rgba(255,255,255,0.9)' : '2px solid #ffffff';

  return `<div style="
    width: ${size}px;
    height: ${size}px;
    border-radius: 999px;
    background: ${color};
    opacity: ${opacity};
    border: ${ring};
    box-shadow: 0 2px 8px rgba(0,0,0,0.25);
    cursor: default;
    pointer-events: none;
    transform: translate(-50%, -50%);
  " title="${kind === 'overlap' ? 'overlap' : 'viewport-only'}"></div>`;
}

const layoutClassCache = new Map<ShadowMarkerKind, unknown>();

export function getShadowMarkerLayoutClass(
  ymaps: typeof window.ymaps,
  kind: ShadowMarkerKind,
): unknown {
  let layout = layoutClassCache.get(kind);
  if (!layout) {
    layout = ymaps.templateLayoutFactory.createClass(buildShadowMarkerLayoutHtml(kind));
    layoutClassCache.set(kind, layout);
  }
  return layout;
}

export function shadowLayerSignature(
  markers: Array<{ id: string; kind: ShadowMarkerKind }>,
): string {
  if (!markers.length) return 'empty';
  const sorted = [...markers].sort((a, b) => a.id.localeCompare(b.id));
  return sorted.map((m) => `${m.kind[0]}:${m.id}`).join('|');
}
