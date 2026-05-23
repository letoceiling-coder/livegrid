# Iteration 15.5 — Pagination & Density RFC

## Iter 15 pagination model (implemented)

| Param | Role |
|---|---|
| `limit` | Max rows (default 300, max 500) |
| `cursor` | Keyset continuation token |

### Blocks keyset

- Sort: `name ASC, id ASC` (or `name DESC, id DESC`)
- Cursor: **slug** of last returned row
- Next page: `(name, id) > (cursor row)`

**Live validated:** page1=10, page2=10, **overlap=0** ✓

### Listings keyset

- Sort: `id ASC` only
- Cursor: **numeric id**

---

## Meta-driven pagination (client contract)

```typescript
if (meta.hasMore && meta.cursor) {
  fetch({ ...params, cursor: meta.cursor, limit });
}
```

| Field | Client use |
|---|---|
| `visible` | «N объектов в области» |
| `total` | «M всего по фильтрам» (Iter 12 hybrid) |
| `hasMore` | Show «load more in viewport» |
| `cursor` | Next chunk |
| `density` | Cluster/zoom hints |

---

## Future-safe strategies (not implemented)

### Spatial window pagination

Bbox changes on pan → **new query key**, not cursor continuation.

Cursor applies **within fixed bbox** only.

### Density buckets (zoom-based limits)

| Zoom | Suggested limit | Rationale |
|---|---|---|
| z10–11 | 300–500 | Region overview |
| z12–14 | 200–300 | District |
| z15+ | 50–100 | Street — natural cap |

Server accepts client `limit`; no server-side zoom cap yet.

### Cluster zoom integration

When viewport render enabled (future):

- z < 13: server-side cluster centroids (not in prototype)
- z ≥ 13: raw markers up to `limit`

**Out of scope Iter 15.**

---

## Sort stability

| Sort | Stable key | Viewport support |
|---|---|---|
| `name_asc` | `(name, id)` | ✓ default |
| `name_desc` | `(name, id)` | ✓ |
| `price_asc` | min listing price | ✗ needs SQL join |
| `created_desc` | `created_at` | ✗ not wired |

**Recommendation:** add `meta.sortRequested` vs `sortApplied` in Iter 16 when exposing unsupported sorts explicitly.

Currently unsupported sorts silently apply `name_asc`.

---

## Density field

```
density = visible / bboxAreaDeg2
```

**Moscow test bbox:** visible=181, area≈0.15 deg² → **1206.7**

Use cases:

- DEV overlay diagnostics
- Future «too dense» warning when visible > 500
- Compare zoom levels — not for user display v1

---

## vs legacy offset pagination

| Aspect | Legacy `/blocks` | Viewport prototype |
|---|---|---|
| Model | `page` + `per_page` | `cursor` + `limit` |
| Stable under insert | ✗ offset drift | ✓ keyset |
| Bbox-aware | ✗ | ✓ |
| Total count | `meta.total` | `meta.total` + `meta.visible` |

**Do not** use offset pagination for viewport — cursor only.

---

## Conclusion

Iter 15 establishes **keyset cursor + dual counts** as the viewport pagination model. Spatial pan remains a **new bbox query**; cursor paginates within a settled bbox only.
