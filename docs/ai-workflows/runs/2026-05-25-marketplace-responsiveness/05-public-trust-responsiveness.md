# 05 — Public Trust Responsiveness

**Iteration:** 81 · **Date:** 2026-05-25

## Rules

- Heuristic only — no AI scoring
- No fake time guarantees
- No public shaming of agents or SLA failures
- Positive signals only when platform median meets thresholds

## Shared helper

`publicResponsivenessHint()` in `response-responsiveness.ts`:

| Condition | Public copy |
|-----------|-------------|
| Median first contact ≤120 min OR reply ≤90 min | «Обычно отвечаем быстро» / «Менеджеры на связи» |
| Otherwise | Hidden (null) |

Expectation text clarifies working-hours dependency.

## UI

- `ResponsivenessHint.tsx` — fetches `GET /stats/responsiveness-hint` (public)
- `LeadForm.tsx` — hint above submit; success copy softened (no «2 hours» guarantee)

## Files

- `response-responsiveness.ts`
- `ResponsivenessHint.tsx`
- `LeadForm.tsx`
- `stats.controller.ts`
