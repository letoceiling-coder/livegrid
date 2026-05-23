# Iter 45 — Phase 8: Safe Removal

## Removal executed (post-validation)

| Path | Destination | Size |
|------|-------------|------|
| `~/lg` | `livegrid-archives/lg-removed-20260523/` | full clone |
| `deployment/tmp-lg-work` | `livegrid-archives/tmp-lg-work-stale-20260523/` | stale nested clone |

## Confirmation checklist

- [x] All 39 migrations present in `~/livegrid`
- [x] Iter 42–44 uncommitted work copied (206 files from lg working tree)
- [x] `.env` monorepo config active
- [x] Laravel `.env` preserved as `.env.laravel.legacy`
- [x] tsc passes web + api
- [x] `~/lg` directory does not exist
- [x] Tarball backups created before any destructive step

## Recovery procedure

If anything missing:

```bash
# Full lg restore
tar xzf ~/livegrid-archives/lg-pre-consolidation-20260523.tar.gz -C ~/

# Full livegrid pre-merge restore
tar xzf ~/livegrid-archives/livegrid-pre-consolidation-20260523.tar.gz -C ~/
```

## Files explicitly NOT deleted

- Laravel legacy tree (`app/`, `vendor/` if present)
- `gstack/`, `.cursor/`
- `PROJECT_FULL_CONTEXT.md`
- All 52+ ai-workflow run folders (merged)
- Production deploy configs referencing `/var/www/lg`

## Git status note

Consolidated monorepo files appear as untracked/new in `livegrid.git`. **Commit required** to persist Iter 15–44 work in canonical remote.

Suggested commit scope: `apps/`, `packages/`, `deploy/`, `scripts/`, `pnpm-lock.yaml`, updated `.gitignore`, `.cursor/rules/livegrid-canonical-workspace.mdc`, merged docs.
