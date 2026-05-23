# Iter 34 — Escalation Visibility

## Ops Center escalation block

| Signal | Source |
|---|---|
| Global overdue | SLA `computeSlaState` aggregate |
| Stale hotspots | Stale queue panel |
| Unassigned risk | Unassigned count + SLA on unassigned |
| Overload managers | `overdue >= 2` OR `assigned >= 8` |
| Notification pressure | Unread CRM notifications |

## Visual density

- Red/amber bordered queue sections
- Overload manager cards with red border
- No alert wall — capped at 8 items per queue

## Gaps (documented)

- Reopened lead counter not aggregated (derive from events in future)
- No cross-region heat map
