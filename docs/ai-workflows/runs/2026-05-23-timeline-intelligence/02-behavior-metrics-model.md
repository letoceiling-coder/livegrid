# Iter 36 — Behavior Metrics Model

## Source of Truth

`packages/shared/src/crm/timeline-intelligence.ts` — pure functions, no persistence.

Aggregated via `CrmAnalyticsService.computeTimelineIntelligence()` → `GET /admin/ops/analytics` → `response.timeline.behavior`.

---

## Metric Definitions

| Metric | Formula | Interpretation |
|---|---|---|
| `medianTouchesBeforeSuccess` | Median touch events before first `STATUS_CHANGED → SUCCESS` | Handling effort to close |
| `avgTransitionsPerLead` | Σ status changes / sample size | Pipeline volatility |
| `noteDisciplinePct` | Leads with ≥1 NOTE / sample × 100 | Documentation hygiene |
| `assignmentChurnPct` | Leads with >1 ASSIGNED / sample × 100 | Routing instability |
| `untouchedLeadPct` | Leads with only CREATED+ASSIGNED / sample × 100 | Neglected queue |
| `reopenAfterTerminalPct` | Reopens from SUCCESS / total reopens × 100 | Quality of closures |
| `medianInactivityGapHours` | Median consecutive event gap / sample | Follow-up cadence |

### Touch types

`NOTE_ADDED`, `CONTACTED`, `STATUS_CHANGED`, `VIEWING_SCHEDULED`, `ASSIGNED`

---

## Sample Bounds

| Constant | Value |
|---|---|
| `MAX_TIMELINE_SAMPLE` | 400 request IDs |
| Events take | `sampleIds.length × 50` |
| Open rows in sample | Up to 2000 (from open scan) |
| Terminal in sample | Up to 100 recently closed in window |

---

## Hygiene Summary

| Field | Formula |
|---|---|
| `qualityGreen/Yellow/Red` | Count open leads by worst hint severity |
| `reopenHeat` | green: <2 reopens; yellow: 2–4; red: ≥5 in sample |
| `topAlerts` | Up to 5 red hint messages |

---

## Per-Request Hints (`analyzeRequestTimeline`)

| Code | Severity | Trigger |
|---|---|---|
| `long_inactivity` | yellow/red | ≥1d / ≥3d without activity |
| `reassignment_churn` | yellow/red | ≥3 / ≥4 ASSIGNED events |
| `reopen_loop` | yellow/red | ≥1 / ≥2 reopens from terminal |
| `no_followup_after_contact` | yellow/red | CONTACTED + no follow-up ≥1d |
| `sparse_notes` | yellow | Past NEW, zero notes |
| `overdue_after_contact` | red | CONTACTED+ status + ≥2d inactive |
| `healthy_cadence` | green | ≥3 touches + <1d inactive |
| `note_discipline` | green | Notes present, no reopen, active |

Returned on `GET /admin/requests/:id` as `timelineHints[]`.

---

## Design Constraints

- Derived only — no ML scores
- No revenue or fake conversion value
- Same 60s cache as Iter 35 analytics
