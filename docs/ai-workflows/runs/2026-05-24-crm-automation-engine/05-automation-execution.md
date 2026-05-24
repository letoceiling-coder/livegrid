# 05 — Automation Execution

## Engine

`CrmAutomationEngineService.runBoundedScan()`

## Bounds

| Limit | Value |
|-------|-------|
| Requests per run | 200 |
| Actions per run | 80 |
| Cooldown | Per-rule `cooldown_hours` |
| Max actions/day | Per-rule `max_actions_per_day` |

## Safety Rules

1. **No infinite loops** — single pass, capped actions
2. **Dedupe-safe** — unique keys on tasks and actions
3. **Cooldown windows** — skip if recent action for same rule+request
4. **Max actions/day** — per-rule daily cap
5. **Deterministic** — rule-based eval only, no LLM

## Trigger

- `POST /admin/automation/scan` (admin/editor)
- Cron-ready: direct call, no BullMQ worker required yet

## Scan Output

```json
{
  "scanned": 120,
  "matched": 15,
  "tasksCreated": 8,
  "cooldownSkips": 4,
  "dedupeSkips": 3,
  "durationMs": 450
}
```
