# 02 — Draft Architecture

## Chosen model: **Wizard snapshot + listing row**

Safest additive approach vs full event sourcing or revision tables.

```
listings (existing)
  ├── draft_version (optimistic lock)
  ├── moderation_note
  └── visibility (+ REVIEW, REJECTED)

listing_wizard_snapshots (new, 1:1)
  ├── payload JSON (full wizard state)
  ├── wizard_step
  ├── is_pending_revision
  └── updated_by_user_id

listing_edit_history (new, 1:N)
  ├── action, summary JSON, note
  └── user_id, created_at
```

## Why not alternatives

| Approach | Risk | Decision |
|----------|------|----------|
| Full revisions table | High complexity | Deferred |
| JSON-only on listing row | Wide row, merge pain | Rejected |
| Snapshot table | Isolated, reversible | **Selected** |

## State mapping

| Workflow | `ListingVisibility` |
|----------|---------------------|
| Draft | DRAFT |
| Review | REVIEW |
| Published | PUBLIC |
| Rejected | REJECTED |
| Archived | ARCHIVED |

Migration: `20260524100000_listing_wizard_drafts`
