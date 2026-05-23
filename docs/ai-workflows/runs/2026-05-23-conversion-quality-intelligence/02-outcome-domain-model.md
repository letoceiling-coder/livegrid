# Iter 40 — Outcome Domain Model

## Canonical Module

`packages/shared/src/crm/conversion-outcome-quality.ts`

Rule-based only — **no AI classification**.

---

## Outcome Classes

| Class | Derivation rules |
|---|---|
| `strong_success` | SUCCESS, no reopen, ≥2 touches, ≥1 note, ≤21d |
| `healthy_lifecycle` | SUCCESS, CONTACTED+VIEWING+NEGOTIATION, no reopen, ≤14d, ≥3 touches |
| `recovered_success` | SUCCESS after 3d+ inactivity gap |
| `unstable_success` | STATUS_CHANGED from SUCCESS in history |
| `weak_success` | SUCCESS with >21d or ≤1 touch |
| `abandoned_negotiation` | CLOSED/CANCELLED after NEGOTIATION, never SUCCESS |
| `spam_fast` | SPAM within 24h of creation |
| `fake_progression` | ≥4 status changes in ≤48h, 0 notes |
| `closed_neutral` | Other terminal CLOSED |
| `open` | Non-terminal status |

---

## Derived Aggregates

| Concept | Function |
|---|---|
| Quality metrics | `aggregateConversionQuality()` |
| Per-lead hints | `analyzeOutcomeQualityHints()` |
| Manager recovery | Rows keyed by `assignedTo` at success |
| Source quality score | `strongSuccess×2 − unstableSuccess×2 − fastSpam` |

---

## API Surface

| Endpoint / field | Content |
|---|---|
| `GET /admin/ops/analytics` → `conversionQuality` | Live metrics + warnings + recovery + source quality |
| Request detail → `qualityHints` | Subtle operational chips |
| Snapshots `CONVERSION_QUALITY` | Metrics + warnings + sourceQuality |
| Snapshots `RECOVERY_INTELLIGENCE` | managerRecovery + recoverySuccessPct |
