# Iteration 19.6 — Risk Analysis

## Mode

DATA PLATFORM IMPLEMENTATION · shadow phase risks · 2026-05-22

---

## Mitigated by Iter 19

| Risk | Mitigation |
|---|---|
| SQL/DTO drift before schema | Single resolver module + parity helpers |
| Non-deterministic geo logic | Pure sync; 24 unit tests |
| Accidental DB writes | No Prisma in resolver; materialize stub only |
| UI_ONLY in resolver | Not in enum; never returned |
| Silent EXACT promotion | Legacy → SHADOW_UNCLASSIFIED, not EXACT |
| Inferred EXACT from dataSource | Not used in resolution |

---

## Residual risks (acceptable in shadow)

| Risk | Notes |
|---|---|
| Resolver not yet wired to viewport | By design — Iter 20+ |
| Legacy 56 rows stay unclassified in DB | Shadow suggests; no write |
| Parent coords passed incorrectly by caller | Caller responsibility; documented |
| UNKNOWN suggestions need human review | materialize stub flags `requires_review` |

---

## Risks if prematurely wired

| Action | Consequence |
|---|---|
| Wire resolver to viewport without schema | DTO lacks geoQuality — truth leak returns |
| Run materialize stub as real write | Blocked — stub only, but misuse risk in Iter 20 |
| Skip shadow phase → direct backfill | Partial corruption (Iter 18 R5) |

---

## Guards in place

```typescript
// materializeListingGeo — always returns stub, never touches Prisma
action: 'STUB_WOULD_WRITE' | 'STUB_BLOCKED' | 'NOOP'

// EXACT downgrade
if (listing.geoQuality === EXACT && resolved !== EXACT && !allowDowngrade)
  → STUB_BLOCKED
```

---

## Debug logging risk

`logGeoResolverDebug()` gated:

```
NODE_ENV !== 'production' && GEO_RESOLVER_DEBUG === '1'
```

No production log spam.

---

## Next iteration risks to address

| Iter | Risk |
|---|---|
| 20 | Schema migration drift (listing lat/lng) |
| 21 | Materialization partial backfill |
| 22 | Resolver/SQL parity failure at scale |

---

## Safety checklist (Iter 19)

- [x] No schema changes
- [x] No Prisma migration
- [x] No DB updates
- [x] No viewport rollout
- [x] No feed import changes
- [x] No production deployment
- [x] tsc pass
- [x] 24/24 tests pass
