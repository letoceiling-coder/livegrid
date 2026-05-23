# Iter 45 — Phase 5: Path Hardening

## Canonical paths

| Context | Path |
|---------|------|
| Local dev workspace | `~/livegrid` |
| WSL absolute | `/home/dsc-2/livegrid` |
| Production deploy | `/var/www/lg` (allowed, unchanged) |

## Replacements applied

Bulk sed across `docs/`, `scripts/`, `deploy/`:

```
~/lg              → ~/livegrid
/home/dsc-2/lg    → /home/dsc-2/livegrid
```

## Cursor hardening

Added `.cursor/rules/livegrid-canonical-workspace.mdc`:

- `alwaysApply: true`
- Explicit ban on `~/lg` workspace usage
- Documents production path exception

## Remaining legacy references

`.local/infra/redis-src/` contains hardcoded build paths from pre-consolidation lg clone (redis test script). Non-functional for app runtime; safe to ignore or regenerate if redis rebuilt locally.

## Git root

```
git rev-parse --show-toplevel
→ /home/dsc-2/livegrid
```

Single `.git` at livegrid root — no nested monorepo repos.

## Production deploy scripts

`deploy/*.sh` reference `/var/www/lg` — **correct**, do not change to livegrid path.

## Never create again

```
~/lg                    — REMOVED
deployment/tmp-lg-work  — ARCHIVED
```
