# R3.1 — Error State Review

## Mode

READ-ONLY · `@gstack/careful` + `@gstack/cso`

---

## Retry Implementation

```typescript
const retryCatalog = () => {
  if (displayBlocks) void blocksQuery.refetch();
  else void listingsQuery.refetch();
};
```

| Check | Result |
|---|---|
| Manual retry only | ✓ User click required |
| Auto-retry loop | ✗ Not implemented |
| `retry: N` on useQuery | Default 3 on **failure** only — pre-existing TanStack behavior |
| Infinite retry risk | **None** — no `refetchInterval`, no recursive onClick |

---

## Error Propagation

`apiGet` throws `ApiError` on non-2xx:

```typescript
if (!res.ok) throw new ApiError(res.status, text);
```

React Query captures in `query.error`. R3 surfaces via `catalogFetchError`.

---

## UI Branch Coverage

```typescript
{catalogInitialLoading && loadedCount === 0 ? (
  "Загрузка…"
) : catalogFetchError ? (
  retry UI
) : useBlocksMap ? (
  blocks empty ? "Нет объектов" : list
) : listingItems.length === 0 ? (
  "Нет объектов"
) : list
}
```

| Branch | Reachable | Notes |
|---|---|---|
| Loading | ✓ | First fetch, no placeholder |
| Error | ✓ | `query.error` set |
| Empty success | ✓ | `!error && length===0` |
| Success list | ✓ | Normal path |
| Unreachable dead code | **None found** | All branches mutually exclusive |

---

## Error vs Empty Distinction

| Condition | blocksQuery | listingsQuery | UI |
|---|---|---|---|
| HTTP 500 | `isError=true` | — | Retry (if active query) |
| HTTP 200, total=0 | `isError=false`, data=[] | — | "Нет объектов по фильтрам." |
| Network offline | `isError=true` | — | Retry |

**Improvement over production:** errors no longer masquerade as empty catalog.

---

## Pre-Existing Edge Case (NOT R3 regression)

**Blocks API error → listings fallback:**

```typescript
const needListings = !useBlocksForApartments || (blocksQuery.isFetched && blocks.length === 0);
```

When blocks fetch **errors** (not empty success):
- `isFetched=true`, `data=undefined`, `blocks=[]`
- `needListings=true` → listings query activates
- `displayBlocks=false` → `catalogFetchError` reads **listingsQuery.error**, not blocksQuery.error

| Scenario | User sees |
|---|---|
| Blocks 500, listings 200 | Listings map (fallback) — pre-existing |
| Blocks 500, listings 500 | Listings retry UI — blocks error hidden |
| Blocks 200 empty, listings 200 | Listings map — pre-existing |

**Severity:** LOW — rare (blocks endpoint stable, Redis-cached). Document for future R4.

**Not a deploy blocker** — behavior predates R3; R3 improves the common case (blocks success path errors vs empty).

---

## keepPreviousData + Error

On error after successful prior fetch:
- Previous data may remain visible (TanStack default with placeholderData)
- `catalogFetchError` set → sidebar shows retry UI **over** list branch

Wait — branch order: error checked before list. Sidebar shows retry, not stale list. ✓

On first-load error:
- No placeholder data
- `loadedCount=0`, `catalogInitialLoading=false` (isLoading false after error)
- Sidebar: retry UI ✓
- Map: empty ✓

---

## Subtitle on Error

```typescript
catalogFetchError ? 'Не удалось загрузить объекты' : ...
```

Consistent with sidebar. Map area has no error overlay — acceptable.

---

## Error State Verdict

| Criterion | Status |
|---|---|
| Retry safe (no infinite loop) | ✓ PASS |
| Distinct from empty state | ✓ PASS |
| All UI branches reachable | ✓ PASS |
| Blocks error → listings fallback masking | ⚠ Pre-existing, LOW |

**Error state review: APPROVED.**
