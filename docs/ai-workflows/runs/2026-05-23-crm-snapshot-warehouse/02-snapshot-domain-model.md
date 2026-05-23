# Iter 37 — Snapshot Domain Model

## Table: `crm_analytics_snapshots`

| Column | Type | Notes |
|---|---|---|
| `id` | serial | PK |
| `snapshot_date` | date | UTC calendar day partition |
| `kind` | enum | Snapshot group |
| `payload` | jsonb | Immutable metrics blob |
| `compute_ms` | int | Generation cost |
| `created_at` | timestamp | Append time |

**Unique:** `(snapshot_date, kind)` — prevents duplicate writes.

---

## Snapshot Kinds

| Kind | Payload contents |
|---|---|
| `GLOBAL_OPS` | open, overdue, stale, queuePressure, reopenCount, inflowWeek, outcomesWeek |
| `FUNNEL` | stage counts + pipeline share |
| `SLA` | overdue, stale, avgInactivityHours, unassignedPressurePct |
| `BEHAVIOR` | behavior metrics + hygiene summary + reopenCount |
| `MANAGERS` | workload array + timeline performance array |

---

## Immutability Rules

- **Append-only** — no UPDATE on payload
- Re-generate same day: `force=true` deletes kind row then re-inserts
- No mutable reporting tables
- No event replay into snapshots (point-in-time capture only)

---

## Honest Limitation

Snapshots capture **state at generation time**, not reconstructed historical state. Backfill for missed days uses current live compute labeled with past date — documented as recovery for cron gaps, not time travel.

---

## Retention

`CRM_SNAPSHOT_RETENTION_DAYS = 180` — auto-purge on generate.

Weekly rollups: **RFC only** (not implemented).
