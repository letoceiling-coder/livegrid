# 07 — IP + access safety

## Rule

TrendAgent HTTP requests **only** from backend API process with whitelisted server IP.

## Enforcement (iter 65)

`FeedFetcherService.assertHttpFetchAllowed()`:

- If `FEED_LOCAL_DIR` set → local files OK (dev)
- Else requires `FEED_HTTP_FETCH_ALLOWED=true`
- User-Agent: `LiveGrid-FeedImporter/1.0 (backend; server-side-only)`

## Verified absent

- No TrendAgent URLs in `apps/web` fetch calls
- No SSR prerender to TrendAgent
- Map/catalog → LiveGrid API only

## Dev workflow

Use `FEED_LOCAL_DIR` when WSL gets 403 from TrendAgent.

## Production

Set in `deploy/ecosystem.config.js`:

```
FEED_HTTP_FETCH_ALLOWED=true
```

Never enable on developer laptops against production DB.
