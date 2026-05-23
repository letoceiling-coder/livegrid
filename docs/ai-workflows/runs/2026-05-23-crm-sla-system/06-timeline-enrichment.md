# Iter 32 — Timeline Enrichment

## Principle

**Append-only DB timeline unchanged.** Operational markers are **UI-derived only** — not persisted, not editable.

---

## Marker types (`buildEnrichedTimeline`)

### Inactivity marker

Inserted when gap between consecutive events ≥ **24 hours**:

> Период без активности · {duration}

### Reopen marker

Inserted before `STATUS_CHANGED` when `fromStatus` is `CLOSED` or `CANCELLED`:

> Переоткрыта · Возврат в работу из «{status}»

---

## Rendering

- Markers: amber dot, smaller text
- Events: primary dot, existing labels via `REQUEST_EVENT_LABEL`
- Display order: reverse chronological (newest first)

---

## SLA recovery

Not logged as events. When manager acts:

1. Event appended → `lastActivityAt` bumps
2. Detail page SLA banner updates on refetch
3. No fake `SLA_RECOVERED` event type (avoids timeline pollution)

---

## Chronology integrity

- Markers reference real event timestamps
- No mutation or deletion of stored events
- `crmObsTimelineRender` tracks DEV render cost

---

## Gaps

- No persisted SLA state change history
- Inactivity threshold fixed at 24h (not status-specific in UI)
