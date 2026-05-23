# Iter 37 — True Trend Intelligence

## Service

`CrmTrendService.getHistory(days)` — reads snapshot rows, builds series.

Shared logic: `packages/shared/src/crm/trend-intelligence.ts`

---

## Trend Series

| Metric | Source kind | lowerIsBetter |
|---|---|---|
| overdue | SLA | ✓ |
| stale | SLA | ✓ |
| reopen | GLOBAL_OPS | ✓ |
| inactivity | SLA | ✓ |
| queue_pressure | GLOBAL_OPS | ✓ |
| note_discipline | BEHAVIOR | ✗ |

---

## Direction Algorithm

Split series in half → compare avg(recent) vs avg(prior):

- Delta ≥8% → `improving` or `degrading` (inverted when `lowerIsBetter`)
- Else → `stable`

---

## API Integration

`GET /admin/ops/analytics` now returns:

```typescript
{
  ...liveAnalytics,
  history: CrmHistoryResponse,
  slaTrend: {
    ...proxies,
    historical: boolean,
    overdueDirection, staleDirection,
    overdueSparkline, staleSparkline,
  }
}
```

**Replaces** proxy-only SLA trend when `snapshotCount > 1`.

---

## Drift Warnings

Auto-generated when any series `degrading` with `|deltaPct| ≥ 15%`.

---

## Performance

Single query: `findMany` snapshots in date range — typically <30 rows × 5 kinds.
Target: <50ms query (reported as `history.queryMs`).
