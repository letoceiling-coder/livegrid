# 01 — Auth Runtime Audit

**Iter 62** — `ReferenceError: useAuthState is not defined` in App.tsx.

**Cause:** auth import removed during iter 61 refactor.

**Fix:** `import { AuthProvider, useAuth, useAuthState } from '@/shared/hooks/useAuth'`

**Barrel:** `shared/hooks/index.ts` re-exports canonical symbols.
