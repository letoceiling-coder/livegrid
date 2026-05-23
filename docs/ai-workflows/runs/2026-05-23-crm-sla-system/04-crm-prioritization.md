# Iter 32 — CRM List Prioritization

## Default queue

**Route:** `/admin/requests`  
**Default sort:** `sort=priority` (operational)

---

## Visual urgency

| SLA | UI treatment |
|---|---|
| OVERDUE | Red badge + red border glow on row/card |
| STALE | Amber badge + amber border |
| FRESH | Green badge (compact) |
| ACTIVE | No SLA badge (status badge only) |
| ARCHIVED | Muted opacity 60% |

Components: `SlaBadge`, `rowUrgencyClass()` in `request-sla.ts`

---

## Columns (desktop)

SLA | # | Client | Phone | Status | Manager | **Activity** (`lastActivityAt`) | Open

Mobile cards: status + SLA badge + activity timestamp.

---

## Filters

- Existing: status chips, assignee, search
- **New:** workload strip toggles `sla=overdue` / `sla=stale`
- URL deep links: `/admin/requests?sla=overdue` (read on mount)

---

## Workload strip

`CrmWorkloadStrip` above sticky filters:

- Open total
- Overdue (click to filter)
- Stale (click to filter)
- Unassigned count + overdue sub-count
- Horizontal manager chips (top 6 by overdue)

---

## API

```
GET /admin/requests?sort=priority&sla=overdue&page=1&per_page=20
```

Response rows include: `slaState`, `slaPriority`, `inactiveMs`, `inactiveLabel`, `lastActivityAt`

---

## Design constraints

- No notification spam — visual cues only
- No auto-reassignment
- Refresh via React Query invalidate / manual button
