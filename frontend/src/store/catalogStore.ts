/**
 * catalogStore.ts — Single source of truth for catalog + map state.
 *
 * Built on React 18's useSyncExternalStore — zero extra dependencies.
 *
 * Shared between:
 *   /catalog  (RedesignCatalog)
 *   /map      (RedesignMap)
 *
 * Guarantees:
 *   - filters applied on /map are carried over to /catalog and vice-versa.
 *   - viewport updated by map move is immediately visible to list hooks.
 *   - a single notification fan-out to all subscribed components.
 */

import { useSyncExternalStore } from 'react';
import { defaultFilters, type CatalogFilters, type Viewport } from '@/redesign/data/types';

// ─── Public types ──────────────────────────────────────────────────────────

export type ViewMode = 'grid' | 'list' | 'map';

export interface CatalogState {
  /** Active filter set. Changing this re-fetches both list and map. */
  filters: CatalogFilters;
  /**
   * Current map viewport.
   * null  = user has never opened the map; list queries have no bounds.
   * set   = user has moved the map; list queries include bounds.
   */
  viewport: Viewport | null;
  /** Active view in /catalog (grid | list | map). */
  viewMode: ViewMode;
  /**
   * ID of the complex that is currently highlighted across map + list.
   * Set on marker click (map → list) or card hover (list → map).
   * null when nothing is active.
   */
  activeComplexId: string | null;
}

// ─── Viewport normalisation ────────────────────────────────────────────────

/**
 * Map zoom level → decimal-place precision for viewport rounding.
 *
 * | Zoom  | Precision | Grid cell size* | Use case              |
 * |-------|-----------|-----------------|----------------------|
 * | ≤ 10  |     1 dp  |  ~11 km         | City / region overview |
 * | ≤ 12  |     2 dp  |  ~1.1 km        | District level         |
 * | ≤ 14  |     3 dp  |  ~111 m         | Neighbourhood level    |
 * | > 14  |     4 dp  |  ~11 m          | Street / building level|
 *
 * *At ~56° N (Moscow). 1 dp ≈ 111 km × cos(lat) in longitude.
 *
 * Higher zoom = finer grid = more unique cache keys, which is correct because
 * at street level a 100 m pan genuinely reveals different buildings.
 * At city level a 1 km pan is noise — we want cache hits, not 15 new requests.
 */
export function getPrecision(zoom: number): number {
  if (zoom <= 10) return 1;
  if (zoom <= 12) return 2;
  if (zoom <= 14) return 3;
  return 4;
}

/**
 * Round bounds to `precision` decimal places and embed `zoom` and
 * `interactionId` into the returned object.
 *
 * Neither zoom nor interactionId is sent to the API — buildParams only
 * reads lat_min / lat_max / lng_min / lng_max. Both fields exist solely
 * to produce distinct React Query cache keys:
 *
 *   zoom          → different precision buckets never share a cache entry
 *   interactionId → each completed user action gets a fresh fetch, even
 *                   if bounds and zoom are identical (e.g. cluster expand
 *                   that happens to return to the same region)
 */
export function normalizeViewport(
  vp: Viewport,
  precision: number,
  zoom: number,
  interactionId: number,
): Viewport {
  return {
    lat_min: Number(vp.lat_min.toFixed(precision)),
    lat_max: Number(vp.lat_max.toFixed(precision)),
    lng_min: Number(vp.lng_min.toFixed(precision)),
    lng_max: Number(vp.lng_max.toFixed(precision)),
    zoom,
    interactionId,
  };
}

/**
 * Shallow equality for normalised Viewport objects.
 * All six fields are compared so that a change in any dimension —
 * bounds, zoom level, or interaction counter — triggers a store emit.
 */
function viewportEqual(a: Viewport | null, b: Viewport): boolean {
  return (
    a !== null &&
    a.lat_min       === b.lat_min &&
    a.lat_max       === b.lat_max &&
    a.lng_min       === b.lng_min &&
    a.lng_max       === b.lng_max &&
    a.zoom          === b.zoom    &&
    a.interactionId === b.interactionId
  );
}

// ─── Internal store ────────────────────────────────────────────────────────

const initialState: CatalogState = {
  filters: { ...defaultFilters },
  viewport: null,
  viewMode: 'grid',
  activeComplexId: null,
};

let _state: CatalogState = { ...initialState, filters: { ...defaultFilters } };
const _listeners = new Set<() => void>();

function _emit() {
  _listeners.forEach(l => l());
}

function _getSnapshot(): CatalogState {
  return _state;
}

function _subscribe(listener: () => void): () => void {
  _listeners.add(listener);
  return () => { _listeners.delete(listener); };
}

// ─── Actions (stable references, safe to use in deps arrays) ──────────────

export const catalogActions = {
  /**
   * Replace the full filter set. Triggers re-fetch in both
   * useBlocks and useMapObjects.
   */
  setFilters(filters: CatalogFilters): void {
    _state = { ..._state, filters };
    _emit();
  },

  /**
   * Update the map viewport.
   *
   * Expects a pre-normalised Viewport produced by normalizeViewport() in
   * MapSearch (zoom-aware rounding already applied). Only emits when the
   * rounded values actually differ from the current state, preventing
   * spurious re-renders for sub-grid-cell movements.
   */
  setViewport(viewport: Viewport): void {
    if (viewportEqual(_state.viewport, viewport)) return;
    _state = { ..._state, viewport };
    _emit();
  },

  /** Switch between grid / list / map view in the catalog. */
  setViewMode(viewMode: ViewMode): void {
    _state = { ..._state, viewMode };
    _emit();
  },

  /** Reset filters to defaults. Viewport and viewMode are preserved. */
  resetFilters(): void {
    _state = { ..._state, filters: { ...defaultFilters } };
    _emit();
  },

  /**
   * Mark a complex as active (highlighted).
   * Called on marker click (map → list) and card hover (list → map).
   * No-op if the id is already active to prevent unnecessary re-renders.
   */
  setActiveComplex(id: string): void {
    if (_state.activeComplexId === id) return;
    _state = { ..._state, activeComplexId: id };
    _emit();
  },

  /**
   * Clear the active complex.
   * Called on card mouse-leave and whenever the context is reset.
   */
  clearActiveComplex(): void {
    if (_state.activeComplexId === null) return;
    _state = { ..._state, activeComplexId: null };
    _emit();
  },
} as const;

// ─── Hook ──────────────────────────────────────────────────────────────────

/**
 * useCatalogStore()
 *
 * Returns the current store snapshot plus all actions.
 * Actions are module-level constants — safe to destructure and use directly.
 *
 * @example
 *   const { filters, viewport, viewMode, setFilters, setViewport } = useCatalogStore();
 */
export function useCatalogStore(): CatalogState & typeof catalogActions {
  const snap = useSyncExternalStore(_subscribe, _getSnapshot);
  return { ...snap, ...catalogActions };
}
