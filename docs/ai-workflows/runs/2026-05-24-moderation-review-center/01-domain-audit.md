# 01 — Domain Audit (Iter 51)

**Date:** 2026-05-24  
**Scope:** Moderation queue + revision review center

## Pre-Iter 51 foundation (Iter 50)

| Capability | Status |
|------------|--------|
| `listing_wizard_snapshots` | ✓ JSON payload + `isPendingRevision` |
| `listing_edit_history` | ✓ append-only log |
| Visibility REVIEW / REJECTED | ✓ schema |
| Wizard autosave + concurrency | ✓ `draft_version` |
| `PATCH /admin/listings/wizard/:id/moderation` | ✓ basic approve/reject |
| Site flag `listing_moderation_enabled` | ✓ default false |
| Moderation ops UI | ✗ |

## APIs audited

| Endpoint | Role | Purpose |
|----------|------|---------|
| `GET /admin/moderation/stats` | manager+ | Queue metrics (DEV overlay) |
| `GET /admin/moderation/listings` | manager+ | Tabbed queue |
| `GET /admin/moderation/listings/:id/review` | manager+ | Live vs pending bundle + diff |
| `PATCH /admin/moderation/listings/:id` | manager+ | approve / reject / request_changes / archive / restore |
| `GET /admin/listings/wizard/:id/draft` | agent+ | Agent edit + pending revision |
| `GET /admin/listings?admin_view&scope=owned` | agent+ | My Listings |

## Workflow map

```
Agent creates/edits → autosave snapshot
  ├─ New draft → visibility REVIEW (if moderation enabled)
  ├─ Live PUBLIC edit → isPendingRevision=true, live unchanged
  └─ Submit → REVIEW or publish per lifecycle

Moderator queue tabs:
  REVIEW           → visibility=REVIEW
  REJECTED         → visibility=REJECTED
  PENDING_REVISION → PUBLIC/HIDDEN + snapshot.isPendingRevision
  RECENTLY_APPROVED→ moderation_approve in last 14d

Review center:
  live payload (DB listing) vs pending (snapshot)
  → diffWizardPayloads → field + media diff
  → action with expectedVersion

Reject on live+pending:
  reset snapshot to live payload
  keep PUBLIC visibility
  set moderationNote (agent feedback)
```

## Unchanged (safe)

- Feed listings, CRM, geo, viewport, map
- Public catalog filters (REVIEW/REJECTED excluded)
- Ownership asserts in governance service
