# Iter 39 — Stage Velocity Analytics

## Velocity Pairs

| Transition | Metric |
|---|---|
| NEW → CONTACTED | Median hours |
| NEW → IN_PROGRESS | Median hours |
| CONTACTED → VIEWING_SCHEDULED | Median hours |
| VIEWING_SCHEDULED → NEGOTIATION | Median hours |
| NEGOTIATION → SUCCESS | Median hours |
| NEW → SUCCESS | Full lifecycle shortcut |

---

## Stage Aging (Open Pipeline)

Per open status: count + median hours in current stage.

Highlight: ≥72h shown red in UI.

---

## Service

`CrmLifecycleService` — 400 request sample, 40 events/request max, 60s cache.

Bundled as `response.pipeline` on analytics endpoint.
