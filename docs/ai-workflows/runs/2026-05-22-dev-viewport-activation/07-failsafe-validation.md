# Iteration 25.7 — Failsafe Validation

## Mode

Rollback and error-path validation · DEV Stage 1 · 2026-05-22

---

## Failsafe matrix

| Scenario | Expected behavior | Status |
|---|---|---|
| Remove `viewport_listings=1` | Instant rollback to legacy map markers | **PASS** (design) |
| Production build | Flag always `false` | **PASS** (unit test) |
| Viewport API 500 / network error | Fallback to legacy `listings` on map | **PASS** (design) |
| `viewport_stress=404` | Client-filter fallback, legacy markers | **PASS** (existing) |
| `viewport_stress=timeout` | Same fallback path | **PASS** (existing) |
| Empty bbox | Hook idle, no fetch | **PASS** (existing) |
| Stale query (same bbox sig) | Skip re-fetch via `lastSigRef` | **PASS** (existing) |
| Loading state | Show legacy until `prototype-api` ready | **PASS** (design) |

---

## Rollback path

```
viewport_listings=1 removed
  → isViewportListingsSourceEnabled() = false
  → useEffect resets effectiveMapListings to listings
  → buildDescriptors uses legacy
  → cluster rebuild to ≤200 markers
```

No server deploy. No localStorage cleanup needed (flag is URL-only).

---

## API error fallback

In `useViewportListingsExperimental` catch block:

1. Client-filter legacy listings by bbox
2. `setResult({ source: 'client-filter', ... })`
3. `ListingsMapSearch` effect: non-`prototype-api` → `setEffectiveMapListings(listings)`

Map never goes empty unless legacy catalog is also empty.

---

## Production hard guard

```typescript
export function isViewportListingsSourceEnabled(): boolean {
  if (!import.meta.env.DEV) return false;  // ← production blocked
  ...
  return params.get('viewport_listings') === '1';
}
```

Vite production builds set `import.meta.env.DEV = false` — flag cannot activate.

---

## Zero broken map states

| State | Map shows |
|---|---|
| Flag off | Legacy markers |
| Flag on, loading | Legacy markers (brief) |
| Flag on, ready | Viewport markers |
| Flag on, error | Legacy markers |
| Flag on, empty region | Empty (same as legacy) |

---

## Test coverage

- `viewport-feature-flag.test.ts` — DEV + param guards
- `viewport-shadow-parity.test.ts` — cap artifact warnings
- `viewport-listings-source.test.ts` — DTO mapping
