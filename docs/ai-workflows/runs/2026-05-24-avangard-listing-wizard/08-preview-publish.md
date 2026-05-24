# 08 — Preview + Publish

## Preview

`ListingWizardPreviewCard` builds synthetic `ApiListingCardRow` from draft and renders production `ListingCard` (read-only).

## Publish actions (step 4 footer)

| Action | Lifecycle | Legacy status |
|--------|-----------|---------------|
| draft | `action: draft` | DRAFT, not published |
| publish | `action: publish` | ACTIVE, published |
| archive | `action: archive` | INACTIVE, archived visibility |

Sequence after create:

1. `POST manual-*`
2. Optional `PATCH assign`
3. `PATCH lifecycle`

## Validation gate

Full `validateWizardDraft` runs before submit; jumps to failing step on error.
