# 05 — Geo Integration

## Component

`AddressGeocoderField.tsx`

- Uses existing `useYandexMapsReady` + shared maps loader
- Address search → `ymaps.geocode` (house kind, fallback broad)
- Map click → places placemark, writes lat/lng
- Manual lat/lng inputs synced

## Region

User selects region from `GET /regions` (required). Auto region creation from geocoder **not implemented** — avoids accidental region sprawl on production.

## Coordinates

- Validated: pair required together, lat ∈ [-90,90], lng ∈ [-180,180]
- Passed to create DTO `lat`/`lng` on listing row

## Safety

- No changes to public map hooks, viewport, or cluster layers
- Admin-only component; no new API geocode service
