# 03 — Lead Quality Operations

**Iteration:** 77 · **Date:** 2026-05-25

## Diagnostics inventory

| Signal | Mechanism | Iter 77 |
|--------|-----------|---------|
| Spam leads | `RequestStatus.SPAM` + ops filters | existing |
| Duplicate phone | 48h window match on create | **new API hint** |
| Dead leads | SLA stale/overdue | existing |
| Stale negotiations | NEGOTIATION SLA thresholds | existing |
| Callback misses | Automation metrics / Ops Center | existing |
| Low-quality sources | `sourceUrl` + attribution | existing |
| Abandoned flows | Conversion observability hooks | existing |

## Iter 77: duplicate-phone warning

`POST /requests` response may include:

```json
{
  "duplicateWarning": {
    "recentRequestId": 12345,
    "messageRu": "Недавно уже была заявка #12345 с этим номером (...)"
  }
}
```

- Normalizes RU phone (`8` → `7`)
- Excludes SPAM status
- Shown to buyer on LeadForm success (amber banner)
- Does **not** block submission — ops decides merge/spam

## Ops playbook

1. Duplicate banner → check `#recentRequestId` in CRM before second callback
2. Overdue queue → Ops Center → filtered requests
3. SPAM → mark status, exclude from duplicate scan

## Files

- `requests.service.ts` — `findRecentDuplicatePhone`
- `LeadForm.tsx`
