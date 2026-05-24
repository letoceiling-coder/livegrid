import { getLazyImportFailures } from '@/shared/lib/lazy-route';
import { LAZY_ROUTE_REGISTRY } from '@/shared/lib/route-registry';

export type ClientPlatformDiagnostics = {
  mode: 'development' | 'production';
  viteEnv: { dev: boolean; mode: string };
  lazyRoutesRegistered: number;
  lazyImportFailures: ReturnType<typeof getLazyImportFailures>;
  workspaceHints: string[];
};

export function collectClientPlatformDiagnostics(): ClientPlatformDiagnostics {
  const workspaceHints: string[] = [];
  if (import.meta.env.DEV) {
    workspaceHints.push('@lg/shared должен быть в apps/web/package.json (workspace:*)');
    workspaceHints.push('После git pull: pnpm --filter @lg/shared build');
    workspaceHints.push('Миграции: cd packages/database && npx prisma migrate deploy');
  }
  return {
    mode: import.meta.env.DEV ? 'development' : 'production',
    viteEnv: { dev: import.meta.env.DEV, mode: import.meta.env.MODE },
    lazyRoutesRegistered: LAZY_ROUTE_REGISTRY.length,
    lazyImportFailures: [...getLazyImportFailures()],
    workspaceHints,
  };
}
