# 03 — Related Listings

## API

- `GET /discovery/listings/:id/related?limit=12`
- `GET /discovery/blocks/:id/related?limit=12`

## Rules

- Same `regionId` required (region-safe)
- `PUBLIC` + `isPublished` + ACTIVE/RESERVED only
- Excludes source listing id
- Candidate pool capped at 80, results at 12
- 5-minute in-memory cache (200 entries max)

## UI

`RelatedListingsCarousel.tsx` on:
- Listing detail (`RedesignListingDetail`)
- Complex page (`RedesignComplex`)
- Account favorites / saved searches
