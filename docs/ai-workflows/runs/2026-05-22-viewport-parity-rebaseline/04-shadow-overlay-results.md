# Iteration 24.4 — Shadow Overlay Results

## Mode

VIEWPORT VALIDATION · 2026-05-22

---

## Server-side shadow metrics (full ID sets)

Moscow wide, no filters:

| Metric | Value |
|---|---:|
| overlapCount | **6,533** |
| missingInViewport | **0** |
| extraInViewport | **0** |
| parityPct | **100%** |
| legacyOnlyPct | 0% |
| viewportOnlyPct | 0% |

---

## Frontend shadow simulation (200-row cap)

What `useViewportListingsExperimental` + `MapDevOverlay` would show:

| Metric | Legacy (cap 200) | Viewport API |
|---|---:|---:|
| Total loaded | 200 | — |
| In bbox (client filter) | **125** | — |
| Viewport returned | — | 500 (limit) |
| Viewport visible | — | **6,533** |

Expected shadow overlay parity: **~125/6533 ≈ 1.9%** if comparing capped legacy page to full viewport — **misleading**.

Correct comparison (full catalog): **100%**.

---

## Shadow overlay interpretation

| Comparison mode | parityPct | Valid? |
|---|---:|---|
| Full ID set (server) | 100% | ✓ production metric |
| Legacy 200 cap vs viewport | ~1–2% | ✗ cap artifact |
| Legacy cap + staleLegacyCap warning | N/A | UI shows warning |

`viewport-shadow-parity.ts` already detects cap artifact via `staleLegacyCap` flag.

---

## Cluster parity

Not re-measured in Iter 24 (no frontend switch). With identical marker IDs and coords, cluster distribution should match when legacy source uses full viewport data.

**Blocker:** legacy map still loads paginated `/listings?per_page=200`.

---

## MapDevOverlay metrics (expected post-materialization)

When `map_debug=1` and viewport experimental enabled:

```
viewport: total=14888 visible=6533
shadow parity: low (cap artifact) OR 100% if legacy uses viewport total
filter warning: "cap artifact — filter parity OK"
```

No screenshots captured — server measurements authoritative for Iter 24.

---

## Verdict

**Shadow overlay: PASS (server)** / **HOLD (frontend cap)** — API parity perfect; frontend shadow misleading until cap removed or viewport becomes primary source.
