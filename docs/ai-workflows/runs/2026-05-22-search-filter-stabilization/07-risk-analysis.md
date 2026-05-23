# Iteration 5 — Risk Analysis

## Change class

**Frontend-only · interaction/URL/query timing · no API changes**

---

## Risk matrix

| Area | Risk | Mitigation |
|---|---|---|
| Search debounce 350ms | LOW | Standard UX; input stays instant |
| Split search/filter URL paths | LOW-MED | Race guard `draft === debounced` |
| URL equality skip | LOW | String compare before setSearchParams |
| Geo in catalog blocks key | LOW | Bug fix — correct behavior |
| Body scroll lock | LOW | Restores overflow on unmount |
| filterKeyPart serialization | LOW | Same logical key, stable primitives |

---

## Regression vectors

| Vector | Likelihood | Notes |
|---|---|---|
| Search feels laggy | Low | Only API/URL lag; input immediate |
| Stale search in URL after filter click | Low | Filter path writes full filters including draft search |
| Back button desync | Low | Unchanged URL→state effect |
| Catalog listings ignore geo | Pre-existing | Documented, not introduced |
| Hero search inconsistency | Pre-existing | Different surface, own debounce |

---

## Rollback

Delete / revert:

```
redesign/hooks/useDebouncedValue.ts
redesign/hooks/useBodyScrollLock.ts
redesign/lib/catalog-interaction.ts
RedesignMap.tsx
RedesignCatalog.tsx
```

No env, DB, or API rollback needed.

---

## Deploy recommendation

**LOW risk** — bundle with R3 + Iterations 2–4.

Priority smoke: rapid search typing on `/map`, browser back after filter change, mobile filter overlay scroll.
