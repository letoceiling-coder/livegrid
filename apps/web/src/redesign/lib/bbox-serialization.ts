/** WGS84 bounding box — south-west / north-east corners + zoom at capture time */
export type MapBbox = {
  swLat: number;
  swLng: number;
  neLat: number;
  neLng: number;
  zoom: number;
};

/** Minimum zoom before viewport fetches are considered (avoid world-scale storms) */
export const VIEWPORT_MIN_ZOOM = 10;

/** Debounce pan/zoom → bbox API calls */
export const VIEWPORT_BBOX_DEBOUNCE_MS = 450;

/** Ignore sub-threshold bbox drift (degrees) to reduce duplicate requests */
export const VIEWPORT_BBOX_EPSILON = 0.0008;

export function isValidBbox(b: MapBbox | null | undefined): b is MapBbox {
  if (!b) return false;
  const nums = [b.swLat, b.swLng, b.neLat, b.neLng, b.zoom];
  if (!nums.every((n) => Number.isFinite(n))) return false;
  if (b.swLat >= b.neLat || b.swLng >= b.neLng) return false;
  if (b.zoom < VIEWPORT_MIN_ZOOM) return false;
  return true;
}

/** Stable key for dedupe — 4 decimal degrees + zoom */
export function bboxSignature(b: MapBbox): string {
  const f = (n: number) => n.toFixed(4);
  return `${f(b.swLat)},${f(b.swLng)},${f(b.neLat)},${f(b.neLng)}|z${Math.round(b.zoom)}`;
}

export function parseBboxFromYandexBounds(
  bounds: number[][],
  zoom: number,
): MapBbox | null {
  if (!Array.isArray(bounds) || bounds.length < 2) return null;
  const [sw, ne] = bounds;
  if (!sw?.length || !ne?.length) return null;
  const b: MapBbox = {
    swLat: Number(sw[0]),
    swLng: Number(sw[1]),
    neLat: Number(ne[0]),
    neLng: Number(ne[1]),
    zoom: Number(zoom),
  };
  return isValidBbox(b) ? b : null;
}

export function bboxChangedMeaningfully(a: MapBbox, b: MapBbox): boolean {
  if (Math.abs(a.zoom - b.zoom) >= 1) return true;
  return (
    Math.abs(a.swLat - b.swLat) > VIEWPORT_BBOX_EPSILON ||
    Math.abs(a.swLng - b.swLng) > VIEWPORT_BBOX_EPSILON ||
    Math.abs(a.neLat - b.neLat) > VIEWPORT_BBOX_EPSILON ||
    Math.abs(a.neLng - b.neLng) > VIEWPORT_BBOX_EPSILON
  );
}

export function bboxToSearchParams(b: MapBbox): URLSearchParams {
  const sp = new URLSearchParams();
  sp.set('sw_lat', String(b.swLat));
  sp.set('sw_lng', String(b.swLng));
  sp.set('ne_lat', String(b.neLat));
  sp.set('ne_lng', String(b.neLng));
  sp.set('zoom', String(Math.round(b.zoom)));
  return sp;
}

/** Client-side filter — prototype fallback when API unavailable */
export function filterByBbox<T extends { lat: number; lng: number }>(
  items: T[],
  bbox: MapBbox,
): T[] {
  return items.filter(
    (it) =>
      it.lat >= bbox.swLat &&
      it.lat <= bbox.neLat &&
      it.lng >= bbox.swLng &&
      it.lng <= bbox.neLng,
  );
}

export function createBboxDebouncer(delayMs: number) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastSig = '';

  return {
    schedule(bbox: MapBbox, fn: (bbox: MapBbox) => void) {
      const sig = bboxSignature(bbox);
      if (sig === lastSig) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        lastSig = sig;
        fn(bbox);
      }, delayMs);
    },
    cancel() {
      if (timer) clearTimeout(timer);
      timer = null;
    },
  };
}
