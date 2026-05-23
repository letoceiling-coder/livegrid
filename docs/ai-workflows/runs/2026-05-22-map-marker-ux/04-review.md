# Iteration 2 — Code Review

## Mode

`@gstack/review` · `@gstack/cso`

---

## Review Checklist

| Item | Result | Notes |
|---|---|---|
| Scope adherence | ✓ PASS | Frontend map components + shared lib only |
| No backend changes | ✓ PASS | — |
| No React Query changes | ✓ PASS | RedesignMap untouched in Iteration 2 |
| Cluster preserved | ✓ PASS | Same Clusterer API |
| XSS in marker HTML | ✓ PASS | `escapeMarkerHtml()` on labels |
| TypeScript | ✓ PASS | tsc exit 0 |
| Active state visible | ✓ PASS | Darker blue + larger dot |
| Price fallback | ✓ PASS | Uses `MIN_REASONABLE_PRICE_RUB` |

---

## Code Quality

### Positive

1. **DRY** — shared `map-marker-layout.ts` eliminates duplicate HTML between MapSearch and ListingsMapSearch
2. **Fewer rebuilds** — `markerMode` bucketing vs raw `zoom` reduces clusterer destroy/recreate cycles
3. **TZ-aligned pricing** — single `formatMarkerPriceFromRub` source of truth
4. **Accessible** — `aria-label="Закрыть"` on popup dismiss

### Observations (non-blocking)

1. **HTML templates in strings** — pre-existing Yandex pattern; acceptable for this iteration
2. **Active marker still triggers rebuild** — `activeSlug` in deps; required for visual update, same as before
3. **Listings cluster preset differs** — pre-existing (`blueCircleClusterIcons` vs `invertedBlueClusterIcons`)

---

## Contract Preservation

| Prop | MapSearch | ListingsMapSearch |
|---|---|---|
| Data input | `complexes[]` | `listings[]` |
| Selection | `activeSlug` / `onSelect(slug)` | `activeId` / `onSelect(id)` |
| Region | `regionCenter` | `regionCenter` |
| Layout | `compact`, `height` | same |

No breaking changes to parent `RedesignMap`.

---

## Security Review

- Complex/listing names escaped before HTML injection
- Price labels numeric-only formatting — no user input
- Popup links use existing slug/id routes

---

## Review Verdict

**APPROVED** — minimal, focused, production-safe marker UX iteration.
