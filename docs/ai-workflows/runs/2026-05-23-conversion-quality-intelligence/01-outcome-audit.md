# Iter 40 — Outcome Quality Audit

## Pre-Iter 40 Baseline

| Capability | State | Gap |
|---|---|---|
| Outcome counts (SUCCESS/CLOSED/SPAM) | ✓ Iter 35 | No quality classification |
| Reopen detection | ✓ Timeline | Not tied to outcome stability |
| Negotiation stage tracking | ✓ Lifecycle | No abandoned-negotiation metric |
| Source attribution | ✓ Iter 38 | Volume-only, not quality |
| Manager performance | ✓ Timeline | No recovery analytics |
| Success path duration | ✓ Iter 39 | No strong vs weak success |

---

## Outcome Pattern Matrix

| Pattern | Signals | Pre-40 | Post-40 |
|---|---|---|---|
| Strong SUCCESS | No reopen, ≥2 touches, notes, ≤21d | ✗ | ✓ `strong_success` |
| Weak SUCCESS | Long cycle or low touches | ✗ | ✓ `weak_success` |
| Unstable SUCCESS | Reopen from SUCCESS | ◐ | ✓ `unstable_success` |
| Recovered lead | 3d+ gap then SUCCESS | ✗ | ✓ `recovered_success` |
| Abandoned negotiation | NEGOTIATION → CLOSED/SPAM | ✗ | ✓ `abandoned_negotiation` |
| Fake progression | 4+ transitions in 48h, 0 notes | ✗ | ✓ `fake_progression` |
| Spam fast exit | SPAM within 24h | ✗ | ✓ `spam_fast` |
| Healthy lifecycle | Full path, no reopen, ≤14d | ✗ | ✓ `healthy_lifecycle` |

---

## Reopen-After-Success Flow

```
SUCCESS → (reopen) → IN_PROGRESS/... → SUCCESS
         └── unstable_success + reopenAfterSuccessPct
```

---

## Verification

| Check | Result |
|---|---|
| `pnpm --filter @lg/shared build` | ✓ PASS |
| `pnpm --filter api exec tsc --noEmit` | ✓ PASS |
| `pnpm --filter web exec tsc --noEmit` | ✓ PASS |
