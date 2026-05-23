# Iter 36 — Timeline Quality Signals

## Design

Rule-based GREEN / YELLOW / RED — **no ML**, no numeric "quality score".

---

## Per-Lead Signals

From `analyzeRequestTimeline()` → rendered as pills on `AdminRequestDetail`.

| Severity | Examples |
|---|---|
| GREEN | «Регулярные касания по лиду», «Заметки ведутся» |
| YELLOW | «2 дня без активности», «Частая переадресация», «Нет заметок» |
| RED | «Просроченный follow-up после контакта», «Лид reopened 2 раза» |

Aggregate worst severity via `aggregateQualitySignal()`.

---

## Ops-Level Hygiene

`computeHygieneSummary()` on open sample:

| Output | Meaning |
|---|---|
| `qualityGreen` | Leads with no yellow/red hints |
| `qualityYellow` | At least one yellow, no red |
| `qualityRed` | At least one red hint |
| `reopenHeat` | Sample-wide reopen intensity |
| `topAlerts` | Up to 5 red messages for quick scan |

---

## UI Treatment

- Detail: rounded pill badges under SLA banner
- Ops Center: 4-card hygiene grid + alert list
- Manager table: qualitySignal column

Colors use border/background tints — readable in light/dark.

---

## reduced-motion

Pills are static — no animation. Timeline markers retain existing `motion-safe` on list hover only.

---

## Not Implemented (By Design)

- Weighted composite score
- Auto-escalation from RED
- LLM-generated advice
