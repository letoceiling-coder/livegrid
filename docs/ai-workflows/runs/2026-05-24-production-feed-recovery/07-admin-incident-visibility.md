# 07 — Admin incident visibility

## `/admin/feed-import`

- **Incident banner** when `recoveryRecommended` or `soldSpikeAlert`
- Preview / execute SOLD recovery buttons
- Snapshot trend bars
- Integrity panel (iter 65)
- Feed health cards

## `/admin/system`

- Feed health section (iter 65) — link to Feed Import

## API

`GET /admin/feed-import/recovery/incident?region=msk`

Returns: `recoveryMode`, `soldSpikeAlert`, `integrityScore`, `lastHealthyImport`, `lastDegradedImport`, recommended actions.
