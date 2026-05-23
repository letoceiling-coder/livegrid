# Iter 38 — Object Intelligence

## Scope

Block (ЖК) and listing operational pressure from request linkage.

---

## ObjectPressureRow

| Field | Definition |
|---|---|
| `objectKind` | `block` \| `listing` |
| `objectId` | PK |
| `objectName` | Block name or listing title |
| `inflow` | Request count touching object |
| `open` | Open pipeline count |
| `overdue` / `stale` | SLA counts |
| `reopenCount` | Reopen events |
| `pressureScore` | `overdue×2 + stale + reopenCount` |

Sorted by `pressureScore DESC`.

---

## Use Cases

- Identify ЖК generating manager overload
- Spot high-pressure listings stalling pipeline
- Cross-reference with source table (same scan)

---

## UI

Ops Center → **Давление по объектам** table (admin/editor only).

Detail hints: «ЖК перегружает менеджеров» when block pressureScore ≥ threshold.

---

## Limits

Top 15 objects in API; UI shows 8.

No region-level rollup (future).
