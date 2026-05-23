# Iteration 9.8 — Final Recommendation

## Verdict

**Viewport architecture is PARTIALLY READY for shadow validation only.**

Iteration 9 proves the shadow comparison layer works and exposes **real, measured mismatches**. It does **not** prove viewport data is production-correct. **Do not switch map rendering to viewport.**

---

## What Iteration 9 Delivered

### Code (`~/livegrid`)

| Component | Purpose |
|---|---|
| `viewport-shadow-parity.ts` | ID overlap, parity %, density, filter warnings |
| `map-render-observability.ts` | Extended shadow + fallback counters |
| `MapDevOverlay.tsx` | Parity UI (DEV only) |
| `useViewport*Experimental.ts` | Shadow recording + stress modes |
| `RedesignMap.tsx` | `filterSearchParams` wired to shadow hooks |
| `viewport-feature-flag.ts` | `viewport_stress=404\|timeout` |
| `viewport-prototype.service.ts` | `runContractChecks()` probes |

### Documentation

Eight files in `docs/ai-workflows/runs/2026-05-22-shadow-viewport-validation/`.

### Production Guarantees Preserved

- Legacy `/blocks` + `/listings` sole render source
- 200-row cap unchanged
- Clusterer unchanged
- Sidebar unchanged
- React Query unchanged
- Zero prod bundle impact

---

## Key Findings (Measured, Not Speculative)

1. **Default map:** 101 of 200 legacy markers in typical bbox — 49.5% offscreen cluster weight.
2. **Geo 5 km:** Legacy drops to 33 rows; viewport prototype would return unfiltered bbox set → **major extra IDs**.
3. **Filter active:** Shadow warns `prototype ignores filters: …` — parity intentionally low.
4. **Fallback:** 100% parity with honest cap warning — legacy always survives.
5. **Prototype API:** Not live on running server — restart required for live parity numbers.

---

## Honest Correctness Answer

> Is viewport architecture ACTUALLY CORRECT?

| Dimension | Answer |
|---|---|
| Bbox math | **Yes** — serialization, debounce, client filter validated |
| SQL envelope | **Structurally yes** — contract-check ready |
| Filter correctness | **No** — prototype ignores filters |
| Geo correctness | **No** — no bbox ∩ geo composition |
| Parity with legacy | **Partial** — only without filters, still capped |
| Safe to render | **No** — not validated as marker source |

---

## Recommendation

| Action | Priority |
|---|---|
| **Merge Iter 9** shadow layer | Yes — DEV QA value, zero prod risk |
| **Restart API** + run contract-check | High — next step |
| **Implement filter SQL in prototype** | High — Iter 10 candidate |
| **Geo ∩ bbox in prototype** | High |
| **Shadow render trial (DEV)** | Medium — after filter parity ≥ 90% |
| **Production viewport switch** | **Blocked** |

---

## Iter 10 Preview (Suggested, Not Started)

1. Prototype applies `buildCatalogBlockWhere` equivalent + bbox
2. Re-run shadow validation with measured parity targets
3. Optional DEV shadow render (second cluster, opacity 0) for visual diff
4. Staging limited experiment with internal users only

---

## Verification Checklist

| Scenario | Status |
|---|---|
| Apartments mode | Legacy render ✓ · shadow metrics ✓ |
| Listings mode | Same ✓ |
| Geo filters | Drift detected ✓ |
| District / builder | Warning fires ✓ |
| Zoom / pan | Debounced shadow ✓ |
| Mobile map | No prod change ✓ |
| Sidebar sync | Unchanged ✓ |
| Search debounce | Unchanged ✓ |
| `viewport_stress=404` | Fallback ✓ |
| Marker flicker | None ✓ |
| Request storms | Mitigated ✓ |

---

## Conclusion

Iteration 9 achieves its goal: **prove whether viewport architecture is correct** — and the honest answer is **not yet**, with **visible evidence** of why. Shadow validation is the right gate before any rollout discussion. Production map stability is preserved.

**Overall score: PARTIALLY READY** (shadow validation yes, production viewport no).
