# 05 — Usage Tracking

**Service:** `BillingUsageService`

## Dimensions

| Kind | Source |
|------|--------|
| LISTING | Owner active manual listings count |
| PROMOTION | Order created events |
| SAVED_SEARCH | SavedSearch count |
| CRM_SEAT | Role-based seat estimate |
| AUTOMATION | usage_events aggregate 24h |
| NOTIFICATION | usage_events aggregate 24h |

## Bounds

- Events append-only
- Aggregates computed on read (no unbounded scans)
- 24h window for automation/notification volume
