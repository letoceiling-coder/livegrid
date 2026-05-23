# Iter 38 — Performance & Governance

## Compute Path

```
GET /admin/ops/analytics
  ├─ CrmAnalyticsService (existing)
  ├─ CrmTrendService (existing + sourceTrends)
  └─ CrmAttributionService (new, parallel)
```

---

## Cost Controls

| Guard | Value |
|---|---|
| Attribution scan | 3,000 requests |
| Reopen events | 2,000 |
| In-memory cache | 60s (global only) |
| Block/listing name lookup | Batch by ids |
| Snapshot kinds added | +2 (7 total/day) |

---

## DEV Observability

| Metric | Source |
|---|---|
| `attributionComputeMs` | `attribution.computeMs` |
| Existing analytics/history/timeline ms | unchanged |

`crm_debug` overlay: `attribution: Nms`

---

## Role Matrix

| Data | admin | editor | manager |
|---|---|---|---|
| Source table (scoped) | all | all | own leads |
| Object pressure | ✓ | ✓ | ✗ |
| Bottlenecks | ✓ | ✓ | ✗ |
| Snapshot generate | ✓ | ✓ | ✗ |

---

## Verification

| Check | Result |
|---|---|
| `pnpm --filter @lg/shared build` | ✓ PASS |
| `pnpm --filter web exec tsc --noEmit` | ✓ PASS |
| `pnpm --filter api exec tsc --noEmit` | ✓ PASS |
| Migration `20260523190000` | ✓ DEPLOYED |

---

## Manual QA

- [ ] Map lead shows MAP_POPUP in source table
- [ ] Apartment page lead vs map overdue comparison
- [ ] Object pressure for ЖК with many leads
- [ ] Detail hints: «Лид пришёл с карты ЖК»
- [ ] Manager sees scoped attribution only
- [ ] Source trends after 2+ snapshots with new kinds
- [ ] No extra poll beyond analytics
