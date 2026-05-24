# 02 — Wizard Architecture

## Flow (5 steps)

| Step | Title | Module |
|------|-------|--------|
| 0 | Тип объекта | `AdminListingWizard` kind grid |
| 1 | Адрес и карта | `AddressGeocoderField` + region/block/price/seller |
| 2 | Параметры | `ListingWizardDynamicFields` + `ListingWizardMediaStep` |
| 3 | Ответственный | `ListingWizardAgentStep` |
| 4 | Публикация | `ListingWizardPreviewCard` + publish action |

## Draft persistence

- **Client:** `admin:listing-wizard:draft:v2` in localStorage, autosave on every change
- **Server:** Create on final submit only (no mid-wizard API draft — avoids orphan rows)
- **Resume route:** `/admin/listings/wizard/:listingId/edit` (shell; full server hydrate deferred)

## Submit pipeline

```
validateWizardDraft (@lg/shared)
  → POST /admin/listings/manual-{kind}
  → PATCH /assign (if agent selected by admin/manager)
  → PATCH /lifecycle { publish | draft | archive }
  → redirect /admin/my-listings
```

## File layout

```
apps/web/src/admin/
  pages/AdminListingWizard.tsx          # orchestrator
  lib/listingWizardDraft.ts             # draft state + storage
  lib/listingWizardSubmit.ts            # API payload + lifecycle
  components/listing-wizard/
    AddressGeocoderField.tsx
    ListingWizardDynamicFields.tsx
    ListingWizardMediaStep.tsx
    ListingWizardAgentStep.tsx
    ListingWizardPreviewCard.tsx
    ListingWizardFooter.tsx
packages/shared/src/listings/
  listing-field-registry.ts
  wizard-validation.ts
```

## Non-goals (this iteration)

- Server-side step autosave
- Moderation queue
- Unified edit wizard loading from API (route exists, hydrate TBD)
