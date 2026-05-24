# 03 — Hydration Flow

## Edit route

`/admin/listings/wizard/:id/edit`

## Sequence

```
1. GET /admin/listings/wizard/:id/draft
2. mergeHydratedDraft(server, localStorage)
3. setStep(wizardStep)
4. toast "Черновик восстановлен"
```

## Payload source priority

1. `listing_wizard_snapshots.payload` if exists
2. Else `buildPayloadFromListing()` from DB kind tables

## Fields restored

- Type, geo, price, region, block
- Kind-specific parameters
- Media URLs + order
- Ownership (ownerUserId, ownerMode)
- Visibility, moderationNote, pending revision flag

## My Listings routing

DRAFT / REVIEW / REJECTED → wizard edit  
PUBLIC / HIDDEN → legacy manual edit pages
