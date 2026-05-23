# Iter 33 — SLA Reminder Readiness

## BullMQ constants

```typescript
CRM_REMINDER_QUEUE = 'crm-reminder'
CRM_REMINDER_JOBS.SLA_ATTENTION_SCAN
CRM_REMINDER_JOBS.VIEWING_REMINDER_DRY_RUN
```

## CrmReminderService

- `runSlaAttentionScan()` — calls `AttentionRoutingService.scanAndRouteSlaEscalations()`
- `runViewingReminderDryRun()` — logs readiness only

**No queue processor registered** — no Redis job enqueued in production path.

## Admin trigger

`POST /admin/crm-notifications/dev/sla-scan` — manual scan for ops/testing.

## Future enablement checklist

1. Register BullMQ processor on `CRM_REMINDER_QUEUE`
2. Schedule cron via existing Redis connection pattern (see FeedImportModule)
3. Processor MUST only call in-app `CrmNotificationsService.emit`
4. MUST NOT call Telegram/SMS/email APIs

## VIEWING_REMINDER

Type exists in schema; generation not wired — placeholder for future viewing-date field.
