# Iteration 19.4 — Determinism Tests

## Mode

DATA PLATFORM IMPLEMENTATION · test evidence · 2026-05-22

---

## Test runner

```bash
cd ~/livegrid/apps/api && npx tsx --test src/modules/geo/geo-resolver.spec.ts
```

Node built-in test runner — no new devDependencies.

---

## Results (2026-05-22)

```
# tests 24
# suites 10
# pass 24
# fail 0
```

---

## Coverage matrix

| Suite | Cases |
|---|---|
| WGS84 validation | NaN, out-of-range lat/lng, 0,0, parseCoord |
| Stored EXACT | MANUAL_EXACT, FEED_EXACT, invalid combo |
| Building inherit | present, beats block |
| Block inherit | block only |
| Missing | no parents, invalid parents |
| Legacy shadow | unclassified, MANUAL_EXACT suggest, UNKNOWN, no inherit fallthrough |
| EXACT precedence | stored beats building |
| Determinism | same input ×2, service vs pure export |
| Materialize stub | STUB_WOULD_WRITE, NOOP already materialized, legacy review |
| Transition safety | EXACT not downgraded |

---

## Determinism guarantees

- No `Date.now()`, no randomness
- No DB fixtures
- No async
- `resolvedGeoEquals()` via `serializeResolvedGeo()` JSON comparison
- Coords rounded to 6 dp in serialization

---

## Typecheck

```bash
pnpm --filter api exec tsc --noEmit
# exit 0
```

---

## Future CI hook (not wired)

Add to API package.json when test script adopted:

```json
"test:geo-resolver": "tsx --test src/modules/geo/geo-resolver.spec.ts"
```

Run on PRs touching `apps/api/src/modules/geo/**`.
