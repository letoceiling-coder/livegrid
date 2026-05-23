# Iter 39 — Conversion Friction Intelligence

## Friction Rules (`detectLifecycleFriction`)

| Code | Trigger |
|---|---|
| `viewing_abandon` | VIEWING → CLOSED/SPAM without NEGOTIATION |
| `negotiation_stagnation` | NEGOTIATION open ≥7 days |
| `reopen_after_success` | STATUS_CHANGED from SUCCESS |
| `reassign_before_contact` | Multiple ASSIGNED before CONTACTED |
| `stale_after_viewing` | Inactive ≥2d after viewing scheduled |
| `early_spam` | SPAM within 24h of create |

---

## Detail Hints (`analyzeLifecycleHints`)

- Long NEGOTIATION (3d/7d thresholds)
- Reopen after SUCCESS
- No VIEWING after CONTACTED (3d+)
- Fast SPAM exit
- Success path (green, ≤14d)
- Reopen loop (2+)

---

## No AI

Rule-based only — operational warnings, not predictions.
