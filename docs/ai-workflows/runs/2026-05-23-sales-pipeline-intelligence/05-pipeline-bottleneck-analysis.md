# Iter 38 — Pipeline Bottleneck Analysis

## Engine

`detectPipelineBottlenecks()` in shared package — rule-based, no AI.

---

## Rules

| Rule | Warning |
|---|---|
| Map overdue% > apartment + 15pp | Map leads slower to process |
| Source inflow ≥5 AND overdue% ≥35 | Source SLA pressure |
| Source inflow ≥5 AND reopen rate ≥15% | Source reopen pattern |

Max 5 warnings returned.

---

## Causality Warnings in UI

Rendered in Ops Center attribution section as amber alert list.

---

## Snapshot Persistence

Stored in `SOURCE_ATTRIBUTION` snapshot payload → `bottlenecks[]` for historical comparison (manual review).

---

## Not Implemented

- Negotiation stagnation **by object** (timeline aging covers global)
- Automatic routing changes
- Dynamic SLA tuning
