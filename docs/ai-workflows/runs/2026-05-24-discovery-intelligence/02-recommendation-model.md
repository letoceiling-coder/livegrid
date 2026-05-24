# 02 — Recommendation Model

## Shared engine

`packages/shared/src/discovery/recommendation-scoring.ts`

Deterministic weighted scoring — **no embeddings / LLM**.

| Signal | Weight |
|--------|--------|
| same_block | 40 |
| same_district | 25 |
| price_similar | 20 |
| rooms_similar | 15 |
| geo_nearby (≤2km) | 18 |
| favorite_block | 22 |
| saved_search_match | 25 |
| trending | 15 |
| promotion | up to 8 |

## Functions

- `scoreListingSimilarity(source, candidate, ctx)`
- `rankRecommendations(source, candidates, opts)`
- `mergeRecommendationScores(batches, limit)` — personalized feed merge
- `haversineMeters` — geo proximity

## Profile shape

`ListingRecoProfile`: id, regionId, kind, blockId, districtId, price, lat/lng, roomTypeId, areaTotal, promotion fields.
