# 04 — Dynamic Form Engine

## Design

Single renderer: `ListingWizardDynamicFields.tsx`

Reads `LISTING_FIELD_REGISTRY[kind]` and renders:

- `text`, `number`, `integer` → `Input`
- `select` → native `<select>` with static options or ref data
- `boolean` → checkbox
- `textarea` → description (house/dacha)

## Reference data

| refKey | API |
|--------|-----|
| room-types | `GET /reference/room-types` |
| finishings | `GET /reference/finishings` |

## No duplicated forms

Wizard step 2 replaces inline `CharacteristicsStep` from v1 wizard. Legacy `AdminManual*` pages remain for deep edit (house districts, etc.).

## Extending

Add fields to registry + ensure DTO/service accepts them. No new React form file per kind.
