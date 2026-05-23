# Iter 37 — Performance & Governance

## Snapshot Generation Bounds

| Guard | Value |
|---|---|
| Single writer | `generating` mutex |
| Backfill max | 30 days |
| Retention | 180 days auto-purge |
| Concurrent generate | Rejected 400 |
| Live compute | Reuses Iter 35–36 caps |

---

## Trend Query Bounds

| Guard | Value |
|---|---|
| History max days | 90 (clamped) |
| Default | 30 |
| Rows read | ≤ days × 5 kinds |

---

## Index Usage

- `crm_analytics_snapshots_kind_snapshot_date_idx`
- Unique `(snapshot_date, kind)`

---

## Storm Prevention

- Snapshots **not** on analytics poll path
- Nightly cron + manual trigger only
- Analytics poll unchanged (2× ops interval)

---

## DEV Observability

| Metric | Source |
|---|---|
| `historyQueryMs` | `history.queryMs` from API |
| Snapshot compute | `generate` response `computeMs` |
| `payloadBytes` | generate response |

`crm_debug` overlay shows history query ms.

---

## Verification

| Check | Result |
|---|---|
| `pnpm --filter @lg/database migrate:deploy` | ✓ PASS |
| `pnpm --filter web exec tsc --noEmit` | ✓ PASS |
| `pnpm --filter api exec tsc --noEmit` | ✓ PASS |

---

## Role Safety

| Endpoint | Roles |
|---|---|
| Analytics + history | admin, editor, manager |
| Snapshot generate/backfill | admin, editor |
