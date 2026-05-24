# Phase 6 — Recovery + Failure Testing

**Iteration:** 64

## Graceful degradation

| Failure | Behavior |
|---------|----------|
| Viewport API error | `status: fallback` → legacy 200-row markers |
| Aborted request | Silent cancel, no state update |
| Stale response | Gen counter drop |
| Slow API | No retry storm (single in-flight per bbox sig) |

## DEV stress modes (unchanged)

- `?viewport_stress=404|timeout` on experimental path

## Manual QA matrix

See `09-qa-matrix.md`
