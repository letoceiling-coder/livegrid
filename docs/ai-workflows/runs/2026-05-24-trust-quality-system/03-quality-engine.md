# 03 — Quality Engine

## Scoring (0–100)

| Factor | Max pts | Source |
|--------|---------|--------|
| Photos | 20 | media + kind-specific URLs |
| Description | 15 | length + title/address presence |
| Geo | 15 | geoQuality + confidence |
| Duplicate risk | 15 | inverse of cluster size |
| Freshness | 10 | lastActivityAt age |
| Moderation | 10 | reject history |
| Agent history | 10 | approve ratio |
| Price stability | 5 | edit history swings |

## API

- `TrustQualityService.scoreListing()` — wraps shared `computeListingQualityScore`
- `TrustScanService.runBoundedScan()` — batch upsert scores

## Fingerprint

SHA-256 truncated hash of normalized title|address|price bucket|region|kind|area.
