# Iter 31 — Request List UX

## Mode

Phase 3 — high-density CRM list

---

## Implementation

**File:** `apps/web/src/admin/pages/AdminRequests.tsx`  
**Route:** `/admin/requests`

---

## Columns (desktop table, ≥ md)

| Column | Source field | Notes |
|---|---|---|
| # | `id` | |
| Клиент | `name` | Sub-line: `listing #id` or `block #id` |
| Телефон | `phone` | `tel:` link via `telHrefFromPhone()` |
| Тип | `type` | `REQUEST_TYPE_LABEL` |
| Статус | `status` | Colored badge |
| Менеджер | `assignedUser` | fullName or email |
| Создана | `createdAt` | `formatRequestDate()` |
| TG | `telegramSent` | ✓ or — |
| Action | — | Link → detail |

**Gap:** `lastActivity` column not implemented. Proxy: `updatedAt` or latest event timestamp — follow-up if ops require sort-by-activity.

---

## Filters (sticky header)

- **Search:** name, phone, email, comment, numeric id (`search` query param)
- **Status chips:** all pipeline statuses via `STATUS_FILTER_OPTIONS`
- **Assignee select:** all / unassigned (`none`) / specific user

Sticky: `sticky top-0 z-10` with backdrop blur for scroll persistence.

---

## Sorting

Current: **createdAt desc** (server-side, fixed).  
**Gap:** no client/server column sort toggles — acceptable for v1; add `sort` query if needed.

---

## Pagination

Server paginated: `page`, `per_page=20`, prev/next controls.

---

## Mobile (360px)

`< md`: card stack instead of table.

Each card shows: id, name, type, status badge, phone, assignee, createdAt, TG indicator. Full card links to detail.

Touch targets: card padding `p-4`, filter chips `py-1.5`.

---

## Quick Actions

| Action | Where | Status |
|---|---|---|
| Open detail | Row / card | ✓ |
| Call | Phone link in table | ✓ |
| Assign | Detail page only | ◐ List inline assign removed |
| Change status | Detail page only | ◐ List inline status removed |
| Open object | Detail page | ✓ |

**Trade-off:** List is read/navigate focused; mutations on detail page reduces accidental bulk edits and table clutter.

---

## DEV Observability

`crmObsListFetch(ms, count)` on each list fetch when `?crm_debug=1`.  
Overlay: `CrmDebugOverlay`.

---

## API Contract

```
GET /admin/requests?status=&assigned_to=&search=&page=&per_page=
```

Response: `{ data: RequestRow[], meta: { page, per_page, total, total_pages } }`
