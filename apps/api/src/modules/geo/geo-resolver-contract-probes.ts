/**
 * Iter 20 — in-memory geo resolver contract probes (no DB writes).
 */
import { GeoSource, GeoQuality, GeoEntityKind, ResolutionPath } from './geo-resolver.types';
import { resolveListingGeo } from './geo-resolver.service';
import { serializeResolvedGeo, resolvedGeoEquals } from './geo-resolver-sql-parity';
import type { ListingGeoInput } from './geo-resolver.types';

export type GeoContractProbeResult = { name: string; ok: boolean; detail: string };

const BLOCK_PARENT = { id: 100, latitude: 55.751, longitude: 37.618 };
const BUILDING_PARENT = { id: 200, latitude: 55.752, longitude: 37.619 };

export function runGeoResolverContractProbes(): GeoContractProbeResult[] {
  return [
    probeBuildingPrecedence(),
    probeInvalidExactCombo(),
    probeNoUiOnlyInSourceEnum(),
    probeDeterministicReplay(),
    probeShadowLegacyClassification(),
  ];
}

function probeBuildingPrecedence(): GeoContractProbeResult {
  const name = 'geo_resolver_building_precedence';
  try {
    const listing: ListingGeoInput = {
      id: 1,
      lat: null,
      lng: null,
      geoSource: null,
      geoQuality: null,
      geoEntityId: null,
      geoEntityKind: null,
      geoResolvedAt: null,
      blockId: 100,
      buildingId: 200,
      dataSource: 'FEED',
    };
    const r = resolveListingGeo(listing, {
      parents: { block: BLOCK_PARENT, building: BUILDING_PARENT },
    });
    if (r.status !== 'RESOLVED') {
      return { name, ok: false, detail: `expected RESOLVED got ${r.status}` };
    }
    if (r.geoSource !== GeoSource.BUILDING_INHERIT) {
      return { name, ok: false, detail: `expected BUILDING_INHERIT got ${r.geoSource}` };
    }
    if (r.geoEntityKind !== GeoEntityKind.BUILDING || r.geoEntityId !== 200) {
      return { name, ok: false, detail: 'building entity lineage mismatch' };
    }
    return { name, ok: true, detail: `source=${r.geoSource} entityId=${r.geoEntityId}` };
  } catch (e) {
    return { name, ok: false, detail: e instanceof Error ? e.message : String(e) };
  }
}

function probeInvalidExactCombo(): GeoContractProbeResult {
  const name = 'geo_resolver_invalid_exact_combo';
  try {
    const r = resolveListingGeo({
      id: 2,
      lat: 55.7,
      lng: 37.6,
      geoSource: GeoSource.BLOCK_INHERIT,
      geoQuality: GeoQuality.EXACT,
      geoEntityId: null,
      geoEntityKind: null,
      geoResolvedAt: null,
      blockId: null,
      buildingId: null,
      dataSource: 'FEED',
    });
    if (r.status !== 'INVALID') {
      return { name, ok: false, detail: `expected INVALID got ${r.status}` };
    }
    if (r.resolutionPath !== ResolutionPath.STORED_COMBO_INVALID) {
      return { name, ok: false, detail: `path=${r.resolutionPath}` };
    }
    return { name, ok: true, detail: 'BLOCK_INHERIT+EXACT rejected' };
  } catch (e) {
    return { name, ok: false, detail: e instanceof Error ? e.message : String(e) };
  }
}

function probeNoUiOnlyInSourceEnum(): GeoContractProbeResult {
  const name = 'geo_resolver_no_ui_only';
  try {
    const values = Object.values(GeoSource) as string[];
    if (values.includes('UI_ONLY')) {
      return { name, ok: false, detail: 'UI_ONLY present in GeoSource' };
    }
    const forbidden = ['UI_ONLY', 'APPROXIMATE_UI_ONLY'];
    for (const f of forbidden) {
      if (values.includes(f)) {
        return { name, ok: false, detail: `${f} present in GeoSource` };
      }
    }
    return { name, ok: true, detail: `sources=${values.length} no UI_ONLY` };
  } catch (e) {
    return { name, ok: false, detail: e instanceof Error ? e.message : String(e) };
  }
}

function probeDeterministicReplay(): GeoContractProbeResult {
  const name = 'geo_resolver_deterministic_replay';
  try {
    const listing: ListingGeoInput = {
      id: 3,
      lat: null,
      lng: null,
      geoSource: null,
      geoQuality: null,
      geoEntityId: null,
      geoEntityKind: null,
      geoResolvedAt: null,
      blockId: 100,
      buildingId: null,
      dataSource: 'FEED',
    };
    const opts = { parents: { block: BLOCK_PARENT } };
    const a = resolveListingGeo(listing, opts);
    const b = resolveListingGeo(listing, opts);
    if (!resolvedGeoEquals(a, b)) {
      return { name, ok: false, detail: 'resolvedGeoEquals failed' };
    }
    const sa = serializeResolvedGeo(a);
    const sb = serializeResolvedGeo(b);
    if (JSON.stringify(sa) !== JSON.stringify(sb)) {
      return { name, ok: false, detail: 'serialize mismatch' };
    }
    return { name, ok: true, detail: JSON.stringify(sa).slice(0, 120) };
  } catch (e) {
    return { name, ok: false, detail: e instanceof Error ? e.message : String(e) };
  }
}

function probeShadowLegacyClassification(): GeoContractProbeResult {
  const name = 'geo_resolver_shadow_legacy';
  try {
    const r = resolveListingGeo(
      {
        id: 4,
        lat: 55.751,
        lng: 37.618,
        geoSource: null,
        geoQuality: null,
        geoEntityId: null,
        geoEntityKind: null,
        geoResolvedAt: null,
        blockId: 100,
        buildingId: null,
        dataSource: 'MANUAL',
      },
      { mode: 'shadow', parents: { block: BLOCK_PARENT } },
    );
    if (r.status !== 'SHADOW_UNCLASSIFIED') {
      return { name, ok: false, detail: `expected SHADOW_UNCLASSIFIED got ${r.status}` };
    }
    if (r.suggestedSource !== GeoSource.BLOCK_INHERIT) {
      return { name, ok: false, detail: `suggestedSource=${r.suggestedSource}` };
    }
    return {
      name,
      ok: true,
      detail: `suggested=${r.suggestedSource}/${r.suggestedQuality}`,
    };
  } catch (e) {
    return { name, ok: false, detail: e instanceof Error ? e.message : String(e) };
  }
}
