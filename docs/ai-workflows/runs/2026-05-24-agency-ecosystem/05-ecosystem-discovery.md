# 05 — Ecosystem Discovery

## Endpoints

- `GET /ecosystem/discovery/agencies?kind=top|verified|premium`
- `GET /ecosystem/discovery/agents?kind=trusted_agents|nearby`

## Ranking

`computeAgencyRankScore` / `computeAgentRankScore` in `@lg/shared`:
- Verification, listing count, quality, billing plan (featured only)
- Bounded candidate scan (80 max)
- No fake review scores
