# 03 — Type System

## API kinds (`ListingKind` enum)

`APARTMENT | HOUSE | LAND | COMMERCIAL | PARKING` — unchanged in Prisma.

## UI kinds (`ListingWizardUiKind`)

| UI kind | Maps to API | Notes |
|---------|-------------|-------|
| APARTMENT | APARTMENT | Full apartment field set |
| ROOM | APARTMENT | Same schema; labels tuned for room |
| HOUSE | HOUSE | Avangard house fields |
| DACHA | HOUSE | Subset of house fields |
| LAND | LAND | |
| COMMERCIAL | COMMERCIAL | |
| PARKING | PARKING | |

## Central registry

`packages/shared/src/listings/listing-field-registry.ts`

- `ListingFieldDefinition` — typed field metadata (no `any`)
- `LISTING_FIELD_REGISTRY` — per-UI-kind field arrays
- `resolveWizardApiKind()` — UI → API mapping
- `LISTING_WIZARD_MEDIA_LIMITS` — mime, size, count

## Validation

`packages/shared/src/listings/wizard-validation.ts`

- `validateWizardStep(draft, step)`
- `validateWizardDraft(draft)`
- Russian error strings

## DTO layer

NestJS class-validator DTOs unchanged (`manual-*.dto.ts`). Wizard builds compatible payloads client-side.
