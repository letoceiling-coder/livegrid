/**
 * Production map viewport — enabled by default (Iter 64).
 * Set VITE_MAP_VIEWPORT=0 to fall back to legacy global 200-row fetch for markers.
 */
export function isMapViewportProductionEnabled(): boolean {
  if (import.meta.env.VITE_MAP_VIEWPORT === '0') return false;
  return true;
}

/**
 * Opt-in viewport/bbox experimental mode (DEV shadow parity).
 * NEVER enabled in production builds.
 */
export function isViewportExperimentalEnabled(): boolean {
  if (!import.meta.env.DEV) return false;
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  if (params.get('viewport_debug') === '1') return true;
  try {
    return window.localStorage.getItem('lg_viewport_experimental') === '1';
  } catch {
    return false;
  }
}

/** DEV console helper — not called automatically */
export function enableViewportExperimentalLocal(): void {
  if (!import.meta.env.DEV) return;
  window.localStorage.setItem('lg_viewport_experimental', '1');
}

export function disableViewportExperimentalLocal(): void {
  if (!import.meta.env.DEV) return;
  window.localStorage.removeItem('lg_viewport_experimental');
}

/**
 * DEV Stage 1 — viewport API as primary map marker source (Iter 25).
 * Requires explicit `?viewport_listings=1` — no localStorage opt-in.
 * NEVER enabled in production builds.
 */
export function isViewportListingsSourceEnabled(): boolean {
  if (!import.meta.env.DEV) return false;
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('viewport_listings') === '1';
}

/** Shadow parity / bbox fetch — experimental debug OR listings source activation */
export function isViewportListingsTrackingEnabled(): boolean {
  return isViewportExperimentalEnabled() || isViewportListingsSourceEnabled();
}

/** DEV-only stress modes for fallback validation (Iter 9) */
export type ViewportStressMode = 'none' | '404' | 'timeout';

export function getViewportStressMode(): ViewportStressMode {
  if (!import.meta.env.DEV) return 'none';
  const v = new URLSearchParams(window.location.search).get('viewport_stress');
  if (v === '404' || v === 'timeout') return v;
  return 'none';
}

/**
 * DEV-only optional shadow cluster render (Iter 11).
 * Requires viewport experimental mode + explicit opt-in.
 */
export function isViewportShadowRenderEnabled(): boolean {
  if (!import.meta.env.DEV) return false;
  if (!isViewportExperimentalEnabled()) return false;
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  if (params.get('viewport_shadow_render') === '1') return true;
  try {
    return window.localStorage.getItem('lg_viewport_shadow_render') === '1';
  } catch {
    return false;
  }
}

export function enableViewportShadowRenderLocal(): void {
  if (!import.meta.env.DEV) return;
  window.localStorage.setItem('lg_viewport_shadow_render', '1');
}

export function disableViewportShadowRenderLocal(): void {
  if (!import.meta.env.DEV) return;
  window.localStorage.removeItem('lg_viewport_shadow_render');
}
