# Iter 36 — Lead Aging Intelligence

## Scope

Aging visibility beyond SLA badges — **operational hotspots** from open pipeline + event context.

---

## Hotspot Types

Computed by `computeAgingHotspots()`:

| Code | Label | Trigger |
|---|---|---|
| `aging_{status}` | Застой в «STATUS» | ≥3 leads, avg inactivity ≥48h |
| `negotiation_stagnation` | Стагнация переговоров | NEGOTIATION + inactive ≥7d |
| `viewing_untouched` | Просмотр без follow-up | VIEWING_SCHEDULED, no events after scheduling + ≥1d |
| `reopen_cycles` | Повторные reopen | ≥2 reopen events on open lead |

Severity: `red` if avg ≥120h or negotiation/reopen; else `yellow`.

---

## Data Inputs

Per open lead:
- `status`, `inactiveMs` from `computeSlaState`
- Full event list from timeline sample query

---

## UI

Ops Center analytics panel → **Aging hotspots** card list with count + avg hours.

Mobile: stacked cards, 360px readable.

---

## Limitations

- Only open leads in `MAX_OPEN_SCAN` (2000) contribute
- Events loaded for timeline sample subset — very old open leads outside sample may lack event context for viewing/reopen checks
- No historical aging trend (same gap as Iter 35 SLA warehouse)

---

## Manual QA

- [ ] NEGOTIATION leads idle 7d+ appear in stagnation hotspot
- [ ] VIEWING_SCHEDULED without follow-up flagged
- [ ] Multi-reopen leads in reopen_cycles
- [ ] Empty pipeline → no false hotspots
