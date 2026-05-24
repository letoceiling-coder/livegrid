/**
 * Minimal entry for strict typecheck — auth + route integrity symbols only (Iter 62).
 * App.tsx is validated via runtime-import-integrity.test.ts (import source audit).
 */
import { AuthProvider, useAuth, useAuthState } from '@/shared/hooks/useAuth';
import { lazyWithReload } from '@/shared/lib/lazy-route';
import { LAZY_ROUTE_REGISTRY } from '@/shared/lib/route-registry';

export { AuthProvider, useAuth, useAuthState, lazyWithReload, LAZY_ROUTE_REGISTRY };
