# Iteration 24.6 — UX Parity Audit

## Mode

VIEWPORT VALIDATION · audit only · 2026-05-22

---

## Marker count expectations

| View | Current legacy | Viewport-capable |
|---|---:|---:|
| Moscow wide | ≤200 loaded, ~125 in bbox | 6,533 visible |
| Center tight | ≤200 loaded, 0–59 in bbox | 59 visible |
| Geo radius 5km | ≤200 loaded | 421 visible |

**Blocker:** Users see sparse map with legacy cap despite 6,533 available markers.

---

## Sidebar expectations

Legacy sidebar driven by catalog query (paginated). Viewport does not replace sidebar in current architecture — **no conflict**.

When viewport enabled: sidebar should remain catalog-sourced; map layer viewport-sourced.

---

## Loading behavior

| State | Legacy | Viewport experimental |
|---|---|---|
| Initial | 200 listings fetch | Shadow fetch on bbox change |
| Bbox pan | Client re-filter 200 | New viewport fetch |
| Error | fallbackCoords possible | client-filter-fallback |

---

## Empty states

| Scenario | Legacy | Viewport |
|---|---|---|
| Pre-materialization MSK | Empty map (0 coords) | total=0 |
| Post-materialization | Partial (cap) | Full bbox coverage |
| empty_world bbox | 0 | 0 ✓ |

---

## Popup / selection sync

Not changed Iter 24. Selection via cluster layer unchanged. Viewport markers use same id space — selection sync should work when enabled.

---

## Mobile behavior

Not tested Iter 24. No mobile-specific changes. **HOLD** pending device testing.

---

## fallbackCoords

Still present in `RedesignMap.tsx` and `RedesignCatalog.tsx`. Required for non-materialized regions. **Must not remove** until all regions materialized.

---

## UX blockers before rollout

| Blocker | Severity | Mitigation |
|---|---|---|
| 200-row legacy cap | **High** | Use viewport as map source |
| Shadow parity misleading | Medium | Use server parity metrics |
| Belgorod not materialized | Low | fallbackCoords still needed |
| No mobile validation | Medium | Device test pass |

---

## Verdict

**UX parity: HOLD** — API ready; frontend map layer still capped and disabled.
