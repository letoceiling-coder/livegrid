# 04 — Personalized Feed

## Endpoints

- `GET /account/recommendations` (auth)
- `GET /discovery/feed` (auth → personalized; anon → trending)

## Signal merge

1. Favorites → similar listings (`reason: favorite`)
2. Browse history → viewed affinity (`reason: viewed`)
3. Saved searches → `RetentionMatchService` matches (`reason: saved_search`)
4. Trending aggregate boost (`reason: trending`)

`mergeRecommendationScores` dedupes by listing id, keeps highest score.

## Cold start

No favorites/history → `getColdStartFeed()` returns regional trending only.

## Pagination

Stable page/per_page with merged total; bounded generation per request.
