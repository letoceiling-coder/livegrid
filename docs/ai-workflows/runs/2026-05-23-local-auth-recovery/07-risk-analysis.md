# Local Auth Recovery — Risk Analysis

## Risks Introduced

| Risk | Level | Mitigation |
|---|---|---|
| auth-repair on prod | Low | NODE_ENV guard |
| Password in script | Low | local dev passwords only; script not deployed |
| Email lowercase change | Low | aligns with register; standard practice |
| Error message mapping | None | same security model (no user enumeration) |

## Risks NOT Taken

| Avoided | Reason |
|---|---|
| Production DB touch | Out of scope |
| JWT/guard rewrite | User constraint |
| Separate auth table | Would break architecture |
| Distinct "user not found" message | Security leak |

## Residual Hold

1. **Snapshot vs seed** — local DB may lack prod users after restore; document `pnpm db:auth-repair`
2. **API hot reload** — restart `dev:api` to pick up Russian backend strings
3. **bcrypt rounds** — seed uses 12, repair uses 10; both valid for compare

## Rollback

- Remove user row manually if needed
- Revert auth.service.ts / auth-errors.ts — login still works with repair script
