# 08 — Safety Invariants

## Hard guarantees

| Rule | Implementation |
|------|----------------|
| PUBLIC listing never breaks during review | Live DB row unchanged until approve; snapshot holds pending |
| Reject never deletes live data | `rejectListing`: copy live payload back to snapshot |
| Pending revision isolated | `isPendingRevision` flag; autosave only updates snapshot when live |
| Concurrent moderation safe | `expectedVersion` / `draft_version` conflict → 409 |
| Rollback possible | Reject restores snapshot; restore action → DRAFT |

## Review bundle invariants (API)

```json
{
  "publicListingProtected": true,  // live PUBLIC + pending revision
  "rejectDoesNotDeleteLive": true, // any live visibility
  "pendingRevisionIsolated": true
}
```

## Out of scope / not broken

- FEED listings — moderation paths MANUAL-only
- CRM, geo pipeline, ownership transfer rules
- No destructive migrations in this iteration
