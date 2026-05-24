/** Boot-time client diagnostics (Iter 62). */
import { getLazyImportFailures } from '@/shared/lib/lazy-route';
import { collectClientPlatformDiagnostics } from '@/shared/lib/platform-diagnostics';

export type BootDiagnostics = {
  at: string;
  lazyFailures: ReturnType<typeof getLazyImportFailures>;
  exportFailures: ReturnType<typeof getLazyImportFailures>;
  platform: ReturnType<typeof collectClientPlatformDiagnostics>;
};

export function collectBootDiagnostics(): BootDiagnostics {
  const lazyFailures = getLazyImportFailures();
  return {
    at: new Date().toISOString(),
    lazyFailures,
    exportFailures: lazyFailures.filter((f) => f.kind === 'export'),
    platform: collectClientPlatformDiagnostics(),
  };
}

if (import.meta.env.DEV && typeof window !== 'undefined') {
  (window as unknown as { __LG_BOOT_DIAG__?: BootDiagnostics }).__LG_BOOT_DIAG__ = collectBootDiagnostics();
}
