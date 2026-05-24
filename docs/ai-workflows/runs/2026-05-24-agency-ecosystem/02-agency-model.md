# 02 — Agency Model

**Migration:** `20260524900000_agency_ecosystem`

## `agency_profiles`

- `userId` (1:1 manager/agency owner)
- `slug` (unique, public URL)
- Branding: logo, banner, about, contacts, social links JSON
- `status`: DRAFT | PUBLISHED | SUSPENDED
- `themeKey` + billing-derived theme override
- `regionIdsJson` for coverage

## Visibility

Only `PUBLISHED` profiles accessible via public API.
