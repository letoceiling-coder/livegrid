# Iteration 8.5 — Render Comparison Metrics

## Mode

Measurable evidence · legacy vs experimental · uses Iter 7 observability

**Overlay:** `MapDevOverlay.tsx` (extended)  
**Store:** `map-render-observability.ts`

---

## Enable

```
http://localhost:5173/map?map_debug=1&viewport_debug=1&region_id=1
```

Requires `import.meta.env.DEV`. Production builds: all `record*` calls no-op.

---

## Overlay Fields

### Iter 7 (legacy path — unchanged)

| Field | Meaning |
|---|---|
| `layer` | `blocks` \| `listings` |
| `mode` | `dot` \| `price` \| `name` |
| `markers` | Count rendered by cluster layer |
| `cluster rebuilds` | Full clusterer recreations |
| `selection updates` | iconLayout swaps (post-Iter-7) |
| `mode transitions` | Zoom bucket changes |
| `last rebuild` | ms of last cluster rebuild |
| `reason` | Rebuild trigger signature |
| `last selection` | ms of last selection update |

### Iter 8 (viewport comparison — new)

| Field | Meaning |
|---|---|
| `legacy markers` | Count from legacy catalog fetch (200 cap) |
| `viewport markers` | Count from prototype API or client-filter fallback |
| `viewport fetch` | Last fetch duration (ms) |
| `payload` | Last prototype response JSON estimate (KB) |
| `source` | `prototype-api` \| `client-filter-fallback` |
| `requests` | Cumulative viewport fetches this session |
| `bbox` | Last `bboxSignature` |

---

## Comparison Matrix

| Dimension | Legacy path | Experimental viewport path |
|---|---|---|
| **Trigger** | Filter / region / URL change | Bbox change (debounced pan/zoom) |
| **API** | `/blocks` or `/listings` | `/_prototype/*/viewport` |
| **Marker feed** | `useMapClusterLayer` | Metrics only (not rendered in Iter 8) |
| **Typical payload** | 878 KB blocks / 362 KB listings | Slim DTO — see §Payload |
| **Marker count** | min(200, total) | bbox-limited (≤300 prototype cap) |
| **Cluster rebuilds** | On data/zoom change | **Zero** (experimental doesn't touch clusterer) |
| **Pan/zoom API calls** | 0 | 1 per settled bbox (when flag on) |

---

## Payload Comparison (Measured)

### Same 200 rows — full vs slim JSON (derived from live API)

| Path | Uncompressed JSON |
|---|---|
| Legacy `/blocks` 200 rows | 2 060 605 B |
| Slim viewport DTO 200 rows | 78 096 B (**−96.2%**) |
| Legacy `/listings` 200 rows | 467 544 B |
| Slim viewport DTO 200 rows | 18 722 B (**−96.0%**) |

### Wire download (legacy only — measured)

| Endpoint | Wire bytes |
|---|---|
| `/blocks?…&per_page=200` | 900 142 |
| `/listings?…&per_page=200` | 370 342 |

Prototype wire sizes require API restart — not measured live (404 before module load).

---

## Marker Count Comparison (Conceptual)

| Viewport | Legacy loaded | Experimental (expected) |
|---|---|---|
| Full region zoom 11 | 200 (cap) | ~80–150 (bbox filtered, no cap artifact) |
| Zoom 14 small area | 200 (same 200 regardless) | ~10–40 |
| Filtered geo radius 5 km | ≤200 in radius | bbox ∩ geo subset |

**Client-filter fallback ceiling:** Experimental count ≤ legacy loaded count (200) — cannot exceed legacy dataset.

---

## Render Timing (Iter 7 Baseline)

Post-Iter-7 healthy patterns (from scalability prep audit):

| Action | Cluster rebuilds | Selection updates |
|---|---|---|
| Initial load | 1 | 0 |
| 20 sidebar clicks | 0 | 20 |
| Zoom 3 buckets | 2 | 0 |

**Iter 8 requirement:** Enabling viewport experimental must **not increase** legacy rebuild counts.

Experimental hook runs outside cluster layer — verified by architecture (no props to `useMapClusterLayer`).

---

## Recording API

```typescript
recordViewportComparison({
  legacyMarkerCount,
  viewportMarkerCount,
  fetchMs,
  payloadBytes,
  source,
  bboxSignature,
});

setViewportExperimentalEnabled(enabled);
```

Called from experimental hooks on each successful or fallback fetch.

---

## Manual Test Protocol

1. Open `/map?map_debug=1&viewport_debug=1&region_id=1`
2. Note initial: `markers: 200`, `legacy markers: 200`, `viewport requests: 0`
3. Wait for map ready → viewport fetch fires → `viewport requests: 1`
4. Compare `viewport markers` vs `legacy markers`
5. Pan map slowly → requests increment only after 450 ms settle; not on every frame
6. Click sidebar items → `selection updates` increment, `cluster rebuilds` unchanged
7. Stop API / use 404 → `source: client-filter-fallback`, map still shows 200 legacy markers
8. Switch to listings tab → layer resets, viewport stats continue on listings hook
9. Mobile: open map in narrow viewport — same behavior (overlay may overlap; DEV only)

---

## Evidence Gaps (Honest)

| Gap | Status |
|---|---|
| Prototype API live timing | Blocked — API restart needed |
| Viewport markers rendered on map | Not in Iter 8 — comparison metrics only |
| gzip slim DTO wire size | Extrapolated from uncompressed slim JSON |
| Production zoom-14 bbox counts | Requires prototype API + DB query |

These gaps are intentional — Iter 8 is RFC + instrumentation, not production viewport rendering.

---

## Future: Export / Canvas Dashboard

Iter 7 note: counters can feed Canvas dashboard. Iter 8 adds viewport fields to same store — ready for export button in future DEV tooling.
