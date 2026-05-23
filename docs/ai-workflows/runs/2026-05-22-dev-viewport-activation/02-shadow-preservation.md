# Iteration 25.2 — Shadow Preservation

## Mode

DEV shadow parity preserved during viewport primary activation · 2026-05-22

---

## Design

When `viewport_listings=1` is active:

| Role | Data source |
|---|---|
| **Primary map markers** | Viewport API (`/_prototype/listings/viewport`) |
| **Shadow baseline** | Legacy 200-row catalog (`listings` prop) |
| **Sidebar** | Legacy catalog (unchanged) |

Shadow parity logic in `computeShadowParity()` is unchanged — it compares legacy-in-bbox IDs vs viewport IDs.

---

## Overlay warnings

`MapDevOverlay` now surfaces:

1. **`viewport_listings: PRIMARY MAP SOURCE`** — confirms Stage 1 activation
2. **`shadowFilterWarning`** — e.g. `6408 viewport IDs beyond legacy page (cap artifact — filter parity OK)`
3. **`legacy cap artifact (200-row sidebar/catalog)`** — when `shadowStaleLegacyCap=true`

The cap artifact warning fires when:

- Legacy total ≥ 200 (page cap hit)
- Viewport has extra IDs beyond legacy in-bbox set
- No missing IDs (filter parity OK)

This matches Iter 24 finding: **only gap is 200-row frontend cap**, not API semantics.

---

## Shadow render layer

Optional `viewport_shadow_render=1` still requires `viewport_debug=1` (unchanged).

When primary source is viewport, shadow render overlays viewport points — useful for debug but redundant in Stage 1. Recommend `map_debug=1` without shadow render for cleaner visual.

---

## Metrics recorded

| Field | Meaning |
|---|---|
| `legacyMarkerCount` | 200 (catalog page) |
| `viewportMarkerCount` | ~6,533 Moscow wide bbox |
| `shadowOverlap` | ~125 (legacy in bbox ∩ viewport) |
| `shadowExtra` | ~6,408 (viewport-only in bbox) |
| `shadowStaleLegacyCap` | `true` when cap artifact detected |
| `shadowParityPct` | Low % expected — cap artifact, not API bug |

---

## Unit tests

`viewport-shadow-parity.test.ts` validates cap artifact detection with synthetic 200/6533 ID sets.
