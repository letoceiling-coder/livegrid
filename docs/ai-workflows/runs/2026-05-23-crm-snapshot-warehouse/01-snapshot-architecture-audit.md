# Iter 37 — Snapshot Architecture Audit

## Mode

HISTORICAL OPERATIONS INTELLIGENCE — Phase 1 audit

---

## Pre-Iter 37 Baseline

| Capability | State | Gap |
|---|---|---|
| SLA trends | ◐ Proxy | No day-over-day overdue history |
| Manager trends | ◐ Point-in-time | No weekly discipline history |
| Reopen tracking | ◐ Window count | No growth trend |
| Analytics cache | 60s in-memory | Lost on restart |
| Event storage | Append-only timeline | Not replayed for trends |
| BullMQ infra | Feed import only | No CRM jobs |

---

## Compute Cost Inventory

| Path | Cost | Frequency |
|---|---|---|
| `CrmAnalyticsService.compute` | Multi-query + O(n) SLA | Every analytics poll (2× ops) |
| Timeline intelligence | Event batch ≤400×50 | Bundled in analytics |
| Ops summary | Queue top-N | Ops poll interval |
| Request detail hints | O(events) per lead | On detail view |

**Conclusion:** Snapshot generation should run **once daily**, not on every poll.

---

## Safe Snapshot Strategy

1. **Capture** live metrics via `captureLiveMetrics()` at generation time
2. **Persist** 5 immutable rows per calendar day (`GLOBAL_OPS`, `FUNNEL`, `SLA`, `BEHAVIOR`, `MANAGERS`)
3. **Query** trends from snapshot table only — O(days) JSON reads
4. **Retain** 180 days, purge on each generate
5. **Idempotent** unique `(snapshot_date, kind)` — skip if exists unless `force=true`

---

## Scale Assumptions

| Table | Expected scale |
|---|---|
| `requests` | <50k |
| `request_events` | <500k |
| `crm_analytics_snapshots` | ~900 rows (180d × 5 kinds) |

No OLAP required at this scale.

---

## Verification

| Check | Result |
|---|---|
| Migration deploy | ✓ PASS (incl. Iter 31–37 CRM migrations) |
